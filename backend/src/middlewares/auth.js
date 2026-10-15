import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errores.js';

// Cada cuánto se renueva el token mientras el usuario está activo.
const RENOVAR_DESPUES_DE_SEG = 15 * 60;

export function firmarToken(usuario) {
  return jwt.sign({ rol: usuario.rol, nombre: usuario.nombre }, env.jwtSecret, {
    subject: String(usuario.id),
    expiresIn: env.jwtExpiresIn,
  });
}

/**
 * Verifica el token JWT del encabezado Authorization: Bearer <token>.
 * Expiración por inactividad (RNF04): el token dura 8 h y, mientras el usuario
 * sigue usando el sistema, se le envía uno nuevo en el encabezado X-Token-Renovado.
 * Si pasa 8 h sin hacer ninguna petición, el token vence y debe iniciar sesión de nuevo.
 */
export async function autenticar(req, res, next) {
  const encabezado = req.headers.authorization ?? '';
  const [esquema, token] = encabezado.split(' ');
  if (esquema !== 'Bearer' || !token) throw new AppError(401, 'Debe iniciar sesión');

  let datos;
  try {
    datos = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError(401, 'La sesión expiró o no es válida. Inicie sesión nuevamente');
  }

  // Se consulta el usuario para que un usuario desactivado pierda el acceso de inmediato.
  const usuario = await prisma.usuario.findUnique({ where: { id: Number(datos.sub) } });
  if (!usuario?.activo) throw new AppError(401, 'Usuario inexistente o desactivado');

  req.usuario = { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol };

  if (Date.now() / 1000 - datos.iat > RENOVAR_DESPUES_DE_SEG) {
    res.setHeader('X-Token-Renovado', firmarToken(usuario));
  }
  next();
}

/** Control de acceso por rol (RBAC, RF08). Uso: permitir('ADMIN', 'VETERINARIO'). */
export function permitir(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario?.rol)) {
      throw new AppError(403, 'No tiene permisos para realizar esta acción');
    }
    next();
  };
}
