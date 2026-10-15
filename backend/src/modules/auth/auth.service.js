import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma.js';
import { firmarToken } from '../../middlewares/auth.js';
import { AppError } from '../../utils/errores.js';

export const datosPublicos = ({ id, nombre, email, rol, activo }) => ({ id, nombre, email, rol, activo });

export async function login({ email, password }) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  const valido = usuario?.activo && (await bcrypt.compare(password, usuario.passwordHash));
  // Mismo mensaje para email o contraseña incorrectos: no se revela qué dato falló.
  if (!valido) throw new AppError(401, 'Email o contraseña incorrectos');
  return { token: firmarToken(usuario), usuario: datosPublicos(usuario) };
}

export async function usuarioActual(id) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  return datosPublicos(usuario);
}
