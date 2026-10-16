// Componentes de presentación reutilizados en varias pantallas (estilo "Campo cálido").
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { COLORES } from '../theme.js';
import { VacaSilueta } from './ilustraciones/index.jsx';

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', py: 6, gap: 1.5 }}>
      <CircularProgress color="secondary" />
      <Typography variant="body2" color="text.secondary">{texto}</Typography>
    </Box>
  );
}

export function ErrorCarga({ mensaje }) {
  return <Alert severity="error" sx={{ my: 2 }}>{mensaje}</Alert>;
}

/** Tarjeta de indicador (KPI) con ícono opcional. */
export function Indicador({ titulo, valor, detalle, color, icono }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        {icono && (
          <Box
            sx={{
              flexShrink: 0, width: 42, height: 42, borderRadius: '50%', display: 'grid', placeItems: 'center',
              bgcolor: alpha(COLORES.hoja, 0.18), color: 'primary.main',
            }}
          >
            {icono}
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{titulo}</Typography>
          <Typography variant="h5" sx={{ color: color ?? 'text.primary', my: 0.25, lineHeight: 1.25 }}>{valor}</Typography>
          {detalle && <Typography variant="caption" color="text.secondary">{detalle}</Typography>}
        </Box>
      </CardContent>
    </Card>
  );
}

/** Grilla responsive: 1 columna en celular, más columnas en pantallas anchas. */
export function Grilla({ min = 220, gap = 2, children }) {
  return (
    <Box sx={{ display: 'grid', gap, gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}px, 100%), 1fr))` }}>
      {children}
    </Box>
  );
}

/** Encabezado de pantalla con ícono del módulo, título, subtítulo y acciones. */
export function Encabezado({ titulo, subtitulo, acciones, icono }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 3 }}>
      {icono && (
        <Box
          sx={{
            width: 52, height: 52, borderRadius: 3, display: 'grid', placeItems: 'center', flexShrink: 0,
            bgcolor: 'primary.main', color: '#fff', '& svg': { fontSize: 30 },
          }}
        >
          {icono}
        </Box>
      )}
      <Box sx={{ flex: 1, minWidth: 200 }}>
        <Typography variant="h5">{titulo}</Typography>
        {subtitulo && <Typography color="text.secondary">{subtitulo}</Typography>}
      </Box>
      {acciones}
    </Box>
  );
}

/** Dato con etiqueta, para fichas de detalle. */
export function Dato({ etiqueta, valor }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{etiqueta}</Typography>
      <Typography sx={{ fontWeight: 700 }}>{valor}</Typography>
    </Box>
  );
}

/** Estado vacío ilustrado. */
export function EstadoVacio({ titulo, texto, accion }) {
  return (
    <Box
      sx={{
        textAlign: 'center', py: 4, px: 2, border: 1, borderStyle: 'dashed', borderColor: 'divider',
        borderRadius: 3, bgcolor: alpha('#fff', 0.5),
      }}
    >
      <VacaSilueta color={COLORES.hoja} sx={{ width: 110, opacity: 0.8 }} />
      <Typography variant="h6" sx={{ mt: 1 }}>{titulo}</Typography>
      {texto && <Typography color="text.secondary" sx={{ mb: accion ? 2 : 0 }}>{texto}</Typography>}
      {accion}
    </Box>
  );
}

// Semántica de estados del sistema: verde OK, ocre próximo, teja crítico.
const ESTADOS = {
  ok: { bg: alpha(COLORES.hoja, 0.18), color: COLORES.bosque },
  aviso: { bg: alpha(COLORES.ocre, 0.16), color: '#8A5D0E' },
  critico: { bg: alpha(COLORES.teja, 0.13), color: COLORES.teja },
  neutro: { bg: COLORES.tierraClara, color: '#5C4A33' },
};

export function ChipEstado({ estado = 'neutro', label, icon, sx }) {
  const e = ESTADOS[estado];
  return <Chip size="small" icon={icon} label={label} sx={{ bgcolor: e.bg, color: e.color, '& .MuiChip-icon': { color: e.color }, ...sx }} />;
}

/** Mini gráfico de tendencia (sin ejes) en SVG. */
export function Sparkline({ valores, ancho = 120, alto = 32, color = COLORES.bosque }) {
  if (!valores || valores.length < 2) return null;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const puntos = valores.map((v, i) => [(i / (valores.length - 1)) * (ancho - 4) + 2, alto - 2 - ((v - min) / rango) * (alto - 4)]);
  const d = puntos.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const [ux, uy] = puntos[puntos.length - 1];
  return (
    <Box component="svg" viewBox={`0 0 ${ancho} ${alto}`} sx={{ width: ancho, height: alto }} aria-hidden="true">
      <path d={`${d} L${ux} ${alto} L2 ${alto}Z`} fill={alpha(COLORES.hoja, 0.18)} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={ux} cy={uy} r="3.5" fill={color} />
    </Box>
  );
}
