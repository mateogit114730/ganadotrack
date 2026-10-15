// RF05 / RF01 / RF07: sanidad, bajas y cierre de lote (CU08, CU09, CU10, CU13, CU14).
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, auth, prisma, limpiarBase, prepararUsuarios, crearInsumos, crearLote, fechaRelativa } from './helpers.js';

let tokens, insumos, lote;

beforeEach(async () => {
  await limpiarBase();
  tokens = await prepararUsuarios();
  insumos = await crearInsumos();
  lote = await crearLote(tokens.admin);
});

afterAll(() => prisma.$disconnect());

const programar = (dias, datos = {}) =>
  api().post('/api/sanidad/eventos').set(auth(tokens.veterinario)).send({
    loteId: lote.id, tipo: 'VACUNA', nombre: 'Vacuna clostridial', fechaProgramada: fechaRelativa(dias), ...datos,
  });

describe('Calendario sanitario y alertas (CU08, CU14)', () => {
  it('CP-28 genera alerta para eventos a 7 días o menos y no para los posteriores', async () => {
    await programar(7);
    await programar(8, { nombre: 'Desparasitación' });
    const res = await api().get('/api/alertas').set(auth(tokens.veterinario));
    const sanitarias = res.body.filter((a) => a.tipo === 'SANITARIA');
    expect(sanitarias).toHaveLength(1);
    expect(sanitarias[0].mensaje).toMatch(/Vacuna clostridial/);
  });

  it('CP-29 rechaza programar un evento con fecha pasada', async () => {
    expect((await programar(-1)).status).toBe(400);
  });
});

describe('Registrar evento sanitario realizado (CU09)', () => {
  it('CP-30 marca el evento como realizado y suma el costo sanitario', async () => {
    const { body: evento } = await programar(3);
    const res = await api().post(`/api/sanidad/eventos/${evento.id}/realizar`).set(auth(tokens.veterinario))
      .send({ fechaRealizada: fechaRelativa(0), dosis: '5 ml', costo: 25000 });
    expect(res.status).toBe(200);
    expect(res.body.evento.estado).toBe('REALIZADO');
    const detalle = await api().get(`/api/lotes/${lote.id}`).set(auth(tokens.admin));
    expect(detalle.body.indicadores.costoSanitario).toBe(25000);
  });

  it('CP-31 tratamiento de garrapata: exige duración y programa el control automáticamente', async () => {
    const { body: evento } = await programar(0, { tipo: 'GARRAPATA', nombre: 'Baño garrapaticida' });
    const sinDuracion = await api().post(`/api/sanidad/eventos/${evento.id}/realizar`)
      .set(auth(tokens.veterinario)).send({ fechaRealizada: fechaRelativa(0), costo: 1000 });
    expect(sinDuracion.status).toBe(400);

    const res = await api().post(`/api/sanidad/eventos/${evento.id}/realizar`).set(auth(tokens.veterinario))
      .send({ fechaRealizada: fechaRelativa(0), costo: 1000, duracionDias: 21 });
    expect(res.status).toBe(200);
    expect(res.body.proximoEvento.estado).toBe('PENDIENTE');
    expect(res.body.proximoEvento.fechaProgramada.slice(0, 10)).toBe(fechaRelativa(21));
  });

  it('CP-32 sin costo informado guarda $0 con advertencia', async () => {
    const { body: evento } = await programar(1);
    const res = await api().post(`/api/sanidad/eventos/${evento.id}/realizar`).set(auth(tokens.veterinario))
      .send({ fechaRealizada: fechaRelativa(0) });
    expect(res.status).toBe(200);
    expect(res.body.evento.costo).toBe(0);
    expect(res.body.advertencias).toHaveLength(1);
  });

  it('CP-33 no permite registrar dos veces el mismo evento', async () => {
    const { body: evento } = await programar(1);
    const url = `/api/sanidad/eventos/${evento.id}/realizar`;
    await api().post(url).set(auth(tokens.veterinario)).send({ fechaRealizada: fechaRelativa(0), costo: 1 });
    const res = await api().post(url).set(auth(tokens.veterinario)).send({ fechaRealizada: fechaRelativa(0), costo: 1 });
    expect(res.status).toBe(409);
  });
});

describe('Registrar baja (CU10)', () => {
  it('CP-34 descuenta las cabezas y no permite bajas mayores a las cabezas actuales', async () => {
    const ok = await api().post('/api/sanidad/bajas').set(auth(tokens.veterinario))
      .send({ loteId: lote.id, fecha: fechaRelativa(0), cantidad: 95, causa: 'SEQUIA' });
    expect(ok.status).toBe(201);
    expect(ok.body.cabezasActuales).toBe(5);

    const excede = await api().post('/api/sanidad/bajas').set(auth(tokens.veterinario))
      .send({ loteId: lote.id, fecha: fechaRelativa(0), cantidad: 6, causa: 'SEQUIA' });
    expect(excede.status).toBe(400);
  });
});

describe('Cerrar lote (CU13)', () => {
  const datosCierre = () => ({ fechaCierre: fechaRelativa(0), pesoFinal: 421, precioVentaKg: 9500 });

  it('CP-35 la simulación muestra el resumen final sin cerrar el lote', async () => {
    const res = await api().post(`/api/lotes/${lote.id}/cierre`).set(auth(tokens.admin))
      .send({ ...datosCierre(), simular: true });
    expect(res.status).toBe(200);
    expect(res.body.simulacion).toBe(true);
    expect(res.body.lote.indicadores.kgCarneEstimados).toBe(23997); // 421 × 100 × 0,57
    const enBase = await prisma.lote.findUnique({ where: { id: lote.id } });
    expect(enBase.estado).toBe('ACTIVO');
  });

  it('CP-36 cierra el lote, advierte eventos pendientes y bloquea nuevos registros', async () => {
    await programar(5);
    const res = await api().post(`/api/lotes/${lote.id}/cierre`).set(auth(tokens.admin)).send(datosCierre());
    expect(res.status).toBe(200);
    expect(res.body.lote.estado).toBe('CERRADO');
    expect(res.body.advertencias).toHaveLength(1);

    const alimentacion = await api().post('/api/alimentacion').set(auth(tokens.encargado))
      .send({ loteId: lote.id, items: [{ insumoId: insumos.silaje.id, kg: 100 }] });
    expect(alimentacion.status).toBe(409);

    // Los eventos de lotes cerrados no generan alertas.
    const alertas = await api().get('/api/alertas').set(auth(tokens.admin));
    expect(alertas.body.some((a) => a.loteId === lote.id)).toBe(false);
  });

  it('CP-37 el trigger de la base impide insertar registros en un lote cerrado', async () => {
    await api().post(`/api/lotes/${lote.id}/cierre`).set(auth(tokens.admin)).send(datosCierre());
    const admin = await prisma.usuario.findUnique({ where: { email: 'admin@test.local' } });
    await expect(
      prisma.pesada.create({
        data: { loteId: lote.id, fecha: new Date(), pesoPromedio: 400, gdp: 0.5, usuarioId: admin.id },
      }),
    ).rejects.toThrow(/está cerrado/);
  });
});
