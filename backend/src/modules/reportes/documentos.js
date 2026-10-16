// Reportes descargables (RF13): informe de lote y reporte mensual en PDF, planilla en Excel.

import ExcelJS from 'exceljs';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/errores.js';
import { aFecha, formatoISO, hoy, sumarDias } from '../../utils/fechas.js';
import { ETIQUETAS, fmtFecha, fmtGdp, fmtKg, fmtMoneda, fmtNumero } from '../../utils/formato.js';
import { conIndicadores } from '../../services/indicadores.js';
import { redondear } from '../../services/calculos.js';
import { costosLote } from './reportes.service.js';
import { listar as listarPesadas } from '../pesadas/pesadas.service.js';
import { listarEventos, listarBajas } from '../sanidad/sanidad.service.js';
import { COLOR, finalizar, graficoLinea, indicadores, nuevoDocumento, parrafo, seccion, tabla } from './pdf.js';

const sumar = (lista, campo) => redondear(lista.reduce((t, x) => t + Number(x[campo] ?? 0), 0), 2);

/* ------------------------------------------------------------------ */
/* Informe de lote (también sirve como informe de cierre)              */
/* ------------------------------------------------------------------ */

export async function informeLote(loteId) {
  const [costos, pesadas, eventos, bajas] = await Promise.all([
    costosLote(loteId),
    listarPesadas({ loteId }),
    listarEventos({ loteId }),
    listarBajas({ loteId }),
  ]);
  const { lote, conversion } = costos;
  const ind = lote.indicadores;
  const cerrado = lote.estado === 'CERRADO';

  const doc = nuevoDocumento(cerrado ? 'Informe de cierre de lote' : 'Informe de lote', lote.nombre);

  seccion(doc, 'Datos del lote');
  parrafo(
    doc,
    `Ingreso: ${fmtFecha(lote.fechaIngreso)} · ${lote.cantidadInicial} animales · ${fmtKg(lote.pesoIngreso)} promedio · ` +
      `objetivo ${fmtKg(lote.pesoObjetivo)} con GDP de ${fmtGdp(lote.gdpObjetivo)}.` +
      (cerrado ? ` Cerrado el ${fmtFecha(lote.fechaCierre)} con ${fmtKg(lote.pesoFinal, 1)} de peso final.` : ' Estado: activo.'),
  );

  seccion(doc, 'Indicadores');
  indicadores(doc, [
    ['Días en feedlot', fmtNumero(ind.diasEnFeedlot)],
    ['Cabezas actuales', `${ind.cabezasActuales} (${ind.bajas} baja/s)`],
    [cerrado ? 'Peso final' : 'Peso actual', fmtKg(ind.pesoActual, 1)],
    ['Última GDP', fmtGdp(ind.ultimaGdp)],
    ['Conversión alimenticia', conversion.acumulada ? `${fmtNumero(conversion.acumulada, 2)} : 1` : '-'],
    [cerrado ? 'Llegó al objetivo' : 'Llegada estimada', cerrado ? (ind.alcanzoObjetivo ? 'Sí' : 'No') : fmtFecha(ind.fechaEstimadaObjetivo)],
  ]);

  seccion(doc, 'Evolución del peso promedio');
  graficoLinea(
    doc,
    [{ fecha: lote.fechaIngreso, valor: Number(lote.pesoIngreso) }, ...pesadas.map((p) => ({ fecha: p.fecha, valor: Number(p.pesoPromedio) }))],
    { referencia: Number(lote.pesoObjetivo) },
  );
  tabla(
    doc,
    [
      { titulo: 'Fecha', ancho: 2 },
      { titulo: 'Peso promedio', ancho: 2, alinear: 'right' },
      { titulo: 'GDP', ancho: 2, alinear: 'right' },
      { titulo: 'Conversión (kg MS / kg)', ancho: 3, alinear: 'right' },
    ],
    pesadas.map((p) => [fmtFecha(p.fecha), fmtKg(p.pesoPromedio, 1), fmtGdp(p.gdp), p.conversion ? fmtNumero(p.conversion, 2) : '-']),
    { vacio: 'Sin pesadas registradas.' },
  );

  seccion(doc, 'Alimentación');
  tabla(
    doc,
    [
      { titulo: 'Insumo', ancho: 4 },
      { titulo: 'Kg entregados', ancho: 2, alinear: 'right' },
      { titulo: 'Costo', ancho: 2, alinear: 'right' },
    ],
    costos.alimentacionPorInsumo.map((a) => [a.insumo, fmtKg(a.kg), fmtMoneda(a.costo)]),
  );

  seccion(doc, 'Sanidad');
  const realizados = eventos.filter((e) => e.estado === 'REALIZADO');
  const pendientes = eventos.filter((e) => e.estado === 'PENDIENTE');
  tabla(
    doc,
    [
      { titulo: 'Fecha', ancho: 2 },
      { titulo: 'Evento', ancho: 4 },
      { titulo: 'Producto / dosis', ancho: 4 },
      { titulo: 'Costo', ancho: 2, alinear: 'right' },
    ],
    realizados.map((e) => [fmtFecha(e.fechaRealizada), e.nombre, [e.producto, e.dosis].filter(Boolean).join(' · ') || '-', fmtMoneda(e.costo)]),
    { vacio: 'Sin eventos realizados.' },
  );
  if (pendientes.length) {
    parrafo(doc, `Eventos pendientes: ${pendientes.map((e) => `${e.nombre} (${fmtFecha(e.fechaProgramada)})`).join('; ')}.`, { color: COLOR.gris, tamano: 9 });
  }
  if (bajas.length) {
    tabla(
      doc,
      [
        { titulo: 'Fecha de baja', ancho: 2 },
        { titulo: 'Cantidad', ancho: 1, alinear: 'right' },
        { titulo: 'Causa', ancho: 2 },
        { titulo: 'Observaciones', ancho: 5 },
      ],
      bajas.map((b) => [fmtFecha(b.fecha), b.cantidad, ETIQUETAS.causaBaja[b.causa], b.observaciones ?? '-']),
    );
  }

  seccion(doc, 'Resultado económico');
  indicadores(doc, [
    ['Costo de alimentación', fmtMoneda(ind.costoAlimentacion)],
    ['Costo sanitario', fmtMoneda(ind.costoSanitario)],
    ['Costo total de engorde', fmtMoneda(ind.costoTotal)],
    ['Carne estimada al gancho', fmtKg(ind.kgCarneEstimados)],
    ['Costo por kg de carne', fmtMoneda(ind.costoPorKgCarne, 2)],
    ['Margen bruto de engorde', ind.precioVentaKg ? fmtMoneda(ind.margenBruto) : 'Sin precio de venta'],
  ]);
  parrafo(
    doc,
    `Kg de carne = peso × cabezas × rendimiento al gancho (${fmtNumero(ind.rendimientoGancho * 100)} %). ` +
      'El costo corresponde a la etapa de engorde (alimentación + sanidad); no incluye el valor del animal al ingresar.',
    { color: COLOR.gris, tamano: 8.5 },
  );

  return finalizar(doc);
}

/* ------------------------------------------------------------------ */
/* Reporte mensual                                                     */
/* ------------------------------------------------------------------ */

/** 'AAAA-MM' → { desde, hasta (exclusivo), titulo }. */
export function rangoMes(mes) {
  const desde = aFecha(`${mes}-01`);
  const hasta = new Date(Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth() + 1, 1));
  const titulo = desde.toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return { desde, hasta, titulo: titulo.charAt(0).toUpperCase() + titulo.slice(1) };
}

export async function reporteMensual(mes) {
  const { desde, hasta, titulo } = rangoMes(mes);
  if (desde > hoy()) throw new AppError(400, 'El mes todavía no empezó');
  const enRango = { gte: desde, lt: hasta };

  const [alimentacion, eventos, bajas, compras, pesadas, insumos] = await Promise.all([
    prisma.registroAlimentacion.findMany({ where: { fecha: enRango }, include: { lote: { select: { nombre: true } }, insumo: { select: { nombre: true } } } }),
    prisma.eventoSanitario.findMany({ where: { estado: 'REALIZADO', fechaRealizada: enRango }, include: { lote: { select: { nombre: true } } }, orderBy: { fechaRealizada: 'asc' } }),
    prisma.baja.findMany({ where: { fecha: enRango }, include: { lote: { select: { nombre: true } } }, orderBy: { fecha: 'asc' } }),
    prisma.compraInsumo.findMany({ where: { fecha: enRango }, include: { insumo: { select: { nombre: true } } }, orderBy: { fecha: 'asc' } }),
    prisma.pesada.findMany({ where: { fecha: enRango }, include: { lote: { select: { nombre: true } } }, orderBy: { fecha: 'asc' } }),
    prisma.insumo.findMany({ orderBy: { nombre: 'asc' } }),
  ]);

  // Costos del mes por lote.
  const lotes = [...new Set([...alimentacion, ...eventos, ...bajas].map((r) => r.lote.nombre))].sort();
  const porLote = lotes.map((nombre) => {
    const alim = alimentacion.filter((r) => r.lote.nombre === nombre);
    const san = eventos.filter((e) => e.lote.nombre === nombre);
    return {
      nombre,
      kg: sumar(alim, 'kg'),
      costoAlim: sumar(alim, 'costo'),
      costoSan: sumar(san, 'costo'),
      bajas: bajas.filter((b) => b.lote.nombre === nombre).reduce((t, b) => t + b.cantidad, 0),
    };
  });
  const totalAlim = sumar(alimentacion, 'costo');
  const totalSan = sumar(eventos, 'costo');

  const doc = nuevoDocumento('Reporte mensual', titulo);

  seccion(doc, 'Resumen del mes');
  indicadores(doc, [
    ['Costo de alimentación', fmtMoneda(totalAlim)],
    ['Costo sanitario', fmtMoneda(totalSan)],
    ['Costo total', fmtMoneda(totalAlim + totalSan)],
    ['Compras de insumos', fmtMoneda(sumar(compras, 'precioTotal'))],
    ['Eventos sanitarios realizados', fmtNumero(eventos.length)],
    ['Bajas', fmtNumero(bajas.reduce((t, b) => t + b.cantidad, 0))],
  ]);

  seccion(doc, 'Costos por lote');
  tabla(
    doc,
    [
      { titulo: 'Lote', ancho: 4 },
      { titulo: 'Kg de alimento', ancho: 2, alinear: 'right' },
      { titulo: 'Alimentación', ancho: 2, alinear: 'right' },
      { titulo: 'Sanidad', ancho: 2, alinear: 'right' },
      { titulo: 'Total', ancho: 2, alinear: 'right' },
      { titulo: 'Bajas', ancho: 1, alinear: 'right' },
    ],
    porLote.map((l) => [l.nombre, fmtKg(l.kg), fmtMoneda(l.costoAlim), fmtMoneda(l.costoSan), fmtMoneda(l.costoAlim + l.costoSan), l.bajas]),
    { vacio: 'Sin actividad en el mes.' },
  );

  seccion(doc, 'Insumos');
  tabla(
    doc,
    [
      { titulo: 'Insumo', ancho: 4 },
      { titulo: 'Consumido', ancho: 2, alinear: 'right' },
      { titulo: 'Comprado', ancho: 2, alinear: 'right' },
      { titulo: 'Monto comprado', ancho: 2, alinear: 'right' },
      { titulo: 'Stock actual', ancho: 2, alinear: 'right' },
    ],
    insumos.map((i) => [
      i.nombre,
      fmtKg(sumar(alimentacion.filter((r) => r.insumoId === i.id), 'kg')),
      fmtKg(sumar(compras.filter((c) => c.insumoId === i.id), 'cantidadKg')),
      fmtMoneda(sumar(compras.filter((c) => c.insumoId === i.id), 'precioTotal')),
      fmtKg(i.stockKg),
    ]),
  );

  seccion(doc, 'Pesadas del mes');
  tabla(
    doc,
    [
      { titulo: 'Fecha', ancho: 2 },
      { titulo: 'Lote', ancho: 4 },
      { titulo: 'Peso promedio', ancho: 2, alinear: 'right' },
      { titulo: 'GDP', ancho: 2, alinear: 'right' },
    ],
    pesadas.map((p) => [fmtFecha(p.fecha), p.lote.nombre, fmtKg(p.pesoPromedio, 1), fmtGdp(p.gdp)]),
    { vacio: 'Sin pesadas en el mes.' },
  );

  seccion(doc, 'Sanidad del mes');
  tabla(
    doc,
    [
      { titulo: 'Fecha', ancho: 2 },
      { titulo: 'Lote', ancho: 3 },
      { titulo: 'Evento', ancho: 4 },
      { titulo: 'Costo', ancho: 2, alinear: 'right' },
    ],
    eventos.map((e) => [fmtFecha(e.fechaRealizada), e.lote.nombre, e.nombre, fmtMoneda(e.costo)]),
    { vacio: 'Sin eventos realizados en el mes.' },
  );
  if (bajas.length) {
    tabla(
      doc,
      [
        { titulo: 'Fecha de baja', ancho: 2 },
        { titulo: 'Lote', ancho: 3 },
        { titulo: 'Cantidad', ancho: 1, alinear: 'right' },
        { titulo: 'Causa', ancho: 2 },
      ],
      bajas.map((b) => [fmtFecha(b.fecha), b.lote.nombre, b.cantidad, ETIQUETAS.causaBaja[b.causa]]),
    );
  }

  return finalizar(doc);
}

/* ------------------------------------------------------------------ */
/* Planilla Excel (para el contador)                                   */
/* ------------------------------------------------------------------ */

const FORMATO = { moneda: '"$" #,##0.00', kg: '#,##0.00', entero: '#,##0', fecha: 'dd/mm/yyyy', gdp: '0.000' };

function agregarHoja(libro, nombre, columnas, filas) {
  const hoja = libro.addWorksheet(nombre, { views: [{ state: 'frozen', ySplit: 1 }] });
  hoja.columns = columnas.map((c) => ({ header: c.titulo, key: c.clave, width: c.ancho ?? 14, style: c.formato ? { numFmt: FORMATO[c.formato] } : {} }));
  hoja.addRows(filas);
  const encabezado = hoja.getRow(1);
  encabezado.font = { bold: true, color: { argb: 'FF2B2A22' } };
  encabezado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8DCC6' } };
  hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } };
  return hoja;
}

/** Fecha para Excel: las fechas de negocio son días sin hora (se envían como fecha local). */
const fechaExcel = (f) => (f ? new Date(`${formatoISO(f)}T12:00:00`) : null);

export async function planillaExcel({ desde, hasta }) {
  const fin = hasta ?? hoy();
  const inicio = desde ?? sumarDias(fin, -365);
  if (inicio > fin) throw new AppError(400, 'La fecha "desde" es posterior a "hasta"');
  const enRango = { gte: inicio, lte: fin };

  const [lotes, alimentacion, compras, eventos, bajas, pesadas] = await Promise.all([
    prisma.lote.findMany({ orderBy: { fechaIngreso: 'asc' } }).then((l) => conIndicadores(l)),
    prisma.registroAlimentacion.findMany({ where: { fecha: enRango }, orderBy: [{ fecha: 'asc' }, { id: 'asc' }], include: { lote: { select: { nombre: true } }, insumo: { select: { nombre: true } }, usuario: { select: { nombre: true } } } }),
    prisma.compraInsumo.findMany({ where: { fecha: enRango }, orderBy: { fecha: 'asc' }, include: { insumo: { select: { nombre: true } }, usuario: { select: { nombre: true } } } }),
    prisma.eventoSanitario.findMany({ where: { fechaProgramada: enRango }, orderBy: { fechaProgramada: 'asc' }, include: { lote: { select: { nombre: true } } } }),
    prisma.baja.findMany({ where: { fecha: enRango }, orderBy: { fecha: 'asc' }, include: { lote: { select: { nombre: true } } } }),
    prisma.pesada.findMany({ where: { fecha: enRango }, orderBy: { fecha: 'asc' }, include: { lote: { select: { nombre: true } } } }),
  ]);

  const libro = new ExcelJS.Workbook();
  libro.creator = 'GanadoTrack';
  libro.created = new Date();

  agregarHoja(libro, 'Lotes', [
    { titulo: 'Lote', clave: 'nombre', ancho: 30 },
    { titulo: 'Estado', clave: 'estado', ancho: 10 },
    { titulo: 'Ingreso', clave: 'ingreso', formato: 'fecha', ancho: 12 },
    { titulo: 'Cierre', clave: 'cierre', formato: 'fecha', ancho: 12 },
    { titulo: 'Animales al ingreso', clave: 'inicial', formato: 'entero' },
    { titulo: 'Cabezas actuales', clave: 'cabezas', formato: 'entero' },
    { titulo: 'Peso ingreso (kg)', clave: 'pesoIngreso', formato: 'kg' },
    { titulo: 'Peso actual (kg)', clave: 'pesoActual', formato: 'kg' },
    { titulo: 'Última GDP', clave: 'gdp', formato: 'gdp' },
    { titulo: 'Costo alimentación', clave: 'costoAlim', formato: 'moneda', ancho: 18 },
    { titulo: 'Costo sanidad', clave: 'costoSan', formato: 'moneda', ancho: 16 },
    { titulo: 'Costo total', clave: 'costoTotal', formato: 'moneda', ancho: 18 },
    { titulo: 'Kg carne estimados', clave: 'kgCarne', formato: 'kg', ancho: 16 },
    { titulo: 'Costo por kg', clave: 'costoKg', formato: 'moneda' },
    { titulo: 'Precio venta por kg', clave: 'precio', formato: 'moneda', ancho: 16 },
    { titulo: 'Margen bruto', clave: 'margen', formato: 'moneda', ancho: 18 },
  ], lotes.map((l) => ({
    nombre: l.nombre,
    estado: ETIQUETAS.estadoLote[l.estado],
    ingreso: fechaExcel(l.fechaIngreso),
    cierre: fechaExcel(l.fechaCierre),
    inicial: l.cantidadInicial,
    cabezas: l.indicadores.cabezasActuales,
    pesoIngreso: Number(l.pesoIngreso),
    pesoActual: l.indicadores.pesoActual,
    gdp: l.indicadores.ultimaGdp,
    costoAlim: l.indicadores.costoAlimentacion,
    costoSan: l.indicadores.costoSanitario,
    costoTotal: l.indicadores.costoTotal,
    kgCarne: l.indicadores.kgCarneEstimados,
    costoKg: l.indicadores.costoPorKgCarne,
    precio: l.indicadores.precioVentaKg,
    margen: l.indicadores.margenBruto,
  })));

  agregarHoja(libro, 'Alimentación', [
    { titulo: 'Fecha', clave: 'fecha', formato: 'fecha', ancho: 12 },
    { titulo: 'Lote', clave: 'lote', ancho: 30 },
    { titulo: 'Insumo', clave: 'insumo', ancho: 26 },
    { titulo: 'Kg', clave: 'kg', formato: 'kg' },
    { titulo: 'Precio por kg', clave: 'precioKg', formato: 'moneda' },
    { titulo: 'Costo', clave: 'costo', formato: 'moneda', ancho: 16 },
    { titulo: 'Cargó', clave: 'usuario', ancho: 22 },
  ], alimentacion.map((r) => ({
    fecha: fechaExcel(r.fecha), lote: r.lote.nombre, insumo: r.insumo.nombre, kg: Number(r.kg),
    precioKg: Number(r.precioKg), costo: Number(r.costo), usuario: r.usuario.nombre,
  })));

  agregarHoja(libro, 'Compras', [
    { titulo: 'Fecha', clave: 'fecha', formato: 'fecha', ancho: 12 },
    { titulo: 'Insumo', clave: 'insumo', ancho: 26 },
    { titulo: 'Cantidad (kg)', clave: 'kg', formato: 'kg' },
    { titulo: 'Precio total', clave: 'total', formato: 'moneda', ancho: 18 },
    { titulo: 'Precio por kg', clave: 'precioKg', formato: 'moneda' },
    { titulo: 'Registró', clave: 'usuario', ancho: 22 },
  ], compras.map((c) => ({
    fecha: fechaExcel(c.fecha), insumo: c.insumo.nombre, kg: Number(c.cantidadKg), total: Number(c.precioTotal),
    precioKg: redondear(Number(c.precioTotal) / Number(c.cantidadKg), 2), usuario: c.usuario.nombre,
  })));

  agregarHoja(libro, 'Sanidad', [
    { titulo: 'Fecha programada', clave: 'programada', formato: 'fecha', ancho: 14 },
    { titulo: 'Fecha realizada', clave: 'realizada', formato: 'fecha', ancho: 14 },
    { titulo: 'Lote', clave: 'lote', ancho: 30 },
    { titulo: 'Tipo', clave: 'tipo', ancho: 16 },
    { titulo: 'Evento', clave: 'evento', ancho: 34 },
    { titulo: 'Producto', clave: 'producto', ancho: 24 },
    { titulo: 'Dosis', clave: 'dosis', ancho: 14 },
    { titulo: 'Costo', clave: 'costo', formato: 'moneda' },
    { titulo: 'Estado', clave: 'estado', ancho: 12 },
  ], eventos.map((e) => ({
    programada: fechaExcel(e.fechaProgramada), realizada: fechaExcel(e.fechaRealizada), lote: e.lote.nombre,
    tipo: ETIQUETAS.tipoEvento[e.tipo], evento: e.nombre, producto: e.producto, dosis: e.dosis,
    costo: Number(e.costo), estado: e.estado === 'REALIZADO' ? 'Realizado' : 'Pendiente',
  })));

  agregarHoja(libro, 'Pesadas', [
    { titulo: 'Fecha', clave: 'fecha', formato: 'fecha', ancho: 12 },
    { titulo: 'Lote', clave: 'lote', ancho: 30 },
    { titulo: 'Peso promedio (kg)', clave: 'peso', formato: 'kg', ancho: 18 },
    { titulo: 'GDP (kg/día)', clave: 'gdp', formato: 'gdp' },
  ], pesadas.map((p) => ({ fecha: fechaExcel(p.fecha), lote: p.lote.nombre, peso: Number(p.pesoPromedio), gdp: Number(p.gdp) })));

  agregarHoja(libro, 'Bajas', [
    { titulo: 'Fecha', clave: 'fecha', formato: 'fecha', ancho: 12 },
    { titulo: 'Lote', clave: 'lote', ancho: 30 },
    { titulo: 'Cantidad', clave: 'cantidad', formato: 'entero' },
    { titulo: 'Causa', clave: 'causa', ancho: 14 },
    { titulo: 'Observaciones', clave: 'observaciones', ancho: 40 },
  ], bajas.map((b) => ({ fecha: fechaExcel(b.fecha), lote: b.lote.nombre, cantidad: b.cantidad, causa: ETIQUETAS.causaBaja[b.causa], observaciones: b.observaciones })));

  return Buffer.from(await libro.xlsx.writeBuffer());
}
