import { z } from 'zod';
import { fecha, noNegativo } from '../../utils/validaciones.js';

export const loteParam = z.object({ loteId: z.coerce.number().int().positive() });

export const guardarRacionSchema = z
  .object({
    // Si no se envía, la ración rige desde hoy.
    vigenteDesde: fecha.optional(),
    items: z
      .array(
        z.object({
          insumoId: z.coerce.number().int().positive(),
          kgCabezaDia: noNegativo('Los kg por cabeza por día').max(80, { error: 'Valor fuera de rango (máximo 80 kg por cabeza)' }),
        }),
      )
      .min(1, { error: 'Indique al menos un insumo' }),
  })
  .refine((d) => new Set(d.items.map((i) => i.insumoId)).size === d.items.length, {
    error: 'Hay insumos repetidos',
    path: ['items'],
  });
