import { describe, it, expect } from 'vitest';
import { clasificarEventoSanitario } from '../../src/services/alertas.js';
import { aFecha } from '../../src/utils/fechas.js';

const HOY = aFecha('2026-10-08');

describe('clasificarEventoSanitario (RF05: alerta 7 días antes)', () => {
  it('marca como VENCIDO un evento con fecha pasada', () => {
    expect(clasificarEventoSanitario(aFecha('2026-10-07'), HOY, 7)).toBe('VENCIDO');
  });

  it('marca como PROXIMO un evento de hoy', () => {
    expect(clasificarEventoSanitario(HOY, HOY, 7)).toBe('PROXIMO');
  });

  it('marca como PROXIMO un evento exactamente a 7 días', () => {
    expect(clasificarEventoSanitario(aFecha('2026-10-15'), HOY, 7)).toBe('PROXIMO');
  });

  it('no genera alerta para un evento a 8 días', () => {
    expect(clasificarEventoSanitario(aFecha('2026-10-16'), HOY, 7)).toBeNull();
  });

  it('respeta un parámetro de aviso distinto', () => {
    expect(clasificarEventoSanitario(aFecha('2026-10-16'), HOY, 10)).toBe('PROXIMO');
  });
});
