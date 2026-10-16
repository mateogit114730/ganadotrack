// Índices de riesgo a partir del clima (RF12). Son funciones puras y ORIENTATIVAS:
// los umbrales provienen de bibliografía general y deben validarse con el veterinario.

import { redondear } from './calculos.js';

/**
 * Índice de Temperatura y Humedad (ITH) para bovinos.
 * ITH = (1,8·T + 32) − (0,55 − 0,0055·HR) · (1,8·T − 26)
 * @param temperatura °C   @param humedad % (0–100)
 */
export function indiceTemperaturaHumedad(temperatura, humedad) {
  return redondear(1.8 * temperatura + 32 - (0.55 - 0.0055 * humedad) * (1.8 * temperatura - 26), 1);
}

/** Nivel de estrés térmico según el ITH: < 72 normal · 72–78 alerta · 79–88 peligro · ≥ 89 emergencia. */
export function nivelEstresTermico(ith) {
  if (ith >= 89) return 'emergencia';
  if (ith >= 79) return 'peligro';
  if (ith >= 72) return 'alerta';
  return 'normal';
}

/**
 * Riesgo de garrapata (Rhipicephalus microplus): su actividad aumenta con calor y humedad.
 * alto: temperatura media ≥ 20 °C y humedad ≥ 70 % · medio: ≥ 15 °C y ≥ 60 % · bajo: el resto.
 */
export function riesgoGarrapata(temperaturaMedia, humedadMedia) {
  if (temperaturaMedia >= 20 && humedadMedia >= 70) return 'alto';
  if (temperaturaMedia >= 15 && humedadMedia >= 60) return 'medio';
  return 'bajo';
}

/**
 * Riesgo de sequía según la lluvia de los últimos 30 días y la pronosticada para 7 días.
 * alto: < 20 mm y < 5 mm pronosticados · medio: < 40 mm en 30 días · bajo: el resto.
 */
export function riesgoSequia(lluvia30Dias, lluviaPronostico7Dias) {
  if (lluvia30Dias < 20 && lluviaPronostico7Dias < 5) return 'alto';
  if (lluvia30Dias < 40) return 'medio';
  return 'bajo';
}

/** Descripción e ícono del estado del tiempo según el código WMO que informa Open-Meteo. */
export function describirTiempo(codigo) {
  if (codigo === 0) return { texto: 'Despejado', icono: 'sol' };
  if (codigo <= 2) return { texto: 'Parcialmente nublado', icono: 'parcial' };
  if (codigo === 3) return { texto: 'Nublado', icono: 'nublado' };
  if (codigo === 45 || codigo === 48) return { texto: 'Niebla', icono: 'niebla' };
  if (codigo >= 95) return { texto: 'Tormenta', icono: 'tormenta' };
  if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86) return { texto: 'Nieve', icono: 'nieve' };
  if (codigo >= 51 && codigo <= 82) return { texto: codigo <= 57 ? 'Llovizna' : 'Lluvia', icono: 'lluvia' };
  return { texto: 'Sin datos', icono: 'nublado' };
}
