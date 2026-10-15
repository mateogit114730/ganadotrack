// Clima del establecimiento (RF12) a partir de Open-Meteo (gratuito, sin clave).
// La API se consulta desde el backend: así se cachea, se oculta el proveedor al cliente
// y, si no responde, el sistema sigue funcionando sin los datos de clima.

import { prisma } from '../config/prisma.js';
import { formatoISO, hoy } from '../utils/fechas.js';
import { redondear } from './calculos.js';
import {
  describirTiempo, indiceTemperaturaHumedad, nivelEstresTermico, riesgoGarrapata, riesgoSequia,
} from './riesgosClima.js';

const URL_PRONOSTICO = 'https://api.open-meteo.com/v1/forecast';
const URL_GEOCODIFICACION = 'https://geocoding-api.open-meteo.com/v1/search';
const ZONA = 'America/Argentina/Buenos_Aires';
const DURACION_CACHE_MS = 30 * 60 * 1000;
const TIMEOUT_MS = 8000;

export const CLAVES_UBICACION = {
  nombre: 'ubicacion_nombre',
  latitud: 'ubicacion_latitud',
  longitud: 'ubicacion_longitud',
};

let cache = null; // { clave, hasta, datos }

export function limpiarCacheClima() {
  cache = null;
}

async function obtenerJson(url) {
  const respuesta = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!respuesta.ok) throw new Error(`Open-Meteo respondió ${respuesta.status}`);
  return respuesta.json();
}

export async function leerUbicacion(db = prisma) {
  const filas = await db.parametro.findMany({ where: { clave: { in: Object.values(CLAVES_UBICACION) } } });
  const valor = (clave) => filas.find((f) => f.clave === clave)?.valor;
  const latitud = valor(CLAVES_UBICACION.latitud);
  const longitud = valor(CLAVES_UBICACION.longitud);
  if (latitud === undefined || longitud === undefined) return null;
  return { nombre: valor(CLAVES_UBICACION.nombre) ?? '', latitud: Number(latitud), longitud: Number(longitud) };
}

export async function guardarUbicacion({ nombre, latitud, longitud }, db = prisma) {
  const datos = { [CLAVES_UBICACION.nombre]: nombre, [CLAVES_UBICACION.latitud]: latitud, [CLAVES_UBICACION.longitud]: longitud };
  await db.$transaction(
    Object.entries(datos).map(([clave, v]) =>
      db.parametro.upsert({ where: { clave }, create: { clave, valor: String(v) }, update: { valor: String(v) } }),
    ),
  );
  limpiarCacheClima();
  return leerUbicacion(db);
}

/** Busca localidades de Argentina por nombre (para configurar la ubicación). */
export async function buscarLocalidades(texto) {
  const params = new URLSearchParams({ name: texto, count: '8', language: 'es', countryCode: 'AR' });
  const datos = await obtenerJson(`${URL_GEOCODIFICACION}?${params}`);
  return (datos.results ?? []).map((r) => ({
    nombre: [r.name, r.admin2?.replace('Partido de ', '').replace('Departamento ', ''), r.admin1].filter(Boolean).join(', '),
    latitud: r.latitude,
    longitud: r.longitude,
  }));
}

/** Transforma la respuesta de Open-Meteo en el resumen que usa el sistema (función pura). */
export function procesarPronostico(datos, fechaHoy) {
  const dias = datos.daily.time.map((fecha, i) => ({
    fecha,
    maxima: datos.daily.temperature_2m_max[i],
    minima: datos.daily.temperature_2m_min[i],
    media: datos.daily.temperature_2m_mean[i],
    humedad: datos.daily.relative_humidity_2m_mean[i],
    lluvia: datos.daily.precipitation_sum[i] ?? 0,
    codigo: datos.daily.weather_code[i],
  }));
  const pasados = dias.filter((d) => d.fecha < fechaHoy);
  const futuros = dias.filter((d) => d.fecha >= fechaHoy);
  const ultimos7 = pasados.slice(-7);
  const promedio = (lista, campo) => (lista.length ? lista.reduce((t, d) => t + (d[campo] ?? 0), 0) / lista.length : 0);

  const pronostico = futuros.map((d) => {
    // El ITH del día se estima con la máxima y la humedad media: es el momento de mayor estrés.
    const ith = indiceTemperaturaHumedad(d.maxima, d.humedad);
    return { ...d, ...describirTiempo(d.codigo), ith, estresTermico: nivelEstresTermico(ith) };
  });
  const lluvia30 = redondear(pasados.reduce((t, d) => t + d.lluvia, 0), 1);
  const lluvia7 = redondear(futuros.reduce((t, d) => t + d.lluvia, 0), 1);
  const temperaturaMedia7 = redondear(promedio(ultimos7, 'media'), 1);
  const humedadMedia7 = redondear(promedio(ultimos7, 'humedad'), 0);
  const ithActual = indiceTemperaturaHumedad(datos.current.temperature_2m, datos.current.relative_humidity_2m);
  const peorEstres = ['emergencia', 'peligro', 'alerta'].find((n) => pronostico.slice(0, 3).some((d) => d.estresTermico === n)) ?? 'normal';

  return {
    actual: {
      temperatura: datos.current.temperature_2m,
      humedad: datos.current.relative_humidity_2m,
      viento: datos.current.wind_speed_10m,
      lluvia: datos.current.precipitation,
      ...describirTiempo(datos.current.weather_code),
      ith: ithActual,
      estresTermico: nivelEstresTermico(ithActual),
    },
    pronostico,
    riesgos: {
      estresTermico: { nivel: peorEstres, dia: pronostico.slice(0, 3).find((d) => d.estresTermico === peorEstres)?.fecha ?? null },
      garrapata: { nivel: riesgoGarrapata(temperaturaMedia7, humedadMedia7), temperaturaMedia7, humedadMedia7 },
      sequia: { nivel: riesgoSequia(lluvia30, lluvia7), lluvia30, lluviaPronostico7: lluvia7 },
    },
  };
}

/**
 * Clima de la ubicación configurada.
 * Nunca lanza error: si falta la ubicación o la API no responde, lo indica en la respuesta.
 */
export async function obtenerClima(db = prisma) {
  const ubicacion = await leerUbicacion(db);
  if (!ubicacion) return { configurado: false };

  const clave = `${ubicacion.latitud},${ubicacion.longitud}`;
  if (cache && cache.clave === clave && cache.hasta > Date.now()) return cache.datos;

  const params = new URLSearchParams({
    latitude: String(ubicacion.latitud),
    longitude: String(ubicacion.longitud),
    current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,temperature_2m_mean,relative_humidity_2m_mean,precipitation_sum,weather_code',
    past_days: '30',
    forecast_days: '7',
    timezone: ZONA,
  });
  try {
    const datos = await obtenerJson(`${URL_PRONOSTICO}?${params}`);
    const resultado = {
      configurado: true,
      disponible: true,
      ubicacion,
      actualizado: new Date().toISOString(),
      ...procesarPronostico(datos, formatoISO(hoy())),
    };
    cache = { clave, hasta: Date.now() + DURACION_CACHE_MS, datos: resultado };
    return resultado;
  } catch (err) {
    console.warn('No se pudo obtener el clima:', err.message);
    return { configurado: true, disponible: false, ubicacion };
  }
}
