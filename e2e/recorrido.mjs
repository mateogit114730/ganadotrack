// Recorrido end-to-end de GanadoTrack con Edge: login por rol, navegación, acciones y capturas.
// Requisitos: backend y frontend corriendo y la base recién cargada con "npm run db:seed".
// ATENCIÓN: modifica los datos (carga alimentación, cierra un lote, etc.). Volver a ejecutar el seed después.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const SALIDA = process.argv[2];
// Contraseña de los usuarios del seed (SEED_PASSWORD del backend).
const PASSWORD = process.env.SEED_PASSWORD;
if (!PASSWORD) throw new Error('Defina SEED_PASSWORD (la misma del backend/.env)');
mkdirSync(SALIDA, { recursive: true });

const errores = [];
const browser = await chromium.launch({ channel: 'msedge', headless: true });

async function nuevaPagina(viewport) {
  const ctx = await browser.newContext({ viewport, locale: 'es-AR' });
  const page = await ctx.newPage();
  // El 401 del intento de login con contraseña incorrecta es esperado: no se cuenta como error.
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (page.url().endsWith('/login') && m.text().includes('401')) return;
    errores.push(`[console] ${page.url()} ${m.text()}`);
  });
  page.on('pageerror', (e) => errores.push(`[pageerror] ${page.url()} ${e.message}`));
  page.on('response', (r) => r.status() >= 500 && errores.push(`[http ${r.status()}] ${r.url()}`));
  return { ctx, page };
}

async function login(page, email) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill(PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((u) => !u.pathname.includes('/login'));
  await page.waitForLoadState('networkidle');
}

const foto = (page, nombre) => page.screenshot({ path: `${SALIDA}/${nombre}.png`, fullPage: true });
const paso = (t) => console.log('✓', t);

// ---------------- Login y credenciales inválidas ----------------
{
  const { ctx, page } = await nuevaPagina({ width: 1366, height: 800 });
  await page.goto(`${BASE}/login`);
  await foto(page, '01-login');
  await page.getByLabel('Email').fill('admin@ganadotrack.local');
  await page.getByLabel('Contraseña').fill('incorrecta');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByText('Email o contraseña incorrectos').waitFor();
  paso('login rechaza contraseña incorrecta');
  await ctx.close();
}

// ---------------- Encargado (celular) ----------------
{
  const { ctx, page } = await nuevaPagina({ width: 390, height: 844 });
  const t0 = Date.now();
  await login(page, 'encargado@ganadotrack.local');
  if (!page.url().endsWith('/alimentacion')) errores.push(`encargado redirigido a ${page.url()}`);
  await foto(page, '10-encargado-inicio');
  // Carga en 1 toque: la ración del día ya viene calculada (RF09)
  const tarjeta1 = page.locator('.MuiCard-root', { hasText: 'Lote 01 - Angus novillos' });
  const t1 = Date.now();
  await tarjeta1.getByRole('button', { name: 'Confirmar ración de hoy' }).click();
  await page.getByText(/Registro guardado/).waitFor();
  paso(`encargado confirmó la ración en 1 toque (respuesta en ${Date.now() - t1} ms)`);
  await foto(page, '12-encargado-confirmacion');
  if (!(await tarjeta1.getByText('Cargado hoy').isVisible())) errores.push('no se marca "Cargado hoy"');

  // Otros kilos: formulario precargado con la ración, se modifica un valor
  const tarjeta2 = page.locator('.MuiCard-root', { hasText: 'Lote 02 - Angus vaquillonas' });
  await tarjeta2.getByRole('button', { name: 'Di otros kilos' }).click();
  await tarjeta2.getByLabel('Silaje de sorgo (propio)').fill('1100');
  await foto(page, '11-encargado-formulario');
  await tarjeta2.getByRole('button', { name: 'Confirmar' }).click();
  await page.getByText(/Registro guardado – Lote 02/).waitFor();
  paso('encargado cargó otros kilos desde el formulario precargado');
  // Acceso a pantallas de admin debe redirigir
  await page.goto(`${BASE}/dashboard`);
  await page.waitForLoadState('networkidle');
  if (!page.url().endsWith('/alimentacion')) errores.push(`encargado pudo entrar a ${page.url()}`);
  paso('encargado no accede al dashboard');
  console.log(`  tiempo total login + carga: ${Date.now() - t0} ms`);
  await ctx.close();
}

// ---------------- Veterinario ----------------
{
  const { ctx, page } = await nuevaPagina({ width: 1366, height: 800 });
  await login(page, 'veterinario@ganadotrack.local');
  if (!page.url().endsWith('/sanidad')) errores.push(`veterinario redirigido a ${page.url()}`);
  await foto(page, '20-veterinario-sanidad');
  // Registrar el control de garrapata pendiente
  const tarjeta = page.locator('.MuiCard-root', { hasText: 'Control de tratamiento de garrapata' });
  await tarjeta.getByRole('button', { name: 'Registrar realizado' }).click();
  await page.getByLabel('Dosis').fill('1 ml/10 kg');
  await page.getByLabel('Costo total').fill('380000');
  await page.getByLabel(/Duración del tratamiento/).fill('21');
  await foto(page, '21-veterinario-registrar-evento');
  await page.getByRole('button', { name: 'Registrar como realizado' }).click();
  await page.getByText(/Se programó un control/).waitFor();
  paso('veterinario registró tratamiento de garrapata y se reprogramó el control');
  await foto(page, '22-veterinario-evento-registrado');
  // Baja
  await page.getByRole('button', { name: 'Registrar baja' }).click();
  await page.getByLabel('Lote').last().click();
  await page.getByRole('option', { name: /Lote 03/ }).click();
  await page.getByLabel('Cantidad de animales').fill('1');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await page.getByText(/quedan 99 cabezas/).waitFor();
  paso('veterinario registró una baja');
  await ctx.close();
}

// ---------------- Administrador ----------------
{
  const { ctx, page } = await nuevaPagina({ width: 1366, height: 800 });
  await login(page, 'admin@ganadotrack.local');
  const t0 = Date.now();
  await page.goto(`${BASE}/dashboard`);
  await page.getByText('Lotes en el corral').first().waitFor();
  await page.waitForLoadState('networkidle');
  paso(`dashboard cargado en ${Date.now() - t0} ms`);
  await foto(page, '30-admin-dashboard');

  await page.goto(`${BASE}/lotes`);
  await page.getByRole('cell', { name: 'Lote 01 - Angus novillos' }).waitFor();
  await foto(page, '31-admin-lotes');

  // Alta de lote
  await page.getByRole('button', { name: 'Nuevo lote' }).click();
  await page.getByLabel(/Nombre \/ número de lote/).fill('Lote 04 - Prueba E2E');
  await page.getByLabel(/Cantidad de animales/).fill('50');
  await page.getByLabel(/Peso promedio de ingreso/).fill('370');
  await page.getByLabel(/Peso objetivo de salida/).fill('420');
  await page.getByLabel(/GDP objetivo/).fill('0.45');
  await foto(page, '32-admin-nuevo-lote');
  await page.getByRole('button', { name: 'Crear lote' }).click();
  await page.waitForURL(/\/lotes\/\d+/);
  await page.getByText('Lote 04 - Prueba E2E').first().waitFor();
  paso('admin creó un lote');

  // Detalle de Lote 01
  await page.goto(`${BASE}/lotes`);
  await page.getByRole('cell', { name: 'Lote 01 - Angus novillos' }).click();
  await page.getByText('Evolución del peso promedio').waitFor();
  await page.waitForTimeout(800);
  await foto(page, '33-admin-lote-detalle');
  await page.getByRole('tab', { name: 'Costos' }).click();
  await foto(page, '34-admin-lote-costos');
  await page.getByRole('tab', { name: 'Sanidad' }).click();
  await foto(page, '35-admin-lote-sanidad');

  // Pesada con GDP baja
  await page.getByRole('button', { name: 'Registrar pesada' }).click();
  await page.getByLabel('Peso promedio del lote').fill('406');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await page.getByText(/Pesada registrada/).waitFor();
  paso('admin registró una pesada');
  await foto(page, '36-admin-pesada-registrada');

  // Corrección: eliminar la última pesada (con confirmación)
  await page.getByRole('tab', { name: 'Pesadas' }).click();
  await page.getByTitle('Eliminar la última pesada').click();
  await page.getByText('¿Eliminar la última pesada?').waitFor();
  await foto(page, '36b-admin-confirmar-eliminar');
  await page.getByRole('button', { name: 'Eliminar' }).last().click();
  await page.getByText('Pesada eliminada').waitFor();
  paso('admin eliminó la última pesada con confirmación');

  // Cierre (solo simulación + confirmación) del Lote 02
  await page.goto(`${BASE}/lotes`);
  await page.getByRole('cell', { name: 'Lote 02 - Angus vaquillonas' }).click();
  await page.getByRole('button', { name: 'Cerrar lote' }).click();
  await page.getByLabel('Precio de venta por kg').fill('9500');
  await page.getByRole('button', { name: 'Ver resumen final' }).click();
  await page.getByText('Resumen final del lote').waitFor();
  await foto(page, '37-admin-cierre-resumen');
  await page.getByRole('button', { name: 'Confirmar cierre' }).click();
  await page.getByText('Lote cerrado').first().waitFor();
  paso('admin cerró un lote');

  await page.goto(`${BASE}/insumos`);
  await page.getByText('Historial de compras y cargas').waitFor();
  await page.waitForLoadState('networkidle');
  await foto(page, '38-admin-insumos');

  await page.goto(`${BASE}/usuarios`);
  await page.getByText('encargado@ganadotrack.local').waitFor();
  await foto(page, '39-admin-usuarios');

  await page.goto(`${BASE}/configuracion`);
  await page.getByText(/Rendimiento al gancho/).first().waitFor();
  await foto(page, '40-admin-configuracion');

  await page.goto(`${BASE}/perfil`);
  await page.getByText('Cambiar contraseña').first().waitFor();
  await foto(page, '43-perfil');
  await page.goto(`${BASE}/no-existe`);
  await page.getByText('Esta tranquera está cerrada').waitFor();
  await foto(page, '44-pagina-404');
  paso('perfil y página 404');
  await ctx.close();
}

// ---------------- Admin en celular (responsive) ----------------
{
  const { ctx, page } = await nuevaPagina({ width: 390, height: 844 });
  await login(page, 'admin@ganadotrack.local');
  await page.getByText('Lotes en el corral').first().waitFor();
  await page.waitForLoadState('networkidle');
  const anchoDoc = await page.evaluate(() => document.documentElement.scrollWidth);
  if (anchoDoc > 390) errores.push(`dashboard móvil con scroll horizontal: ${anchoDoc}px`);
  await foto(page, '41-admin-dashboard-movil');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await foto(page, '42-admin-menu-movil');
  paso('dashboard responsive en 390 px');
  await ctx.close();
}

await browser.close();
console.log(errores.length ? `\nERRORES (${errores.length}):\n${errores.join('\n')}` : '\nSin errores de consola ni de servidor.');
process.exit(errores.length ? 1 : 0);
