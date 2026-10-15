// Indicadores de cada lote: días en feedlot, cabezas, peso, GDP, proyección, costos y margen.
// Los acumulados se leen de la vista SQL v_resumen_lote y los cálculos se hacen con calculos.js.

import { prisma, Prisma } from '../config/prisma.js';
import { hoy, diasEntre } from '../utils/fechas.js';
import { rendimientoGancho } from './parametros.js';
import {
  diasHastaObjetivo,
  fechaProyectada,
  kgCarneGancho,
  costoPorKgCarne,
  margenBruto,
} from './calculos.js';

const num = (valor) => (valor === null || valor === undefined ? null : Number(valor));

/** Lee la vista v_resumen_lote para un conjunto de lotes. Devuelve un Map loteId → fila. */
async function leerResumenes(ids, db) {
  if (ids.length === 0) return new Map();
  const filas = await db.$queryRaw`
    SELECT * FROM v_resumen_lote WHERE lote_id IN (${Prisma.join(ids)})`;
  return new Map(filas.map((f) => [f.lote_id, f]));
}

/**
 * Calcula los indicadores de un lote a partir de su fila de la vista.
 * Para un lote cerrado se usan la fecha de cierre y el peso final.
 */
export function armarIndicadores(lote, fila, rendimiento, fechaReferencia = hoy()) {
  const cerrado = lote.estado === 'CERRADO';
  const fechaRef = cerrado ? lote.fechaCierre : fechaReferencia;
  const pesoObjetivo = num(lote.pesoObjetivo);
  const pesoActual = cerrado && lote.pesoFinal !== null ? num(lote.pesoFinal) : num(fila.peso_actual);
  const ultimaGdp = num(fila.ultima_gdp);
  const cabezas = fila.cabezas_actuales;
  const costoAlim = num(fila.costo_alimentacion);
  const costoSan = num(fila.costo_sanitario);
  const costoTotal = num(fila.costo_total);
  const kgCarne = kgCarneGancho(pesoActual, cabezas, rendimiento);
  const fechaBase = fila.fecha_ultima_pesada ?? lote.fechaIngreso;

  return {
    diasEnFeedlot: diasEntre(lote.fechaIngreso, fechaRef),
    cabezasActuales: cabezas,
    bajas: lote.cantidadInicial - cabezas,
    pesoActual,
    fechaUltimaPesada: fila.fecha_ultima_pesada,
    ultimaGdp,
    gdpObjetivo: num(lote.gdpObjetivo),
    bajoRendimiento: ultimaGdp !== null && ultimaGdp < num(lote.gdpObjetivo),
    alcanzoObjetivo: pesoActual >= pesoObjetivo,
    diasRestantes: cerrado ? null : diasHastaObjetivo(pesoActual, pesoObjetivo, ultimaGdp),
    fechaEstimadaObjetivo: cerrado ? null : fechaProyectada(fechaBase, pesoActual, pesoObjetivo, ultimaGdp),
    costoAlimentacion: costoAlim,
    costoSanitario: costoSan,
    costoTotal,
    rendimientoGancho: rendimiento,
    kgCarneEstimados: kgCarne,
    costoPorKgCarne: costoPorKgCarne(costoTotal, kgCarne),
    precioVentaKg: num(lote.precioVentaKg),
    margenBruto: margenBruto(num(lote.precioVentaKg), kgCarne, costoTotal),
    calculoPreliminar: !fila.fecha_ultima_pesada,
  };
}

/** Devuelve los lotes recibidos con la propiedad "indicadores" agregada. */
export async function conIndicadores(lotes, db = prisma) {
  const [resumenes, rendimiento] = await Promise.all([
    leerResumenes(lotes.map((l) => l.id), db),
    rendimientoGancho(db),
  ]);
  return lotes.map((lote) => ({
    ...lote,
    indicadores: armarIndicadores(lote, resumenes.get(lote.id), rendimiento),
  }));
}

export async function loteConIndicadores(lote, db = prisma) {
  const [resultado] = await conIndicadores([lote], db);
  return resultado;
}
