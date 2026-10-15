// Perfil propio y corrección de datos cargados por error (issue #19).
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  api, auth, prisma, limpiarBase, prepararUsuarios, crearInsumos, crearLote, fechaRelativa, PASSWORD,
} from './helpers.js';

let tokens, insumos, lote;

beforeEach(async () => {
  await limpiarBase();
  tokens = await prepararUsuarios();
  insumos = await crearInsumos();
  lote = await crearLote(tokens.admin);
});

afterAll(() => prisma.$disconnect());

describe('Perfil propio', () => {
  it('CP-45 cada usuario puede cambiar su nombre', async () => {
    const res = await api().patch('/api/auth/perfil').set(auth(tokens.encargado)).send({ nombre: 'Juan Encargado' });
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Juan Encargado');
  });

  it('CP-46 cambio de contraseña: exige la actual y la nueva sirve para ingresar', async () => {
    const mal = await api().patch('/api/auth/password').set(auth(tokens.veterinario)).send({ actual: 'otra', nueva: 'NuevaClave123' });
    expect(mal.status).toBe(400);

    const ok = await api().patch('/api/auth/password').set(auth(tokens.veterinario)).send({ actual: PASSWORD, nueva: 'NuevaClave123' });
    expect(ok.status).toBe(200);
    const login = await api().post('/api/auth/login').send({ email: 'veterinario@test.local', password: 'NuevaClave123' });
    expect(login.status).toBe(200);
  });
});

describe('Corrección de datos', () => {
  it('CP-47 solo se puede eliminar la última pesada del lote', async () => {
    const pesar = (dias, peso) =>
      api().post('/api/pesadas').set(auth(tokens.admin)).send({ loteId: lote.id, fecha: fechaRelativa(dias), pesoPromedio: peso });
    const primera = await pesar(-10, 390);
    const segunda = await pesar(0, 396);

    expect((await api().delete(`/api/pesadas/${primera.body.pesada.id}`).set(auth(tokens.admin))).status).toBe(409);
    expect((await api().delete(`/api/pesadas/${segunda.body.pesada.id}`).set(auth(tokens.admin))).status).toBe(200);
    expect(await prisma.pesada.count()).toBe(1);
  });

  it('CP-48 eliminar una baja devuelve las cabezas (solo administrador)', async () => {
    const { body } = await api().post('/api/sanidad/bajas').set(auth(tokens.veterinario))
      .send({ loteId: lote.id, fecha: fechaRelativa(0), cantidad: 3, causa: 'ACCIDENTE' });
    const url = `/api/sanidad/bajas/${body.baja.id}`;

    expect((await api().delete(url).set(auth(tokens.veterinario))).status).toBe(403);
    expect((await api().delete(url).set(auth(tokens.admin))).status).toBe(200);
    const detalle = await api().get(`/api/lotes/${lote.id}`).set(auth(tokens.admin));
    expect(detalle.body.indicadores.cabezasActuales).toBe(100);
  });

  it('CP-49 un evento pendiente se puede reprogramar; uno realizado no', async () => {
    const { body: evento } = await api().post('/api/sanidad/eventos').set(auth(tokens.veterinario))
      .send({ loteId: lote.id, tipo: 'VACUNA', nombre: 'Vacuna', fechaProgramada: fechaRelativa(3) });
    const url = `/api/sanidad/eventos/${evento.id}`;

    const editado = await api().patch(url).set(auth(tokens.veterinario)).send({ fechaProgramada: fechaRelativa(10) });
    expect(editado.status).toBe(200);
    expect(editado.body.fechaProgramada.slice(0, 10)).toBe(fechaRelativa(10));

    await api().post(`${url}/realizar`).set(auth(tokens.veterinario)).send({ fechaRealizada: fechaRelativa(0), costo: 10 });
    expect((await api().patch(url).set(auth(tokens.veterinario)).send({ nombre: 'Otro' })).status).toBe(409);
  });

  it('CP-50 editar una compra ajusta el stock y el precio, sin dejar stock negativo', async () => {
    const urlCompras = `/api/insumos/${insumos.suplemento.id}/compras`;
    const { body } = await api().post(urlCompras).set(auth(tokens.admin))
      .send({ fecha: fechaRelativa(0), cantidadKg: 2000, precioTotal: 1_000_000 }); // stock 1.000 → 3.000
    const urlCompra = `${urlCompras}/${body.compra.id}`;

    const mas = await api().put(urlCompra).set(auth(tokens.admin))
      .send({ fecha: fechaRelativa(0), cantidadKg: 2500, precioTotal: 1_000_000 });
    expect(mas.status).toBe(200);
    expect(mas.body.insumo.stockKg).toBe(3500);
    expect(mas.body.insumo.precioKg).toBe(400);

    // Se consumen 3.000 kg: ya no se puede bajar la compra a 100 kg.
    await prisma.insumo.update({ where: { id: insumos.suplemento.id }, data: { stockKg: 500 } });
    const menos = await api().put(urlCompra).set(auth(tokens.admin))
      .send({ fecha: fechaRelativa(0), cantidadKg: 100, precioTotal: 50_000 });
    expect(menos.status).toBe(409);
  });

  it('CP-51 el healthcheck informa el estado de la base', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ estado: 'ok', baseDeDatos: 'ok' });
  });
});
