// RF01 / RF04 / RF06: lotes, pesadas, GDP, proyección y costos (CU03, CU07, CU11).
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, auth, prisma, limpiarBase, prepararUsuarios, crearInsumos, crearLote, fechaRelativa } from './helpers.js';

let tokens, insumos, lote;

beforeEach(async () => {
  await limpiarBase();
  tokens = await prepararUsuarios();
  insumos = await crearInsumos();
  lote = await crearLote(tokens.admin); // 100 cabezas, ingreso hace 30 días con 380 kg, objetivo 420
});

afterAll(() => prisma.$disconnect());

const pesar = (fecha, pesoPromedio) =>
  api().post('/api/pesadas').set(auth(tokens.admin)).send({ loteId: lote.id, fecha, pesoPromedio });

describe('Registrar lote (CU03)', () => {
  it('CP-19 valida que el peso objetivo sea mayor al de ingreso', async () => {
    const res = await api().post('/api/lotes').set(auth(tokens.admin)).send({
      nombre: 'Inválido', fechaIngreso: fechaRelativa(0), cantidadInicial: 10,
      pesoIngreso: 400, pesoObjetivo: 380, gdpObjetivo: 0.5,
    });
    expect(res.status).toBe(400);
    expect(res.body.detalles[0].campo).toBe('pesoObjetivo');
  });

  it('CP-20 rechaza nombres de lote duplicados', async () => {
    const res = await api().post('/api/lotes').set(auth(tokens.admin)).send({
      nombre: lote.nombre, fechaIngreso: fechaRelativa(0), cantidadInicial: 10,
      pesoIngreso: 380, pesoObjetivo: 420, gdpObjetivo: 0.5,
    });
    expect(res.status).toBe(409);
  });

  it('CP-21 muestra los días transcurridos desde el ingreso', async () => {
    const res = await api().get(`/api/lotes/${lote.id}`).set(auth(tokens.admin));
    expect(res.body.indicadores.diasEnFeedlot).toBe(30);
    expect(res.body.indicadores.calculoPreliminar).toBe(true);
  });
});

describe('Registrar pesada mensual (CU07)', () => {
  it('CP-22 la primera pesada calcula la GDP desde el peso de ingreso y proyecta la fecha', async () => {
    const res = await pesar(fechaRelativa(0), 395); // +15 kg en 30 días
    expect(res.status).toBe(201);
    expect(Number(res.body.pesada.gdp)).toBe(0.5);
    expect(res.body.indicadores.diasRestantes).toBe(50); // faltan 25 kg a 0,5 kg/día
    expect(res.body.indicadores.fechaEstimadaObjetivo.slice(0, 10)).toBe(fechaRelativa(50));
  });

  it('CP-23 la segunda pesada calcula la GDP desde la pesada anterior', async () => {
    await pesar(fechaRelativa(-10), 390); // +10 kg en 20 días
    const res = await pesar(fechaRelativa(0), 396); // +6 kg en 10 días
    expect(Number(res.body.pesada.gdp)).toBe(0.6);
  });

  it('CP-24 genera aviso y alerta si la GDP es menor al objetivo', async () => {
    const res = await pesar(fechaRelativa(0), 386); // 0,2 kg/día < 0,45
    expect(res.body.indicadores.bajoRendimiento).toBe(true);
    expect(res.body.avisos[0]).toMatch(/por debajo del objetivo/);
    const alertas = await api().get('/api/alertas').set(auth(tokens.admin));
    expect(alertas.body.some((a) => a.tipo === 'GDP' && a.loteId === lote.id)).toBe(true);
  });

  it('CP-25 sugiere cerrar el lote si alcanzó el peso objetivo', async () => {
    const res = await pesar(fechaRelativa(0), 421);
    expect(res.body.indicadores.alcanzoObjetivo).toBe(true);
    expect(res.body.avisos.join(' ')).toMatch(/cierre/);
  });

  it('CP-26 rechaza una fecha anterior o igual a la última pesada', async () => {
    await pesar(fechaRelativa(-5), 390);
    const res = await pesar(fechaRelativa(-5), 392);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/posterior a la última pesada/);
  });
});

describe('Costos y rentabilidad (CU11)', () => {
  it('CP-27 calcula costos, kg de carne con 57 % de rendimiento y margen descontando bajas', async () => {
    // Alimentación: 100 kg suplemento × $400 = $40.000
    await api().post('/api/alimentacion').set(auth(tokens.encargado))
      .send({ loteId: lote.id, items: [{ insumoId: insumos.suplemento.id, kg: 100 }] });
    // Sanidad: evento de $10.000
    await api().post('/api/sanidad/eventos/realizados').set(auth(tokens.veterinario)).send({
      loteId: lote.id, tipo: 'VACUNA', nombre: 'Vacuna', fechaRealizada: fechaRelativa(0), costo: 10000,
    });
    // Baja de 10 animales → 90 cabezas
    await api().post('/api/sanidad/bajas').set(auth(tokens.veterinario))
      .send({ loteId: lote.id, fecha: fechaRelativa(0), cantidad: 10, causa: 'ENFERMEDAD' });
    await pesar(fechaRelativa(0), 400);
    await api().patch(`/api/lotes/${lote.id}`).set(auth(tokens.admin)).send({ precioVentaKg: 9000 });

    const res = await api().get(`/api/costos/${lote.id}`).set(auth(tokens.admin));
    const ind = res.body.lote.indicadores;
    expect(ind.costoAlimentacion).toBe(40000);
    expect(ind.costoSanitario).toBe(10000);
    expect(ind.costoTotal).toBe(50000);
    expect(ind.cabezasActuales).toBe(90);
    expect(ind.kgCarneEstimados).toBe(20520); // 400 × 90 × 0,57
    expect(ind.costoPorKgCarne).toBe(2.44); // 50.000 / 20.520
    expect(ind.margenBruto).toBe(184_630_000); // 20.520 × 9.000 − 50.000
    expect(res.body.alimentacionPorInsumo[0]).toMatchObject({ insumo: 'Suplemento', kg: 100, costo: 40000 });
  });
});
