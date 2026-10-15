import { ZodError } from 'zod';
import { Prisma } from '../config/prisma.js';
import { AppError } from '../utils/errores.js';

// Todas las respuestas de error tienen la forma { error: string, detalles?: [...] }.

export function rutaNoEncontrada(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars -- Express identifica el manejador de errores por sus 4 parámetros
export function manejarErrores(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, detalles: err.detalles });
  }

  if (err instanceof ZodError) {
    const detalles = err.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message }));
    return res.status(400).json({ error: 'Datos inválidos', detalles });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Ya existe un registro con esos datos' });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Registro no encontrado' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'El registro está relacionado con datos inexistentes o en uso' });
  }

  // Restricciones CHECK y trigger de lote cerrado definidos en la base de datos.
  const mensaje = String(err?.message ?? '');
  if (mensaje.includes('está cerrado y no admite')) {
    return res.status(409).json({ error: 'El lote está cerrado y no admite nuevos registros' });
  }
  if (mensaje.includes('violates check constraint')) {
    return res.status(400).json({ error: 'Los datos no cumplen las reglas de integridad del sistema' });
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }

  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor' });
}
