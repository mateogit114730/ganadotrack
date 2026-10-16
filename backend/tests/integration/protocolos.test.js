// RF10: protocolos sanitarios y generación automática del calendario (issue #21).
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, auth, prisma, limpiarBase, prepararUsuarios, crearLote, fechaRelativa } from './helpers.js';

let tokens;

const PROTOCOLO = {
  nombre: 'Feedlot estándar',
  porDefecto: true,
  items: [
    { tipo: 'VACUNA', nombre: 'Clostridial', producto: 'Polivalente', diaDesdeIngreso: 0 },
    { tipo: 'VACUNA', nombre: 'Refuerzo clostridial', diaDesdeIngreso: 21 },
    { tipo: 'GARRAPATA', nombre: 'Control de garrapata', diaDesdeIngreso: 21, repetirCadaDias: 21, aplicaciones: 3 },
  ],
};

beforeEach(async () => {
  await limpiarBase();
  tokens = await prepararUsuarios();
});

afterAll(() => prisma.$disconnect());

const crearProtocolo = (datos = PROTOCOLO, token = tokens.veterinario) =>
  api().post('/api/protocolos').set(auth(token)).send(datos);

const eventosDe = (loteId) =>
  prisma.eventoSanitario.findMany({ where: { loteId }, orderBy: { fechaProgramada: 'asc' } });

describe('Protocolos sanitarios', () => {
  it('CP-57 el veterinario crea un protocolo; el encargado no tiene acceso', async () => {
    const res = await crearProtocolo();
    expect(res.status).toBe(201);
    expect(res.body.items).toHaveLength(3);
    expect((await crearProtocolo({ ...PROTOCOLO, nombre: 'Otro' }, tokens.encargado)).status).toBe(403);
  });

  it('CP-58 solo un protocolo queda marcado por defecto', async () => {
    await crearProtocolo();
    await crearProtocolo({ ...PROTOCOLO, nombre: 'Mínimo', items: [PROTOCOLO.items[0]] });
    const { body } = await api().get('/api/protocolos').set(auth(tokens.admin));
    expect(body.filter((p) => p.porDefecto).map((p) => p.nombre)).toEqual(['Mínimo']);
  });

  it('CP-59 valida que un evento repetido indique la frecuencia', async () => {
    const res = await crearProtocolo({ ...PROTOCOLO, items: [{ tipo: 'OTRO', nombre: 'X', diaDesdeIngreso: 0, aplicaciones: 3 }] });
    expect(res.status).toBe(400);
  });
});

describe('Alta de lote con protocolo', () => {
  it('CP-60 al crear el lote se genera su calendario sanitario completo', async () => {
    const { body: protocolo } = await crearProtocolo();
    const lote = await crearLote(tokens.admin, { fechaIngreso: fechaRelativa(0), protocoloId: protocolo.id });
    expect(lote.protocolo.eventosCreados).toBe(5);

    const eventos = await eventosDe(lote.id);
    expect(eventos.map((e) => e.fechaProgramada.toISOString().slice(0, 10))).toEqual([
      fechaRelativa(0), fechaRelativa(21), fechaRelativa(21), fechaRelativa(42), fechaRelativa(63),
    ]);
    expect(eventos.every((e) => e.estado === 'PENDIENTE')).toBe(true);
  });

  it('CP-61 en un lote cargado con atraso se omiten los eventos ya pasados', async () => {
    const { body: protocolo } = await crearProtocolo();
    const lote = await crearLote(tokens.admin, { fechaIngreso: fechaRelativa(-30), protocoloId: protocolo.id });
    // Quedan solo las aplicaciones de garrapata de los días 42 y 63 desde el ingreso.
    expect(lote.protocolo.eventosCreados).toBe(2);
  });

  it('CP-62 si el protocolo no existe, no se crea el lote (transacción)', async () => {
    const res = await api().post('/api/lotes').set(auth(tokens.admin)).send({
      nombre: 'Lote X', fechaIngreso: fechaRelativa(0), cantidadInicial: 10,
      pesoIngreso: 380, pesoObjetivo: 420, gdpObjetivo: 0.45, protocoloId: 99999,
    });
    expect(res.status).toBe(404);
    expect(await prisma.lote.count()).toBe(0);
  });

  it('CP-63 se puede aplicar un protocolo a un lote existente', async () => {
    const { body: protocolo } = await crearProtocolo();
    const lote = await crearLote(tokens.admin, { fechaIngreso: fechaRelativa(0) });
    const res = await api().post(`/api/lotes/${lote.id}/aplicar-protocolo`).set(auth(tokens.veterinario))
      .send({ protocoloId: protocolo.id });
    expect(res.status).toBe(201);
    expect(res.body.eventosCreados).toBe(5);
    // Los eventos de hoy aparecen en las alertas sanitarias.
    const alertas = await api().get('/api/alertas').set(auth(tokens.veterinario));
    expect(alertas.body.some((a) => a.mensaje.includes('Clostridial'))).toBe(true);
  });
});
