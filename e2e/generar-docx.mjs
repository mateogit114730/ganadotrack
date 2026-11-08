// Convierte el documento final en Markdown (docs/entregas/GanadoTrack_EntregaFinal.md, armado con ensamblar.py)
// a Word, con portada, índice automático, figuras y tablas numeradas, y los colores del sistema.
// Uso: node generar-docx.mjs [entrada.md] [salida.docx]
// El índice se completa al abrir el documento en Word (o con actualizar-docx.ps1, que además exporta el PDF).
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import * as d from 'docx';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ENTRADA = process.argv[2] ?? path.join(AQUI, '../docs/entregas/GanadoTrack_EntregaFinal.md');
const SALIDA = process.argv[3] ?? path.join(AQUI, '../docs/entregas/GanadoTrack_EntregaFinal.docx');
const BASE = path.dirname(ENTRADA);

// Paleta "Campo cálido" (frontend/src/theme.js)
const C = { bosque: '1F5E2C', tierra: '8B6B43', crema: 'F6F1E4', hoja: 'EAF2DF', tinta: '2B2A22', linea: 'D9D2BF', gris: '6B6658' };
const FUENTE = 'Arial';
const MONO = 'Consolas';

// A4 con márgenes de 2,5 cm (en DXA: 1 cm = 567)
const PAGINA = { ancho: 11906, alto: 16838, margen: 1418 };
const ANCHO_TEXTO = PAGINA.ancho - 2 * PAGINA.margen; // 9070 DXA
const DXA_A_PX = 96 / 1440;
const MAX_PX = { ancho: Math.floor(ANCHO_TEXTO * DXA_A_PX), alto: 760 };
const MAX_PX_APAISADO = { ancho: Math.floor((PAGINA.alto - 2 * PAGINA.margen) * DXA_A_PX), alto: 540 };

let nFigura = 0;
let nTabla = 0;
let nLista = 0;
let ultimoTitulo = '';
let pieDeTabla = null;

const desescapar = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function tamanoPng(ruta) {
  const b = readFileSync(ruta);
  return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20), datos: b };
}

function escalar({ ancho, alto }, max) {
  const f = Math.min(1, max.ancho / ancho, max.alto / alto);
  return { width: Math.round(ancho * f), height: Math.round(alto * f) };
}

// ---------- Texto en línea ----------
function enLinea(tokens = [], estilo = {}) {
  const runs = [];
  for (const t of tokens) {
    switch (t.type) {
      case 'text':
      case 'escape':
        if (t.tokens?.length) runs.push(...enLinea(t.tokens, estilo));
        else runs.push(new d.TextRun({ text: desescapar(t.text), ...estilo }));
        break;
      case 'strong':
        runs.push(...enLinea(t.tokens, { ...estilo, bold: true }));
        break;
      case 'em':
        runs.push(...enLinea(t.tokens, { ...estilo, italics: true }));
        break;
      case 'del':
        runs.push(...enLinea(t.tokens, { ...estilo, strike: true }));
        break;
      case 'codespan':
        runs.push(new d.TextRun({ text: desescapar(t.text), ...estilo, font: MONO, size: (estilo.size ?? 21) - 2, shading: { type: d.ShadingType.CLEAR, fill: C.crema, color: 'auto' } }));
        break;
      case 'link':
        if (/^https?:\/\//.test(t.href)) {
          runs.push(new d.ExternalHyperlink({ link: t.href, children: enLinea(t.tokens, { ...estilo, color: C.bosque, underline: {} }) }));
        } else {
          runs.push(...enLinea(t.tokens, estilo));
        }
        break;
      case 'br':
        runs.push(new d.TextRun({ text: '', break: 1 }));
        break;
      case 'image':
        runs.push(new d.TextRun({ text: t.text, ...estilo }));
        break;
      case 'html':
        if (/<br\s*\/?>/i.test(t.text)) runs.push(new d.TextRun({ text: '', break: 1 }));
        break;
      default:
        if (t.text) runs.push(new d.TextRun({ text: desescapar(t.text), ...estilo }));
    }
  }
  return runs;
}

const textoPlano = (tokens = []) =>
  tokens.map((t) => (t.tokens ? textoPlano(t.tokens) : desescapar(t.text ?? ''))).join('');

// ---------- Figuras ----------
function pie(texto, tipo) {
  const numero = tipo === 'Figura' ? ++nFigura : ++nTabla;
  return new d.Paragraph({
    alignment: tipo === 'Figura' ? d.AlignmentType.CENTER : d.AlignmentType.LEFT,
    spacing: tipo === 'Figura' ? { before: 60, after: 240 } : { before: 200, after: 80 },
    keepNext: tipo === 'Tabla',
    children: [
      new d.TextRun({ text: `${tipo} ${numero}. `, bold: true, italics: true, size: 18, color: C.tierra }),
      new d.TextRun({ text: texto, italics: true, size: 18, color: C.tierra }),
    ],
  });
}

function imagen(t, max) {
  const ruta = path.resolve(BASE, decodeURI(t.href));
  const png = tamanoPng(ruta);
  if (/logo/i.test(path.basename(ruta))) max = { ancho: 240, alto: 240 };
  else if (ruta.includes(`${path.sep}diagramas${path.sep}`) && max === MAX_PX) max = { ...MAX_PX, alto: 900 };
  return { png, run: new d.ImageRun({ type: 'png', data: png.datos, transformation: escalar(png, max), altText: { title: t.text, description: t.text, name: path.basename(ruta) } }) };
}

const esApaisada = (png) => png.ancho / png.alto >= 2.6 && png.ancho >= 1600;

// ---------- Bloques ----------
// Devuelve una lista de párrafos/tablas; las figuras apaisadas se devuelven como { apaisada: [...] }.
function bloques(tokens, ctx = {}) {
  const salida = [];
  for (const t of tokens) {
    switch (t.type) {
      case 'heading': {
        const texto = textoPlano(t.tokens);
        ultimoTitulo = texto.replace(/^[\d.]+\s+/, '').replace(/^Anexo [IVX]+:\s*/, '');
        const nivel = [d.HeadingLevel.HEADING_1, d.HeadingLevel.HEADING_2, d.HeadingLevel.HEADING_3, d.HeadingLevel.HEADING_4][Math.min(t.depth, 4) - 1];
        const saltoDePagina = t.depth === 1 && !/^[2-8]\. /.test(texto);
        salida.push(new d.Paragraph({ heading: nivel, pageBreakBefore: saltoDePagina, children: enLinea(t.tokens) }));
        break;
      }
      case 'paragraph': {
        const contenido = t.tokens.filter((x) => !(x.type === 'text' && !x.text.trim()) && x.type !== 'br');
        if (contenido.length && contenido.every((x) => x.type === 'image')) {
          for (const im of contenido) {
            const { png } = imagen(im, MAX_PX);
            if (esApaisada(png) && !ctx.enTabla) {
              const { run } = imagen(im, MAX_PX_APAISADO);
              salida.push({ apaisada: [new d.Paragraph({ alignment: d.AlignmentType.CENTER, keepNext: true, children: [run] }), pie(im.text, 'Figura')] });
            } else {
              const { run } = imagen(im, MAX_PX);
              salida.push(new d.Paragraph({ alignment: d.AlignmentType.CENTER, keepNext: true, spacing: { before: 120 }, children: [run] }), pie(im.text, 'Figura'));
            }
          }
          break;
        }
        const plano = textoPlano(t.tokens);
        if (plano.startsWith('Tabla: ')) {
          pieDeTabla = plano.slice(7).trim();
          break;
        }
        const parrafo = new d.Paragraph({
          alignment: ctx.cita ? d.AlignmentType.LEFT : d.AlignmentType.JUSTIFIED,
          spacing: { after: 120, line: 276 },
          indent: ctx.cita ? { left: 567 } : undefined,
          border: ctx.cita ? { left: { style: d.BorderStyle.SINGLE, size: 12, color: C.tierra, space: 8 } } : undefined,
          children: enLinea(t.tokens, ctx.cita ? { italics: true, color: C.tinta } : {}),
        });
        parrafo.esParrafo = true;
        salida.push(parrafo);
        break;
      }
      case 'list':
        salida.push(...lista(t, 0, ctx));
        break;
      case 'table':
        salida.push(...tabla(t));
        break;
      case 'code':
        salida.push(...codigo(t.text));
        break;
      case 'blockquote':
        salida.push(...bloques(t.tokens, { ...ctx, cita: true }));
        break;
      default:
        break; // space, hr, html
    }
  }
  return salida;
}

function lista(t, nivel, ctx) {
  const salida = [];
  const instancia = ++nLista;
  for (const item of t.items) {
    const prefijo = item.task ? [new d.TextRun({ text: item.checked ? '☑ ' : '☐ ' })] : [];
    let primero = true;
    for (const tk of item.tokens) {
      if (tk.type === 'list') {
        salida.push(...lista(tk, nivel + 1, ctx));
      } else if (tk.type === 'text' || tk.type === 'paragraph') {
        const runs = [...(primero ? prefijo : []), ...enLinea(tk.tokens ?? [{ type: 'text', text: tk.text }], ctx.cita ? { italics: true } : {})];
        salida.push(new d.Paragraph({
          numbering: primero ? (t.ordered ? { reference: 'numeros', level: nivel, instance: instancia } : { reference: 'vinetas', level: nivel }) : undefined,
          indent: primero ? undefined : { left: 720 * (nivel + 1) },
          spacing: { after: 60, line: 264 },
          children: runs,
        }));
        primero = false;
      } else if (tk.type === 'code') {
        salida.push(...codigo(tk.text));
      } else if (tk.type === 'table') {
        salida.push(...tabla(tk));
      }
    }
  }
  return salida;
}

function codigo(texto) {
  const lineas = texto.replace(/\s+$/, '').split('\n');
  return lineas.map((linea, i) => new d.Paragraph({
    spacing: { before: i === 0 ? 80 : 0, after: i === lineas.length - 1 ? 160 : 0, line: 240 },
    shading: { type: d.ShadingType.CLEAR, fill: C.crema, color: 'auto' },
    indent: { left: 227, right: 227 },
    keepLines: true,
    children: [new d.TextRun({ text: linea.replace(/\t/g, '  ') || ' ', font: MONO, size: 16, color: C.tinta })],
  }));
}

const BORDE = { style: d.BorderStyle.SINGLE, size: 4, color: C.linea };
const BORDES = { top: BORDE, bottom: BORDE, left: BORDE, right: BORDE };
const SIN_BORDE = { style: d.BorderStyle.NONE, size: 0, color: 'FFFFFF' };

function anchosDeColumna(t) {
  const largo = (celda) => Math.min(60, Math.max(6, textoPlano(celda.tokens).length));
  const pesos = t.header.map((h, i) => Math.max(largo(h), ...t.rows.map((r) => largo(r[i] ?? { tokens: [] }))));
  const total = pesos.reduce((a, b) => a + b, 0);
  const anchos = pesos.map((p) => Math.max(900, Math.round((p / total) * ANCHO_TEXTO)));
  const exceso = anchos.reduce((a, b) => a + b, 0) - ANCHO_TEXTO;
  const iMayor = anchos.indexOf(Math.max(...anchos));
  anchos[iMayor] -= exceso;
  return anchos;
}

function tabla(t) {
  if ([...t.header, ...t.rows.flat()].some((c) => c.tokens.some((x) => x.type === 'image'))) return tablaDeImagenes(t);

  const anchos = anchosDeColumna(t);
  const titulo = pieDeTabla ?? ultimoTitulo;
  pieDeTabla = null;
  const celda = (c, i, encabezado, fila) => new d.TableCell({
    width: { size: anchos[i], type: d.WidthType.DXA },
    borders: BORDES,
    shading: { type: d.ShadingType.CLEAR, color: 'auto', fill: encabezado ? C.bosque : fila % 2 ? 'FFFDF8' : 'FFFFFF' },
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    children: [new d.Paragraph({
      alignment: t.align[i] === 'right' ? d.AlignmentType.RIGHT : t.align[i] === 'center' ? d.AlignmentType.CENTER : d.AlignmentType.LEFT,
      children: enLinea(c.tokens, encabezado ? { bold: true, color: 'FFFFFF', size: 17 } : { size: 17 }),
    })],
  });
  return [
    pie(titulo, 'Tabla'),
    new d.Table({
      width: { size: ANCHO_TEXTO, type: d.WidthType.DXA },
      columnWidths: anchos,
      rows: [
        new d.TableRow({ tableHeader: true, cantSplit: true, children: t.header.map((c, i) => celda(c, i, true, 0)) }),
        ...t.rows.map((r, f) => new d.TableRow({ cantSplit: true, children: t.header.map((_, i) => celda(r[i] ?? { tokens: [] }, i, false, f)) })),
      ],
    }),
    new d.Paragraph({ spacing: { after: 120 }, children: [] }),
  ];
}

function tablaDeImagenes(t) {
  const filas = [t.header, ...t.rows];
  const columnas = t.header.length;
  const ancho = Math.floor(ANCHO_TEXTO / columnas);
  const max = { ancho: Math.floor(ancho * DXA_A_PX) - 12, alto: 430 };
  const textos = [];
  const rows = filas.map((r) => new d.TableRow({
    children: r.map((c) => {
      const ims = c.tokens.filter((x) => x.type === 'image');
      textos.push(...ims.map((x) => x.text));
      const rotulo = textoPlano(c.tokens.filter((x) => x.type !== 'image')).trim();
      return new d.TableCell({
        width: { size: ancho, type: d.WidthType.DXA },
        borders: { top: SIN_BORDE, bottom: SIN_BORDE, left: SIN_BORDE, right: SIN_BORDE },
        children: [new d.Paragraph({
          alignment: d.AlignmentType.CENTER,
          spacing: { after: 60 },
          children: ims.length ? ims.map((x) => imagen(x, max).run) : [new d.TextRun({ text: rotulo, bold: true, size: 18, color: C.bosque })],
        })],
      });
    }),
  }));
  pieDeTabla = null;
  return [
    new d.Table({ width: { size: ANCHO_TEXTO, type: d.WidthType.DXA }, columnWidths: Array(columnas).fill(ancho), rows }),
    pie(textos.join(' · ') || ultimoTitulo, 'Figura'),
  ];
}

// ---------- Portada ----------
function portada() {
  const logo = tamanoPng(path.join(AQUI, '../frontend/public/logo.png'));
  const dato = (etiqueta, valor) => new d.Paragraph({
    alignment: d.AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new d.TextRun({ text: `${etiqueta}: `, bold: true, color: C.bosque, size: 23 }), new d.TextRun({ text: valor, size: 23 })],
  });
  return [
    new d.Paragraph({ alignment: d.AlignmentType.CENTER, spacing: { before: 600, after: 200 }, children: [new d.ImageRun({ type: 'png', data: logo.datos, transformation: { width: 220, height: 220 }, altText: { title: 'Logo', description: 'Logo de GanadoTrack', name: 'logo' } })] }),
    new d.Paragraph({ alignment: d.AlignmentType.CENTER, spacing: { after: 120 }, children: [new d.TextRun({ text: 'GanadoTrack', bold: true, size: 64, color: C.bosque, font: FUENTE })] }),
    new d.Paragraph({ alignment: d.AlignmentType.CENTER, spacing: { after: 120 }, children: [new d.TextRun({ text: 'Sistema web de gestión de feedlot bovino', size: 30, color: C.tierra })] }),
    new d.Paragraph({
      alignment: d.AlignmentType.CENTER,
      spacing: { before: 200, after: 700 },
      border: { top: { style: d.BorderStyle.SINGLE, size: 8, color: C.tierra, space: 10 }, bottom: { style: d.BorderStyle.SINGLE, size: 8, color: C.tierra, space: 10 } },
      children: [new d.TextRun({ text: 'Documentación del Proyecto Final de Software', bold: true, size: 28 })],
    }),
    dato('Institución', 'IFES UCASAL'),
    dato('Carrera', 'Tecnicatura Superior en Análisis de Sistemas'),
    dato('Materia', 'Práctica Profesionalizante II'),
    dato('Alumno', 'Mateo Agustín Sgüerzo – Legajo N.° 4261'),
    dato('Docente', 'Silvia Hoferek'),
    dato('Versión del sistema', 'ganadotrack-1.1.1.1'),
    dato('Fecha', 'Noviembre de 2026'),
  ];
}

function indice() {
  return [
    new d.Paragraph({ spacing: { after: 240 }, children: [new d.TextRun({ text: 'Índice', bold: true, size: 36, color: C.bosque })] }),
    new d.TableOfContents('Índice', { hyperlink: true, headingStyleRange: '1-2' }),
  ];
}

// ---------- Secciones ----------
const encabezado = () => new d.Header({
  children: [new d.Paragraph({
    alignment: d.AlignmentType.RIGHT,
    border: { bottom: { style: d.BorderStyle.SINGLE, size: 4, color: C.linea, space: 4 } },
    children: [new d.TextRun({ text: 'GanadoTrack – Documentación del Proyecto Final', size: 16, color: C.gris })],
  })],
});
const pieDePagina = () => new d.Footer({
  children: [new d.Paragraph({
    alignment: d.AlignmentType.CENTER,
    children: [new d.TextRun({ children: ['Página ', d.PageNumber.CURRENT, ' de ', d.PageNumber.TOTAL_PAGES], size: 16, color: C.gris })],
  })],
});
const seccion = (children, apaisada = false) => ({
  properties: {
    page: {
      size: { width: PAGINA.ancho, height: PAGINA.alto, orientation: apaisada ? d.PageOrientation.LANDSCAPE : d.PageOrientation.PORTRAIT },
      margin: { top: PAGINA.margen, bottom: PAGINA.margen, left: PAGINA.margen, right: PAGINA.margen },
    },
  },
  headers: { default: encabezado() },
  footers: { default: pieDePagina() },
  children,
});

const md = readFileSync(ENTRADA, 'utf8');
const cuerpo = bloques(marked.lexer(md));

const secciones = [
  { properties: { page: { size: { width: PAGINA.ancho, height: PAGINA.alto }, margin: { top: PAGINA.margen, bottom: PAGINA.margen, left: PAGINA.margen, right: PAGINA.margen } } }, children: portada() },
  seccion(indice()),
];
let actual = [];
let apaisada = null;
for (const b of cuerpo) {
  if (b.apaisada) {
    const descripcion = actual.length && actual[actual.length - 1].esParrafo ? [actual.pop()] : [];
    if (actual.length) {
      secciones.push(seccion(actual));
      apaisada = null;
    }
    if (apaisada) apaisada.children.push(...descripcion, ...b.apaisada);
    else {
      apaisada = seccion([...descripcion, ...b.apaisada], true);
      secciones.push(apaisada);
    }
    actual = [];
  } else {
    actual.push(b);
  }
}
if (actual.length) secciones.push(seccion(actual));

const titulo = (tam, color, antes, despues) => ({ run: { font: FUENTE, size: tam, bold: true, color }, paragraph: { spacing: { before: antes, after: despues }, keepNext: true, keepLines: true } });
const niveles = (formato, textos) => textos.map((text, level) => ({ level, format: formato, text, alignment: d.AlignmentType.LEFT, style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } } }));

const doc = new d.Document({
  creator: 'Mateo Agustín Sgüerzo',
  title: 'GanadoTrack – Documentación del Proyecto Final',
  description: 'Proyecto Final de Software – Práctica Profesionalizante II (IFES UCASAL)',
  features: { updateFields: true },
  styles: {
    default: {
      document: { run: { font: FUENTE, size: 21, color: C.tinta } },
      heading1: titulo(32, C.bosque, 0, 200),
      heading2: titulo(26, C.bosque, 320, 120),
      heading3: titulo(23, C.tierra, 240, 100),
      heading4: titulo(21, C.tinta, 200, 80),
    },
  },
  numbering: {
    config: [
      { reference: 'vinetas', levels: niveles(d.LevelFormat.BULLET, ['•', '◦', '▪', '•']) },
      { reference: 'numeros', levels: niveles(d.LevelFormat.DECIMAL, ['%1.', '%2.', '%3.', '%4.']) },
    ],
  },
  sections: secciones,
});

writeFileSync(SALIDA, await d.Packer.toBuffer(doc));
console.log(`${path.basename(SALIDA)}: ${nFigura} figuras, ${nTabla} tablas, ${secciones.length} secciones`);
