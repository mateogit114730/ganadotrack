import { describe, it, expect } from 'vitest';
import { planificarEventos } from '../../src/services/protocolo.js';
import { aFecha, formatoISO } from '../../src/utils/fechas.js';

const INGRESO = aFecha('2026-10-01');
const items = [
  { tipo: 'VACUNA', nombre: 'Clostridial', producto: 'Polivalente', diaDesdeIngreso: 0, repetirCadaDias: null, aplicaciones: 1 },
  { tipo: 'VACUNA', nombre: 'Refuerzo', producto: null, diaDesdeIngreso: 21, repetirCadaDias: null, aplicaciones: 1 },
  { tipo: 'GARRAPATA', nombre: 'Control garrapata', producto: null, diaDesdeIngreso: 21, repetirCadaDias: 21, aplicaciones: 3 },
];

describe('planificarEventos (RF10)', () => {
  it('genera cada evento en ingreso + día, con las repeticiones numeradas', () => {
    const eventos = planificarEventos(items, INGRESO, { desde: INGRESO });
    expect(eventos.map((e) => [formatoISO(e.fechaProgramada), e.nombre])).toEqual([
      ['2026-10-01', 'Clostridial'],
      ['2026-10-22', 'Refuerzo'],
      ['2026-10-22', 'Control garrapata (1/3)'],
      ['2026-11-12', 'Control garrapata (2/3)'],
      ['2026-12-03', 'Control garrapata (3/3)'],
    ]);
  });

  it('omite las fechas anteriores a "desde" para lotes cargados con atraso', () => {
    const eventos = planificarEventos(items, INGRESO, { desde: aFecha('2026-10-25') });
    expect(eventos.map((e) => e.nombre)).toEqual(['Control garrapata (2/3)', 'Control garrapata (3/3)']);
  });

  it('puede incluir las fechas pasadas si se pide', () => {
    expect(planificarEventos(items, INGRESO, { desde: aFecha('2026-10-25'), omitirPasadas: false })).toHaveLength(5);
  });
});
