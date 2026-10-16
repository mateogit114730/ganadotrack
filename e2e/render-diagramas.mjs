// Convierte a PNG los diagramas de la documentación (docs/entrega2/*.md) para el documento Word.
// - Mermaid: se dibuja en Microsoft Edge con la librería local (sin servicios externos), con los colores del sistema.
// - PlantUML (casos de uso): se genera con el servidor público de plantuml.com (solo contiene nombres de casos de uso).
// Uso: node render-diagramas.mjs [carpeta]   (por defecto ../docs/diagramas)
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { createRequire } from 'node:module';

const DOCS = new URL('../docs/entrega2/', import.meta.url);
const SALIDA = process.argv[2] ?? new URL('../docs/diagramas/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
mkdirSync(SALIDA, { recursive: true });

// Nombre de cada diagrama según el archivo y su orden de aparición.
const NOMBRES = {
  '14-cronograma.md': ['gantt'],
  '15-arquitectura-y-herramientas.md': ['arquitectura', 'secuencia-alimentacion', 'secuencia-sin-conexion', 'flujo-herramientas', 'despliegue'],
  '16-seguimiento.md': ['flujo-ramas'],
  'modelo-de-datos.md': ['der'],
};

const bloques = (archivo, lenguaje) =>
  [...readFileSync(new URL(archivo, DOCS), 'utf8').matchAll(new RegExp('```' + lenguaje + '\\r?\\n([\\s\\S]*?)```', 'g'))].map((m) => m[1]);

// ---------- Mermaid ----------
const mermaidJs = createRequire(import.meta.url).resolve('mermaid/dist/mermaid.min.js');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 2 });
await page.setContent('<html><body style="margin:0;background:#fff"><div id="lienzo" style="width:1400px;padding:24px;background:#fff"></div></body></html>');
await page.addScriptTag({ path: mermaidJs });
await page.evaluate(() => {
  window.mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    fontFamily: '"Segoe UI", "Nunito Sans", sans-serif',
    themeVariables: {
      primaryColor: '#EAF2DF', // hoja claro
      primaryBorderColor: '#1F5E2C', // bosque
      primaryTextColor: '#2B2A22', // tinta
      secondaryColor: '#F6F1E4', // crema
      tertiaryColor: '#FFFDF8',
      lineColor: '#8B6B43', // tierra
      clusterBkg: '#F6F1E4',
      clusterBorder: '#8B6B43',
      fontSize: '16px',
      // Gantt: hecho = hoja, en curso = ocre, pendiente = hoja claro, hoy = rojo teja
      taskBkgColor: '#D6E6C2',
      taskBorderColor: '#1F5E2C',
      doneTaskBkgColor: '#7CAB3E',
      doneTaskBorderColor: '#1F5E2C',
      activeTaskBkgColor: '#F2D49B',
      activeTaskBorderColor: '#C98A1B',
      taskTextColor: '#2B2A22',
      taskTextDarkColor: '#2B2A22',
      taskTextOutsideColor: '#2B2A22',
      taskTextLightColor: '#2B2A22',
      sectionBkgColor: '#F6F1E4',
      altSectionBkgColor: '#FFFDF8',
      sectionBkgColor2: '#F6F1E4',
      gridColor: '#D9D2BF',
      todayLineColor: '#B23A2E',
    },
    gantt: { useMaxWidth: false, barHeight: 30, barGap: 8, topPadding: 60, fontSize: 16, sectionFontSize: 16, leftPadding: 230, rightPadding: 60 },
    er: { useMaxWidth: false },
    flowchart: { useMaxWidth: false },
    sequence: { useMaxWidth: false },
  });
});

// El DER completo (12 entidades con todos sus campos) no entra legible en una hoja A4: se genera además
// una versión resumida, solo con las entidades y sus relaciones de negocio (los campos están en el diccionario de
// datos y la relación de auditoría con USUARIO, en la tabla de cardinalidades).
const derResumido = (codigo) =>
  codigo
    .replace(/^\s*direction \w+\s*$/m, '  direction LR')
    .replace(/^\s*[A-Z_]+ \{[\s\S]*?^\s*\}\s*$/gm, '') // sin campos
    .replace(/^\s*USUARIO .*$/gm, ''); // sin las relaciones de auditoría (quién cargó cada registro)

let total = 0;
for (const [archivo, nombresArchivo] of Object.entries(NOMBRES)) {
  let codigos = bloques(archivo, 'mermaid');
  const nombres = [...nombresArchivo];
  if (codigos.length !== nombres.length) throw new Error(`${archivo}: hay ${codigos.length} diagramas y ${nombres.length} nombres`);
  const iDer = nombres.indexOf('der');
  if (iDer >= 0) {
    codigos = [...codigos, derResumido(codigos[iDer])];
    nombres.push('der-resumido');
  }
  for (const [i, codigo] of codigos.entries()) {
    const error = await page.evaluate(async ({ codigo, id }) => {
      try {
        const { svg } = await window.mermaid.render(id, codigo);
        document.getElementById('lienzo').innerHTML = svg;
        return null;
      } catch (e) {
        return String(e.message ?? e);
      }
    }, { codigo, id: `d${total}` });
    if (error) throw new Error(`${archivo} (${nombres[i]}): ${error}`);
    await page.locator('#lienzo > svg').screenshot({ path: `${SALIDA}/${nombres[i]}.png` });
    console.log(`✓ ${nombres[i]}.png  (${archivo})`);
    total++;
  }
}
await browser.close();

// ---------- PlantUML: diagrama de casos de uso ----------
// Codificación de plantuml.com: deflate + base64 con su propio alfabeto.
const ALFABETO = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
function codificarPlantUml(texto) {
  const datos = deflateRawSync(Buffer.from(texto, 'utf8'), { level: 9 });
  let salida = '';
  for (let i = 0; i < datos.length; i += 3) {
    const [b1, b2 = 0, b3 = 0] = [datos[i], datos[i + 1], datos[i + 2]];
    salida += ALFABETO[b1 >> 2] + ALFABETO[((b1 & 0x3) << 4) | (b2 >> 4)] + ALFABETO[((b2 & 0xf) << 2) | (b3 >> 6)] + ALFABETO[b3 & 0x3f];
  }
  return salida;
}
const [casosDeUso] = bloques('13-casos-de-uso.md', 'plantuml');
const estilo = 'skinparam backgroundColor white\nskinparam defaultFontName "Segoe UI"\nskinparam usecase {\n BackgroundColor #EAF2DF\n BorderColor #1F5E2C\n}\nskinparam actorBorderColor #1F5E2C\nskinparam rectangleBorderColor #8B6B43\nskinparam ArrowColor #8B6B43\n';
const respuesta = await fetch(`https://www.plantuml.com/plantuml/png/${codificarPlantUml(casosDeUso.replace('@startuml\n', `@startuml\n${estilo}`))}`);
if (!respuesta.ok) throw new Error(`plantuml.com respondió ${respuesta.status}`);
writeFileSync(`${SALIDA}/casos-de-uso.png`, Buffer.from(await respuesta.arrayBuffer()));
console.log('✓ casos-de-uso.png  (13-casos-de-uso.md, plantuml.com)');
console.log(`\n${total + 1} diagramas en ${SALIDA}`);
