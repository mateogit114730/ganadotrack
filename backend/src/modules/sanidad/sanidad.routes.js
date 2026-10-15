import { Router } from 'express';
import { autenticar, permitir } from '../../middlewares/auth.js';
import { validar } from '../../middlewares/validar.js';
import { idParam } from '../../utils/validaciones.js';
import {
  programarEventoSchema,
  realizarEventoSchema,
  eventoNoProgramadoSchema,
  listarEventosQuery,
  registrarBajaSchema,
  listarBajasQuery,
} from './sanidad.schema.js';
import * as controlador from './sanidad.controller.js';

export const sanidadRouter = Router();

sanidadRouter.use(autenticar, permitir('VETERINARIO', 'ADMIN'));

sanidadRouter.get('/lotes', controlador.lotesActivos);

sanidadRouter.get('/eventos', validar({ query: listarEventosQuery }), controlador.listarEventos);
sanidadRouter.post('/eventos', validar({ body: programarEventoSchema }), controlador.programar);
sanidadRouter.post('/eventos/realizados', validar({ body: eventoNoProgramadoSchema }), controlador.registrarNoProgramado);
sanidadRouter.post(
  '/eventos/:id/realizar',
  validar({ params: idParam, body: realizarEventoSchema }),
  controlador.realizar,
);
sanidadRouter.delete('/eventos/:id', validar({ params: idParam }), controlador.eliminarPendiente);

sanidadRouter.get('/bajas', validar({ query: listarBajasQuery }), controlador.listarBajas);
sanidadRouter.post('/bajas', validar({ body: registrarBajaSchema }), controlador.registrarBaja);
