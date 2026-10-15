// Cálculos productivos y económicos del feedlot (RF04 y RF06).
// Son funciones puras: no acceden a la base de datos, por eso se prueban con tests unitarios.

import { sumarDias } from '../utils/fechas.js';

/** Redondea a una cantidad fija de decimales evitando errores de coma flotante (0.1 + 0.2). */
export function redondear(valor, decimales = 2) {
  const factor = 10 ** decimales;
  return Math.round((valor + Number.EPSILON) * factor) / factor;
}

/**
 * Ganancia Diaria de Peso (GDP), en kg/día.
 * GDP = (peso actual − peso anterior) / días transcurridos entre ambas pesadas.
 * Puede ser negativa si el lote perdió peso.
 * @param {number} pesoAnterior  peso promedio de la pesada anterior (o de ingreso), en kg
 * @param {number} pesoActual    peso promedio de la pesada actual, en kg
 * @param {number} dias          días entre ambas pesadas (debe ser > 0)
 */
export function calcularGdp(pesoAnterior, pesoActual, dias) {
  if (!(dias > 0)) throw new RangeError('Los días entre pesadas deben ser mayores a 0');
  return redondear((pesoActual - pesoAnterior) / dias, 3);
}

/**
 * Días que faltan para llegar al peso objetivo si el lote mantiene la GDP actual.
 * Devuelve 0 si ya lo alcanzó y null si la GDP es ≤ 0 (no se puede proyectar).
 * Se redondea hacia arriba: si faltan 10,2 días, el objetivo se alcanza el día 11.
 */
export function diasHastaObjetivo(pesoActual, pesoObjetivo, gdp) {
  if (pesoActual >= pesoObjetivo) return 0;
  if (!(gdp > 0)) return null;
  return Math.ceil((pesoObjetivo - pesoActual) / gdp);
}

/**
 * Fecha estimada de llegada al peso objetivo: fecha de la última pesada + días restantes.
 * Devuelve null si no se puede proyectar (GDP ≤ 0).
 */
export function fechaProyectada(fechaUltimaPesada, pesoActual, pesoObjetivo, gdp) {
  const dias = diasHastaObjetivo(pesoActual, pesoObjetivo, gdp);
  return dias === null ? null : sumarDias(fechaUltimaPesada, dias);
}

/** Cabezas actuales del lote = cantidad de ingreso − bajas registradas. */
export function cabezasActuales(cantidadInicial, totalBajas = 0) {
  return Math.max(0, cantidadInicial - totalBajas);
}

/**
 * Kilos de carne al gancho estimados del lote.
 * kg carne = peso promedio × cabezas × rendimiento al gancho (0,57 para Angus según el relevamiento).
 */
export function kgCarneGancho(pesoPromedio, cabezas, rendimiento) {
  return redondear(pesoPromedio * cabezas * rendimiento, 2);
}

/** Costo diario de alimentación de un insumo = kg entregados × precio por kg. */
export function costoAlimentacion(kg, precioKg) {
  return redondear(kg * precioKg, 2);
}

/**
 * Costo de engorde por kg de carne = costo total acumulado / kg de carne al gancho.
 * Devuelve null si no hay kg de carne (por ejemplo, todas las cabezas dadas de baja).
 */
export function costoPorKgCarne(costoTotal, kgCarne) {
  if (!(kgCarne > 0)) return null;
  return redondear(costoTotal / kgCarne, 2);
}

/**
 * Margen bruto estimado de engorde = (precio de venta por kg × kg de carne) − costo total.
 * Devuelve null si todavía no se cargó el precio de venta.
 */
export function margenBruto(precioVentaKg, kgCarne, costoTotal) {
  if (precioVentaKg === null || precioVentaKg === undefined) return null;
  return redondear(precioVentaKg * kgCarne - costoTotal, 2);
}

/** Kg de alimento sugeridos para el día = kg por cabeza por día (ración) × cabezas actuales. */
export function kgSugeridos(kgCabezaDia, cabezas) {
  return Math.round(kgCabezaDia * cabezas);
}

/** Kg de materia seca de un alimento = kg tal cual × % de materia seca / 100. */
export function kgMateriaSeca(kg, materiaSecaPct) {
  return redondear((kg * materiaSecaPct) / 100, 2);
}

/**
 * Conversión alimenticia (kg de materia seca consumidos por kg de peso vivo ganado).
 * CA = kg MS consumidos en el período / (aumento de peso promedio × cabezas).
 * Cuanto menor, más eficiente el engorde. Devuelve null si el lote no ganó peso.
 */
export function conversionAlimenticia(kgMsConsumidos, aumentoPesoPromedio, cabezas) {
  const kgGanados = aumentoPesoPromedio * cabezas;
  if (!(kgGanados > 0)) return null;
  return redondear(kgMsConsumidos / kgGanados, 2);
}
