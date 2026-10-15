import { z } from 'zod';
import { fecha, positivo, noNegativo } from '../../utils/validaciones.js';

export const actualizarInsumoSchema = z
  .object({
    stockMinimoKg: noNegativo('El stock mínimo').optional(),
    // Para el silaje de producción propia el precio por kg se carga manualmente.
    precioKg: noNegativo('El precio por kg').optional(),
  })
  .refine((d) => d.stockMinimoKg !== undefined || d.precioKg !== undefined, {
    error: 'No hay datos para actualizar',
  });

export const compraSchema = z.object({
  fecha,
  cantidadKg: positivo('La cantidad'),
  precioTotal: positivo('El precio total'),
});

export const compraParams = z.object({
  id: z.coerce.number().int().positive(),
  compraId: z.coerce.number().int().positive(),
});
