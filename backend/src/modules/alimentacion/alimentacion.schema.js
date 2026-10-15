import { z } from 'zod';
import { fecha, noNegativo } from '../../utils/validaciones.js';

export const registrarAlimentacionSchema = z
  .object({
    loteId: z.coerce.number().int().positive({ error: 'Seleccione un lote' }),
    // Si no se envía, se usa la fecha de hoy.
    fecha: fecha.optional(),
    items: z
      .array(
        z.object({
          insumoId: z.coerce.number().int().positive(),
          kg: noNegativo('Los kg entregados'),
        }),
      )
      .min(1, { error: 'Ingrese al menos un insumo' }),
  })
  .refine((d) => d.items.some((i) => i.kg > 0), {
    error: 'Ingrese los kg de al menos un insumo',
    path: ['items'],
  })
  .refine((d) => new Set(d.items.map((i) => i.insumoId)).size === d.items.length, {
    error: 'Hay insumos repetidos',
    path: ['items'],
  });

export const listarAlimentacionQuery = z.object({
  loteId: z.coerce.number().int().positive().optional(),
  desde: fecha.optional(),
  hasta: fecha.optional(),
});
