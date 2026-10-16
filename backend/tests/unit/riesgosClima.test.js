import { describe, it, expect } from 'vitest';
import {
  indiceTemperaturaHumedad, nivelEstresTermico, riesgoGarrapata, riesgoSequia, describirTiempo,
} from '../../src/services/riesgosClima.js';

describe('estrés térmico (ITH)', () => {
  it('calcula el índice de temperatura y humedad', () => {
    // 30 °C y 60 % → 86 − (0,55 − 0,33) × 28 = 79,8
    expect(indiceTemperaturaHumedad(30, 60)).toBe(79.8);
    // 20 °C y 50 % → 68 − 0,275 × 10 = 65,25 → 65,3
    expect(indiceTemperaturaHumedad(20, 50)).toBe(65.3);
  });

  it('clasifica el nivel según los umbrales', () => {
    expect(nivelEstresTermico(70)).toBe('normal');
    expect(nivelEstresTermico(72)).toBe('alerta');
    expect(nivelEstresTermico(79.8)).toBe('peligro');
    expect(nivelEstresTermico(90)).toBe('emergencia');
  });
});

describe('riesgo de garrapata', () => {
  it('es alto con calor y humedad', () => {
    expect(riesgoGarrapata(23, 78)).toBe('alto');
  });
  it('es medio con temperaturas templadas', () => {
    expect(riesgoGarrapata(17, 65)).toBe('medio');
  });
  it('es bajo con frío o aire seco', () => {
    expect(riesgoGarrapata(12, 80)).toBe('bajo');
    expect(riesgoGarrapata(25, 40)).toBe('bajo');
  });
});

describe('riesgo de sequía', () => {
  it('es alto sin lluvias recientes ni pronosticadas', () => {
    expect(riesgoSequia(12, 2)).toBe('alto');
  });
  it('baja si se pronostican lluvias', () => {
    expect(riesgoSequia(12, 25)).toBe('medio');
  });
  it('es bajo con lluvias normales', () => {
    expect(riesgoSequia(80, 0)).toBe('bajo');
  });
});

describe('describirTiempo', () => {
  it('traduce los códigos WMO', () => {
    expect(describirTiempo(0).icono).toBe('sol');
    expect(describirTiempo(3).texto).toBe('Nublado');
    expect(describirTiempo(61)).toEqual({ texto: 'Lluvia', icono: 'lluvia' });
    expect(describirTiempo(95).icono).toBe('tormenta');
  });
});
