import { prisma } from '../../config/prisma.js';
import { AppError, conflicto, noEncontrado } from '../../utils/errores.js';
import { hoy, sumarDias } from '../../utils/fechas.js';
import { cabezasActuales } from '../../services/calculos.js';
import { obtenerLote } from '../lotes/lotes.service.js';

const incluirLote = { lote: { select: { id: true, nombre: true, estado: true } } };

/** Lotes activos con sus cabezas actuales (para los formularios del veterinario). */
export async function lotesActivos() {
  const lotes = await prisma.lote.findMany({
    where: { estado: 'ACTIVO' },
    select: { id: true, nombre: true, cantidadInicial: true, bajas: { select: { cantidad: true } } },
    orderBy: { nombre: 'asc' },
  });
  return lotes.map(({ bajas, ...l }) => ({
    id: l.id,
    nombre: l.nombre,
    cabezasActuales: cabezasActuales(l.cantidadInicial, bajas.reduce((t, b) => t + b.cantidad, 0)),
  }));
}

export async function listarEventos({ loteId, estado } = {}) {
  return prisma.eventoSanitario.findMany({
    where: { loteId, estado },
    orderBy: [{ estado: 'asc' }, { fechaProgramada: 'asc' }],
    include: { ...incluirLote, usuario: { select: { nombre: true } } },
  });
}

/** Agrega un evento al calendario sanitario del lote (CU08). */
export async function programar({ loteId, tipo, nombre, producto, fechaProgramada, observaciones }) {
  await obtenerLote(loteId, { activo: true });
  if (fechaProgramada < hoy()) throw new AppError(400, 'La fecha programada no puede ser anterior a hoy');
  return prisma.eventoSanitario.create({
    data: { loteId, tipo, nombre, producto, fechaProgramada, observaciones },
    include: incluirLote,
  });
}

/**
 * Valida los datos de ejecución y arma las advertencias comunes a eventos
 * programados y no programados.
 */
function prepararEjecucion(tipo, datos, fechaIngresoLote) {
  if (datos.fechaRealizada > hoy()) throw new AppError(400, 'La fecha de realización no puede ser futura');
  if (datos.fechaRealizada < fechaIngresoLote) {
    throw new AppError(400, 'La fecha de realización es anterior al ingreso del lote');
  }
  if (tipo === 'GARRAPATA' && !datos.duracionDias) {
    throw new AppError(400, 'Indique la duración del tratamiento de garrapata (días)');
  }
  const advertencias = [];
  if (datos.costo === undefined) {
    advertencias.push('El evento se guardó con costo $ 0: el costo sanitario del lote quedará subestimado');
  }
  return { costo: datos.costo ?? 0, advertencias };
}

/**
 * Tratamiento de garrapata (flujo alternativo A del CU09): al registrarlo se programa
 * automáticamente un control al finalizar el tratamiento (fecha realizada + duración).
 */
async function programarControlGarrapata(tx, evento) {
  if (evento.tipo !== 'GARRAPATA') return null;
  return tx.eventoSanitario.create({
    data: {
      loteId: evento.loteId,
      tipo: 'GARRAPATA',
      nombre: 'Control de tratamiento de garrapata',
      producto: evento.producto,
      fechaProgramada: sumarDias(evento.fechaRealizada, evento.duracionDias),
      observaciones: `Generado automáticamente al registrar el evento #${evento.id}`,
    },
  });
}

/** Registra la ejecución de un evento programado (CU09). */
export async function realizar(id, datos, usuarioId) {
  const evento = await prisma.eventoSanitario.findUnique({ where: { id } });
  if (!evento) throw noEncontrado('Evento sanitario');
  if (evento.estado === 'REALIZADO') throw conflicto('El evento ya fue registrado como realizado');
  const lote = await obtenerLote(evento.loteId, { activo: true });
  const { costo, advertencias } = prepararEjecucion(evento.tipo, datos, lote.fechaIngreso);

  return prisma.$transaction(async (tx) => {
    const actualizado = await tx.eventoSanitario.update({
      where: { id },
      data: {
        estado: 'REALIZADO',
        fechaRealizada: datos.fechaRealizada,
        producto: datos.producto ?? evento.producto,
        dosis: datos.dosis,
        costo,
        duracionDias: datos.duracionDias,
        observaciones: datos.observaciones ?? evento.observaciones,
        usuarioId,
      },
      include: incluirLote,
    });
    const proximoEvento = await programarControlGarrapata(tx, actualizado);
    return { evento: actualizado, proximoEvento, advertencias };
  });
}

/** Registra un evento que no estaba en el calendario (CU09, "nuevo evento"). */
export async function registrarNoProgramado({ loteId, tipo, nombre, ...datos }, usuarioId) {
  const lote = await obtenerLote(loteId, { activo: true });
  const { costo, advertencias } = prepararEjecucion(tipo, datos, lote.fechaIngreso);

  return prisma.$transaction(async (tx) => {
    const evento = await tx.eventoSanitario.create({
      data: {
        loteId,
        tipo,
        nombre,
        producto: datos.producto,
        fechaProgramada: datos.fechaRealizada,
        estado: 'REALIZADO',
        fechaRealizada: datos.fechaRealizada,
        dosis: datos.dosis,
        costo,
        duracionDias: datos.duracionDias,
        observaciones: datos.observaciones,
        usuarioId,
      },
      include: incluirLote,
    });
    const proximoEvento = await programarControlGarrapata(tx, evento);
    return { evento, proximoEvento, advertencias };
  });
}

/** Elimina un evento pendiente cargado por error. Los realizados no se eliminan. */
export async function eliminarPendiente(id) {
  const evento = await prisma.eventoSanitario.findUnique({ where: { id } });
  if (!evento) throw noEncontrado('Evento sanitario');
  if (evento.estado !== 'PENDIENTE') throw conflicto('Solo se pueden eliminar eventos pendientes');
  await prisma.eventoSanitario.delete({ where: { id } });
  return { eliminado: true };
}

/** Registra la baja (muerte) de animales del lote (CU10). */
export async function registrarBaja({ loteId, fecha, cantidad, causa, observaciones }, usuarioId) {
  if (fecha > hoy()) throw new AppError(400, 'La fecha no puede ser futura');

  return prisma.$transaction(async (tx) => {
    const lote = await obtenerLote(loteId, { activo: true, db: tx });
    if (fecha < lote.fechaIngreso) throw new AppError(400, 'La fecha es anterior al ingreso del lote');

    const { _sum } = await tx.baja.aggregate({ where: { loteId }, _sum: { cantidad: true } });
    const cabezas = cabezasActuales(lote.cantidadInicial, _sum.cantidad ?? 0);
    if (cantidad > cabezas) {
      throw new AppError(400, `La cantidad supera las cabezas actuales del lote (${cabezas})`);
    }

    const baja = await tx.baja.create({
      data: { loteId, fecha, cantidad, causa, observaciones, usuarioId },
      include: incluirLote,
    });
    return { baja, cabezasActuales: cabezas - cantidad };
  });
}

export async function listarBajas({ loteId } = {}) {
  return prisma.baja.findMany({
    where: { loteId },
    orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
    include: { ...incluirLote, usuario: { select: { nombre: true } } },
  });
}
