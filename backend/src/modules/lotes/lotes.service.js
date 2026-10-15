import { prisma } from '../../config/prisma.js';
import { AppError, conflicto, noEncontrado } from '../../utils/errores.js';
import { hoy } from '../../utils/fechas.js';
import { conIndicadores, loteConIndicadores } from '../../services/indicadores.js';
import { aplicarProtocolo } from '../../services/protocolo.js';

/** Busca un lote y valida que exista (y, opcionalmente, que esté activo). */
export async function obtenerLote(id, { activo = false, db = prisma } = {}) {
  const lote = await db.lote.findUnique({ where: { id } });
  if (!lote) throw noEncontrado('Lote');
  if (activo && lote.estado !== 'ACTIVO') {
    throw conflicto('El lote está cerrado y no admite nuevos registros');
  }
  return lote;
}

export async function listar({ estado } = {}) {
  const lotes = await prisma.lote.findMany({
    where: estado ? { estado } : undefined,
    orderBy: [{ estado: 'asc' }, { fechaIngreso: 'desc' }],
  });
  return conIndicadores(lotes);
}

export async function detalle(id) {
  return loteConIndicadores(await obtenerLote(id));
}

/**
 * Alta de lote (CU03). Si se indica un protocolo sanitario, sus eventos se generan
 * en la misma transacción: o se crea todo o no se crea nada (RF10).
 */
export async function crear({ protocoloId, omitirEventosPasados, ...datos }) {
  if (datos.fechaIngreso > hoy()) throw new AppError(400, 'La fecha de ingreso no puede ser futura');
  const existe = await prisma.lote.findUnique({ where: { nombre: datos.nombre } });
  if (existe) throw conflicto('Ya existe un lote con ese nombre');

  const { lote, protocolo } = await prisma.$transaction(async (tx) => {
    const nuevo = await tx.lote.create({ data: datos });
    const aplicado = protocoloId
      ? await aplicarProtocolo(tx, nuevo, protocoloId, { omitirPasadas: omitirEventosPasados })
      : null;
    return { lote: nuevo, protocolo: aplicado };
  });
  return { ...(await loteConIndicadores(lote)), protocolo };
}

export async function actualizar(id, datos) {
  const lote = await obtenerLote(id, { activo: true });
  const pesoObjetivo = datos.pesoObjetivo ?? Number(lote.pesoObjetivo);
  if (pesoObjetivo <= Number(lote.pesoIngreso)) {
    throw new AppError(400, 'El peso objetivo debe ser mayor al peso de ingreso');
  }
  if (datos.nombre && datos.nombre !== lote.nombre) {
    const existe = await prisma.lote.findUnique({ where: { nombre: datos.nombre } });
    if (existe) throw conflicto('Ya existe un lote con ese nombre');
  }
  const actualizado = await prisma.lote.update({ where: { id }, data: datos });
  return loteConIndicadores(actualizado);
}

/**
 * Cierre del lote por venta/faena (CU13).
 * Con simular = true devuelve el resumen financiero final sin guardar nada.
 */
export async function cerrar(id, { fechaCierre, pesoFinal, precioVentaKg, simular }) {
  const lote = await obtenerLote(id, { activo: true });
  if (fechaCierre < lote.fechaIngreso) {
    throw new AppError(400, 'La fecha de cierre no puede ser anterior a la fecha de ingreso');
  }
  if (fechaCierre > hoy()) throw new AppError(400, 'La fecha de cierre no puede ser futura');

  const eventosPendientes = await prisma.eventoSanitario.count({
    where: { loteId: id, estado: 'PENDIENTE' },
  });
  const advertencias =
    eventosPendientes > 0
      ? [`El lote tiene ${eventosPendientes} evento(s) sanitario(s) pendiente(s)`]
      : [];

  const datosCierre = { estado: 'CERRADO', fechaCierre, pesoFinal, precioVentaKg };

  if (simular) {
    const resumen = await loteConIndicadores({ ...lote, ...datosCierre });
    return { simulacion: true, lote: resumen, advertencias };
  }

  const cerrado = await prisma.lote.update({ where: { id }, data: datosCierre });
  return { simulacion: false, lote: await loteConIndicadores(cerrado), advertencias };
}
