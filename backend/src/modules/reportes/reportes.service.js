import { prisma } from '../../config/prisma.js';
import { conIndicadores, loteConIndicadores } from '../../services/indicadores.js';
import { generarAlertas } from '../../services/alertas.js';
import { redondear } from '../../services/calculos.js';
import { obtenerLote } from '../lotes/lotes.service.js';

/** Costos y rentabilidad de un lote con el desglose por insumo y por tipo de evento (CU11). */
export async function costosLote(loteId) {
  const lote = await loteConIndicadores(await obtenerLote(loteId));

  const [porInsumo, porTipoSanitario, insumos] = await Promise.all([
    prisma.registroAlimentacion.groupBy({
      by: ['insumoId'],
      where: { loteId },
      _sum: { kg: true, costo: true },
    }),
    prisma.eventoSanitario.groupBy({
      by: ['tipo'],
      where: { loteId, estado: 'REALIZADO' },
      _sum: { costo: true },
      _count: { _all: true },
    }),
    prisma.insumo.findMany({ select: { id: true, nombre: true } }),
  ]);

  const nombreInsumo = new Map(insumos.map((i) => [i.id, i.nombre]));

  return {
    lote,
    alimentacionPorInsumo: porInsumo.map((g) => ({
      insumoId: g.insumoId,
      insumo: nombreInsumo.get(g.insumoId),
      kg: Number(g._sum.kg ?? 0),
      costo: Number(g._sum.costo ?? 0),
    })),
    sanidadPorTipo: porTipoSanitario.map((g) => ({
      tipo: g.tipo,
      eventos: g._count._all,
      costo: Number(g._sum.costo ?? 0),
    })),
  };
}

/** Datos del dashboard principal (CU12, RF07). */
export async function dashboard() {
  const [lotesActivos, alertas, insumos] = await Promise.all([
    prisma.lote.findMany({
      where: { estado: 'ACTIVO' },
      orderBy: { fechaIngreso: 'asc' },
      include: { pesadas: { select: { pesoPromedio: true }, orderBy: { fecha: 'asc' } } },
    }),
    generarAlertas('ADMIN'),
    prisma.insumo.findMany({ orderBy: { nombre: 'asc' } }),
  ]);
  const lotes = (await conIndicadores(lotesActivos)).map(({ pesadas, ...l }) => ({
    ...l,
    // Evolución del peso promedio (ingreso + pesadas) para el mini gráfico del dashboard.
    seriePeso: [Number(l.pesoIngreso), ...pesadas.map((p) => Number(p.pesoPromedio))],
    alertas: alertas.filter((a) => a.loteId === l.id).length,
  }));

  const suma = (fn) => redondear(lotes.reduce((total, l) => total + (fn(l) ?? 0), 0), 2);
  const conPrecio = lotes.filter((l) => l.indicadores.margenBruto !== null);

  return {
    resumen: {
      lotesActivos: lotes.length,
      cabezas: suma((l) => l.indicadores.cabezasActuales),
      costoTotal: suma((l) => l.indicadores.costoTotal),
      kgCarneEstimados: suma((l) => l.indicadores.kgCarneEstimados),
      margenEstimado: conPrecio.length ? suma((l) => l.indicadores.margenBruto) : null,
      lotesConPrecio: conPrecio.length,
      alertas: alertas.length,
    },
    lotes,
    alertas,
    insumos: insumos.map((i) => ({
      id: i.id,
      nombre: i.nombre,
      tipo: i.tipo,
      stockKg: Number(i.stockKg),
      stockMinimoKg: Number(i.stockMinimoKg),
      bajoMinimo: Number(i.stockKg) < Number(i.stockMinimoKg),
    })),
  };
}

export const alertas = (rol) => generarAlertas(rol);
