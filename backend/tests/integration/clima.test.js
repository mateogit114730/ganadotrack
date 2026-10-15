// RF12: clima y riesgos (issue #23). La API de Open-Meteo se simula para que las pruebas
// sean deterministas y no dependan de internet.
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { api, auth, prisma, limpiarBase, prepararUsuarios, crearInsumos, crearLote, fechaRelativa } from './helpers.js';
import { limpiarCacheClima } from '../../src/services/clima.js';

let tokens, lote;

/** Respuesta simulada: 30 días pasados y 7 de pronóstico con los valores indicados. */
function respuestaOpenMeteo({ maxima = 34, media = 24, humedad = 80, lluvia = 0 } = {}) {
  const fechas = Array.from({ length: 37 }, (_, i) => fechaRelativa(i - 30));
  const serie = (v) => fechas.map(() => v);
  return {
    current: { temperature_2m: 28, relative_humidity_2m: 70, precipitation: 0, weather_code: 0, wind_speed_10m: 12 },
    daily: {
      time: fechas,
      temperature_2m_max: serie(maxima),
      temperature_2m_min: serie(15),
      temperature_2m_mean: serie(media),
      relative_humidity_2m_mean: serie(humedad),
      precipitation_sum: serie(lluvia),
      weather_code: serie(1),
    },
  };
}

const simularApi = (datos) =>
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => datos })));

const configurarUbicacion = () =>
  api().put('/api/clima/ubicacion').set(auth(tokens.admin)).send({ nombre: 'Pergamino, Buenos Aires', latitud: -33.89, longitud: -60.57 });

beforeEach(async () => {
  limpiarCacheClima();
  await limpiarBase();
  tokens = await prepararUsuarios();
  await crearInsumos();
  lote = await crearLote(tokens.admin);
});

afterEach(() => vi.unstubAllGlobals());
afterAll(() => prisma.$disconnect());

describe('Clima y riesgos', () => {
  it('CP-67 sin ubicación configurada informa que falta configurarla', async () => {
    const res = await api().get('/api/clima').set(auth(tokens.encargado));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ configurado: false });
  });

  it('CP-68 con ubicación devuelve el clima actual, el pronóstico y los riesgos', async () => {
    simularApi(respuestaOpenMeteo());
    expect((await configurarUbicacion()).status).toBe(200);

    const { body } = await api().get('/api/clima').set(auth(tokens.admin));
    expect(body.disponible).toBe(true);
    expect(body.actual.temperatura).toBe(28);
    expect(body.pronostico).toHaveLength(7);
    expect(body.riesgos.garrapata.nivel).toBe('alto'); // 24 °C y 80 %
    expect(body.riesgos.sequia.nivel).toBe('alto'); // sin lluvias
    expect(body.riesgos.estresTermico.nivel).toBe('emergencia'); // máxima 34 °C con 80 % de humedad
  });

  it('CP-69 genera alertas de clima según el rol', async () => {
    simularApi(respuestaOpenMeteo());
    await configurarUbicacion();

    const admin = (await api().get('/api/alertas').set(auth(tokens.admin))).body.filter((a) => a.tipo === 'CLIMA');
    const vet = (await api().get('/api/alertas').set(auth(tokens.veterinario))).body.filter((a) => a.tipo === 'CLIMA');

    expect(admin.map((a) => a.id)).toEqual(expect.arrayContaining(['CLIMA-ESTRES', `CLIMA-GARRAPATA-${lote.id}`, 'CLIMA-SEQUIA']));
    // El veterinario recibe las sanitarias (estrés y garrapata) pero no la de sequía.
    expect(vet.map((a) => a.id).sort()).toEqual(['CLIMA-ESTRES', `CLIMA-GARRAPATA-${lote.id}`].sort());
  });

  it('CP-70 un lote con tratamiento de garrapata reciente no genera alerta de garrapata', async () => {
    simularApi(respuestaOpenMeteo({ maxima: 22 }));
    await configurarUbicacion();
    await api().post('/api/sanidad/eventos/realizados').set(auth(tokens.veterinario)).send({
      loteId: lote.id, tipo: 'GARRAPATA', nombre: 'Baño', fechaRealizada: fechaRelativa(-5), costo: 1, duracionDias: 21,
    });
    const alertas = (await api().get('/api/alertas').set(auth(tokens.admin))).body;
    expect(alertas.some((a) => a.id === `CLIMA-GARRAPATA-${lote.id}`)).toBe(false);
  });

  it('CP-71 si el servicio de clima no responde, el sistema sigue funcionando', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('sin conexión'); }));
    await configurarUbicacion();
    const clima = await api().get('/api/clima').set(auth(tokens.admin));
    expect(clima.body).toMatchObject({ configurado: true, disponible: false });
    const alertas = await api().get('/api/alertas').set(auth(tokens.admin));
    expect(alertas.status).toBe(200);
  });
});
