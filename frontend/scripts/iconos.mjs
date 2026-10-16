// Genera el isotipo (vaca en círculo) y los íconos de la app a partir del logo completo.
// Uso: node scripts/iconos.mjs
import sharp from 'sharp';

const LOGO = 'public/logo.png';
const RECORTE = { left: 300, top: 168, width: 650, height: 650 }; // zona del círculo en el logo de 1254 px
const CREMA = { r: 246, g: 241, b: 228, alpha: 1 };

const isotipo = await sharp(LOGO).extract(RECORTE).png().toBuffer();

for (const tam of [512, 192, 64]) {
  await sharp(isotipo).resize(tam, tam).toFile(`public/isotipo-${tam}.png`);
}
// Ícono "maskable": el sistema puede recortarlo en círculo, se deja margen de seguridad.
await sharp(isotipo)
  .resize(400, 400)
  .extend({ top: 56, bottom: 56, left: 56, right: 56, background: CREMA })
  .flatten({ background: CREMA })
  .toFile('public/isotipo-maskable-512.png');
await sharp(isotipo).resize(180, 180).flatten({ background: CREMA }).toFile('public/apple-touch-icon.png');
// Logo completo liviano para la pantalla de inicio de sesión (el original pesa ~1 MB).
await sharp(LOGO).resize(420, 420).png({ compressionLevel: 9, palette: true }).toFile('public/logo-420.png');
console.log('Íconos generados en public/');
