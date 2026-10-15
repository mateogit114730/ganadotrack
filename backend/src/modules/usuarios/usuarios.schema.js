import { z } from 'zod';

const rol = z.enum(['ADMIN', 'ENCARGADO', 'VETERINARIO'], { error: 'Rol inválido' });
const password = z
  .string()
  .min(8, { error: 'La contraseña debe tener al menos 8 caracteres' })
  .max(72, { error: 'La contraseña no puede superar los 72 caracteres' });

export const crearUsuarioSchema = z.object({
  nombre: z.string().trim().min(2, { error: 'Ingrese el nombre' }).max(100),
  email: z.email({ error: 'Email inválido' }).trim().toLowerCase(),
  rol,
  password,
});

export const actualizarUsuarioSchema = z
  .object({
    nombre: z.string().trim().min(2).max(100).optional(),
    rol: rol.optional(),
    activo: z.boolean().optional(),
    password: password.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { error: 'No hay datos para actualizar' });
