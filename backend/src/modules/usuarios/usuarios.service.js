import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma.js';
import { AppError, conflicto, noEncontrado } from '../../utils/errores.js';
import { datosPublicos } from '../auth/auth.service.js';

// Costo del hash bcrypt (RNF04). 10 rondas ≈ 70 ms por hash.
const RONDAS_BCRYPT = 10;

export async function listar() {
  const usuarios = await prisma.usuario.findMany({ orderBy: [{ activo: 'desc' }, { nombre: 'asc' }] });
  return usuarios.map(datosPublicos);
}

export async function crear({ nombre, email, rol, password }) {
  const existe = await prisma.usuario.findUnique({ where: { email } });
  if (existe) throw conflicto('Ya existe un usuario con ese email');
  const passwordHash = await bcrypt.hash(password, RONDAS_BCRYPT);
  const usuario = await prisma.usuario.create({ data: { nombre, email, rol, passwordHash } });
  return datosPublicos(usuario);
}

export async function actualizar(id, datos, idSolicitante) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) throw noEncontrado('Usuario');

  // El administrador no puede quitarse a sí mismo el acceso.
  if (id === idSolicitante && (datos.activo === false || (datos.rol && datos.rol !== 'ADMIN'))) {
    throw new AppError(400, 'No puede desactivarse ni quitarse el rol de administrador a sí mismo');
  }

  const { password, ...resto } = datos;
  const data = { ...resto };
  if (password) data.passwordHash = await bcrypt.hash(password, RONDAS_BCRYPT);

  const actualizado = await prisma.usuario.update({ where: { id }, data });
  return datosPublicos(actualizado);
}
