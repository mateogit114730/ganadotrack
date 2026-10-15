import { Router } from 'express';
import { autenticar, permitir } from '../../middlewares/auth.js';
import { validar } from '../../middlewares/validar.js';
import { idParam } from '../../utils/validaciones.js';
import * as controlador from './reportes.controller.js';

export const reportesRouter = Router();

reportesRouter.use(autenticar);

reportesRouter.get('/dashboard', permitir('ADMIN'), controlador.dashboard);
reportesRouter.get('/costos/:id', permitir('ADMIN'), validar({ params: idParam }), controlador.costosLote);
// El veterinario recibe solo las alertas sanitarias (filtrado en el servicio).
reportesRouter.get('/alertas', permitir('ADMIN', 'VETERINARIO'), controlador.alertas);
