import { Router } from 'express';
import { autenticar, permitir } from '../../middlewares/auth.js';
import { validar } from '../../middlewares/validar.js';
import { idParam } from '../../utils/validaciones.js';
import {
  crearLoteSchema,
  actualizarLoteSchema,
  cerrarLoteSchema,
  listarLotesQuery,
} from './lotes.schema.js';
import * as controlador from './lotes.controller.js';

export const lotesRouter = Router();

lotesRouter.use(autenticar, permitir('ADMIN'));

lotesRouter.get('/', validar({ query: listarLotesQuery }), controlador.listar);
lotesRouter.post('/', validar({ body: crearLoteSchema }), controlador.crear);
lotesRouter.get('/:id', validar({ params: idParam }), controlador.detalle);
lotesRouter.patch('/:id', validar({ params: idParam, body: actualizarLoteSchema }), controlador.actualizar);
lotesRouter.post('/:id/cierre', validar({ params: idParam, body: cerrarLoteSchema }), controlador.cerrar);
