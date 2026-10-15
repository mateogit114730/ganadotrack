// RF08 / RNF04: autenticación y control de acceso por rol.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, auth, prisma, limpiarBase, prepararUsuarios, crearInsumos, crearLote, PASSWORD } from './helpers.js';

let tokens;

beforeAll(async () => {
  await limpiarBase();
  tokens = await prepararUsuarios();
  await crearInsumos();
});

afterAll(() => prisma.$disconnect());

describe('Autenticación (CU01)', () => {
  it('CP-01 inicia sesión con credenciales válidas y devuelve token y rol', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'admin@test.local', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.usuario).toMatchObject({ email: 'admin@test.local', rol: 'ADMIN' });
    expect(res.body.usuario.passwordHash).toBeUndefined();
  });

  it('CP-02 rechaza una contraseña incorrecta sin revelar qué dato falló', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'admin@test.local', password: 'otra' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Email o contraseña incorrectos');
  });

  it('CP-03 rechaza peticiones sin token o con token inválido', async () => {
    expect((await api().get('/api/lotes')).status).toBe(401);
    expect((await api().get('/api/lotes').set(auth('token-falso'))).status).toBe(401);
  });

  it('CP-04 guarda las contraseñas hasheadas con bcrypt', async () => {
    const usuario = await prisma.usuario.findUnique({ where: { email: 'admin@test.local' } });
    expect(usuario.passwordHash).not.toBe(PASSWORD);
    expect(usuario.passwordHash).toMatch(/^\$2[aby]\$/);
  });
});

describe('Control de acceso por rol (RF08)', () => {
  it('CP-05 el encargado solo accede a alimentación', async () => {
    expect((await api().get('/api/alimentacion/opciones').set(auth(tokens.encargado))).status).toBe(200);
    expect((await api().get('/api/lotes').set(auth(tokens.encargado))).status).toBe(403);
    expect((await api().get('/api/dashboard').set(auth(tokens.encargado))).status).toBe(403);
    expect((await api().get('/api/sanidad/eventos').set(auth(tokens.encargado))).status).toBe(403);
  });

  it('CP-06 el veterinario accede a sanidad pero no a alimentación ni costos', async () => {
    expect((await api().get('/api/sanidad/eventos').set(auth(tokens.veterinario))).status).toBe(200);
    expect((await api().post('/api/alimentacion').set(auth(tokens.veterinario)).send({})).status).toBe(403);
    expect((await api().get('/api/insumos').set(auth(tokens.veterinario))).status).toBe(403);
  });

  it('CP-07 el veterinario solo recibe alertas sanitarias', async () => {
    // El stock de suplemento queda bajo el mínimo → alerta de STOCK para el administrador.
    await prisma.insumo.updateMany({ where: { tipo: 'SUPLEMENTO' }, data: { stockKg: 10 } });
    const lote = await crearLote(tokens.admin);
    await prisma.eventoSanitario.create({
      data: { loteId: lote.id, tipo: 'VACUNA', nombre: 'Vacuna', fechaProgramada: new Date() },
    });

    const admin = await api().get('/api/alertas').set(auth(tokens.admin));
    const vet = await api().get('/api/alertas').set(auth(tokens.veterinario));
    expect(admin.body.map((a) => a.tipo)).toEqual(expect.arrayContaining(['STOCK', 'SANITARIA']));
    expect(vet.body.length).toBeGreaterThan(0);
    expect(vet.body.every((a) => a.tipo === 'SANITARIA')).toBe(true);
  });

  it('CP-08 un usuario desactivado pierde el acceso inmediatamente', async () => {
    const encargado = await prisma.usuario.findUnique({ where: { email: 'encargado@test.local' } });
    const res = await api().patch(`/api/usuarios/${encargado.id}`).set(auth(tokens.admin)).send({ activo: false });
    expect(res.status).toBe(200);
    expect((await api().get('/api/alimentacion/opciones').set(auth(tokens.encargado))).status).toBe(401);
  });

  it('CP-09 el administrador no puede desactivarse a sí mismo', async () => {
    const admin = await prisma.usuario.findUnique({ where: { email: 'admin@test.local' } });
    const res = await api().patch(`/api/usuarios/${admin.id}`).set(auth(tokens.admin)).send({ activo: false });
    expect(res.status).toBe(400);
  });
});
