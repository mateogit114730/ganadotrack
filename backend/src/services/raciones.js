// Helpers de ración y cabezas, compartidos por los módulos de ración, alimentación y la proyección de stock.
import { prisma } from '../config/prisma.js';
import { hoy } from '../utils/fechas.js';
import { cabezasActuales, kgSugeridos } from './calculos.js';

/** Cabezas actuales de varios lotes (cantidad inicial − bajas). Devuelve Map loteId → cabezas. */
export async function cabezasPorLote(lotes, db = prisma) {
  const bajas = await db.baja.groupBy({
    by: ['loteId'],
    where: { loteId: { in: lotes.map((l) => l.id) } },
    _sum: { cantidad: true },
  });
  const total = new Map(bajas.map((b) => [b.loteId, b._sum.cantidad ?? 0]));
  return new Map(lotes.map((l) => [l.id, cabezasActuales(l.cantidadInicial, total.get(l.id) ?? 0)]));
}

/**
 * Ración vigente de cada lote a una fecha: para cada insumo, la fila con mayor vigente_desde
 * que no supere la fecha. Los insumos con 0 kg/cabeza quedan fuera de la ración.
 * Devuelve Map loteId → [{ insumoId, insumo, kgCabezaDia, vigenteDesde }].
 */
export async function racionesVigentes(loteIds, fecha = hoy(), db = prisma) {
  const filas = await db.racion.findMany({
    where: { loteId: { in: loteIds }, vigenteDesde: { lte: fecha } },
    orderBy: [{ vigenteDesde: 'desc' }, { id: 'desc' }],
    include: { insumo: { select: { nombre: true, tipo: true } } },
  });
  const resultado = new Map(loteIds.map((id) => [id, []]));
  const vistos = new Set();
  for (const f of filas) {
    const clave = `${f.loteId}-${f.insumoId}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    if (Number(f.kgCabezaDia) > 0) {
      resultado.get(f.loteId).push({
        insumoId: f.insumoId,
        insumo: f.insumo,
        kgCabezaDia: Number(f.kgCabezaDia),
        vigenteDesde: f.vigenteDesde,
      });
    }
  }
  // Mismo orden que el formulario del encargado (CU04): suplemento y después silaje.
  const orden = ['SUPLEMENTO', 'SILAJE'];
  for (const racion of resultado.values()) racion.sort((a, b) => orden.indexOf(a.insumo.tipo) - orden.indexOf(b.insumo.tipo));
  return resultado;
}

/** Agrega a cada ítem de la ración los kg del día para las cabezas indicadas. */
export const conKgDelDia = (racion, cabezas) =>
  racion.map((r) => ({ ...r, kgDia: kgSugeridos(r.kgCabezaDia, cabezas) }));
