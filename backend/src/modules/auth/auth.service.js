import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma.js';
import { firmarToken } from '../../middlewares/auth.js';
import { AppError } from '../../utils/errores.js';

// Costo del hash bcrypt (RNF04). 10 rondas ≈ 70 ms por hash.
export const RONDAS_BCRYPT = 10;

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

/** Cada usuario puede cambiar su propio nombre. */
export async function actualizarPerfil(id, { nombre }) {
  const usuario = await prisma.usuario.update({ where: { id }, data: { nombre } });
  return datosPublicos(usuario);
}

/** Cambio de contraseña propio: exige la contraseña actual. */
export async function cambiarPassword(id, { actual, nueva }) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!(await bcrypt.compare(actual, usuario.passwordHash))) {
    throw new AppError(400, 'La contraseña actual no es correcta');
  }
  await prisma.usuario.update({ where: { id }, data: { passwordHash: await bcrypt.hash(nueva, RONDAS_BCRYPT) } });
  return { actualizado: true };
}
