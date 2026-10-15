import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { env } from './config/env.js';
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

export function crearApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, exposedHeaders: ['X-Token-Renovado'] }));
  app.use(express.json({ limit: '100kb' }));
  if (env.nodeEnv !== 'test') app.use(morgan('dev'));

  app.get('/api/health', (req, res) => res.json({ estado: 'ok', version: process.env.npm_package_version }));

  // Documentación interactiva de la API (Swagger UI).
  const openapi = parse(readFileSync(new URL('./docs/openapi.yaml', import.meta.url), 'utf8'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));

  app.use('/api/auth', authRouter);
  app.use('/api/usuarios', usuariosRouter);
  app.use('/api/lotes', lotesRouter);
  app.use('/api/insumos', insumosRouter);
  app.use('/api/alimentacion', alimentacionRouter);
  app.use('/api/pesadas', pesadasRouter);
  app.use('/api/sanidad', sanidadRouter);
  app.use('/api/parametros', parametrosRouter);
  app.use('/api', reportesRouter);

  app.use(rutaNoEncontrada);
  app.use(manejarErrores);
  return app;
}
