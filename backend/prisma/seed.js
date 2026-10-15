// Datos de demostración de GanadoTrack.
// ATENCIÓN: borra todos los datos existentes antes de cargar la demo.
// Las fechas son relativas al día de ejecución, para que las alertas sigan vigentes en la presentación.
// Valores de referencia del relevamiento: raza Angus, ingreso ≈ 380 kg, objetivo 420 kg, 90–100 días.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { hoy, sumarDias, diasEntre } from '../src/utils/fechas.js';
import { calcularGdp, costoAlimentacion } from '../src/services/calculos.js';

const prisma = new PrismaClient();
const HOY = hoy();
const hace = (dias) => sumarDias(HOY, -dias);

const PASSWORD = process.env.SEED_PASSWORD;
if (!PASSWORD) throw new Error('Defina SEED_PASSWORD en el archivo .env');

async function limpiar() {
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

async function crearUsuarios() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const datos = [
    { nombre: 'Productor (Administrador)', email: 'admin@ganadotrack.local', rol: 'ADMIN' },
    { nombre: 'Encargado de campo', email: 'encargado@ganadotrack.local', rol: 'ENCARGADO' },
    { nombre: 'Veterinario de cabecera', email: 'veterinario@ganadotrack.local', rol: 'VETERINARIO' },
  ];
  const [admin, encargado, veterinario] = await Promise.all(
    datos.map((d) => prisma.usuario.create({ data: { ...d, passwordHash } })),
  );
  return { admin, encargado, veterinario };
}

async function crearInsumos(admin) {
  const suplemento = await prisma.insumo.create({
    data: {
      nombre: 'Suplemento proteico 18%',
      tipo: 'SUPLEMENTO',
      precioKg: 480,
      stockKg: 1500, // por debajo del mínimo: genera alerta de stock en la demo
      stockMinimoKg: 2000,
      materiaSecaPct: 90,
    },
  });
  const silaje = await prisma.insumo.create({
    data: {
      nombre: 'Silaje de sorgo (propio)',
      tipo: 'SILAJE',
      precioKg: 45,
      stockKg: 180000,
      stockMinimoKg: 40000,
      materiaSecaPct: 35,
    },
  });

  // Compras semanales de suplemento de las últimas semanas.
  await prisma.compraInsumo.createMany({
    data: [21, 14, 7].map((d) => ({
      insumoId: suplemento.id,
      fecha: hace(d),
      cantidadKg: 3000,
      precioTotal: 3000 * 480,
      usuarioId: admin.id,
    })),
  });
  await prisma.compraInsumo.create({
    data: { insumoId: silaje.id, fecha: hace(120), cantidadKg: 400000, precioTotal: 400000 * 45, usuarioId: admin.id },
  });
  return { suplemento, silaje };
}

/** Un registro diario por insumo desde el ingreso hasta el día anterior a "hasta". */
async function cargarAlimentacion(lote, { suplemento, silaje }, racion, hasta, usuarioId) {
  const dias = diasEntre(lote.fechaIngreso, hasta);
  const registros = [];
  for (let d = 0; d < dias; d++) {
    const fecha = sumarDias(lote.fechaIngreso, d);
    for (const [insumo, kg] of [
      [suplemento, racion.suplementoKg],
      [silaje, racion.silajeKg],
    ]) {
      const precioKg = Number(insumo.precioKg);
      registros.push({ loteId: lote.id, insumoId: insumo.id, fecha, kg, precioKg, costo: costoAlimentacion(kg, precioKg), usuarioId });
    }
  }
  await prisma.registroAlimentacion.createMany({ data: registros });
}

/** Ración vigente desde el ingreso del lote (kg por cabeza por día), definida por el veterinario. */
async function cargarRacion(lote, { suplemento, silaje }, usuarioId) {
  await prisma.racion.createMany({
    data: [
      { loteId: lote.id, insumoId: suplemento.id, kgCabezaDia: 1.5, vigenteDesde: lote.fechaIngreso, usuarioId },
      { loteId: lote.id, insumoId: silaje.id, kgCabezaDia: 15, vigenteDesde: lote.fechaIngreso, usuarioId },
    ],
  });
}

/** Pesadas con la GDP calculada igual que en la API. */
async function cargarPesadas(lote, pesadas, usuarioId) {
  let anterior = { fecha: lote.fechaIngreso, peso: Number(lote.pesoIngreso) };
  for (const { fecha, peso } of pesadas) {
    const gdp = calcularGdp(anterior.peso, peso, diasEntre(anterior.fecha, fecha));
    await prisma.pesada.create({ data: { loteId: lote.id, fecha, pesoPromedio: peso, gdp, usuarioId } });
    anterior = { fecha, peso };
  }
}

async function main() {
  await limpiar();
  const { admin, encargado, veterinario } = await crearUsuarios();
  const insumos = await crearInsumos(admin);

  await prisma.parametro.createMany({
    data: [
      { clave: 'rendimiento_gancho', valor: '0.57', descripcion: 'Rendimiento al gancho (kg carne / kg vivo)' },
      { clave: 'dias_aviso_sanitario', valor: '7', descripcion: 'Días de anticipación de las alertas sanitarias' },
    ],
  });

  // ---------- Protocolos sanitarios (a validar con el veterinario de cabecera) ----------
  await prisma.protocoloSanitario.create({
    data: {
      nombre: 'Protocolo feedlot estándar',
      descripcion: 'Plan base de ingreso al corral. A validar con el veterinario de cabecera.',
      porDefecto: true,
      items: {
        create: [
          { tipo: 'VACUNA', nombre: 'Vacuna clostridial (mancha y gangrena)', producto: 'Clostridial polivalente', diaDesdeIngreso: 0 },
          { tipo: 'ANTIPARASITARIO', nombre: 'Desparasitación interna', producto: 'Ivermectina 1%', diaDesdeIngreso: 0 },
          { tipo: 'VACUNA', nombre: 'Vacuna respiratoria (IBR-DVB)', producto: 'Vacuna respiratoria polivalente', diaDesdeIngreso: 0 },
          { tipo: 'VACUNA', nombre: 'Refuerzo clostridial', producto: 'Clostridial polivalente', diaDesdeIngreso: 21 },
          { tipo: 'GARRAPATA', nombre: 'Control de garrapata', producto: 'Fluazurón pour-on', diaDesdeIngreso: 21, repetirCadaDias: 21, aplicaciones: 4 },
        ],
      },
    },
  });
  await prisma.protocoloSanitario.create({
    data: {
      nombre: 'Protocolo mínimo',
      descripcion: 'Solo vacunación clostridial con refuerzo.',
      items: {
        create: [
          { tipo: 'VACUNA', nombre: 'Vacuna clostridial', producto: 'Clostridial polivalente', diaDesdeIngreso: 0 },
          { tipo: 'VACUNA', nombre: 'Refuerzo clostridial', producto: 'Clostridial polivalente', diaDesdeIngreso: 21 },
        ],
      },
    },
  });

  // ---------- Lote cerrado (historial) ----------
  const cerrado = await prisma.lote.create({
    data: {
      nombre: 'Lote 00 - Angus novillos (otoño)',
      fechaIngreso: hace(210),
      cantidadInicial: 90,
      pesoIngreso: 378,
      pesoObjetivo: 420,
      gdpObjetivo: 0.45,
    },
  });
  await cargarAlimentacion(cerrado, insumos, { suplementoKg: 135, silajeKg: 1350 }, hace(110), encargado.id);
  await cargarPesadas(cerrado, [
    { fecha: hace(180), peso: 392 },
    { fecha: hace(150), peso: 406 },
    { fecha: hace(120), peso: 418 },
  ], admin.id);
  await prisma.eventoSanitario.createMany({
    data: [
      { loteId: cerrado.id, tipo: 'VACUNA', nombre: 'Vacuna clostridial', producto: 'Clostridial polivalente', fechaProgramada: hace(208), estado: 'REALIZADO', fechaRealizada: hace(208), dosis: '5 ml/animal', costo: 135000, usuarioId: veterinario.id },
      { loteId: cerrado.id, tipo: 'ANTIPARASITARIO', nombre: 'Desparasitación interna', producto: 'Ivermectina 1%', fechaProgramada: hace(207), estado: 'REALIZADO', fechaRealizada: hace(207), dosis: '1 ml/50 kg', costo: 112000, usuarioId: veterinario.id },
    ],
  });
  await prisma.baja.create({
    data: { loteId: cerrado.id, fecha: hace(160), cantidad: 1, causa: 'ACCIDENTE', observaciones: 'Lesión en manga', usuarioId: veterinario.id },
  });
  // El cierre va al final: el trigger impide cargar registros en lotes cerrados.
  await prisma.lote.update({
    where: { id: cerrado.id },
    data: { estado: 'CERRADO', fechaCierre: hace(110), pesoFinal: 422, precioVentaKg: 9500 },
  });

  // ---------- Lote 01: GDP por debajo del objetivo, tratamiento de garrapata ----------
  const lote1 = await prisma.lote.create({
    data: {
      nombre: 'Lote 01 - Angus novillos',
      fechaIngreso: hace(59),
      cantidadInicial: 120,
      pesoIngreso: 380,
      pesoObjetivo: 420,
      gdpObjetivo: 0.45,
      precioVentaKg: 9800,
    },
  });
  await cargarRacion(lote1, insumos, veterinario.id);
  await cargarAlimentacion(lote1, insumos, { suplementoKg: 180, silajeKg: 1800 }, HOY, encargado.id);
  await cargarPesadas(lote1, [
    { fecha: hace(28), peso: 394 },
    { fecha: hace(2), peso: 405 }, // GDP 0,423 < 0,45 → alerta de bajo rendimiento
  ], admin.id);
  await prisma.eventoSanitario.createMany({
    data: [
      { loteId: lote1.id, tipo: 'VACUNA', nombre: 'Vacuna clostridial', producto: 'Clostridial polivalente', fechaProgramada: hace(58), estado: 'REALIZADO', fechaRealizada: hace(58), dosis: '5 ml/animal', costo: 180000, usuarioId: veterinario.id },
      { loteId: lote1.id, tipo: 'ANTIPARASITARIO', nombre: 'Desparasitación interna', producto: 'Ivermectina 1%', fechaProgramada: hace(57), estado: 'REALIZADO', fechaRealizada: hace(57), dosis: '1 ml/50 kg', costo: 150000, usuarioId: veterinario.id },
      { loteId: lote1.id, tipo: 'GARRAPATA', nombre: 'Baño garrapaticida', producto: 'Fluazurón pour-on', fechaProgramada: hace(18), estado: 'REALIZADO', fechaRealizada: hace(18), dosis: '1 ml/10 kg', costo: 420000, duracionDias: 21, usuarioId: veterinario.id },
      { loteId: lote1.id, tipo: 'GARRAPATA', nombre: 'Control de tratamiento de garrapata', producto: 'Fluazurón pour-on', fechaProgramada: sumarDias(hace(18), 21), observaciones: 'Generado automáticamente al finalizar el tratamiento' },
    ],
  });
  await prisma.baja.create({
    data: { loteId: lote1.id, fecha: hace(35), cantidad: 2, causa: 'ENFERMEDAD', observaciones: 'Sospecha de anaplasmosis', usuarioId: veterinario.id },
  });

  // ---------- Lote 02: cerca del peso objetivo, refuerzo vencido ----------
  const lote2 = await prisma.lote.create({
    data: {
      nombre: 'Lote 02 - Angus vaquillonas',
      fechaIngreso: hace(95),
      cantidadInicial: 80,
      pesoIngreso: 375,
      pesoObjetivo: 420,
      gdpObjetivo: 0.45,
    },
  });
  await cargarRacion(lote2, insumos, veterinario.id);
  await cargarAlimentacion(lote2, insumos, { suplementoKg: 120, silajeKg: 1200 }, HOY, encargado.id);
  await cargarPesadas(lote2, [
    { fecha: hace(64), peso: 390 },
    { fecha: hace(33), peso: 404 },
    { fecha: hace(3), peso: 418 },
  ], admin.id);
  await prisma.eventoSanitario.createMany({
    data: [
      { loteId: lote2.id, tipo: 'VACUNA', nombre: 'Vacuna antiaftosa (campaña SENASA)', producto: 'Antiaftosa bivalente', fechaProgramada: hace(90), estado: 'REALIZADO', fechaRealizada: hace(90), dosis: '2 ml/animal', costo: 96000, usuarioId: veterinario.id },
      { loteId: lote2.id, tipo: 'VACUNA', nombre: 'Refuerzo clostridial', producto: 'Clostridial polivalente', fechaProgramada: hace(3) }, // vencido
    ],
  });
  await prisma.baja.create({
    data: { loteId: lote2.id, fecha: hace(50), cantidad: 1, causa: 'ACCIDENTE', usuarioId: veterinario.id },
  });

  // ---------- Lote 03: recién ingresado, sin pesadas ----------
  const lote3 = await prisma.lote.create({
    data: {
      nombre: 'Lote 03 - Angus novillitos',
      fechaIngreso: hace(10),
      cantidadInicial: 100,
      pesoIngreso: 360,
      pesoObjetivo: 420,
      gdpObjetivo: 0.45,
    },
  });
  await cargarRacion(lote3, insumos, veterinario.id);
  await cargarAlimentacion(lote3, insumos, { suplementoKg: 150, silajeKg: 1500 }, HOY, encargado.id);
  await prisma.eventoSanitario.createMany({
    data: [
      { loteId: lote3.id, tipo: 'VACUNA', nombre: 'Vacuna clostridial', producto: 'Clostridial polivalente', fechaProgramada: sumarDias(HOY, 5) },
      { loteId: lote3.id, tipo: 'ANTIPARASITARIO', nombre: 'Desparasitación interna', producto: 'Ivermectina 1%', fechaProgramada: sumarDias(HOY, 17) },
    ],
  });

  console.log('Datos de demostración cargados.');
  console.log(`Usuarios: admin@, encargado@ y veterinario@ganadotrack.local (contraseña: la definida en SEED_PASSWORD)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
