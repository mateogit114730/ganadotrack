// Prueba de humo de la app publicada: SOLO LECTURA (no carga, modifica ni borra datos).
// Ingresa con los 3 roles, recorre todas sus pantallas, descarga los reportes y verifica que
// el service worker quede activo, sin errores de consola ni respuestas 4xx/5xx de la API.
// Uso: node humo-produccion.mjs [carpeta-capturas]
// La contraseña se lee de SEED_PASSWORD o del archivo local e2e/.password-produccion (ignorado por Git).
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'https://ganadotrack.vercel.app';
const SALIDA = process.argv[2];
const archivo = new URL('./.password-produccion', import.meta.url);
const PASSWORD = process.env.SEED_PASSWORD ?? (existsSync(archivo) ? readFileSync(archivo, 'utf8').replace(/^﻿/, '').trim() : '');
if (!PASSWORD) throw new Error('Defina SEED_PASSWORD o cree e2e/.password-produccion');
if (SALIDA) mkdirSync(SALIDA, { recursive: true });

const errores = [];
const browser = await chromium.launch({ channel: 'msedge', headless: true });

async function nuevaPagina(viewport) {
  const ctx = await browser.newContext({ viewport, locale: 'es-AR', acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errores.push(`[console] ${page.url()} ${m.text()}`));
  page.on('pageerror', (e) => errores.push(`[pageerror] ${page.url()} ${e.message}`));
  page.on('response', (r) => r.url().includes('/api/') && r.status() >= 400 && errores.push(`[http ${r.status()}] ${r.url()}`));
  // Seguridad: la prueba no debe escribir nada. Cualquier POST/PUT/PATCH/DELETE a la API se bloquea.
  await page.route('**/api/**', (ruta) => {
    const metodo = ruta.request().method();
    const esLogin = ruta.request().url().endsWith('/api/auth/login');
    if (['GET', 'HEAD', 'OPTIONS'].includes(metodo) || esLogin) return ruta.continue();
    errores.push(`[bloqueado] ${metodo} ${ruta.request().url()}`);
    return ruta.abort();
  });
  return { ctx, page };
}

async function login(page, email) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill(PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 90_000 }); // la API puede estar "despertando"
  await page.waitForLoadState('networkidle');
}

async function visitar(page, ruta, texto, nombre) {
  const t0 = Date.now();
  await page.goto(`${BASE}${ruta}`);
  await page.getByText(texto, { exact: true }).first().waitFor({ timeout: 30_000 });
  await page.waitForLoadState('networkidle');
  const ms = Date.now() - t0;
  if (SALIDA && nombre) await page.screenshot({ path: `${SALIDA}/${nombre}.png`, fullPage: true });
  console.log(`✓ ${ruta.padEnd(15)} ${String(ms).padStart(5)} ms`);
  return ms;
}

// Despierta la API antes de medir (el plan gratuito de Render la suspende sin uso).
const t0 = Date.now();
await fetch(BASE.replace('ganadotrack.vercel.app', 'ganadotrack-api.onrender.com') + '/api/health').catch(() => {});
console.log(`API despierta en ${Date.now() - t0} ms`);

// ---------- Administrador (escritorio) ----------
{
  const { ctx, page } = await nuevaPagina({ width: 1366, height: 800 });
  await login(page, 'admin@ganadotrack.local');
  await visitar(page, '/dashboard', 'Riesgos (orientativos)', 'prod-dashboard'); // espera también el panel de clima
  await visitar(page, '/lotes', 'Lotes');
  await page.locator('tbody tr').first().click();
  await page.getByText('Evolución del peso promedio').waitFor();
  console.log('✓ detalle de lote');
  await visitar(page, '/insumos', 'Insumos y stock', 'prod-insumos');
  await visitar(page, '/sanidad', 'Sanidad');
  await visitar(page, '/protocolos', 'Protocolos sanitarios');
  await visitar(page, '/raciones', 'Raciones');
  await visitar(page, '/usuarios', 'Usuarios');
  await visitar(page, '/configuracion', 'Configuración');
  await visitar(page, '/reportes', 'Reportes');
  // El informe de lote necesita la lista de lotes cargada en el selector.
  await page.getByLabel('Lote').filter({ hasText: /\S/ }).waitFor({ timeout: 30_000 });
  for (const boton of ['Descargar Excel', 'Descargar PDF']) {
    try {
      const [descarga] = await Promise.all([
        page.waitForEvent('download', { timeout: 60_000 }),
        page.getByRole('button', { name: boton }).first().click(),
      ]);
      console.log(`✓ descarga: ${descarga.suggestedFilename()}`);
    } catch (e) {
      errores.push(`[descarga] ${boton}: ${e.message.split('\n')[0]}`);
    }
  }
  const sw = await page.evaluate(async () => (await navigator.serviceWorker?.getRegistration())?.active?.state ?? 'sin service worker');
  console.log(`✓ service worker: ${sw}`);
  await ctx.close();
}

// ---------- Encargado (celular) ----------
{
  const { ctx, page } = await nuevaPagina({ width: 390, height: 844 });
  await login(page, 'encargado@ganadotrack.local');
  await visitar(page, '/alimentacion', 'Comida de hoy', 'prod-encargado');
  const conRacion = await page.getByRole('button', { name: 'Confirmar ración de hoy' }).count();
  console.log(`✓ ${conRacion} lote(s) con la ración lista para confirmar (no se confirma: prueba de solo lectura)`);
  await ctx.close();
}

// ---------- Veterinario ----------
{
  const { ctx, page } = await nuevaPagina({ width: 1366, height: 800 });
  await login(page, 'veterinario@ganadotrack.local');
  await visitar(page, '/sanidad', 'Sanidad', 'prod-veterinario');
  await visitar(page, '/protocolos', 'Protocolos sanitarios');
  await ctx.close();
}

await browser.close();
if (errores.length) {
  console.log(`\n${errores.length} problema(s):\n${errores.join('\n')}`);
  process.exit(1);
}
console.log('\nProducción OK: sin errores de consola ni de la API, y sin modificar datos.');
