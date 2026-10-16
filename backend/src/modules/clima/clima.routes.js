// Clima y riesgos (RF12). Módulo chico: rutas y validación juntas; la lógica está en services/clima.js.
import { Router } from 'express';
import { z } from 'zod';
import { autenticar, permitir } from '../../middlewares/auth.js';
import { validar } from '../../middlewares/validar.js';
import { AppError } from '../../utils/errores.js';
import { buscarLocalidades, guardarUbicacion, leerUbicacion, obtenerClima } from '../../services/clima.js';

const buscarQuery = z.object({ q: z.string().trim().min(3, { error: 'Escriba al menos 3 letras' }).max(60) });
const ubicacionSchema = z.object({
  nombre: z.string().trim().min(2).max(100),
  latitud: z.coerce.number().min(-90).max(90),
  longitud: z.coerce.number().min(-180).max(180),
});

export const climaRouter = Router();

climaRouter.use(autenticar);

// Todos los roles pueden ver el clima del campo.
climaRouter.get('/', async (req, res) => {
  res.json(await obtenerClima());
});

climaRouter.get('/ubicacion', permitir('ADMIN'), async (req, res) => {
  res.json(await leerUbicacion());
});

climaRouter.put('/ubicacion', permitir('ADMIN'), validar({ body: ubicacionSchema }), async (req, res) => {
  res.json(await guardarUbicacion(req.body));
});

climaRouter.get('/buscar', permitir('ADMIN'), validar({ query: buscarQuery }), async (req, res) => {
  try {
    res.json(await buscarLocalidades(req.datosQuery.q));
  } catch {
    throw new AppError(503, 'No se pudo consultar el servicio de localidades. Intente más tarde');
  }
});
