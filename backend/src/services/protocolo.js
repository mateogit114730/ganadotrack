// Generación del calendario sanitario de un lote a partir de un protocolo (RF10).

import { prisma } from '../config/prisma.js';
import { sumarDias, hoy } from '../utils/fechas.js';
import { noEncontrado } from '../utils/errores.js';

/**
 * Calcula los eventos que genera un protocolo para un lote (función pura).
 * Cada ítem se aplica el día "diaDesdeIngreso" y, si se repite, cada "repetirCadaDias"
 * hasta completar "aplicaciones". Con omitirPasadas se descartan las fechas anteriores a "desde"
 * (útil al cargar un lote que ingresó hace tiempo).
 * @returns [{ tipo, nombre, producto, fechaProgramada }]
 */
export function planificarEventos(items, fechaIngreso, { desde = hoy(), omitirPasadas = true } = {}) {
  const eventos = [];
  for (const item of items) {
    for (let n = 0; n < item.aplicaciones; n++) {
      const fecha = sumarDias(fechaIngreso, item.diaDesdeIngreso + n * (item.repetirCadaDias ?? 0));
      if (omitirPasadas && fecha < desde) continue;
      eventos.push({
        tipo: item.tipo,
        nombre: item.aplicaciones > 1 ? `${item.nombre} (${n + 1}/${item.aplicaciones})` : item.nombre,
        producto: item.producto ?? null,
        fechaProgramada: fecha,
      });
    }
  }
  return eventos.sort((a, b) => a.fechaProgramada - b.fechaProgramada);
}

/**
 * Crea en la base los eventos PENDIENTE del protocolo para el lote.
 * Recibe el cliente de la transacción para ejecutarse junto con el alta del lote.
 */
export async function aplicarProtocolo(db, lote, protocoloId, opciones) {
  const protocolo = await db.protocoloSanitario.findUnique({ where: { id: protocoloId }, include: { items: true } });
  if (!protocolo) throw noEncontrado('Protocolo sanitario');
  const eventos = planificarEventos(protocolo.items, lote.fechaIngreso, opciones);
  if (eventos.length) {
    await db.eventoSanitario.createMany({
      data: eventos.map((e) => ({ ...e, loteId: lote.id, observaciones: `Protocolo: ${protocolo.nombre}` })),
    });
  }
  return { protocolo: protocolo.nombre, eventosCreados: eventos.length };
}

export const protocoloPorDefecto = (db = prisma) => db.protocoloSanitario.findFirst({ where: { porDefecto: true } });
