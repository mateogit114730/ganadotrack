// Parámetros del negocio (rendimiento al gancho, días de aviso). Módulo chico: rutas y lógica juntas.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { autenticar, permitir } from '../../middlewares/auth.js';
import { validar } from '../../middlewares/validar.js';
import { PARAMETROS } from '../../services/parametros.js';

const REGLAS = {
  rendimiento_gancho: z.coerce.number().gt(0).lte(1, { error: 'El rendimiento debe estar entre 0 y 1' }),
  dias_aviso_sanitario: z.coerce.number().int().min(1).max(60, { error: 'Entre 1 y 60 días' }),
  dias_cobertura_minima: z.coerce.number().int().min(1).max(90, { error: 'Entre 1 y 90 días' }),
  horizonte_compra_dias: z.coerce.number().int().min(1).max(120, { error: 'Entre 1 y 120 días' }),
};

const claveParam = z.object({ clave: z.enum(Object.keys(PARAMETROS), { error: 'Parámetro inexistente' }) });
const valorBody = z.object({ valor: z.union([z.string(), z.number()]) });

export const parametrosRouter = Router();

parametrosRouter.use(autenticar, permitir('ADMIN'));

parametrosRouter.get('/', async (req, res) => {
  const guardados = await prisma.parametro.findMany();
  const valores = Object.entries(PARAMETROS).map(([clave, defecto]) => {
    const fila = guardados.find((p) => p.clave === clave);
    return { clave, valor: Number(fila?.valor ?? defecto.valor), descripcion: defecto.descripcion };
  });
  res.json(valores);
});

parametrosRouter.put('/:clave', validar({ params: claveParam, body: valorBody }), async (req, res) => {
  const { clave } = req.datosParams;
  const valor = REGLAS[clave].parse(req.body.valor);
  const fila = await prisma.parametro.upsert({
    where: { clave },
    create: { clave, valor: String(valor), descripcion: PARAMETROS[clave].descripcion },
    update: { valor: String(valor) },
  });
  res.json({ ...fila, valor: Number(fila.valor) });
});
