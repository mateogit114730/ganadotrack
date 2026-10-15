// Capturas rápidas de pantallas para revisar el diseño (no modifica datos).
// Uso: SEED_PASSWORD=... node capturas-rapidas.mjs <carpeta> [ruta1 ruta2 ...]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const [salida, ...rutas] = process.argv.slice(2);
const PASSWORD = process.env.SEED_PASSWORD;
if (!salida || !PASSWORD) throw new Error('Uso: SEED_PASSWORD=... node capturas-rapidas.mjs <carpeta> [rutas]');
mkdirSync(salida, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errores = [];

for (const [nombre, viewport] of [['escritorio', { width: 1366, height: 800 }], ['movil', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport, locale: 'es-AR' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${page.url()} ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errores.push(`${page.url()} ${m.text()}`));

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${salida}/${nombre}-login.png`, fullPage: true });

  for (const ruta of rutas) {
    const [r, email = 'admin'] = ruta.split('@');
    await page.goto(`${BASE}/login`);
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE}/login`);
    await page.getByLabel('Email').fill(`${email}@ganadotrack.local`);
    await page.getByLabel('Contraseña').fill(PASSWORD);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL((u) => !u.pathname.includes('/login'));
    await page.goto(`${BASE}${r}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${salida}/${nombre}${r.replaceAll('/', '-')}.png`, fullPage: true });
  }
  await ctx.close();
}
await browser.close();
console.log(errores.length ? `ERRORES:\n${errores.join('\n')}` : 'Sin errores.');
