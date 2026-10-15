// Proyección de stock de insumos (RF11): cuántos días alcanza cada insumo, cuándo se agota
// y cuánto conviene comprar. Responde al problema de abastecimiento en sequía (relevamiento, Bloque 3).

import { prisma } from '../config/prisma.js';
import { hoy, sumarDias } from '../utils/fechas.js';
import { compraSugerida, diasDeCobertura, redondear, stockProyectado } from './calculos.js';
import { diasCoberturaMinima, horizonteCompraDias } from './parametros.js';
import { cabezasPorLote, racionesVigentes } from './raciones.js';

const DIAS_PROMEDIO_REAL = 14;
const DIAS_GRAFICO = 30;

/**
 * Consumo diario previsto de cada insumo:
 *  - según las raciones vigentes de los lotes activos (kg/cabeza × cabezas), o
 *  - si ningún lote tiene ración para ese insumo, el promedio real de los últimos 14 días.
 */
async function consumoDiario(fechaHoy, db) {
  const lotes = await db.lote.findMany({ where: { estado: 'ACTIVO' }, select: { id: true, cantidadInicial: true } });
  const [cabezas, raciones, recientes] = await Promise.all([
    cabezasPorLote(lotes, db),
    racionesVigentes(lotes.map((l) => l.id), fechaHoy, db),
    db.registroAlimentacion.groupBy({
      by: ['insumoId'],
      where: { fecha: { gte: sumarDias(fechaHoy, -DIAS_PROMEDIO_REAL), lt: fechaHoy } },
      _sum: { kg: true },
    }),
  ]);

  const porRacion = new Map();
  for (const lote of lotes) {
    for (const r of raciones.get(lote.id)) {
      porRacion.set(r.insumoId, (porRacion.get(r.insumoId) ?? 0) + r.kgCabezaDia * cabezas.get(lote.id));
    }
  }
  const porHistorial = new Map(recientes.map((g) => [g.insumoId, Number(g._sum.kg ?? 0) / DIAS_PROMEDIO_REAL]));
  return { porRacion, porHistorial };
}

/** Proyección de todos los insumos. Devuelve Map insumoId → proyección. */
export async function proyeccionInsumos(db = prisma) {
  const fechaHoy = hoy();
  const [insumos, consumo, minimoDias, horizonte] = await Promise.all([
    db.insumo.findMany(),
    consumoDiario(fechaHoy, db),
    diasCoberturaMinima(db),
    horizonteCompraDias(db),
  ]);

  return new Map(
    insumos.map((i) => {
      const segunRacion = consumo.porRacion.get(i.id);
      const diario = redondear(segunRacion ?? consumo.porHistorial.get(i.id) ?? 0, 1);
      const stock = Number(i.stockKg);
      const dias = diasDeCobertura(stock, diario);
      return [
        i.id,
        {
          consumoDiarioKg: diario,
          fuenteConsumo: segunRacion ? 'racion' : diario > 0 ? 'historial' : null,
          diasCobertura: dias,
          fechaQuiebre: dias === null ? null : sumarDias(fechaHoy, dias),
          coberturaBaja: dias !== null && dias < minimoDias,
          diasCoberturaMinima: minimoDias,
          horizonteDias: horizonte,
          compraSugeridaKg: diario > 0 ? compraSugerida(stock, diario, horizonte, Number(i.stockMinimoKg)) : 0,
          serie: diario > 0 ? stockProyectado(stock, diario, DIAS_GRAFICO) : [],
        },
      ];
    }),
  );
}
