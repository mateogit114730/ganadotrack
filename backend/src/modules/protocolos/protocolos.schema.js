import { z } from 'zod';
import { textoOpcional } from '../../utils/validaciones.js';

const item = z
  .object({
    tipo: z.enum(['VACUNA', 'ANTIPARASITARIO', 'GARRAPATA', 'OTRO'], { error: 'Tipo de evento inválido' }),
    nombre: z.string().trim().min(2, { error: 'Ingrese el nombre del evento' }).max(100),
    producto: textoOpcional(100),
    diaDesdeIngreso: z.coerce
      .number({ error: 'El día debe ser un número' })
      .int()
      .min(0, { error: 'El día no puede ser negativo' })
      .max(365, { error: 'Máximo 365 días desde el ingreso' }),
    repetirCadaDias: z.coerce.number().int().positive({ error: 'La frecuencia debe ser mayor a 0' }).nullable().optional(),
    aplicaciones: z.coerce.number().int().min(1).max(52, { error: 'Máximo 52 aplicaciones' }).default(1),
  })
  .refine((i) => i.aplicaciones === 1 || i.repetirCadaDias, {
    error: 'Indique cada cuántos días se repite',
    path: ['repetirCadaDias'],
  });

export const protocoloSchema = z.object({
  nombre: z.string().trim().min(3, { error: 'Ingrese el nombre del protocolo' }).max(100),
  descripcion: textoOpcional(500),
  porDefecto: z.boolean().default(false),
  items: z.array(item).min(1, { error: 'El protocolo debe tener al menos un evento' }).max(40),
});

export const aplicarProtocoloSchema = z.object({
  protocoloId: z.coerce.number().int().positive({ error: 'Seleccione un protocolo' }),
  omitirPasadas: z.boolean().default(true),
});

export const loteParam = z.object({ loteId: z.coerce.number().int().positive() });
