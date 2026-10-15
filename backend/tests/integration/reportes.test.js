// RF13: reportes PDF y planilla Excel (issue #24).
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import ExcelJS from 'exceljs';
import { api, auth, prisma, limpiarBase, prepararUsuarios, crearInsumos, crearLote, fechaRelativa } from './helpers.js';

let tokens, insumos, lote;

/** Supertest no decodifica binarios por defecto: se juntan los bytes de la respuesta. */
const binario = (res, cb) => {
  const partes = [];
  res.on('data', (p) => partes.push(p));
  res.on('end', () => cb(null, Buffer.concat(partes)));
};

beforeEach(async () => {
  await limpiarBase();
  tokens = await prepararUsuarios();
  insumos = await crearInsumos();
  lote = await crearLote(tokens.admin, { nombre: 'Lote Ñandú 1' });
  await api().post('/api/alimentacion').set(auth(tokens.admin))
    .send({ loteId: lote.id, fecha: fechaRelativa(-1), items: [{ insumoId: insumos.silaje.id, kg: 500 }] });
  await api().post('/api/pesadas').set(auth(tokens.admin)).send({ loteId: lote.id, fecha: fechaRelativa(0), pesoPromedio: 392 });
});

afterAll(() => prisma.$disconnect());

describe('Reportes descargables', () => {
  it('CP-72 informe de lote en PDF con nombre de archivo seguro', async () => {
    const res = await api().get(`/api/reportes/lotes/${lote.id}/informe.pdf`).set(auth(tokens.admin)).buffer().parse(binario);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('informe-lote-nandu-1.pdf');
    expect(res.body.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('CP-73 reporte mensual en PDF y validación del mes', async () => {
    const mes = fechaRelativa(0).slice(0, 7);
    const ok = await api().get('/api/reportes/mensual.pdf').query({ mes }).set(auth(tokens.admin)).buffer().parse(binario);
    expect(ok.status).toBe(200);
    expect(ok.body.subarray(0, 4).toString()).toBe('%PDF');

    expect((await api().get('/api/reportes/mensual.pdf').query({ mes: '2026-13' }).set(auth(tokens.admin))).status).toBe(400);
  });

  it('CP-74 planilla Excel con una hoja por tipo de dato', async () => {
    const res = await api().get('/api/reportes/planilla.xlsx').set(auth(tokens.admin)).buffer().parse(binario);
    expect(res.status).toBe(200);

    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(res.body);
    expect(libro.worksheets.map((h) => h.name)).toEqual(['Lotes', 'Alimentación', 'Compras', 'Sanidad', 'Pesadas', 'Bajas']);
    const alimentacion = libro.getWorksheet('Alimentación').getRow(2).values;
    expect(alimentacion).toEqual(expect.arrayContaining(['Lote Ñandú 1', 'Silaje', 500, 20000]));
    expect(libro.getWorksheet('Lotes').getRow(2).getCell(1).value).toBe('Lote Ñandú 1');
  });

  it('CP-75 los reportes son solo para el administrador', async () => {
    expect((await api().get('/api/reportes/planilla.xlsx').set(auth(tokens.encargado))).status).toBe(403);
    expect((await api().get(`/api/reportes/lotes/${lote.id}/informe.pdf`).set(auth(tokens.veterinario))).status).toBe(403);
  });
});
