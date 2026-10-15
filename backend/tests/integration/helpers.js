// Utilidades compartidas por los tests de integración (API + base de datos de prueba).
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { crearApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { hoy, sumarDias, formatoISO } from '../../src/utils/fechas.js';

export const app = crearApp();
export const api = () => request(app);
export { prisma };

export const PASSWORD = 'Prueba1234!';
export const fechaRelativa = (dias) => formatoISO(sumarDias(hoy(), dias));

export async function limpiarBase() {
  await prisma.racion.deleteMany();
  await prisma.protocoloSanitario.deleteMany();
  await prisma.registroAlimentacion.deleteMany();
  await prisma.compraInsumo.deleteMany();
  await prisma.pesada.deleteMany();
  await prisma.eventoSanitario.deleteMany();
  await prisma.baja.deleteMany();
  await prisma.lote.deleteMany();
  await prisma.insumo.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.parametro.deleteMany();
}

/** Crea un usuario por rol e inicia sesión con cada uno. Devuelve los tokens. */
export async function prepararUsuarios() {
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  const roles = { admin: 'ADMIN', encargado: 'ENCARGADO', veterinario: 'VETERINARIO' };
  const tokens = {};
  for (const [clave, rol] of Object.entries(roles)) {
    const email = `${clave}@test.local`;
    await prisma.usuario.create({ data: { nombre: clave, email, rol, passwordHash } });
    const res = await api().post('/api/auth/login').send({ email, password: PASSWORD });
    tokens[clave] = res.body.token;
  }
  return tokens;
}

export const auth = (token) => ({ Authorization: `Bearer ${token}` });

export async function crearInsumos() {
  const suplemento = await prisma.insumo.create({
    data: { nombre: 'Suplemento', tipo: 'SUPLEMENTO', stockKg: 1000, stockMinimoKg: 500, precioKg: 400 },
  });
  const silaje = await prisma.insumo.create({
    data: { nombre: 'Silaje', tipo: 'SILAJE', stockKg: 20000, stockMinimoKg: 1000, precioKg: 40 },
  });
  return { suplemento, silaje };
}

/** Crea un lote por la API (ingresado hace 30 días por defecto). */
export async function crearLote(tokenAdmin, datos = {}) {
  const res = await api()
    .post('/api/lotes')
    .set(auth(tokenAdmin))
    .send({
      nombre: `Lote ${Math.random().toString(36).slice(2, 8)}`,
      fechaIngreso: fechaRelativa(-30),
      cantidadInicial: 100,
      pesoIngreso: 380,
      pesoObjetivo: 420,
      gdpObjetivo: 0.45,
      ...datos,
    });
  if (res.status !== 201) throw new Error(`No se pudo crear el lote: ${JSON.stringify(res.body)}`);
  return res.body;
}
