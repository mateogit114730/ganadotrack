// Genera la presentación de la defensa (docs/entregas/GanadoTrack_Defensa.pptx) con los colores del sistema,
// las capturas y los diagramas de la documentación, y notas del orador en cada diapositiva.
// Uso: node generar-presentacion.mjs [salida.pptx]
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import pptxgen from 'pptxgenjs';
import QRCode from 'qrcode';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');
const SALIDA = process.argv[2] ?? path.join(RAIZ, 'docs/entregas/GanadoTrack_Defensa.pptx');
const APP = 'https://ganadotrack.vercel.app';
const REPO = 'https://github.com/mateogit114730/ganadotrack';

const THEME = {
  name: 'Campo calido',
  headFontFace: 'Cambria',
  bodyFontFace: 'Calibri',
  colors: {
    dk1: '2B2A22', lt1: 'FFFFFF', dk2: '1F5E2C', lt2: 'F1F6EA',
    accent1: '1F5E2C', accent2: '7CAB3E', accent3: '8B6B43', accent4: 'C98A1B', accent5: 'A33A22', accent6: 'D6E6C2',
    hlink: '1F5E2C', folHlink: '8B6B43',
  },
};
const MUTED = '6B6658';

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13,33" × 7,5"
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = 'GanadoTrack – Defensa del Proyecto Final';
pres.author = 'Mateo Agustín Sgüerzo';
pres.subject = 'Práctica Profesionalizante II – IFES UCASAL';
const C = pres.SchemeColor;

const archivo = (...p) => path.join(RAIZ, ...p);
const LOGO = archivo('frontend/public/logo-420.png');
const ISOTIPO = archivo('frontend/public/isotipo-192.png');

function tamano(ruta) {
  const b = readFileSync(ruta);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
// Imagen que entra en la caja (x, y, w, h) sin deformarse, centrada en ella.
function imagen(slide, ruta, x, y, w, h, nombre, alinear = 'centro') {
  const t = tamano(ruta);
  const f = Math.min(w / t.w, h / t.h);
  const iw = t.w * f;
  const ih = t.h * f;
  const ix = alinear === 'izquierda' ? x : x + (w - iw) / 2;
  slide.addImage({ path: ruta, x: ix, y: y + (h - ih) / 2, w: iw, h: ih, objectName: nombre, altText: nombre });
  return { x: ix, y: y + (h - ih) / 2, w: iw, h: ih };
}
const sombra = () => ({ type: 'outer', blur: 8, offset: 2, angle: 90, color: '000000', opacity: 0.12 });
function tarjeta(slide, x, y, w, h, nombre, relleno = C.background2) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: relleno }, line: { type: 'none' }, shadow: sombra(), objectName: nombre });
}
function circulo(slide, x, y, d, texto, relleno = C.accent1, tam = 16) {
  slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: relleno }, line: { type: 'none' }, objectName: `circulo ${texto}` });
  slide.addText(texto, { x, y, w: d, h: d, align: 'center', valign: 'middle', fontSize: tam, bold: true, color: C.background1, margin: 0, isTextBox: true });
}
function texto(slide, t, x, y, w, h, op = {}) {
  slide.addText(t, { x, y, w, h, fontSize: 15, color: C.text1, valign: 'top', margin: 0, isTextBox: true, paraSpaceAfter: 4, ...op });
}
const vinetas = (items, op = {}) => items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1, ...op } }));

// ---------- Diseños ----------
pres.defineSlideMaster({
  title: 'PORTADA',
  background: { color: THEME.colors.accent1 },
  objects: [],
});
pres.defineSlideMaster({
  title: 'CONTENIDO',
  background: { color: 'FFFFFF' },
  margin: [0.5, 0.6, 0.6, 0.6],
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 0.35, w: 12.1, h: 0.85, fontSize: 30, bold: true, color: C.accent1, align: 'left', valign: 'middle', margin: 0 }, text: '' } },
    { image: { x: 0.6, y: 6.93, w: 0.32, h: 0.32, path: ISOTIPO, altText: 'Isotipo de GanadoTrack' } },
    { text: { text: 'GanadoTrack · Proyecto Final de Software', options: { x: 1.0, y: 6.93, w: 6, h: 0.32, fontSize: 10, color: MUTED, valign: 'middle', margin: 0 } } },
  ],
  slideNumber: { x: 12.1, y: 6.93, w: 0.6, h: 0.32, fontSize: 10, color: MUTED, align: 'right' },
});

const contenido = (titulo, seccion) => {
  const s = pres.addSlide({ masterName: 'CONTENIDO', sectionTitle: seccion });
  s.addText(titulo, { placeholder: 'title' });
  return s;
};

// ---------- 1. Portada ----------
pres.addSection({ title: 'Inicio' });
{
  const s = pres.addSlide({ masterName: 'PORTADA', sectionTitle: 'Inicio' });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.55, y: 1.35, w: 4.2, h: 4.2, rectRadius: 0.3, fill: { color: C.background1 }, line: { type: 'none' }, objectName: 'marco del logo' });
  imagen(s, LOGO, 8.8, 1.6, 3.7, 3.7, 'Logo de GanadoTrack');
  texto(s, 'GanadoTrack', 0.8, 1.7, 7.4, 1.1, { fontFace: THEME.headFontFace, fontSize: 60, bold: true, color: C.background1 });
  texto(s, 'Sistema web de gestión de feedlot bovino', 0.8, 2.85, 7.4, 0.6, { fontSize: 24, color: C.accent6 });
  texto(s, 'Defensa del Proyecto Final de Software · Práctica Profesionalizante II', 0.8, 3.75, 7.4, 0.5, { fontSize: 16, color: C.background1 });
  texto(s, [
    { text: 'Mateo Agustín Sgüerzo', options: { bold: true, breakLine: true } },
    { text: 'Docente: Silvia Hoferek', options: { breakLine: true } },
    { text: 'IFES UCASAL · Tecnicatura Superior en Análisis de Sistemas · Noviembre de 2026' },
  ], 0.8, 5.0, 7.4, 1.2, { fontSize: 15, color: C.accent6 });
  s.addNotes('Presentación. GanadoTrack es un sistema web para que un productor ganadero con feedlot conozca su costo por kilo de carne y no pierda el control sanitario de sus animales. Voy a contar el problema, cómo lo relevé, la solución, cómo está construida y cómo la verifiqué, y después muestro la aplicación funcionando.');
}

// ---------- 2. El problema ----------
pres.addSection({ title: 'Problema y análisis' });
{
  const s = contenido('Un feedlot manejado de memoria', 'Problema y análisis');
  const datos = [
    ['26', 'vacas muertas por anaplasmosis', 'La garrapata avanzó sin control: ≈ USD 26.000 de pérdida', C.accent5],
    ['¿$/kg?', 'costo de producción desconocido', 'El productor no sabe cuánto le cuesta producir un kilo de carne', C.accent4],
    ['0', 'registros administrativos', 'Todo se maneja en papel, de palabra o por WhatsApp', C.accent3],
  ];
  datos.forEach(([n, l, d, color], i) => {
    const x = 0.6 + i * 4.1;
    tarjeta(s, x, 1.55, 3.85, 3.3, `dato ${i + 1}`);
    texto(s, n, x + 0.3, 1.8, 3.25, 1.2, { fontFace: THEME.headFontFace, fontSize: 60, bold: true, color });
    texto(s, l, x + 0.3, 3.0, 3.25, 0.7, { fontSize: 18, bold: true });
    texto(s, d, x + 0.3, 3.75, 3.25, 0.9, { fontSize: 14, color: MUTED });
  });
  texto(s, [
    { text: '“Por falta de seguimiento sanitario y control de los tratamientos antiparasitarios, el sistema inmune de los animales colapsó. Perdimos 26 vacas.”', options: { italic: true, breakLine: true } },
    { text: '— El productor, en la entrevista de relevamiento', options: { fontSize: 13, color: MUTED } },
  ], 0.9, 5.25, 11.6, 1.3, { fontSize: 18, color: C.accent1 });
  s.addNotes('El caso es real: un establecimiento de ciclo completo, raza Angus, con 450 a 600 cabezas. Los dos dolores principales que salieron del relevamiento son estos: perdieron 26 vacas por anaplasmosis porque nadie llevaba el control de los tratamientos contra la garrapata, y el productor no conoce su costo por kilo de carne. Además no había ningún registro: todo en papel, de palabra o por WhatsApp.');
}

// ---------- 3. Relevamiento ----------
{
  const s = contenido('Relevamiento: qué dijo el productor', 'Problema y análisis');
  tarjeta(s, 0.6, 1.5, 4.3, 5.1, 'método');
  texto(s, 'Cómo se relevó', 0.9, 1.75, 3.7, 0.5, { fontFace: THEME.headFontFace, fontSize: 20, bold: true, color: C.accent1 });
  texto(s, vinetas([
    'Entrevista semiestructurada en 9 bloques (0 a 8)',
    'Por WhatsApp, con audios de cierre para acordar el alcance',
    'Angus · 450–600 cabezas · 500 ha',
    'Feedlot de 90–100 días: 380 → 420 kg',
    'Suplemento comprado + silaje propio',
  ]), 0.9, 2.35, 3.8, 4.0, { fontSize: 15, paraSpaceAfter: 8 });
  const hallazgos = [
    ['No conoce su costo de producción', 'El cálculo de costo por kg es lo de mayor valor'],
    ['Perdió 26 vacas por falta de control', 'Calendario sanitario automático y alertas'],
    ['Trabaja por tropa, no por animal', 'El sistema gestiona lotes'],
    ['El veterinario define la ración y avisa por WhatsApp', 'El veterinario usa el sistema'],
    ['Sequías: compras de urgencia', 'Proyección de stock y riesgo de sequía'],
  ];
  hallazgos.forEach(([h, i], k) => {
    const y = 1.55 + k * 1.0;
    circulo(s, 5.3, y + 0.12, 0.55, String(k + 1));
    texto(s, h, 6.05, y + 0.02, 6.6, 0.4, { fontSize: 16, bold: true });
    texto(s, `→ ${i}`, 6.05, y + 0.45, 6.6, 0.4, { fontSize: 14, color: MUTED });
  });
  s.addNotes('Hice una entrevista semiestructurada de nueve bloques por WhatsApp y la cerré con audios en los que acordamos el alcance: solo la etapa de feedlot, porque el ciclo completo tiene demasiadas variables. Cada hallazgo se convirtió en una decisión de diseño; por ejemplo, como trabaja por tropa, el sistema gestiona lotes y no animales individuales.');
}

// ---------- 4. Objetivo y alcance ----------
{
  const s = contenido('Objetivo y alcance', 'Problema y análisis');
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 1.45, w: 12.1, h: 1.35, rectRadius: 0.12, fill: { color: C.accent1 }, line: { type: 'none' }, objectName: 'objetivo' });
  texto(s, [
    { text: 'Objetivo: ', options: { bold: true, color: C.accent6 } },
    { text: 'que el productor conozca en tiempo real su costo por kg de carne, la evolución de peso de sus lotes y el estado sanitario de sus animales, sin registros en papel.' },
  ], 0.95, 1.6, 11.4, 1.05, { fontSize: 18, color: C.background1, valign: 'middle' });
  texto(s, 'Incluye', 0.6, 3.1, 7.4, 0.45, { fontFace: THEME.headFontFace, fontSize: 20, bold: true, color: C.accent1 });
  const modulos = ['Lotes', 'Alimentación diaria', 'Ración en un toque', 'Stock y compras', 'Proyección de stock', 'Pesadas y GDP', 'Sanidad y alertas', 'Protocolos sanitarios', 'Costos y margen', 'Clima y riesgos', 'Dashboard', 'Reportes PDF y Excel', 'App instalable sin señal', 'Usuarios y roles'];
  modulos.forEach((m, i) => {
    const col = i % 3;
    const fila = Math.floor(i / 3);
    const x = 0.6 + col * 2.5;
    const y = 3.65 + fila * 0.6;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 2.35, h: 0.48, rectRadius: 0.1, fill: { color: C.background2 }, line: { type: 'none' }, objectName: `módulo ${m}` });
    texto(s, m, x + 0.12, y, 2.15, 0.48, { fontSize: 13, valign: 'middle', color: C.accent1, bold: true });
  });
  texto(s, 'No incluye', 8.4, 3.1, 4.3, 0.45, { fontFace: THEME.headFontFace, fontSize: 20, bold: true, color: C.accent3 });
  texto(s, vinetas([
    'Ciclo completo (cría, parición, recría)',
    'Identificación individual por caravana',
    'Integración con el SENASA',
    'App nativa (es una PWA instalable)',
    'Valor del animal al ingreso y gastos generales',
  ]), 8.4, 3.65, 4.3, 3.0, { fontSize: 15, paraSpaceAfter: 8 });
  s.addNotes('El objetivo principal se mantiene desde la primera entrega. En la versión final el alcance pasó de MVP a sistema terminado: se sumaron ración en un toque, protocolos sanitarios, proyección de stock, clima, reportes y la carga sin señal. Los límites están acordados con el productor: no se modela el ciclo completo ni animales individuales, y el costo es de engorde, sin el valor del animal al ingresar; por eso el margen sale alto.');
}

// ---------- 5. Usuarios ----------
{
  const s = contenido('Tres usuarios, tres formas de usarlo', 'Problema y análisis');
  const roles = [
    ['A', 'Administrador', 'El productor', 'PC o celular', ['Dashboard, lotes y costos', 'Stock, reportes y usuarios', 'Configuración del campo'], 'Consulta diaria de indicadores'],
    ['E', 'Encargado', 'Prepara la comida', 'Celular en el corral', ['Solo la carga de la alimentación', 'Un toque por lote', 'Funciona sin señal'], 'Uno o dos toques por lote, cada día'],
    ['V', 'Veterinario', 'Profesional de cabecera', 'Celular o PC', ['Sanidad, tratamientos y bajas', 'Protocolos sanitarios', 'Raciones de cada lote'], 'Carga en cada visita'],
  ];
  roles.forEach(([l, rol, quien, disp, puede, uso], i) => {
    const x = 0.6 + i * 4.1;
    tarjeta(s, x, 1.5, 3.85, 4.1, `rol ${rol}`);
    circulo(s, x + 0.3, 1.8, 0.8, l, [C.accent1, C.accent2, C.accent3][i], 24);
    texto(s, rol, x + 1.3, 1.8, 2.4, 0.45, { fontFace: THEME.headFontFace, fontSize: 21, bold: true, color: C.accent1 });
    texto(s, `${quien} · ${disp}`, x + 1.3, 2.25, 2.45, 0.45, { fontSize: 13, color: MUTED });
    texto(s, vinetas(puede), x + 0.3, 3.0, 3.3, 2.0, { fontSize: 15, paraSpaceAfter: 8 });
    texto(s, uso, x + 0.3, 4.75, 3.3, 0.6, { fontSize: 14, italic: true, color: C.accent3 });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 5.95, w: 12.1, h: 0.7, rectRadius: 0.1, fill: { color: C.accent1 }, line: { type: 'none' }, objectName: 'nota de permisos' });
  texto(s, 'Los permisos se verifican en el servidor en cada petición (RBAC): ocultar un botón no alcanza como seguridad.', 0.9, 5.95, 11.5, 0.7, { fontSize: 15, color: C.background1, valign: 'middle' });
  s.addNotes('Los tres roles los definió el propio productor en la entrevista. Cada uno ve solo lo suyo, y eso se controla en el servidor, no ocultando botones. La pantalla del encargado está pensada para usarse con una mano en el corral: botones grandes, modo pleno sol y carga sin conexión.');
}

// ---------- 6. Requerimientos ----------
{
  const s = contenido('14 requerimientos funcionales y 7 no funcionales', 'Problema y análisis');
  const rf = ['Lotes', 'Alimentación', 'Stock', 'Pesadas y GDP', 'Sanidad y alertas', 'Costos', 'Dashboard', 'Usuarios y roles', 'Ración y conversión', 'Protocolos', 'Proyección de stock', 'Clima y riesgos', 'Reportes', 'Sin conexión'];
  rf.forEach((n, i) => {
    const col = i % 7;
    const fila = Math.floor(i / 7);
    const x = 0.6 + col * 1.74;
    const y = 1.55 + fila * 1.75;
    const nuevo = i >= 8;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 1.6, h: 1.55, rectRadius: 0.1, fill: { color: nuevo ? C.accent2 : C.background2 }, line: { type: 'none' }, objectName: `RF${i + 1}` });
    texto(s, `RF${String(i + 1).padStart(2, '0')}`, x + 0.12, y + 0.15, 1.4, 0.45, { fontSize: 20, bold: true, color: nuevo ? C.background1 : C.accent1, fontFace: THEME.headFontFace });
    texto(s, n, x + 0.12, y + 0.7, 1.4, 0.75, { fontSize: 14, color: nuevo ? C.background1 : C.text1 });
  });
  texto(s, [
    { text: 'RF01–RF08 ', options: { bold: true, color: C.accent1 } },
    { text: 'de la 1ª entrega, corregidos   ·   ' },
    { text: 'RF09–RF14 ', options: { bold: true, color: C.accent2 } },
    { text: 'nuevos en la versión final' },
  ], 0.6, 5.1, 12.1, 0.4, { fontSize: 14 });
  const rnf = ['Usabilidad', 'Disponibilidad', 'Rendimiento', 'Seguridad', 'Escalabilidad', 'Mantenibilidad', 'Sin conexión'];
  rnf.forEach((n, i) => {
    const x = 0.6 + i * 1.74;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 5.75, w: 1.6, h: 0.75, rectRadius: 0.1, fill: { color: C.background1 }, line: { color: C.accent3, width: 1 }, objectName: `RNF${i + 1}` });
    texto(s, [{ text: `RNF0${i + 1}`, options: { bold: true, breakLine: true, color: C.accent3 } }, { text: n }], x + 0.1, 5.8, 1.45, 0.65, { fontSize: 12, valign: 'middle' });
  });
  s.addNotes('Los ocho requerimientos de la primera entrega se corrigieron: por ejemplo, el costo por kilo ahora usa las cabezas actuales, restando las bajas. Los seis nuevos salieron del relevamiento: la ración la define el veterinario, la sequía obliga a compras de urgencia, la garrapata es la amenaza principal y hay corrales sin señal. Entre los no funcionales, el séptimo es la operación sin conexión, con envío idempotente.');
}

// ---------- 7. Procesos y casos de uso ----------
{
  const s = contenido('Procesos automatizados y casos de uso', 'Problema y análisis');
  const stats = [['6', 'procesos de negocio modelados'], ['22', 'casos de uso con ficha completa'], ['4', 'actores: 3 usuarios, el sistema y el clima']];
  stats.forEach(([n, l], i) => {
    const x = 0.6 + i * 4.1;
    texto(s, n, x, 1.35, 1.3, 0.9, { fontFace: THEME.headFontFace, fontSize: 44, bold: true, color: C.accent1, valign: 'middle' });
    texto(s, l, x + 1.35, 1.35, 2.6, 0.9, { fontSize: 15, color: MUTED, valign: 'middle' });
  });
  texto(s, 'Proceso 1 (ampliado): el ingreso del lote genera su calendario sanitario con el protocolo', 0.6, 2.45, 12.1, 0.32, { fontSize: 14, bold: true, color: C.accent3 });
  imagen(s, archivo('docs/diagramas/bpmn-1-ingreso-lote.png'), 0.6, 2.8, 12.1, 1.85, 'Proceso 1: ingreso de un lote', 'izquierda');
  texto(s, 'Proceso 2 (ampliado): la alimentación diaria, con la ración en un toque y la carga sin señal', 0.6, 4.75, 12.1, 0.32, { fontSize: 14, bold: true, color: C.accent3 });
  imagen(s, archivo('docs/diagramas/bpmn-2-alimentacion.png'), 0.6, 5.1, 12.1, 1.66, 'Proceso 2: alimentación diaria', 'izquierda');
  s.addNotes('Los procesos 1 a 4 venían de la primera entrega; en la final se ampliaron el ingreso de lote, que ahora genera el calendario sanitario con el protocolo, y la alimentación diaria, que muestra este diagrama. Se sumaron el abastecimiento de insumos y el cierre del lote. Los casos de uso pasaron de 12 a 22 y corregí los errores del diagrama anterior: el encargado accedía a alertas, la numeración no coincidía y había un include mal planteado.');
}

// ---------- 8. Arquitectura ----------
pres.addSection({ title: 'Solución' });
{
  const s = contenido('Arquitectura cliente-servidor en tres capas', 'Solución');
  imagen(s, archivo('docs/diagramas/arquitectura.png'), 0.6, 1.4, 5.3, 5.25, 'Diagrama de arquitectura');
  texto(s, 'SPA instalable (PWA) + API REST modular + PostgreSQL', 6.3, 1.45, 6.4, 0.5, { fontSize: 18, bold: true, color: C.accent3 });
  const razones = [
    ['Un solo código para el celular y la PC', 'Aplicación web responsive, sin apps nativas que mantener'],
    ['Las reglas críticas viven en el servidor', 'Roles, costos y stock no se pueden saltear desde el cliente'],
    ['El corral no tiene señal', 'Service worker + cola en IndexedDB; el reenvío es idempotente'],
    ['Crecer sin rediseñar', 'Un módulo por área: ración, protocolos y clima se sumaron después'],
  ];
  razones.forEach(([t, d], i) => {
    const y = 2.1 + i * 1.0;
    circulo(s, 6.3, y + 0.05, 0.5, String(i + 1), C.accent2, 15);
    texto(s, t, 7.0, y, 5.7, 0.4, { fontSize: 16, bold: true });
    texto(s, d, 7.0, y + 0.4, 5.7, 0.5, { fontSize: 14, color: MUTED });
  });
  texto(s, 'Se descartaron los microservicios: demasiada complejidad operativa para un solo establecimiento.', 6.3, 6.15, 6.4, 0.5, { fontSize: 13, italic: true, color: C.accent3 });
  s.addNotes('Elegí una arquitectura cliente-servidor en tres capas. Cada decisión responde a una necesidad del caso: una sola aplicación web sirve al celular del encargado y a la PC del productor; las reglas de costos y permisos están en el servidor; para los corrales sin señal la aplicación es una PWA con una cola local. Descarté microservicios porque para un solo productor solo agregan complejidad. Autenticación con JWT, contraseñas con bcrypt, validación con Zod en la API y restricciones CHECK en la base.');
}

// ---------- 9. Tecnologías ----------
{
  const s = contenido('Tecnologías y herramientas', 'Solución');
  const tec = [
    ['Interfaz', 'React 19 + Vite + Material UI · PWA con Workbox'],
    ['Lógica de negocio', 'Node.js 24 + Express 5 · Zod · JWT + bcrypt'],
    ['Datos', 'PostgreSQL 17 + Prisma · migraciones versionadas'],
    ['Control de versiones', 'Git + GitHub · ramas por issue y tags'],
    ['Tareas', 'GitHub Projects · issues y milestones'],
    ['Pruebas', 'Vitest + Supertest · Playwright (E2E)'],
    ['Documentación', 'OpenAPI / Swagger · Markdown · Mermaid'],
    ['Despliegue', 'Vercel + Render + Neon · GitHub Actions'],
  ];
  tec.forEach(([t, d], i) => {
    const col = i % 2;
    const fila = Math.floor(i / 2);
    const x = 0.6 + col * 6.15;
    const y = 1.5 + fila * 1.28;
    tarjeta(s, x, y, 5.95, 1.1, t);
    circulo(s, x + 0.25, y + 0.25, 0.6, String(i + 1), C.accent1, 16);
    texto(s, t, x + 1.05, y + 0.14, 4.7, 0.4, { fontSize: 17, bold: true, color: C.accent1 });
    texto(s, d, x + 1.05, y + 0.55, 4.75, 0.45, { fontSize: 14 });
  });
  s.addNotes('Un solo lenguaje, JavaScript, en el frontend y el backend, porque es un proyecto de una persona con plazo acotado. Cada cambio pasa por GitHub Actions: lint, pruebas con cobertura y build. Un push a main publica solo el frontend en Vercel y la API en Render, y aplica las migraciones en Neon. La API está documentada en Swagger y se puede probar online.');
}

// ---------- 10. Modelo de datos ----------
{
  const s = contenido('Modelo de datos', 'Solución');
  imagen(s, archivo('docs/diagramas/der-resumido.png'), 0.6, 1.35, 3.1, 5.35, 'Diagrama entidad-relación resumido');
  const stats = [['12', 'tablas'], ['25', 'restricciones CHECK'], ['16', 'índices'], ['6', 'migraciones'], ['1', 'vista de resumen'], ['3', 'triggers']];
  stats.forEach(([n, l], i) => {
    const col = i % 3;
    const fila = Math.floor(i / 3);
    const x = 4.2 + col * 2.85;
    const y = 1.5 + fila * 1.5;
    tarjeta(s, x, y, 2.6, 1.3, l);
    texto(s, n, x + 0.25, y + 0.12, 2.1, 0.7, { fontFace: THEME.headFontFace, fontSize: 36, bold: true, color: C.accent1 });
    texto(s, l, x + 0.25, y + 0.82, 2.2, 0.4, { fontSize: 14, color: MUTED });
  });
  texto(s, vinetas([
    'Tercera forma normal; los valores derivados (GDP proyectada, cabezas, cobertura) se calculan',
    'Desnormalizaciones justificadas: el precio del día se guarda para que el costo histórico no cambie',
    'Reglas en dos niveles: la API valida y la base las vuelve a exigir (stock ≥ 0, lote cerrado)',
  ]), 4.2, 4.65, 8.4, 2.0, { fontSize: 15, paraSpaceAfter: 8 });
  s.addNotes('El modelo tiene 12 tablas. Del diagrama de la primera entrega corregí que faltaban campos del lote, la auditoría de quién carga cada registro y el estado de los eventos sanitarios. Las reglas críticas se protegen dos veces: por ejemplo, un trigger impide cargar datos en un lote cerrado aunque alguien saltee la API. El diccionario de datos completo y las consultas de ejemplo están en el documento.');
}

// ---------- 11. Demo ----------
pres.addSection({ title: 'Demo' });
const qrApp = await QRCode.toDataURL(APP, { margin: 1, width: 600, color: { dark: '#1F5E2C', light: '#FFFFFF' } });
{
  const s = contenido('Demo: el encargado carga en un toque, aun sin señal', 'Demo');
  const capturas = [['10-encargado-inicio.png', 'Ración del día'], ['50-encargado-sin-conexion.png', 'Sin señal: queda en el teléfono'], ['51-encargado-sincronizado.png', 'Vuelve la señal: se envía sola']];
  capturas.forEach(([f, l], i) => {
    const x = 0.6 + i * 2.75;
    tarjeta(s, x, 1.45, 2.5, 5.15, `captura ${l}`, C.background2);
    imagen(s, archivo('docs/capturas', f), x + 0.15, 1.6, 2.2, 4.25, l);
    texto(s, l, x + 0.15, 5.95, 2.2, 0.55, { fontSize: 13, align: 'center', bold: true, color: C.accent1 });
  });
  s.addImage({ data: qrApp, x: 9.35, y: 1.5, w: 2.6, h: 2.6, objectName: 'QR de la aplicación', altText: `Código QR a ${APP}` });
  texto(s, 'ganadotrack.vercel.app', 8.9, 4.2, 3.5, 0.4, { fontSize: 17, bold: true, align: 'center', color: C.accent1 });
  texto(s, vinetas([
    'Usuarios: admin, encargado y veterinario @ganadotrack.local',
    'La contraseña se entrega aparte',
    'Si la API tarda: se “despierta” en unos 50 s',
  ]), 8.9, 4.75, 3.8, 1.8, { fontSize: 13, paraSpaceAfter: 6, color: MUTED });
  s.addNotes('DEMO EN VIVO (5 minutos; guion completo en guion-defensa.md). 1) Encargado en el celular: confirmar la ración del Lote 01 con un toque. 2) Modo avión: confirmar otro lote, se ve "En el teléfono"; volver a conectar y se envía solo, sin duplicar. 3) Veterinario: ver las alertas, registrar un control de garrapata y ver que se programa el próximo; mostrar un protocolo. 4) Productor: dashboard con alertas y clima, detalle del lote con GDP, costo por kilo y margen, insumos con días de cobertura, descargar el informe PDF. Plan B: los videos de docs/entregas/video-demo.');
}

// ---------- 12. Lo que ve el productor ----------
{
  const s = contenido('Lo que ve el productor', 'Demo');
  imagen(s, archivo('docs/capturas/33-admin-lote-detalle.png'), 0.6, 1.4, 6.9, 5.2, 'Detalle de un lote', 'izquierda');
  const items = [
    ['Costo por kg y margen', 'de cada lote, actualizados con cada carga'],
    ['GDP y fecha estimada de venta', 'con alerta si el lote rinde menos'],
    ['Conversión alimenticia', 'en materia seca, entre pesadas'],
    ['Stock con días de cobertura', 'y la compra sugerida antes del quiebre'],
    ['Clima y riesgos', 'estrés térmico, garrapata y sequía'],
    ['Informes PDF y planilla Excel', 'para el productor y su contador'],
  ];
  items.forEach(([t, d], i) => {
    const y = 1.45 + i * 0.86;
    circulo(s, 7.85, y + 0.08, 0.42, '✓', C.accent2, 14);
    texto(s, t, 8.45, y, 4.25, 0.38, { fontSize: 16, bold: true });
    texto(s, d, 8.45, y + 0.38, 4.25, 0.38, { fontSize: 13, color: MUTED });
  });
  s.addNotes('Esta es la pantalla que responde al pain point número uno: el costo de engorde por kilo de carne y el margen de cada lote, calculados solos con cada carga del encargado. La GDP se calcula en cada pesada y proyecta la fecha de venta. Aclarar si preguntan: el margen es de engorde, no incluye el valor del animal al ingresar porque es cría propia; está documentado como límite y como mejora futura.');
}

// ---------- 13. Pruebas ----------
pres.addSection({ title: 'Calidad' });
{
  const s = contenido('Verificación: pruebas automatizadas y E2E', 'Calidad');
  const stats = [['118', 'pruebas automatizadas, 100 % aprobadas'], ['88 %', 'de cobertura de líneas (98 % en los cálculos)'], ['86', 'casos de prueba documentados y rastreables'], ['14', 'incidencias detectadas y corregidas']];
  stats.forEach(([n, l], i) => {
    const y = 1.45 + i * 1.3;
    texto(s, n, 0.6, y, 2.1, 0.9, { fontFace: THEME.headFontFace, fontSize: 40, bold: true, color: C.accent1 });
    texto(s, l, 2.75, y + 0.12, 3.6, 0.8, { fontSize: 15, color: MUTED, valign: 'middle' });
  });
  s.addChart(pres.charts.BAR, [{ name: 'Pruebas', labels: ['Unitarias', 'Integración (API + BD)', 'Frontend (cola sin señal)', 'Pasos E2E (navegador)'], values: [42, 70, 6, 18] }], {
    x: 6.7, y: 1.4, w: 6.0, h: 4.1, barDir: 'bar', objectName: 'gráfico de pruebas por tipo',
    chartColors: [THEME.colors.accent1], showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: THEME.colors.dk1, dataLabelFontSize: 13, dataLabelFontFace: '+mn-lt',
    showTitle: true, title: 'Pruebas por tipo', titleFontSize: 15, titleColor: THEME.colors.dk1, titleFontFace: '+mn-lt',
    catAxisLabelColor: MUTED, catAxisLabelFontSize: 13, catAxisLabelFontFace: '+mn-lt', catAxisOrientation: 'maxMin',
    valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, showLegend: false,
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.7, y: 5.7, w: 6.0, h: 0.95, rectRadius: 0.1, fill: { color: C.background2 }, line: { type: 'none' }, objectName: 'validación' });
  texto(s, [
    { text: 'Validación de aceptación: ', options: { bold: true, color: C.accent1 } },
    { text: '4 de 5 criterios verificados internamente con los escenarios E2E; falta la confirmación del productor.' },
  ], 6.95, 5.75, 5.55, 0.85, { fontSize: 13, valign: 'middle' });
  s.addNotes('Cada caso de prueba tiene un identificador CP que coincide con el nombre de la prueba en el código, así se rastrea del requerimiento al test. Las pruebas de integración usan una base PostgreSQL real separada. Corren en GitHub Actions en cada push. Las reglas críticas, como la atomicidad del stock o la idempotencia de la carga sin conexión, tienen su prueba. La validación con el productor quedó pendiente: los criterios que se pueden verificar sin él se cumplen, y el material para validarlo ya está preparado.');
}

// ---------- 14. Seguimiento ----------
{
  const s = contenido('Seguimiento y control de cambios en GitHub', 'Calidad');
  imagen(s, archivo('docs/capturas/github/tablero.png'), 0.6, 1.4, 6.9, 4.55, 'Tablero de GitHub Projects', 'izquierda');
  texto(s, 'Tablero de GitHub Projects con los 29 issues', 0.6, 6.05, 6.9, 0.4, { fontSize: 12, italic: true, color: MUTED });
  const stats = [['29', 'issues'], ['7', 'milestones'], ['6', 'versiones']];
  stats.forEach(([n, l], i) => {
    const x = 7.9 + i * 1.62;
    tarjeta(s, x, 1.45, 1.45, 1.3, l);
    texto(s, n, x, 1.55, 1.45, 0.7, { fontFace: THEME.headFontFace, fontSize: 32, bold: true, color: C.accent1, align: 'center' });
    texto(s, l, x, 2.25, 1.45, 0.4, { fontSize: 13, color: MUTED, align: 'center' });
  });
  const pasos = ['Issue con criterios de aceptación', 'Rama feature/<n>-…', 'Commits “#n - …”', 'Pull request + CI en verde', 'Merge a develop → main', 'Tag ganadotrack-W.X.Y.Z'];
  pasos.forEach((p, i) => {
    const y = 3.05 + i * 0.6;
    circulo(s, 7.9, y, 0.42, String(i + 1), C.accent3, 13);
    texto(s, p, 8.5, y, 4.2, 0.42, { fontSize: 15, valign: 'middle' });
  });
  s.addNotes('Cada requerimiento es un issue con sus criterios de aceptación; cada issue tiene su rama, y cada commit referencia el número del issue, así hay trazabilidad del requerimiento al código. Nada se integra con la CI en rojo: el PR número 30 es un ejemplo de un error de la CI que se corrigió antes de integrar. Las versiones siguen la convención W.X.Y.Z de la cátedra; la final es la 1.1.1.1.');
}

// ---------- 15. Resultados ----------
pres.addSection({ title: 'Cierre' });
{
  const s = contenido('Resultados: del problema a la solución', 'Cierre');
  const enc = (t) => ({ text: t, options: { bold: true, color: THEME.colors.lt1, fill: { color: THEME.colors.accent1 } } });
  const filas = [
    ['No conocía su costo por kg de carne', 'Costo de engorde por kg y margen de cada lote, calculados con cada carga'],
    ['26 vacas perdidas por falta de control sanitario', 'Calendario armado solo por el protocolo, alertas 7 días antes y riesgo de garrapata según el clima'],
    ['Registros en papel o de palabra', 'Todo queda registrado, con fecha y responsable; el encargado carga en un toque, aun sin señal'],
    ['Pesadas anotadas sin análisis', 'GDP automática, fecha estimada de venta y conversión alimenticia'],
    ['Compras de urgencia en la sequía', 'Días de cobertura, compra sugerida y alerta de sequía'],
  ];
  s.addTable([[enc('Problema relevado'), enc('Respuesta de GanadoTrack')], ...filas.map(([a, b]) => [{ text: a, options: { bold: true } }, { text: b }])], {
    x: 0.6, y: 1.5, w: 12.1, colW: [4.3, 7.8], fontSize: 15, fontFace: THEME.bodyFontFace, color: THEME.colors.dk1,
    border: { type: 'solid', pt: 0.75, color: 'D9D2BF' }, fill: { color: 'FFFFFF' }, valign: 'middle', margin: [0.08, 0.15, 0.08, 0.15], rowH: 0.8, objectName: 'tabla de resultados',
  });
  s.addNotes('Este cuadro resume la coherencia del proyecto: cada problema que salió del relevamiento tiene una respuesta concreta en el sistema. Las dos necesidades principales, el costo por kilo y el control sanitario, están resueltas, y la causa del problema sanitario se ataca dos veces: el calendario se arma solo y el clima anticipa el riesgo de garrapata.');
}

// ---------- 16. Trabajo futuro ----------
{
  const s = contenido('Trabajo futuro', 'Cierre');
  const columnas = [
    ['Corto plazo', C.accent1, ['Validar con el productor y ajustar los valores de referencia (GDP objetivo)', 'Costos completos: valor del animal y gastos generales', 'Notificaciones push, email o WhatsApp']],
    ['Mediano plazo', C.accent2, ['Identificación individual por caravana', 'Ciclo completo: cría, parición y recría', 'Varios establecimientos por cuenta']],
    ['Largo plazo', C.accent3, ['Integración con el SENASA', 'Balanzas y sensores conectados', 'Pruebas de componentes y E2E en la CI']],
  ];
  columnas.forEach(([t, color, items], i) => {
    const x = 0.6 + i * 4.1;
    tarjeta(s, x, 1.5, 3.85, 4.3, t);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.3, y: 1.8, w: 3.25, h: 0.6, rectRadius: 0.1, fill: { color }, line: { type: 'none' }, objectName: `encabezado ${t}` });
    texto(s, t, x + 0.3, 1.8, 3.25, 0.6, { fontSize: 18, bold: true, color: C.background1, align: 'center', valign: 'middle' });
    texto(s, vinetas(items), x + 0.3, 2.75, 3.3, 2.9, { fontSize: 15, paraSpaceAfter: 12 });
  });
  s.addNotes('Lo primero es completar la validación con el productor y confirmar la GDP objetivo: el valor relevado, 380 a 420 kilos en unos 95 días, da 0,42 kilos por día, que es bajo para un feedlot; como se carga por lote, corregirlo no requiere cambios. Después, costos completos, que también fue un pedido del productor, y notificaciones fuera del sistema. Lo que se dejó fuera del alcance, como caravanas y SENASA, queda para versiones mayores.');
}

// ---------- 17. Cierre ----------
{
  const s = pres.addSlide({ masterName: 'PORTADA', sectionTitle: 'Cierre' });
  texto(s, '¡Gracias!', 0.8, 1.5, 7.5, 1.2, { fontFace: THEME.headFontFace, fontSize: 60, bold: true, color: C.background1 });
  texto(s, '¿Preguntas?', 0.8, 2.75, 7.5, 0.6, { fontSize: 26, color: C.accent6 });
  texto(s, [
    { text: 'Aplicación: ', options: { bold: true } }, { text: 'ganadotrack.vercel.app', options: { breakLine: true } },
    { text: 'Repositorio: ', options: { bold: true } }, { text: 'github.com/mateogit114730/ganadotrack', options: { breakLine: true } },
    { text: 'API (Swagger): ', options: { bold: true } }, { text: 'ganadotrack-api.onrender.com/api/docs' },
  ], 0.8, 4.0, 7.6, 1.6, { fontSize: 17, color: C.background1, paraSpaceAfter: 8 });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.95, y: 1.5, w: 3.6, h: 4.3, rectRadius: 0.2, fill: { color: C.background1 }, line: { type: 'none' }, objectName: 'marco del QR' });
  s.addImage({ data: qrApp, x: 9.25, y: 1.75, w: 3.0, h: 3.0, objectName: 'QR de la aplicación', altText: `Código QR a ${APP}` });
  texto(s, 'Escaneá y probalo', 8.95, 4.9, 3.6, 0.5, { fontSize: 16, bold: true, align: 'center', color: C.accent1 });
  s.addNotes(`Cierre. Agradecer y abrir a preguntas. Links: ${APP} · ${REPO}. Preguntas probables y respuestas en guion-defensa.md.`);
}

await pres.writeFile({ fileName: SALIDA });
const require = createRequire(import.meta.url);
const skill = process.env.PPTX_SKILL;
if (skill) {
  const { applyTheme } = require(path.join(skill, 'scripts/apply_theme.js'));
  await applyTheme(SALIDA, THEME);
  console.log('Tema aplicado');
}
console.log(`Presentación: ${SALIDA}`);
