import { Router } from 'express';
import { autenticar, permitir } from '../../middlewares/auth.js';
import { validar } from '../../middlewares/validar.js';
import { idParam } from '../../utils/validaciones.js';
import { protocoloSchema, aplicarProtocoloSchema, loteParam } from './protocolos.schema.js';
import * as controlador from './protocolos.controller.js';

// El plan sanitario lo define el veterinario (o el administrador).
// Se monta en /api con middlewares por ruta, para no interceptar otras rutas de /api.
const acceso = [autenticar, permitir('VETERINARIO', 'ADMIN')];

export const protocolosRouter = Router();

protocolosRouter.get('/protocolos', ...acceso, controlador.listar);
protocolosRouter.post('/protocolos', ...acceso, validar({ body: protocoloSchema }), controlador.crear);
protocolosRouter.put('/protocolos/:id', ...acceso, validar({ params: idParam, body: protocoloSchema }), controlador.actualizar);
protocolosRouter.delete('/protocolos/:id', ...acceso, validar({ params: idParam }), controlador.eliminar);
protocolosRouter.post(
  '/lotes/:loteId/aplicar-protocolo',
  ...acceso,
  validar({ params: loteParam, body: aplicarProtocoloSchema }),
  controlador.aplicarALote,
);
