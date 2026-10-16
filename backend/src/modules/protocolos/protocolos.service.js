import { prisma } from '../../config/prisma.js';
import { conflicto, noEncontrado } from '../../utils/errores.js';
import { aplicarProtocolo } from '../../services/protocolo.js';
import { obtenerLote } from '../lotes/lotes.service.js';

const conItems = { items: { orderBy: [{ diaDesdeIngreso: 'asc' }, { id: 'asc' }] } };

const datosItem = ({ tipo, nombre, producto, diaDesdeIngreso, repetirCadaDias, aplicaciones }) => ({
  tipo,
  nombre,
  producto: producto ?? null,
  diaDesdeIngreso,
  repetirCadaDias: aplicaciones > 1 ? repetirCadaDias : null,
  aplicaciones,
});

export function listar() {
  return prisma.protocoloSanitario.findMany({ include: conItems, orderBy: [{ porDefecto: 'desc' }, { nombre: 'asc' }] });
}

async function verificarNombre(tx, nombre, idActual) {
  const existe = await tx.protocoloSanitario.findUnique({ where: { nombre } });
  if (existe && existe.id !== idActual) throw conflicto('Ya existe un protocolo con ese nombre');
}

/** Crea un protocolo. Si se marca por defecto, desmarca el anterior. */
export function crear({ nombre, descripcion, porDefecto, items }) {
  return prisma.$transaction(async (tx) => {
    await verificarNombre(tx, nombre);
    if (porDefecto) await tx.protocoloSanitario.updateMany({ data: { porDefecto: false } });
    return tx.protocoloSanitario.create({
      data: { nombre, descripcion, porDefecto, items: { create: items.map(datosItem) } },
      include: conItems,
    });
  });
}

/** Reemplaza los datos y los ítems de un protocolo. No modifica eventos ya generados en lotes. */
export function actualizar(id, { nombre, descripcion, porDefecto, items }) {
  return prisma.$transaction(async (tx) => {
    const protocolo = await tx.protocoloSanitario.findUnique({ where: { id } });
    if (!protocolo) throw noEncontrado('Protocolo sanitario');
    await verificarNombre(tx, nombre, id);
    if (porDefecto) await tx.protocoloSanitario.updateMany({ where: { id: { not: id } }, data: { porDefecto: false } });
    await tx.protocoloItem.deleteMany({ where: { protocoloId: id } });
    return tx.protocoloSanitario.update({
      where: { id },
      data: { nombre, descripcion, porDefecto, items: { create: items.map(datosItem) } },
      include: conItems,
    });
  });
}

export async function eliminar(id) {
  const protocolo = await prisma.protocoloSanitario.findUnique({ where: { id } });
  if (!protocolo) throw noEncontrado('Protocolo sanitario');
  await prisma.protocoloSanitario.delete({ where: { id } });
  return { eliminado: true };
}

/** Genera los eventos del protocolo en un lote activo ya existente. */
export async function aplicarALote(loteId, { protocoloId, omitirPasadas }) {
  const lote = await obtenerLote(loteId, { activo: true });
  return prisma.$transaction((tx) => aplicarProtocolo(tx, lote, protocoloId, { omitirPasadas }));
}
