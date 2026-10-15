import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { manejarErrores, rutaNoEncontrada } from './middlewares/manejarErrores.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usuariosRouter } from './modules/usuarios/usuarios.routes.js';
import { lotesRouter } from './modules/lotes/lotes.routes.js';
import { insumosRouter } from './modules/insumos/insumos.routes.js';
import { alimentacionRouter } from './modules/alimentacion/alimentacion.routes.js';
import { pesadasRouter } from './modules/pesadas/pesadas.routes.js';
import { sanidadRouter } from './modules/sanidad/sanidad.routes.js';
import { reportesRouter } from './modules/reportes/reportes.routes.js';
import { parametrosRouter } from './modules/parametros/parametros.routes.js';
import { racionRouter } from './modules/racion/racion.routes.js';
import { protocolosRouter } from './modules/protocolos/protocolos.routes.js';
import { climaRouter } from './modules/clima/clima.routes.js';

export function crearApp() {
  const app = express();
  // En producción la API corre detrás del proxy de la plataforma: la IP real llega en X-Forwarded-For.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, exposedHeaders: ['X-Token-Renovado', 'Content-Disposition'] }));
  app.use(express.json({ limit: '100kb' }));
  if (env.nodeEnv !== 'test') app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  // Estado de la API y de la conexión a la base (lo usa la plataforma de despliegue).
  app.get('/api/health', async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ estado: 'ok', baseDeDatos: 'ok' });
    } catch {
      res.status(503).json({ estado: 'error', baseDeDatos: 'sin conexión' });
    }
  });

  // Documentación interactiva de la API (Swagger UI).
  const openapi = parse(readFileSync(new URL('./docs/openapi.yaml', import.meta.url), 'utf8'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));

  app.use('/api/auth', authRouter);
  app.use('/api/usuarios', usuariosRouter);
  // Antes de /api/lotes: lotesRouter exige rol ADMIN para todo lo que pasa por él.
  app.use('/api', racionRouter);
  app.use('/api', protocolosRouter);
  app.use('/api/lotes', lotesRouter);
  app.use('/api/insumos', insumosRouter);
  app.use('/api/alimentacion', alimentacionRouter);
  app.use('/api/pesadas', pesadasRouter);
  app.use('/api/sanidad', sanidadRouter);
  app.use('/api/parametros', parametrosRouter);
  app.use('/api/clima', climaRouter);
  app.use('/api', reportesRouter);

  app.use(rutaNoEncontrada);
  app.use(manejarErrores);
  return app;
}
