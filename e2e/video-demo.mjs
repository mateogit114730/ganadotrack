// Graba los videos de demostración para el productor (con subtítulos en pantalla).
// Requisitos: backend + frontend corriendo, base recién cargada con el seed y ffmpeg para convertir a MP4.
// Uso: SEED_PASSWORD=... FFMPEG=<ruta a ffmpeg> node video-demo.mjs <carpeta-salida>
// ATENCIÓN: modifica los datos de demostración. Volver a ejecutar el seed después.
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const SALIDA = process.argv[2] ?? 'videos';
const PASSWORD = process.env.SEED_PASSWORD;
if (!PASSWORD) throw new Error('Defina SEED_PASSWORD');
mkdirSync(SALIDA, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge', headless: true, slowMo: 250 });

/** Muestra un subtítulo grande en la parte inferior de la pantalla. */
async function subtitulo(page, texto, ms = 3200) {
  await page.evaluate((t) => {
    let caja = document.getElementById('subtitulo-demo');
    if (!caja) {
      caja = document.createElement('div');
      caja.id = 'subtitulo-demo';
      Object.assign(caja.style, {
        position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)', zIndex: 99999,
        maxWidth: '86%', padding: '14px 22px', borderRadius: '14px', background: 'rgba(31,94,44,0.94)',
        color: '#fff', font: '600 20px "Nunito Sans", sans-serif', textAlign: 'center',
        boxShadow: '0 6px 24px rgba(0,0,0,0.25)', pointerEvents: 'none',
      });
      document.body.appendChild(caja);
    }
    caja.textContent = t;
  }, texto);
  await page.waitForTimeout(ms);
}

async function nuevaGrabacion(viewport) {
  const ctx = await browser.newContext({ viewport, locale: 'es-AR', recordVideo: { dir: SALIDA, size: viewport } });
  return { ctx, page: await ctx.newPage() };
}

async function ingresar(page, email) {
  await page.goto(`${BASE}/login`);
  await subtitulo(page, 'GanadoTrack: costos, ganancia de peso y sanidad del feedlot', 2500);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill(PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((u) => !u.pathname.includes('/login'));
  await page.waitForLoadState('networkidle');
}

async function terminar(ctx, page, nombre) {
  const video = page.video();
  await ctx.close();
  const webm = await video.path();
  const destino = join(SALIDA, `${nombre}.webm`);
  renameSync(webm, destino);
  if (process.env.FFMPEG) {
    // H.264 + AAC silencioso: se reproduce en cualquier celular y en WhatsApp.
    execFileSync(process.env.FFMPEG, ['-y', '-loglevel', 'error', '-i', destino, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '26', '-movflags', '+faststart', join(SALIDA, `${nombre}.mp4`)]);
    rmSync(destino);
  }
  console.log('✓ video', nombre);
}

// ---------- 1. Encargado en el celular ----------
{
  const { ctx, page } = await nuevaGrabacion({ width: 390, height: 844 });
  await ingresar(page, 'encargado@ganadotrack.local');
  await subtitulo(page, 'El encargado ve la ración del día de cada lote, ya calculada');
  const lote = page.locator('.MuiCard-root', { hasText: 'Lote 01 - Angus novillos' });
  await subtitulo(page, 'Un solo toque para registrar lo que le dio de comer');
  await lote.getByRole('button', { name: 'Confirmar ración de hoy' }).click();
  await page.getByText(/Registro guardado/).waitFor();
  await subtitulo(page, 'El sistema calcula el costo del día y descuenta el stock');
  await subtitulo(page, 'Si en el corral no hay señal, la carga queda en el teléfono y se envía sola después', 4000);
  await terminar(ctx, page, '1-encargado-celular');
}

// ---------- 2. Productor (administrador) ----------
{
  const { ctx, page } = await nuevaGrabacion({ width: 1280, height: 720 });
  await ingresar(page, 'admin@ganadotrack.local');
  await subtitulo(page, 'El tablero muestra todos los lotes, las alertas y el clima del campo');
  await page.mouse.wheel(0, 500);
  await subtitulo(page, 'Alertas: vacunas vencidas o próximas, stock que no alcanza, lotes que no engordan');
  await page.mouse.wheel(0, -500);
  await page.getByText('Lote 01 - Angus novillos').first().click();
  await page.getByText('Evolución del peso promedio').waitFor();
  await subtitulo(page, 'Cada lote: días en el corral, peso, ganancia diaria y fecha estimada de venta');
  await page.getByRole('tab', { name: 'Costos' }).click();
  await subtitulo(page, 'El costo de engorde por kilo de carne y el margen, calculados solos', 4000);
  await page.goto(`${BASE}/insumos`);
  await page.waitForLoadState('networkidle');
  await subtitulo(page, 'Cuántos días alcanza el silaje y el suplemento, y cuánto conviene comprar', 4000);
  await page.goto(`${BASE}/reportes`);
  await page.waitForLoadState('networkidle');
  await subtitulo(page, 'Informes en PDF y planilla Excel para el contador');
  await terminar(ctx, page, '2-productor');
}

// ---------- 3. Veterinario ----------
{
  const { ctx, page } = await nuevaGrabacion({ width: 1280, height: 720 });
  await ingresar(page, 'veterinario@ganadotrack.local');
  await subtitulo(page, 'El veterinario ve las alertas sanitarias y el calendario de cada lote');
  await page.goto(`${BASE}/protocolos`);
  await page.waitForLoadState('networkidle');
  await subtitulo(page, 'Protocolos: al ingresar una tropa, el calendario de vacunas y garrapata se arma solo', 4000);
  await page.goto(`${BASE}/sanidad`);
  await page.waitForLoadState('networkidle');
  const control = page.locator('.MuiCard-root', { hasText: 'Control de tratamiento de garrapata' }).first();
  await control.getByRole('button', { name: 'Registrar realizado' }).click();
  await page.getByLabel('Costo total').fill('380000');
  await page.getByLabel(/Duración del tratamiento/).fill('21');
  await subtitulo(page, 'Al registrar un tratamiento de garrapata, el próximo control se programa solo');
  await page.getByRole('button', { name: 'Registrar como realizado' }).click();
  await page.getByText(/Se programó un control/).waitFor();
  await subtitulo(page, 'Así no se pasa ningún tratamiento: es lo que faltó con la anaplasmosis', 4000);
  await terminar(ctx, page, '3-veterinario');
}

await browser.close();
console.log('Videos en', SALIDA, readdirSync(SALIDA));
