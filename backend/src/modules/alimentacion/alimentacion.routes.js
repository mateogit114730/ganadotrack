import { Router } from 'express';
import { autenticar, permitir } from '../../middlewares/auth.js';
import { validar } from '../../middlewares/validar.js';
import { idParam } from '../../utils/validaciones.js';
import { registrarAlimentacionSchema, listarAlimentacionQuery } from './alimentacion.schema.js';
import * as controlador from './alimentacion.controller.js';

export const alimentacionRouter = Router();

alimentacionRouter.use(autenticar);

alimentacionRouter.get('/opciones', permitir('ENCARGADO', 'ADMIN'), controlador.opciones);
alimentacionRouter.post(
  '/',
  permitir('ENCARGADO', 'ADMIN'),
  validar({ body: registrarAlimentacionSchema }),
  controlador.registrar,
);
alimentacionRouter.get('/', permitir('ADMIN'), validar({ query: listarAlimentacionQuery }), controlador.listar);
alimentacionRouter.delete('/:id', permitir('ADMIN'), validar({ params: idParam }), controlador.eliminar);
