// Ilustraciones propias en SVG (sin licencias de terceros), en la paleta del logo.
import { Box } from '@mui/material';
import { COLORES } from '../../theme.js';

/**
 * Silueta de un novillo Angus de perfil, mirando a la derecha (viewBox 0 0 120 80).
 * Se usa como <g> dentro de otros SVG.
 */
function FormaVaca({ color }) {
  return (
    <g fill={color}>
      {/* cuerpo, cuello y cabeza */}
      <path d="M20 30 C20 22 27 18 36 18 L74 17 C81 17 86 19 90 23 L95 27 C97 24 100 22 104 22 L107 22 L109 18 L111 23 C115 25 117 29 117 33 L117 37 C117 40 115 42 112 42 L106 42 C103 42 101 41 99 39 L93 37 L91 47 C90 51 88 53 86 54 L44 55 C35 55 28 52 24 46 C21 42 20 36 20 30 Z" />
      {/* patas */}
      <path d="M33 50 L31 74 L37 74 L40 52 Z" />
      <path d="M44 52 L44 74 L50 74 L51 54 Z" />
      <path d="M76 52 L77 74 L83 74 L84 52 Z" />
      <path d="M85 50 L88 74 L94 74 L91 47 Z" />
      {/* cola */}
      <path d="M21 27 C14 30 12 38 13 50 L16 50 C16 40 18 34 23 31 Z" />
      <ellipse cx="13.5" cy="52" rx="3" ry="4" />
    </g>
  );
}

/** Vaca de perfil, para estados vacíos y decoración. */
export function VacaSilueta({ color = COLORES.bosque, sx }) {
  return (
    <Box component="svg" viewBox="0 0 120 80" sx={sx} aria-hidden="true">
      <FormaVaca color={color} />
      <ellipse cx="60" cy="77" rx="40" ry="2.5" fill={color} opacity="0.15" />
    </Box>
  );
}

/** Paisaje de campo: sol, colinas, molino, alambrado y vacas. */
export function PaisajeCampo({ sx, conVacas = true }) {
  return (
    <Box component="svg" viewBox="0 0 800 320" preserveAspectRatio="xMidYMax slice" sx={sx} aria-hidden="true">
      <defs>
        <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FBF6E9" />
          <stop offset="1" stopColor={COLORES.hojaClara} />
        </linearGradient>
      </defs>
      <rect width="800" height="320" fill="url(#cielo)" />
      <circle cx="640" cy="90" r="46" fill="#F2C76B" opacity="0.85" />
      <circle cx="640" cy="90" r="66" fill="#F2C76B" opacity="0.2" />
      {/* colinas */}
      <path d="M0 200 C120 150 240 170 360 185 S600 150 800 175 V320 H0Z" fill="#B9D18F" />
      <path d="M0 235 C150 200 300 215 450 230 S700 205 800 220 V320 H0Z" fill={COLORES.hoja} />
      <path d="M0 270 C180 245 360 255 520 268 S720 255 800 262 V320 H0Z" fill={COLORES.bosque} />
      {/* molino */}
      <g stroke={COLORES.tierra} strokeWidth="4" fill="none" strokeLinecap="round">
        <path d="M150 230 L165 120 L180 230" />
        <path d="M156 190 H174 M159 160 H171" />
      </g>
      <g fill={COLORES.tierra} transform="translate(165 118)">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((g) => (
          <path key={g} d="M0 0 L5 -30 L-5 -30 Z" transform={`rotate(${g})`} opacity="0.9" />
        ))}
        <circle r="5" />
      </g>
      {/* alambrado */}
      <g stroke={COLORES.tierra} strokeWidth="3">
        {Array.from({ length: 11 }, (_, i) => (
          <line key={i} x1={20 + i * 78} y1="262" x2={20 + i * 78} y2="300" />
        ))}
      </g>
      <g stroke={COLORES.tierra} strokeWidth="1.5" opacity="0.8">
        <line x1="0" y1="272" x2="800" y2="268" />
        <line x1="0" y1="286" x2="800" y2="282" />
      </g>
      {conVacas && (
        <>
          <g transform="translate(455 190) scale(0.55)"><FormaVaca color={COLORES.tinta} /></g>
          <g transform="translate(600 200) scale(-0.45 0.45)"><FormaVaca color={COLORES.tinta} /></g>
        </>
      )}
    </Box>
  );
}

/** Franja decorativa de pasto para el pie del menú o de encabezados. */
export function FranjaPasto({ sx }) {
  return (
    <Box component="svg" viewBox="0 0 400 24" preserveAspectRatio="none" sx={sx} aria-hidden="true">
      <path d="M0 24 V14 C40 4 60 18 100 10 S170 2 210 12 S300 4 340 12 S380 8 400 6 V24Z" fill={COLORES.hoja} opacity="0.55" />
      <path d="M0 24 V18 C50 12 90 22 140 16 S230 10 280 18 S360 14 400 14 V24Z" fill={COLORES.bosqueOscuro} opacity="0.7" />
    </Box>
  );
}
