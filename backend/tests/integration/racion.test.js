// RF09: ración por lote, carga en 1 toque y conversión alimenticia (issue #20).
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, auth, prisma, limpiarBase, prepararUsuarios, crearInsumos, crearLote, fechaRelativa } from './helpers.js';

let tokens, insumos, lote;

beforeEach(async () => {
  await limpiarBase();
  tokens = await prepararUsuarios();
  insumos = await crearInsumos(); // suplemento $400/kg · silaje $40/kg
  lote = await crearLote(tokens.admin); // 100 cabezas
});

afterAll(() => prisma.$disconnect());

const definirRacion = (items, extra = {}, token = tokens.veterinario) =>
  api().put(`/api/lotes/${lote.id}/racion`).set(auth(token)).send({ items, ...extra });

describe('Ración por lote', () => {
  it('CP-52 el veterinario define la ración y se calculan los kg del día', async () => {
    const res = await definirRacion([
      { insumoId: insumos.suplemento.id, kgCabezaDia: 1.5 },
      { insumoId: insumos.silaje.id, kgCabezaDia: 15 },
    ]);
    expect(res.status).toBe(200);
    const kgDia = Object.fromEntries(res.body.vigente.map((r) => [r.insumoId, r.kgDia]));
    expect(kgDia[insumos.suplemento.id]).toBe(150);
    expect(kgDia[insumos.silaje.id]).toBe(1500);
  });

  it('CP-53 el encargado recibe la ración sugerida y la confirma en un solo envío', async () => {
    await definirRacion([
      { insumoId: insumos.suplemento.id, kgCabezaDia: 1.5 },
      { insumoId: insumos.silaje.id, kgCabezaDia: 15 },
    ]);
    const { body: opciones } = await api().get('/api/alimentacion/opciones').set(auth(tokens.encargado));
    const delLote = opciones.lotes.find((l) => l.id === lote.id);
    expect(delLote.cabezasActuales).toBe(100);
    expect(delLote.racionSugerida).toHaveLength(2);

    const items = delLote.racionSugerida.map((r) => ({ insumoId: r.insumoId, kg: r.kgDia }));
    const res = await api().post('/api/alimentacion').set(auth(tokens.encargado)).send({ loteId: lote.id, items });
    expect(res.status).toBe(201);
    expect(res.body.costoDia).toBe(150 * 400 + 1500 * 40);
  });

  it('CP-54 la ración tiene historial: un cambio a futuro no afecta hoy y 0 kg quita el insumo', async () => {
    await definirRacion([{ insumoId: insumos.suplemento.id, kgCabezaDia: 1.5 }]);
    await definirRacion([{ insumoId: insumos.suplemento.id, kgCabezaDia: 2 }], { vigenteDesde: fechaRelativa(1) });
    let res = await api().get(`/api/lotes/${lote.id}/racion`).set(auth(tokens.admin));
    expect(res.body.vigente[0].kgCabezaDia).toBe(1.5);
    expect(res.body.historial).toHaveLength(2);

    res = await definirRacion([{ insumoId: insumos.suplemento.id, kgCabezaDia: 0 }]);
    expect(res.body.vigente).toHaveLength(0);
  });

  it('CP-55 el encargado no puede modificar la ración', async () => {
    const res = await definirRacion([{ insumoId: insumos.silaje.id, kgCabezaDia: 10 }], {}, tokens.encargado);
    expect(res.status).toBe(403);
  });
});

describe('Conversión alimenticia', () => {
  it('CP-56 calcula kg de materia seca por kg ganado en cada pesada y acumulada', async () => {
    await prisma.insumo.update({ where: { id: insumos.silaje.id }, data: { materiaSecaPct: 35 } });
    // Dos días de alimentación: 100 kg de silaje por día = 35 kg MS por día.
    for (const dia of [-30, -29]) {
      await api().post('/api/alimentacion').set(auth(tokens.admin))
        .send({ loteId: lote.id, fecha: fechaRelativa(dia), items: [{ insumoId: insumos.silaje.id, kg: 100 }] });
    }
    await api().post('/api/pesadas').set(auth(tokens.admin))
      .send({ loteId: lote.id, fecha: fechaRelativa(0), pesoPromedio: 381 }); // +1 kg × 100 cabezas = 100 kg

    const { body: pesadas } = await api().get('/api/pesadas').query({ loteId: lote.id }).set(auth(tokens.admin));
    expect(pesadas[0].kgMs).toBe(70);
    expect(pesadas[0].conversion).toBe(0.7);

    const { body: costos } = await api().get(`/api/costos/${lote.id}`).set(auth(tokens.admin));
    expect(costos.conversion.acumulada).toBe(0.7);
  });
});
