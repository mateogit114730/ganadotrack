import { Router } from 'express';
import { autenticar, permitir } from '../../middlewares/auth.js';
import { validar } from '../../middlewares/validar.js';
import { loteParam, guardarRacionSchema } from './racion.schema.js';
import * as controlador from './racion.controller.js';

// La ración la define el veterinario (relevamiento, Bloque 3) o el administrador.
// Se monta en /api con middlewares por ruta, para no interceptar otras rutas de /api.
const acceso = [autenticar, permitir('VETERINARIO', 'ADMIN')];

export const racionRouter = Router();

racionRouter.get('/raciones', ...acceso, controlador.listarActivos);
racionRouter.get('/lotes/:loteId/racion', ...acceso, validar({ params: loteParam }), controlador.obtener);
racionRouter.put(
  '/lotes/:loteId/racion',
  ...acceso,
  validar({ params: loteParam, body: guardarRacionSchema }),
  controlador.guardar,
);
