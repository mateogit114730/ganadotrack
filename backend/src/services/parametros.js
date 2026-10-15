import { prisma } from '../config/prisma.js';

// Valores por defecto si el parámetro todavía no fue cargado en la tabla "parametro".
export const PARAMETROS = {
  rendimiento_gancho: { valor: '0.57', descripcion: 'Rendimiento al gancho (kg carne / kg vivo)' },
  dias_aviso_sanitario: { valor: '7', descripcion: 'Días de anticipación de las alertas sanitarias' },
};

async function leerNumero(clave, db = prisma) {
  const fila = await db.parametro.findUnique({ where: { clave } });
  return Number(fila?.valor ?? PARAMETROS[clave].valor);
}

export const rendimientoGancho = (db) => leerNumero('rendimiento_gancho', db);
export const diasAvisoSanitario = (db) => leerNumero('dias_aviso_sanitario', db);
