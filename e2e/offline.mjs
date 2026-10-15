// Recorrido E2E del modo sin conexión (RF14) sobre el build de producción (service worker activo).
// Requisitos: backend corriendo, "npm run build && npm run preview" en frontend (puerto 4173)
// y la base recién cargada con el seed. Uso: SEED_PASSWORD=... node offline.mjs <carpeta-capturas>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const SALIDA = process.argv[2] ?? 'capturas-offline';
const PASSWORD = process.env.SEED_PASSWORD;
if (!PASSWORD) throw new Error('Defina SEED_PASSWORD (la misma del backend/.env)');
mkdirSync(SALIDA, { recursive: true });

const paso = (t) => console.log('✓', t);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-AR' });
const page = await ctx.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));

// 1. Login con señal: se instala el service worker y se guardan los datos del encargado.
await page.goto(`${BASE}/login`);
await page.getByLabel('Email').fill('encargado@ganadotrack.local');
await page.getByLabel('Contraseña').fill(PASSWORD);
await page.getByRole('button', { name: 'Ingresar' }).click();
await page.waitForURL(/\/alimentacion/);
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload(); // la página queda controlada por el service worker y se cachean los datos
await page.getByText('Lote 03 - Angus novillitos').waitFor();
paso('service worker activo y datos del encargado guardados');

// 2. Sin señal: la app abre igual y la carga se guarda en el teléfono.
await ctx.setOffline(true);
await page.reload();
await page.getByText('Sin conexión', { exact: true }).waitFor();
const tarjeta = page.locator('.MuiCard-root', { hasText: 'Lote 03 - Angus novillitos' });
await tarjeta.getByRole('button', { name: 'Confirmar ración de hoy' }).click();
await page.getByText(/Guardado en el teléfono/).waitFor();
await tarjeta.getByText('En el teléfono').waitFor();
await page.screenshot({ path: `${SALIDA}/50-encargado-sin-conexion.png`, fullPage: true });
paso('sin conexión: la app abre y la carga queda guardada en el teléfono');

// 3. Vuelve la señal: la carga se envía sola, una sola vez.
await ctx.setOffline(false);
await page.getByText(/Se enviaron 1 carga\(s\)/).waitFor({ timeout: 20000 });
await tarjeta.getByText('Cargado hoy').waitFor();
await page.screenshot({ path: `${SALIDA}/51-encargado-sincronizado.png`, fullPage: true });
const registros = await page.evaluate(async () => {
  const token = localStorage.getItem('ganadotrack.token');
  const r = await fetch('/api/alimentacion/opciones', { headers: { Authorization: `Bearer ${token}` } });
  const datos = await r.json();
  return datos.lotes.find((l) => l.nombre.startsWith('Lote 03')).cargadoHoy.length;
});
if (registros !== 2) errores.push(`se esperaban 2 registros de hoy (suplemento y silaje) y hay ${registros}`);
paso(`al volver la señal se sincronizó sin duplicar (${registros} registros)`);

await browser.close();
console.log(errores.length ? `\nERRORES:\n${errores.join('\n')}` : '\nSin errores.');
process.exit(errores.length ? 1 : 0);
