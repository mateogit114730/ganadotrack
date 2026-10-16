// Construcción de documentos PDF con la identidad visual de GanadoTrack (pdfkit).
// Se usan las fuentes estándar de PDF (Helvetica), que incluyen los caracteres del español.

import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'node:url';
import { fmtFecha } from '../../utils/formato.js';

const LOGO = fileURLToPath(new URL('../../docs/isotipo.png', import.meta.url));

export const COLOR = {
  bosque: '#1F5E2C',
  hoja: '#7CAB3E',
  tierra: '#8B6B43',
  tierraClara: '#E8DCC6',
  paja: '#F6F1E4',
  tinta: '#2B2A22',
  gris: '#6B6556',
  teja: '#B23A2E',
};

const MARGEN = 50;

/** Crea un documento A4 con el encabezado de GanadoTrack. */
export function nuevoDocumento(titulo, subtitulo) {
  const doc = new PDFDocument({ size: 'A4', margin: MARGEN, bufferPages: true, info: { Title: `${titulo} - ${subtitulo}`, Author: 'GanadoTrack' } });
  const ancho = doc.page.width - MARGEN * 2;

  doc.rect(0, 0, doc.page.width, 92).fill(COLOR.paja);
  doc.image(LOGO, MARGEN, 20, { width: 52 });
  doc.fillColor(COLOR.bosque).font('Helvetica-Bold').fontSize(20).text('ganado', MARGEN + 64, 26, { continued: true })
    .fillColor(COLOR.hoja).text('track');
  doc.fillColor(COLOR.gris).font('Helvetica').fontSize(9).text('Gestión de feedlot', MARGEN + 64, 50);
  doc.fillColor(COLOR.tinta).font('Helvetica-Bold').fontSize(14).text(titulo, MARGEN, 28, { width: ancho, align: 'right' });
  doc.font('Helvetica').fontSize(10).fillColor(COLOR.gris).text(subtitulo, MARGEN, 48, { width: ancho, align: 'right' });
  doc.moveTo(0, 92).lineTo(doc.page.width, 92).lineWidth(3).strokeColor(COLOR.hoja).stroke();
  doc.y = 112;
  doc.x = MARGEN;
  return doc;
}

const anchoUtil = (doc) => doc.page.width - MARGEN * 2;

/** Salta de página si no hay lugar para "alto" puntos. */
export function asegurarEspacio(doc, alto) {
  if (doc.y + alto > doc.page.height - MARGEN - 20) {
    doc.addPage();
    doc.y = MARGEN;
  }
}

export function seccion(doc, texto) {
  asegurarEspacio(doc, 60);
  doc.moveDown(0.6);
  doc.x = MARGEN;
  doc.fillColor(COLOR.bosque).font('Helvetica-Bold').fontSize(13).text(texto);
  const y = doc.y + 2;
  doc.moveTo(MARGEN, y).lineTo(MARGEN + anchoUtil(doc), y).lineWidth(0.8).strokeColor(COLOR.tierraClara).stroke();
  doc.y = y + 8;
}

export function parrafo(doc, texto, { color = COLOR.tinta, tamano = 10 } = {}) {
  asegurarEspacio(doc, 30);
  doc.x = MARGEN;
  doc.fillColor(color).font('Helvetica').fontSize(tamano).text(texto, { width: anchoUtil(doc) });
  doc.moveDown(0.3);
}

/** Tarjetas de indicadores: [[etiqueta, valor], ...] en filas de "columnas". */
export function indicadores(doc, items, columnas = 3) {
  const gap = 8;
  const ancho = (anchoUtil(doc) - gap * (columnas - 1)) / columnas;
  const alto = 46;
  for (let i = 0; i < items.length; i += columnas) {
    asegurarEspacio(doc, alto + gap);
    const y = doc.y;
    items.slice(i, i + columnas).forEach(([etiqueta, valor], j) => {
      const x = MARGEN + j * (ancho + gap);
      doc.roundedRect(x, y, ancho, alto, 6).lineWidth(0.8).fillAndStroke('#FFFDF8', COLOR.tierraClara);
      doc.fillColor(COLOR.gris).font('Helvetica').fontSize(8).text(etiqueta, x + 8, y + 7, { width: ancho - 16 });
      doc.fillColor(COLOR.tinta).font('Helvetica-Bold').fontSize(13).text(valor, x + 8, y + 22, { width: ancho - 16 });
    });
    doc.y = y + alto + gap;
  }
  doc.x = MARGEN;
}

/**
 * Tabla con encabezado, filas alternadas y salto de página (repite el encabezado).
 * columnas: [{ titulo, ancho (proporción), alinear: 'left' | 'right' }]
 */
export function tabla(doc, columnas, filas, { vacio = 'Sin datos.' } = {}) {
  const total = columnas.reduce((t, c) => t + c.ancho, 0);
  const anchos = columnas.map((c) => (c.ancho / total) * anchoUtil(doc));
  const altoFila = 18;

  const fila = (valores, y, { encabezado = false, sombreada = false } = {}) => {
    if (encabezado || sombreada) {
      doc.rect(MARGEN, y, anchoUtil(doc), altoFila).fill(encabezado ? COLOR.tierraClara : '#FBF8F0');
    }
    let x = MARGEN;
    valores.forEach((v, i) => {
      doc.fillColor(COLOR.tinta).font(encabezado ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5)
        .text(String(v ?? '-'), x + 5, y + 5, { width: anchos[i] - 10, align: columnas[i].alinear ?? 'left', lineBreak: false, ellipsis: true });
      x += anchos[i];
    });
  };

  // doc.text mueve el cursor: cada fila fija su posición y la siguiente arranca en y + altoFila.
  const dibujar = (valores, opciones) => {
    const y = doc.y;
    fila(valores, y, opciones);
    doc.y = y + altoFila;
  };

  asegurarEspacio(doc, altoFila * 2);
  dibujar(columnas.map((c) => c.titulo), { encabezado: true });
  if (!filas.length) dibujar([vacio, ...columnas.slice(1).map(() => '')]);
  filas.forEach((valores, n) => {
    if (doc.y + altoFila > doc.page.height - MARGEN - 20) {
      doc.addPage();
      doc.y = MARGEN;
      dibujar(columnas.map((c) => c.titulo), { encabezado: true });
    }
    dibujar(valores, { sombreada: n % 2 === 1 });
  });
  doc.x = MARGEN;
  doc.moveDown(0.5);
}

/** Gráfico de líneas simple (evolución del peso) con línea de referencia (objetivo). */
export function graficoLinea(doc, puntos, { referencia, etiquetaReferencia = 'Objetivo', unidad = 'kg', alto = 150 } = {}) {
  if (puntos.length < 2) {
    parrafo(doc, 'Se necesitan al menos dos mediciones para el gráfico.', { color: COLOR.gris });
    return;
  }
  asegurarEspacio(doc, alto + 30);
  const x0 = MARGEN + 40;
  const y0 = doc.y;
  const ancho = anchoUtil(doc) - 50;
  const valores = puntos.map((p) => p.valor).concat(referencia ?? []);
  const min = Math.floor(Math.min(...valores) - 5);
  const max = Math.ceil(Math.max(...valores) + 5);
  const tiempos = puntos.map((p) => p.fecha.getTime());
  const t0 = Math.min(...tiempos);
  const rangoT = Math.max(...tiempos) - t0 || 1;
  const px = (t) => x0 + ((t - t0) / rangoT) * ancho;
  const py = (v) => y0 + alto - ((v - min) / (max - min)) * alto;

  // ejes y grilla
  doc.lineWidth(0.5).strokeColor(COLOR.tierraClara);
  for (let i = 0; i <= 4; i++) {
    const v = min + ((max - min) * i) / 4;
    doc.moveTo(x0, py(v)).lineTo(x0 + ancho, py(v)).stroke();
    doc.fillColor(COLOR.gris).font('Helvetica').fontSize(7).text(`${Math.round(v)} ${unidad}`, MARGEN - 6, py(v) - 3, { width: 42, align: 'right' });
  }
  if (referencia !== undefined) {
    doc.dash(4, { space: 3 }).strokeColor(COLOR.hoja).lineWidth(1).moveTo(x0, py(referencia)).lineTo(x0 + ancho, py(referencia)).stroke().undash();
    doc.fillColor(COLOR.hoja).fontSize(7).text(etiquetaReferencia, x0 + ancho - 60, py(referencia) - 10, { width: 60, align: 'right' });
  }
  // línea
  doc.strokeColor(COLOR.bosque).lineWidth(2);
  puntos.forEach((p, i) => (i ? doc.lineTo(px(tiempos[i]), py(p.valor)) : doc.moveTo(px(tiempos[i]), py(p.valor))));
  doc.stroke();
  puntos.forEach((p, i) => {
    doc.circle(px(tiempos[i]), py(p.valor), 2.5).fill(COLOR.bosque);
    doc.fillColor(COLOR.gris).fontSize(7).text(fmtFecha(p.fecha).slice(0, 5), px(tiempos[i]) - 15, y0 + alto + 4, { width: 30, align: 'center' });
  });
  doc.y = y0 + alto + 18;
  doc.x = MARGEN;
}

/** Agrega el pie con número de página y devuelve el PDF como Buffer. */
export function finalizar(doc) {
  return new Promise((resolve, reject) => {
    const partes = [];
    doc.on('data', (p) => partes.push(p));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);

    const { start, count } = doc.bufferedPageRange();
    const generado = `Generado por GanadoTrack el ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`;
    for (let i = start; i < start + count; i++) {
      doc.switchToPage(i);
      // El pie va dentro del margen inferior: se anula el margen para que pdfkit no agregue otra página.
      doc.page.margins.bottom = 0;
      const y = doc.page.height - MARGEN + 10;
      doc.fillColor(COLOR.gris).font('Helvetica').fontSize(7.5);
      doc.text(generado, MARGEN, y, { width: 360, lineBreak: false });
      doc.text(`Página ${i + 1} de ${count}`, doc.page.width - MARGEN - 100, y, { width: 100, align: 'right', lineBreak: false });
    }
    doc.end();
  });
}
