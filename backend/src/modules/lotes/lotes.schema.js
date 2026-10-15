import { z } from 'zod';
import { fecha, positivo, entero, textoOpcional } from '../../utils/validaciones.js';

export const crearLoteSchema = z
  .object({
    nombre: z.string().trim().min(1, { error: 'Ingrese el nombre del lote' }).max(60),
    fechaIngreso: fecha,
    cantidadInicial: entero('La cantidad de animales'),
    pesoIngreso: positivo('El peso de ingreso'),
    pesoObjetivo: positivo('El peso objetivo'),
    gdpObjetivo: positivo('La GDP objetivo'),
    observaciones: textoOpcional(500),
  })
  .refine((d) => d.pesoObjetivo > d.pesoIngreso, {
    error: 'El peso objetivo debe ser mayor al peso de ingreso',
    path: ['pesoObjetivo'],
  });

export const actualizarLoteSchema = z
  .object({
    nombre: z.string().trim().min(1).max(60).optional(),
    pesoObjetivo: positivo('El peso objetivo').optional(),
    gdpObjetivo: positivo('La GDP objetivo').optional(),
    precioVentaKg: positivo('El precio de venta').nullable().optional(),
    observaciones: textoOpcional(500),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), { error: 'No hay datos para actualizar' });

export const cerrarLoteSchema = z.object({
  fechaCierre: fecha,
  pesoFinal: positivo('El peso final'),
  precioVentaKg: positivo('El precio de venta por kg'),
  // simular = true devuelve el resumen financiero sin cerrar el lote (paso 3 del CU13).
  simular: z.boolean().default(false),
});

export const listarLotesQuery = z.object({
  estado: z.enum(['ACTIVO', 'CERRADO']).optional(),
});
