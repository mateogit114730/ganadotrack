// Pruebas de la cola offline con IndexedDB simulada (fake-indexeddb) y la API simulada.
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clear } from 'idb-keyval';

const post = vi.fn();
vi.mock('../api/cliente.js', () => ({
  api: { post: (...args) => post(...args) },
  mensajeError: (err) => err.response?.data?.error ?? 'error',
}));

const { encolar, leerCola, sincronizar, nuevoId, suscribir } = await import('./colaAlimentacion.js');

const operacion = (loteId) => ({
  operacionId: nuevoId(),
  loteId,
  loteNombre: `Lote ${loteId}`,
  fecha: '2026-10-15',
  items: [{ insumoId: 1, kg: 100 }],
});
const errorDeRed = () => Object.assign(new Error('Network Error'), { response: undefined });
const errorDeNegocio = () => Object.assign(new Error('409'), { response: { status: 409, data: { error: 'Stock insuficiente' } } });

beforeEach(async () => {
  await clear();
  post.mockReset();
});

describe('cola de cargas sin conexión', () => {
  it('genera identificadores UUID v4', () => {
    expect(nuevoId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('guarda las cargas en el teléfono y avisa a los suscriptores', async () => {
    const oyente = vi.fn();
    const desuscribir = suscribir(oyente);
    await encolar(operacion(1));
    expect(await leerCola()).toHaveLength(1);
    expect(oyente).toHaveBeenCalledTimes(1);
    desuscribir();
  });

  it('envía las cargas en orden con su operacionId y fecha de captura, y vacía la cola', async () => {
    const a = operacion(1);
    const b = operacion(2);
    await encolar(a);
    await encolar(b);
    post.mockResolvedValue({ data: {} });

    const resultado = await sincronizar();
    expect(resultado).toEqual({ enviadas: 2, restantes: 0 });
    expect(post.mock.calls.map((c) => c[1].operacionId)).toEqual([a.operacionId, b.operacionId]);
    expect(post.mock.calls[0][1].fecha).toBe('2026-10-15');
  });

  it('si no hay señal, se detiene y conserva las cargas', async () => {
    await encolar(operacion(1));
    await encolar(operacion(2));
    post.mockRejectedValue(errorDeRed());

    expect(await sincronizar()).toEqual({ enviadas: 0, restantes: 2 });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('marca con error las cargas rechazadas por el servidor y sigue con las demás', async () => {
    await encolar(operacion(1));
    await encolar(operacion(2));
    post.mockRejectedValueOnce(errorDeNegocio()).mockResolvedValueOnce({ data: {} });

    expect(await sincronizar()).toEqual({ enviadas: 1, restantes: 1 });
    const [conError] = await leerCola();
    expect(conError).toMatchObject({ loteId: 1, estado: 'error', error: 'Stock insuficiente' });
  });

  it('no ejecuta dos sincronizaciones a la vez', async () => {
    await encolar(operacion(1));
    post.mockResolvedValue({ data: {} });
    const [r1, r2] = await Promise.all([sincronizar(), sincronizar()]);
    expect(r1).toBe(r2);
    expect(post).toHaveBeenCalledTimes(1);
  });
});
