// Conversión alimenticia de un lote (RF09): kg de materia seca consumidos por kg de peso ganado,
// para cada período entre pesadas y acumulada desde el ingreso.

import { prisma } from '../config/prisma.js';
import { cabezasActuales, conversionAlimenticia, kgMateriaSeca, redondear } from './calculos.js';

/**
 * @param lote  lote con id, fechaIngreso, pesoIngreso y cantidadInicial
 * @returns { porPesada: Map pesadaId → { kgMs, conversion }, acumulada, kgMsTotal }
 *
 * Criterios:
 *  - El alimento de un período es el entregado desde la pesada anterior (incluida) hasta el día
 *    anterior a la pesada actual.
 *  - Las cabezas son las del lote el día de la pesada (cantidad inicial − bajas hasta esa fecha).
 */
export async function conversionDeLote(lote, db = prisma) {
  const [pesadas, registros, bajas] = await Promise.all([
    db.pesada.findMany({ where: { loteId: lote.id }, orderBy: { fecha: 'asc' } }),
    db.registroAlimentacion.findMany({
      where: { loteId: lote.id },
      select: { fecha: true, kg: true, insumo: { select: { materiaSecaPct: true } } },
    }),
    db.baja.findMany({ where: { loteId: lote.id }, select: { fecha: true, cantidad: true } }),
  ]);

  const consumos = registros.map((r) => ({
    fecha: r.fecha,
    kgMs: kgMateriaSeca(Number(r.kg), Number(r.insumo.materiaSecaPct)),
  }));
  const msEntre = (desde, hasta) =>
    consumos.filter((c) => c.fecha >= desde && c.fecha < hasta).reduce((t, c) => t + c.kgMs, 0);
  const cabezasAl = (fecha) =>
    cabezasActuales(lote.cantidadInicial, bajas.filter((b) => b.fecha <= fecha).reduce((t, b) => t + b.cantidad, 0));

  const porPesada = new Map();
  let anterior = { fecha: lote.fechaIngreso, peso: Number(lote.pesoIngreso) };
  for (const p of pesadas) {
    const kgMs = msEntre(anterior.fecha, p.fecha);
    porPesada.set(p.id, {
      kgMs: redondear(kgMs, 2),
      conversion: conversionAlimenticia(kgMs, Number(p.pesoPromedio) - anterior.peso, cabezasAl(p.fecha)),
    });
    anterior = { fecha: p.fecha, peso: Number(p.pesoPromedio) };
  }

  const ultima = pesadas.at(-1);
  const kgMsHastaUltima = ultima ? msEntre(lote.fechaIngreso, ultima.fecha) : 0;
  return {
    porPesada,
    kgMsTotal: redondear(consumos.reduce((t, c) => t + c.kgMs, 0), 2),
    acumulada: ultima
      ? conversionAlimenticia(kgMsHastaUltima, Number(ultima.pesoPromedio) - Number(lote.pesoIngreso), cabezasAl(ultima.fecha))
      : null,
  };
}
