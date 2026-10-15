import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { autenticar } from '../../middlewares/auth.js';
import { validar } from '../../middlewares/validar.js';
import { loginSchema, perfilSchema, cambiarPasswordSchema } from './auth.schema.js';
import * as controlador from './auth.controller.js';

// Limita los intentos de login por IP para dificultar ataques de fuerza bruta.
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Demasiados intentos de inicio de sesión. Intente nuevamente en 15 minutos' },
});

export const authRouter = Router();

authRouter.post('/login', limiteLogin, validar({ body: loginSchema }), controlador.login);
authRouter.get('/me', autenticar, controlador.me);
authRouter.patch('/perfil', autenticar, validar({ body: perfilSchema }), controlador.actualizarPerfil);
authRouter.patch('/password', autenticar, limiteLogin, validar({ body: cambiarPasswordSchema }), controlador.cambiarPassword);
