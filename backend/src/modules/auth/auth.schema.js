import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email({ error: 'Email inválido' }).trim().toLowerCase(),
  password: z.string().min(1, { error: 'Ingrese la contraseña' }),
});

export const perfilSchema = z.object({
  nombre: z.string().trim().min(2, { error: 'Ingrese el nombre' }).max(100),
});

export const cambiarPasswordSchema = z
  .object({
    actual: z.string().min(1, { error: 'Ingrese la contraseña actual' }),
    nueva: z
      .string()
      .min(8, { error: 'La nueva contraseña debe tener al menos 8 caracteres' })
      .max(72, { error: 'La contraseña no puede superar los 72 caracteres' }),
  })
  .refine((d) => d.actual !== d.nueva, { error: 'La nueva contraseña debe ser distinta de la actual', path: ['nueva'] });
