import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email({ error: 'Email inválido' }).trim().toLowerCase(),
  password: z.string().min(1, { error: 'Ingrese la contraseña' }),
});
