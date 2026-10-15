import { Router } from 'express';
import { autenticar, permitir } from '../../middlewares/auth.js';
import { validar } from '../../middlewares/validar.js';
import { idParam } from '../../utils/validaciones.js';
import { crearUsuarioSchema, actualizarUsuarioSchema } from './usuarios.schema.js';
import * as controlador from './usuarios.controller.js';

export const usuariosRouter = Router();

usuariosRouter.use(autenticar, permitir('ADMIN'));

usuariosRouter.get('/', controlador.listar);
usuariosRouter.post('/', validar({ body: crearUsuarioSchema }), controlador.crear);
usuariosRouter.patch('/:id', validar({ params: idParam, body: actualizarUsuarioSchema }), controlador.actualizar);
