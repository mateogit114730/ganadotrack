// RF11: proyección de stock de insumos y compra sugerida (issue #22).
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, auth, prisma, limpiarBase, prepararUsuarios, crearInsumos, crearLote, fechaRelativa } from './helpers.js';

let tokens, insumos, lote;

beforeEach(async () => {
  await limpiarBase();
  tokens = await prepararUsuarios();
  insumos = await crearInsumos(); // suplemento: 1.000 kg (mínimo 500) · silaje: 20.000 kg (mínimo 1.000)
  lote = await crearLote(tokens.admin); // 100 cabezas
});

afterAll(() => prisma.$disconnect());

const proyeccionDe = async (insumoId) => {
  const { body } = await api().get('/api/insumos').set(auth(tokens.admin));
  return body.find((i) => i.id === insumoId).proyeccion;
};

describe('Proyección de stock', () => {
  it('CP-64 con ración: calcula días de cobertura, quiebre, compra sugerida y alerta', async () => {
    await api().put(`/api/lotes/${lote.id}/racion`).set(auth(tokens.veterinario))
      .send({ items: [{ insumoId: insumos.suplemento.id, kgCabezaDia: 1.5 }] }); // 150 kg/día

    const p = await proyeccionDe(insumos.suplemento.id);
    expect(p.fuenteConsumo).toBe('racion');
    expect(p.consumoDiarioKg).toBe(150);
    expect(p.diasCobertura).toBe(6); // 1.000 / 150
    expect(p.fechaQuiebre.slice(0, 10)).toBe(fechaRelativa(6));
    expect(p.coberturaBaja).toBe(true);
    expect(p.compraSugeridaKg).toBe(1600); // 150 × 14 + 500 − 1.000

    const alertas = await api().get('/api/alertas').set(auth(tokens.admin));
    expect(alertas.body.some((a) => a.tipo === 'STOCK_PROYECTADO' && a.insumoId === insumos.suplemento.id)).toBe(true);
  });

  it('CP-65 sin ración: usa el consumo real promedio de los últimos 14 días', async () => {
    for (const dia of [-3, -2]) {
      await api().post('/api/alimentacion').set(auth(tokens.admin))
        .send({ loteId: lote.id, fecha: fechaRelativa(dia), items: [{ insumoId: insumos.silaje.id, kg: 700 }] });
    }
    const p = await proyeccionDe(insumos.silaje.id);
    expect(p.fuenteConsumo).toBe('historial');
    expect(p.consumoDiarioKg).toBe(100); // 1.400 kg / 14 días
    expect(p.diasCobertura).toBe(186); // 18.600 / 100
    expect(p.coberturaBaja).toBe(false);
  });

  it('CP-66 el mínimo de días de cobertura es configurable', async () => {
    await api().put(`/api/lotes/${lote.id}/racion`).set(auth(tokens.veterinario))
      .send({ items: [{ insumoId: insumos.suplemento.id, kgCabezaDia: 1.5 }] });
    await api().put('/api/parametros/dias_cobertura_minima').set(auth(tokens.admin)).send({ valor: 3 });

    expect((await proyeccionDe(insumos.suplemento.id)).coberturaBaja).toBe(false);
    const alertas = await api().get('/api/alertas').set(auth(tokens.admin));
    expect(alertas.body.some((a) => a.tipo === 'STOCK_PROYECTADO')).toBe(false);
  });
});
