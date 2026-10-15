import { prisma } from '../../config/prisma.js';
import { AppError, noEncontrado } from '../../utils/errores.js';
import { hoy } from '../../utils/fechas.js';
import { redondear } from '../../services/calculos.js';

const conEstado = (insumo) => ({
  ...insumo,
  bajoMinimo: Number(insumo.stockKg) < Number(insumo.stockMinimoKg),
});

export async function listar() {
  const insumos = await prisma.insumo.findMany({ orderBy: { nombre: 'asc' } });
  return insumos.map(conEstado);
}

export async function actualizar(id, datos) {
  const insumo = await prisma.insumo.findUnique({ where: { id } });
  if (!insumo) throw noEncontrado('Insumo');
  return conEstado(await prisma.insumo.update({ where: { id }, data: datos }));
}

/**
 * Registra una compra (o carga de silaje propio) — CU06.
 * En una misma transacción: guarda la compra, suma la cantidad al stock (CU05)
 * y actualiza el precio por kg con el de la última compra.
 */
export async function registrarCompra(insumoId, { fecha, cantidadKg, precioTotal }, usuarioId) {
  if (fecha > hoy()) throw new AppError(400, 'La fecha de compra no puede ser futura');

  return prisma.$transaction(async (tx) => {
    const insumo = await tx.insumo.findUnique({ where: { id: insumoId } });
    if (!insumo) throw noEncontrado('Insumo');

    const compra = await tx.compraInsumo.create({
      data: { insumoId, fecha, cantidadKg, precioTotal, usuarioId },
    });
    const actualizado = await tx.insumo.update({
      where: { id: insumoId },
      data: {
        stockKg: { increment: cantidadKg },
        precioKg: redondear(precioTotal / cantidadKg, 2),
      },
    });
    return { compra, insumo: conEstado(actualizado) };
  });
}

export async function listarCompras(insumoId) {
  const insumo = await prisma.insumo.findUnique({ where: { id: insumoId } });
  if (!insumo) throw noEncontrado('Insumo');
  return prisma.compraInsumo.findMany({
    where: { insumoId },
    orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
    include: { usuario: { select: { nombre: true } } },
  });
}
