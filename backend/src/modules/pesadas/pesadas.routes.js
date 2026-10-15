import { Router } from 'express';
import { autenticar, permitir } from '../../middlewares/auth.js';
import { validar } from '../../middlewares/validar.js';
import { registrarPesadaSchema, listarPesadasQuery } from './pesadas.schema.js';
import * as controlador from './pesadas.controller.js';

export const pesadasRouter = Router();

pesadasRouter.use(autenticar, permitir('ADMIN'));

pesadasRouter.get('/', validar({ query: listarPesadasQuery }), controlador.listar);
pesadasRouter.post('/', validar({ body: registrarPesadaSchema }), controlador.registrar);
