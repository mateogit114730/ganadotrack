import { prisma } from '../../config/prisma.js';
import { AppError, conflicto, noEncontrado } from '../../utils/errores.js';
import { hoy } from '../../utils/fechas.js';
import { costoAlimentacion, redondear } from '../../services/calculos.js';
import { obtenerLote } from '../lotes/lotes.service.js';
import { cabezasPorLote, racionesVigentes, conKgDelDia } from '../../services/raciones.js';

/**
 * Datos para el formulario del encargado: lotes activos con sus cabezas, la ración
 * sugerida para hoy (kg por cabeza × cabezas), los insumos y lo ya cargado hoy.
 */
export async function opciones() {
  const fechaHoy = hoy();
  const [lotes, insumos, registrosHoy] = await Promise.all([
    prisma.lote.findMany({
      where: { estado: 'ACTIVO' },
      select: { id: true, nombre: true, cantidadInicial: true },
      orderBy: { nombre: 'asc' },
    }),
    prisma.insumo.findMany({
      select: { id: true, nombre: true, tipo: true, stockKg: true, precioKg: true },
      orderBy: { tipo: 'asc' }, // suplemento y luego silaje, como en el CU04
    }),
    prisma.registroAlimentacion.findMany({
      where: { fecha: fechaHoy },
      select: { loteId: true, insumoId: true, kg: true },
    }),
  ]);

  const [cabezas, raciones] = await Promise.all([
    cabezasPorLote(lotes),
    racionesVigentes(lotes.map((l) => l.id), fechaHoy),
  ]);

  return {
    fecha: fechaHoy,
    insumos,
    lotes: lotes.map(({ cantidadInicial: _cantidad, ...l }) => ({
      ...l,
      cabezasActuales: cabezas.get(l.id),
      racionSugerida: conKgDelDia(raciones.get(l.id), cabezas.get(l.id)),
      cargadoHoy: registrosHoy.filter((r) => r.loteId === l.id),
    })),
  };
}

/**
 * Registra la alimentación diaria de un lote (CU04) y descuenta el stock (CU05).
 * Todo ocurre en una transacción: si un insumo no tiene stock suficiente
 * o ya se cargó ese día, no se guarda nada.
 */
export async function registrar({ loteId, fecha = hoy(), items }, usuarioId) {
  if (fecha > hoy()) throw new AppError(400, 'La fecha no puede ser futura');
  const itemsConKg = items.filter((i) => i.kg > 0);

  return prisma.$transaction(async (tx) => {
    const lote = await obtenerLote(loteId, { activo: true, db: tx });
    if (fecha < lote.fechaIngreso) {
      throw new AppError(400, 'La fecha es anterior al ingreso del lote');
    }

    const registros = [];
    for (const { insumoId, kg } of itemsConKg) {
      const insumo = await tx.insumo.findUnique({ where: { id: insumoId } });
      if (!insumo) throw noEncontrado('Insumo');

      const existente = await tx.registroAlimentacion.findUnique({
        where: { loteId_insumoId_fecha: { loteId, insumoId, fecha } },
      });
      if (existente) {
        throw conflicto(`Ya se registró ${insumo.nombre} para el lote ${lote.nombre} en esa fecha`);
      }

      // Descuento atómico: solo se actualiza si el stock alcanza.
      const { count } = await tx.insumo.updateMany({
        where: { id: insumoId, stockKg: { gte: kg } },
        data: { stockKg: { decrement: kg } },
      });
      if (count === 0) {
        throw conflicto(
          `Stock insuficiente de ${insumo.nombre}: hay ${Number(insumo.stockKg).toLocaleString('es-AR')} kg disponibles`,
        );
      }

      const precioKg = Number(insumo.precioKg);
      registros.push(
        await tx.registroAlimentacion.create({
          data: { loteId, insumoId, fecha, kg, precioKg, costo: costoAlimentacion(kg, precioKg), usuarioId },
          include: { insumo: { select: { nombre: true, tipo: true } } },
        }),
      );
    }

    // Alerta de stock (flujo alternativo del CU04).
    const insumosActualizados = await tx.insumo.findMany({
      where: { id: { in: itemsConKg.map((i) => i.insumoId) } },
    });
    const alertasStock = insumosActualizados
      .filter((i) => Number(i.stockKg) < Number(i.stockMinimoKg))
      .map((i) => `${i.nombre} quedó por debajo del stock mínimo (${Number(i.stockKg).toLocaleString('es-AR')} kg)`);

    return {
      lote: { id: lote.id, nombre: lote.nombre },
      fecha,
      registros,
      costoDia: redondear(registros.reduce((total, r) => total + Number(r.costo), 0), 2),
      alertasStock,
    };
  });
}

export async function listar({ loteId, desde, hasta } = {}) {
  return prisma.registroAlimentacion.findMany({
    where: {
      loteId,
      fecha: desde || hasta ? { gte: desde, lte: hasta } : undefined,
    },
    orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
    take: 500,
    include: {
      insumo: { select: { nombre: true, tipo: true } },
      lote: { select: { nombre: true } },
      usuario: { select: { nombre: true } },
    },
  });
}

/** Elimina un registro cargado por error y devuelve los kg al stock (solo administrador). */
export async function eliminar(id) {
  return prisma.$transaction(async (tx) => {
    const registro = await tx.registroAlimentacion.findUnique({ where: { id } });
    if (!registro) throw noEncontrado('Registro de alimentación');
    await obtenerLote(registro.loteId, { activo: true, db: tx });
    await tx.registroAlimentacion.delete({ where: { id } });
    await tx.insumo.update({
      where: { id: registro.insumoId },
      data: { stockKg: { increment: registro.kg } },
    });
    return { eliminado: true };
  });
}
