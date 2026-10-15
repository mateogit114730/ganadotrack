// Esquemas Zod reutilizados por varios módulos.
import { z } from 'zod';
import { aFecha } from './fechas.js';

/** Fecha 'AAAA-MM-DD' → Date (00:00 UTC). */
export const fecha = z.iso
  .date({ error: 'Fecha inválida, use el formato AAAA-MM-DD' })
  .transform((texto) => aFecha(texto));

/** Número mayor a 0. Acepta texto numérico ('12.5') porque los formularios envían texto. */
export const positivo = (campo) =>
  z.coerce
    .number({ error: `${campo} debe ser un número` })
    .positive({ error: `${campo} debe ser mayor a 0` });

export const noNegativo = (campo) =>
  z.coerce
    .number({ error: `${campo} debe ser un número` })
    .min(0, { error: `${campo} no puede ser negativo` });

export const entero = (campo) =>
  z.coerce
    .number({ error: `${campo} debe ser un número` })
    .int({ error: `${campo} debe ser un número entero` })
    .positive({ error: `${campo} debe ser mayor a 0` });

export const idParam = z.object({ id: z.coerce.number().int().positive() });

export const textoOpcional = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    // undefined = el campo no se envió (no se modifica); '' o null = se borra.
    .transform((v) => (v === undefined ? undefined : v || null));
