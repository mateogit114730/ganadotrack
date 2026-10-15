import { prisma } from '../../config/prisma.js';
import { AppError, noEncontrado } from '../../utils/errores.js';
import { hoy } from '../../utils/fechas.js';
import { cabezasActuales, kgSugeridos } from '../../services/calculos.js';
import { obtenerLote } from '../lotes/lotes.service.js';

/** Cabezas actuales de varios lotes (cantidad inicial − bajas). Devuelve Map loteId → cabezas. */
export async function cabezasPorLote(lotes, db = prisma) {
  const bajas = await db.baja.groupBy({
    by: ['loteId'],
    where: { loteId: { in: lotes.map((l) => l.id) } },
    _sum: { cantidad: true },
  });
  const total = new Map(bajas.map((b) => [b.loteId, b._sum.cantidad ?? 0]));
  return new Map(lotes.map((l) => [l.id, cabezasActuales(l.cantidadInicial, total.get(l.id) ?? 0)]));
}

/**
 * Ración vigente de cada lote a una fecha: para cada insumo, la fila con mayor vigente_desde
 * que no supere la fecha. Los insumos con 0 kg/cabeza quedan fuera de la ración.
 * Devuelve Map loteId → [{ insumoId, insumo, kgCabezaDia, vigenteDesde }].
 */
export async function racionesVigentes(loteIds, fecha = hoy(), db = prisma) {
  const filas = await db.racion.findMany({
    where: { loteId: { in: loteIds }, vigenteDesde: { lte: fecha } },
    orderBy: [{ vigenteDesde: 'desc' }, { id: 'desc' }],
    include: { insumo: { select: { nombre: true, tipo: true } } },
  });
  const resultado = new Map(loteIds.map((id) => [id, []]));
  const vistos = new Set();
  for (const f of filas) {
    const clave = `${f.loteId}-${f.insumoId}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    if (Number(f.kgCabezaDia) > 0) {
      resultado.get(f.loteId).push({
        insumoId: f.insumoId,
        insumo: f.insumo,
        kgCabezaDia: Number(f.kgCabezaDia),
        vigenteDesde: f.vigenteDesde,
      });
    }
  }
  // Mismo orden que el formulario del encargado (CU04): suplemento y después silaje.
  const orden = ['SUPLEMENTO', 'SILAJE'];
  for (const racion of resultado.values()) racion.sort((a, b) => orden.indexOf(a.insumo.tipo) - orden.indexOf(b.insumo.tipo));
  return resultado;
}

/** Agrega a cada ítem de la ración los kg del día para las cabezas indicadas. */
export const conKgDelDia = (racion, cabezas) =>
  racion.map((r) => ({ ...r, kgDia: kgSugeridos(r.kgCabezaDia, cabezas) }));

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
