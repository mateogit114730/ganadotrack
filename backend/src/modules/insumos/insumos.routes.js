import { Router } from 'express';
import { autenticar, permitir } from '../../middlewares/auth.js';
import { validar } from '../../middlewares/validar.js';
import { idParam } from '../../utils/validaciones.js';
import { actualizarInsumoSchema, compraSchema, compraParams } from './insumos.schema.js';
import * as controlador from './insumos.controller.js';

export const insumosRouter = Router();

insumosRouter.use(autenticar, permitir('ADMIN'));

insumosRouter.get('/', controlador.listar);
insumosRouter.patch('/:id', validar({ params: idParam, body: actualizarInsumoSchema }), controlador.actualizar);
insumosRouter.get('/:id/compras', validar({ params: idParam }), controlador.listarCompras);
insumosRouter.post('/:id/compras', validar({ params: idParam, body: compraSchema }), controlador.registrarCompra);
insumosRouter.put('/:id/compras/:compraId', validar({ params: compraParams, body: compraSchema }), controlador.editarCompra);
