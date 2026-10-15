import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/errores.js';
import { hoy, diasEntre } from '../../utils/fechas.js';
import { calcularGdp } from '../../services/calculos.js';
import { loteConIndicadores } from '../../services/indicadores.js';
import { obtenerLote } from '../lotes/lotes.service.js';

/**
 * Registra una pesada mensual (CU07) y calcula la GDP respecto de la pesada anterior
 * (o del peso de ingreso, si es la primera).
 */
export async function registrar({ loteId, fecha, pesoPromedio }, usuarioId) {
  const lote = await obtenerLote(loteId, { activo: true });
  if (fecha > hoy()) throw new AppError(400, 'La fecha de la pesada no puede ser futura');

  const anterior = await prisma.pesada.findFirst({ where: { loteId }, orderBy: { fecha: 'desc' } });
  const base = anterior
    ? { fecha: anterior.fecha, peso: Number(anterior.pesoPromedio), origen: 'la última pesada' }
    : { fecha: lote.fechaIngreso, peso: Number(lote.pesoIngreso), origen: 'el ingreso del lote' };

  const dias = diasEntre(base.fecha, fecha);
  if (dias <= 0) throw new AppError(400, `La fecha debe ser posterior a ${base.origen}`);

  const gdp = calcularGdp(base.peso, pesoPromedio, dias);
  const pesada = await prisma.pesada.create({
    data: { loteId, fecha, pesoPromedio, gdp, usuarioId },
  });

  // Resumen para el paso 5 del CU07: GDP, días restantes y costo acumulado.
  const { indicadores } = await loteConIndicadores(lote);
  const avisos = [];
  if (indicadores.bajoRendimiento) {
    avisos.push(`La GDP (${gdp} kg/día) está por debajo del objetivo (${indicadores.gdpObjetivo} kg/día)`);
  }
  if (indicadores.alcanzoObjetivo) {
    avisos.push('El lote alcanzó el peso objetivo: se sugiere evaluar el cierre del lote');
  }

  return { pesada, diasDesdeAnterior: dias, indicadores, avisos };
}

export async function listar({ loteId }) {
  await obtenerLote(loteId);
  return prisma.pesada.findMany({ where: { loteId }, orderBy: { fecha: 'asc' } });
}
