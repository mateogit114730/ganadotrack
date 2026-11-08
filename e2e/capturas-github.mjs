// Capturas de las páginas públicas de GitHub para la sección 16 (seguimiento del proyecto).
// Uso: node capturas-github.mjs [carpeta]   (por defecto ../docs/capturas/github)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const REPO = 'https://github.com/mateogit114730/ganadotrack';
const SALIDA = process.argv[2] ?? '../docs/capturas/github';
mkdirSync(SALIDA, { recursive: true });

const PAGINAS = [
  { nombre: 'tablero', url: 'https://github.com/users/mateogit114730/projects/1', espera: 'Hecho' },
  { nombre: 'milestones', url: `${REPO}/milestones?state=open&sort=due_date&direction=asc`, espera: 'F4 Pruebas' },
  { nombre: 'issues-cerrados', url: `${REPO}/issues?q=is%3Aissue+is%3Aclosed+sort%3Acreated-asc`, espera: 'Correcciones a la 1ª entrega' },
  { nombre: 'commits', url: `${REPO}/commits/develop`, espera: 'Commits' },
  { nombre: 'actions', url: `${REPO}/actions/workflows/ci.yml`, espera: /workflow runs?/ },
  { nombre: 'tags', url: `${REPO}/tags`, espera: 'ganadotrack-1.1.1.0' },
  { nombre: 'pull-request', url: `${REPO}/pull/30`, espera: 'Arreglo de la CI' },
  { nombre: 'issue-ejemplo', url: `${REPO}/issues/21`, espera: 'Protocolos sanitarios' },
];

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'es-AR', colorScheme: 'light' });
const page = await ctx.newPage();
for (const { nombre, url, espera } of PAGINAS) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.getByText(espera).first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1500); // termina de cargar avatares y estados
  // Se captura solo la parte visible: las páginas de GitHub son muy largas.
  await page.screenshot({ path: `${SALIDA}/${nombre}.png` });
  console.log('✓', nombre);
}
await browser.close();
