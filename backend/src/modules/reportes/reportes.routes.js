import { Router } from 'express';
import { z } from 'zod';
import { autenticar, permitir } from '../../middlewares/auth.js';
import { validar } from '../../middlewares/validar.js';
import { fecha, idParam } from '../../utils/validaciones.js';
import * as controlador from './reportes.controller.js';

const mesQuery = z.object({
  mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: 'Mes inválido, use el formato AAAA-MM' }).optional(),
});
const rangoQuery = z.object({ desde: fecha.optional(), hasta: fecha.optional() });

// Se monta en /api con middlewares por ruta (no con router.use), para que las rutas
// inexistentes de /api respondan 404 y no 401.
const admin = [autenticar, permitir('ADMIN')];

export const reportesRouter = Router();

reportesRouter.get('/dashboard', ...admin, controlador.dashboard);
reportesRouter.get('/costos/:id', ...admin, validar({ params: idParam }), controlador.costosLote);
// El veterinario recibe solo las alertas sanitarias (filtrado en el servicio).
reportesRouter.get('/alertas', autenticar, permitir('ADMIN', 'VETERINARIO'), controlador.alertas);

// Reportes descargables (RF13).
reportesRouter.get('/reportes/lotes/:id/informe.pdf', ...admin, validar({ params: idParam }), controlador.informeLote);
reportesRouter.get('/reportes/mensual.pdf', ...admin, validar({ query: mesQuery }), controlador.reporteMensual);
reportesRouter.get('/reportes/planilla.xlsx', ...admin, validar({ query: rangoQuery }), controlador.planillaExcel);
