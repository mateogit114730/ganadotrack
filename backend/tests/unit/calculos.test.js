import { describe, it, expect } from 'vitest';
import {
  calcularGdp,
  diasHastaObjetivo,
  fechaProyectada,
  cabezasActuales,
  kgCarneGancho,
  costoAlimentacion,
  costoPorKgCarne,
  margenBruto,
} from '../../src/services/calculos.js';
import { aFecha, formatoISO } from '../../src/utils/fechas.js';

describe('calcularGdp (RF04)', () => {
  it('calcula la ganancia diaria entre dos pesadas', () => {
    expect(calcularGdp(380, 395, 30)).toBe(0.5);
  });

  it('redondea a 3 decimales', () => {
    expect(calcularGdp(380, 400, 30)).toBe(0.667);
  });

  it('devuelve una GDP negativa si el lote perdió peso', () => {
    expect(calcularGdp(400, 394, 30)).toBe(-0.2);
  });

  it('rechaza 0 días entre pesadas', () => {
    expect(() => calcularGdp(380, 395, 0)).toThrow(RangeError);
  });
});

describe('diasHastaObjetivo y fechaProyectada (RF04)', () => {
  it('proyecta los días restantes redondeando hacia arriba', () => {
    // faltan 25 kg a 0,5 kg/día = 50 días
    expect(diasHastaObjetivo(395, 420, 0.5)).toBe(50);
    // faltan 25 kg a 0,6 kg/día = 41,67 → 42 días
    expect(diasHastaObjetivo(395, 420, 0.6)).toBe(42);
  });

  it('devuelve 0 si el lote ya alcanzó el objetivo', () => {
    expect(diasHastaObjetivo(421, 420, 0.5)).toBe(0);
  });

  it('no proyecta si la GDP es cero o negativa', () => {
    expect(diasHastaObjetivo(395, 420, 0)).toBeNull();
    expect(diasHastaObjetivo(395, 420, -0.2)).toBeNull();
    expect(fechaProyectada(aFecha('2026-10-01'), 395, 420, 0)).toBeNull();
  });

  it('calcula la fecha estimada desde la última pesada', () => {
    const fecha = fechaProyectada(aFecha('2026-10-01'), 395, 420, 0.5);
    expect(formatoISO(fecha)).toBe('2026-11-20');
  });
});

describe('cabezasActuales', () => {
  it('descuenta las bajas de la cantidad de ingreso', () => {
    expect(cabezasActuales(100, 3)).toBe(97);
    expect(cabezasActuales(100)).toBe(100);
  });

  it('nunca devuelve un número negativo', () => {
    expect(cabezasActuales(5, 8)).toBe(0);
  });
});

describe('costos y rentabilidad (RF02, RF06)', () => {
  it('calcula el costo diario de alimentación', () => {
    expect(costoAlimentacion(250, 420)).toBe(105000);
    expect(costoAlimentacion(0.1, 0.2)).toBe(0.02);
  });

  it('calcula los kg de carne al gancho con rendimiento 57 %', () => {
    // 400 kg × 97 cabezas × 0,57
    expect(kgCarneGancho(400, 97, 0.57)).toBe(22116);
  });

  it('calcula el costo por kg de carne', () => {
    expect(costoPorKgCarne(5_000_000, 22116)).toBe(226.08);
  });

  it('no calcula costo por kg sin kg de carne', () => {
    expect(costoPorKgCarne(1000, 0)).toBeNull();
  });

  it('calcula el margen bruto estimado', () => {
    // 22.116 kg × $ 8.000 − $ 5.000.000
    expect(margenBruto(8000, 22116, 5_000_000)).toBe(171_928_000);
  });

  it('no calcula el margen sin precio de venta', () => {
    expect(margenBruto(null, 22116, 5_000_000)).toBeNull();
  });
});
