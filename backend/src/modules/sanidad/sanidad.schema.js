import { z } from 'zod';
import { fecha, noNegativo, entero, textoOpcional } from '../../utils/validaciones.js';

const tipo = z.enum(['VACUNA', 'ANTIPARASITARIO', 'GARRAPATA', 'OTRO'], { error: 'Tipo de evento inválido' });
const loteId = z.coerce.number().int().positive({ error: 'Seleccione un lote' });
const nombre = z.string().trim().min(2, { error: 'Ingrese el nombre del evento' }).max(100);

const datosEjecucion = {
  fechaRealizada: fecha,
  producto: textoOpcional(100),
  dosis: textoOpcional(60),
  // Si no se informa el costo se guarda en $ 0 con una advertencia (excepción del CU09).
  costo: noNegativo('El costo').optional(),
  duracionDias: entero('La duración del tratamiento').optional(),
  observaciones: textoOpcional(500),
};

export const programarEventoSchema = z.object({
  loteId,
  tipo,
  nombre,
  producto: textoOpcional(100),
  fechaProgramada: fecha,
  observaciones: textoOpcional(500),
});

export const realizarEventoSchema = z.object(datosEjecucion);

export const eventoNoProgramadoSchema = z.object({ loteId, tipo, nombre, ...datosEjecucion });

export const listarEventosQuery = z.object({
  loteId: z.coerce.number().int().positive().optional(),
  estado: z.enum(['PENDIENTE', 'REALIZADO']).optional(),
});

export const registrarBajaSchema = z.object({
  loteId,
  fecha,
  cantidad: entero('La cantidad de animales'),
  causa: z.enum(['ENFERMEDAD', 'ACCIDENTE', 'SEQUIA', 'OTRA'], { error: 'Seleccione la causa' }),
  observaciones: textoOpcional(500),
});

export const listarBajasQuery = z.object({
  loteId: z.coerce.number().int().positive().optional(),
});
