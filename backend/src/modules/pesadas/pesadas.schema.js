import { z } from 'zod';
import { fecha, positivo } from '../../utils/validaciones.js';

export const registrarPesadaSchema = z.object({
  loteId: z.coerce.number().int().positive({ error: 'Seleccione un lote' }),
  fecha,
  pesoPromedio: positivo('El peso promedio'),
});

export const listarPesadasQuery = z.object({
  loteId: z.coerce.number().int().positive({ error: 'Indique el lote' }),
});
