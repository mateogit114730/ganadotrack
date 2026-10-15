// RF02 / RF03: registro de alimentación diaria y control de stock (CU04, CU05, CU06).
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, auth, prisma, limpiarBase, prepararUsuarios, crearInsumos, crearLote, fechaRelativa } from './helpers.js';

let tokens, insumos, lote;

beforeEach(async () => {
  await limpiarBase();
  tokens = await prepararUsuarios();
  insumos = await crearInsumos(); // suplemento: 1000 kg a $400 (mín 500) · silaje: 20000 kg a $40
  lote = await crearLote(tokens.admin);
});

afterAll(() => prisma.$disconnect());

const registrar = (items, extra = {}) =>
  api()
    .post('/api/alimentacion')
    .set(auth(tokens.encargado))
    .send({ loteId: lote.id, items, ...extra });

const stock = async (id) => Number((await prisma.insumo.findUnique({ where: { id } })).stockKg);

describe('Registrar alimentación diaria (CU04)', () => {
  it('CP-10 guarda los registros, calcula el costo del día y descuenta el stock', async () => {
    const res = await registrar([
      { insumoId: insumos.suplemento.id, kg: 150 },
      { insumoId: insumos.silaje.id, kg: 1500 },
    ]);
    expect(res.status).toBe(201);
    // 150 × 400 + 1500 × 40 = 60.000 + 60.000
    expect(res.body.costoDia).toBe(120000);
    expect(res.body.registros).toHaveLength(2);
    expect(await stock(insumos.suplemento.id)).toBe(850);
    expect(await stock(insumos.silaje.id)).toBe(18500);
  });

  it('CP-11 permite registrar un solo insumo', async () => {
    const res = await registrar([
      { insumoId: insumos.suplemento.id, kg: 0 },
      { insumoId: insumos.silaje.id, kg: 1000 },
    ]);
    expect(res.status).toBe(201);
    expect(res.body.registros).toHaveLength(1);
  });

  it('CP-12 rechaza el registro si no se ingresa ningún valor', async () => {
    const res = await registrar([
      { insumoId: insumos.suplemento.id, kg: 0 },
      { insumoId: insumos.silaje.id, kg: 0 },
    ]);
    expect(res.status).toBe(400);
    expect(await prisma.registroAlimentacion.count()).toBe(0);
  });

  it('CP-13 rechaza un segundo registro del mismo insumo en el mismo día', async () => {
    await registrar([{ insumoId: insumos.silaje.id, kg: 1000 }]);
    const res = await registrar([{ insumoId: insumos.silaje.id, kg: 1000 }]);
    expect(res.status).toBe(409);
    expect(await stock(insumos.silaje.id)).toBe(19000);
  });

  it('CP-14 con stock insuficiente no guarda nada (transacción completa)', async () => {
    const res = await registrar([
      { insumoId: insumos.silaje.id, kg: 1000 },
      { insumoId: insumos.suplemento.id, kg: 5000 }, // hay 1000 kg
    ]);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Stock insuficiente/);
    // El silaje, que se procesó primero, no debe haberse descontado.
    expect(await stock(insumos.silaje.id)).toBe(20000);
    expect(await prisma.registroAlimentacion.count()).toBe(0);
  });

  it('CP-15 avisa cuando un insumo queda por debajo del stock mínimo', async () => {
    const res = await registrar([{ insumoId: insumos.suplemento.id, kg: 600 }]);
    expect(res.status).toBe(201);
    expect(res.body.alertasStock).toHaveLength(1);
    const alertas = await api().get('/api/alertas').set(auth(tokens.admin));
    expect(alertas.body.some((a) => a.tipo === 'STOCK')).toBe(true);
  });

  it('CP-16 rechaza fechas futuras o anteriores al ingreso del lote', async () => {
    const futura = await registrar([{ insumoId: insumos.silaje.id, kg: 10 }], { fecha: fechaRelativa(1) });
    const anterior = await registrar([{ insumoId: insumos.silaje.id, kg: 10 }], { fecha: fechaRelativa(-60) });
    expect(futura.status).toBe(400);
    expect(anterior.status).toBe(400);
  });
});

describe('Compras de insumos (CU06)', () => {
  it('CP-17 suma la compra al stock y actualiza el precio por kg', async () => {
    const res = await api()
      .post(`/api/insumos/${insumos.suplemento.id}/compras`)
      .set(auth(tokens.admin))
      .send({ fecha: fechaRelativa(0), cantidadKg: 2000, precioTotal: 1_000_000 });
    expect(res.status).toBe(201);
    expect(res.body.insumo.stockKg).toBe(3000);
    expect(res.body.insumo.precioKg).toBe(500);
  });

  it('CP-18 el administrador puede eliminar un registro erróneo y el stock se restituye', async () => {
    const res = await registrar([{ insumoId: insumos.suplemento.id, kg: 100 }]);
    const id = res.body.registros[0].id;
    const borrado = await api().delete(`/api/alimentacion/${id}`).set(auth(tokens.admin));
    expect(borrado.status).toBe(200);
    expect(await stock(insumos.suplemento.id)).toBe(1000);
  });
});
