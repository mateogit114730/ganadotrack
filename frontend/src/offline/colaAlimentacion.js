// Cola de cargas de alimentación hechas sin conexión (RF14).
// Se guardan en el teléfono (IndexedDB) y se envían en orden cuando vuelve la señal.
// Cada carga lleva un operacionId: si un envío se repite, el servidor no duplica el registro.

import { get, set } from 'idb-keyval';
import { api, mensajeError } from '../api/cliente.js';

const CLAVE = 'ganadotrack.colaAlimentacion';
const oyentes = new Set();
let sincronizacionEnCurso = null;

/** Identificador único de la operación (con alternativa para contextos sin crypto.randomUUID). */
export function nuevoId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Sin respuesta del servidor (sin señal, servidor caído) = error de red. */
export const esErrorDeRed = (err) => !err?.response;

export async function leerCola() {
  return (await get(CLAVE)) ?? [];
}

async function guardarCola(cola) {
  await set(CLAVE, cola);
  oyentes.forEach((fn) => fn(cola));
}

/** Se suscribe a los cambios de la cola. Devuelve la función para desuscribirse. */
export function suscribir(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

/**
 * Agrega una carga a la cola.
 * @param operacion { operacionId, loteId, loteNombre, fecha (AAAA-MM-DD de captura), items }
 */
export async function encolar(operacion) {
  const cola = await leerCola();
  await guardarCola([...cola, { ...operacion, estado: 'pendiente', creada: new Date().toISOString() }]);
}

export async function descartar(operacionId) {
  const cola = await leerCola();
  await guardarCola(cola.filter((o) => o.operacionId !== operacionId));
}

async function enviarPendientes() {
  let cola = await leerCola();
  let enviadas = 0;
  for (const op of cola.filter((o) => o.estado === 'pendiente')) {
    try {
      await api.post('/alimentacion', { loteId: op.loteId, fecha: op.fecha, items: op.items, operacionId: op.operacionId });
      cola = cola.filter((o) => o.operacionId !== op.operacionId);
      enviadas++;
      await guardarCola(cola);
    } catch (err) {
      // Sin señal o sesión vencida: la carga queda pendiente y se reintenta más tarde.
      if (esErrorDeRed(err) || err.response.status === 401) break;
      // Error de negocio (stock insuficiente, lote cerrado…): queda marcada para revisarla.
      cola = cola.map((o) => (o.operacionId === op.operacionId ? { ...o, estado: 'error', error: mensajeError(err) } : o));
      await guardarCola(cola);
    }
  }
  return { enviadas, restantes: cola.length };
}

/** Envía las cargas pendientes. Si ya hay una sincronización en curso, devuelve esa misma. */
export function sincronizar() {
  if (!sincronizacionEnCurso) {
    sincronizacionEnCurso = enviarPendientes().finally(() => {
      sincronizacionEnCurso = null;
    });
  }
  return sincronizacionEnCurso;
}
