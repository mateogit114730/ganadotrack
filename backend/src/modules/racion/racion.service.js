import { prisma } from '../../config/prisma.js';
import { AppError, noEncontrado } from '../../utils/errores.js';
import { hoy } from '../../utils/fechas.js';
import { cabezasPorLote, racionesVigentes, conKgDelDia } from '../../services/raciones.js';
import { obtenerLote } from '../lotes/lotes.service.js';

export async function obtener(loteId) {
  const lote = await obtenerLote(loteId);
  const [cabezas, vigentes, historial] = await Promise.all([
    cabezasPorLote([lote]),
    racionesVigentes([loteId]),
    prisma.racion.findMany({
      where: { loteId },
      orderBy: [{ vigenteDesde: 'desc' }, { id: 'desc' }],
      include: { insumo: { select: { nombre: true } }, usuario: { select: { nombre: true } } },
    }),
  ]);
  const cab = cabezas.get(loteId);
  return {
    lote: { id: lote.id, nombre: lote.nombre, estado: lote.estado, cabezasActuales: cab },
    vigente: conKgDelDia(vigentes.get(loteId), cab),
    historial,
  };
}

/** Insumos disponibles y lotes activos con su ración vigente (pantalla "Raciones"). */
export async function listarActivos() {
  const lotes = await prisma.lote.findMany({
    where: { estado: 'ACTIVO' },
    select: { id: true, nombre: true, cantidadInicial: true },
    orderBy: { nombre: 'asc' },
  });
  const ids = lotes.map((l) => l.id);
  const [cabezas, vigentes, insumos] = await Promise.all([
    cabezasPorLote(lotes),
    racionesVigentes(ids),
    prisma.insumo.findMany({ select: { id: true, nombre: true, tipo: true }, orderBy: { tipo: 'asc' } }),
  ]);
  return {
    insumos,
    lotes: lotes.map(({ cantidadInicial: _cantidad, ...l }) => ({
      ...l,
      cabezasActuales: cabezas.get(l.id),
      racion: conKgDelDia(vigentes.get(l.id), cabezas.get(l.id)),
    })),
  };
}

/**
 * Define la ración de un lote a partir de una fecha (por defecto hoy).
 * Un insumo con 0 kg/cabeza se quita de la ración desde esa fecha.
 */
export async function guardar(loteId, { vigenteDesde = hoy(), items }, usuarioId) {
  const lote = await obtenerLote(loteId, { activo: true });
  if (vigenteDesde < lote.fechaIngreso) {
    throw new AppError(400, 'La ración no puede regir antes del ingreso del lote');
  }
  const insumos = await prisma.insumo.findMany({ where: { id: { in: items.map((i) => i.insumoId) } } });
  if (insumos.length !== items.length) throw noEncontrado('Insumo');

  await prisma.$transaction(
    items.map(({ insumoId, kgCabezaDia }) =>
      prisma.racion.upsert({
        where: { loteId_insumoId_vigenteDesde: { loteId, insumoId, vigenteDesde } },
        create: { loteId, insumoId, vigenteDesde, kgCabezaDia, usuarioId },
        update: { kgCabezaDia, usuarioId },
      }),
    ),
  );
  return obtener(loteId);
}
