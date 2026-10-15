// Componentes de presentación reutilizados en varias pantallas.
import { Alert, Box, Card, CardContent, CircularProgress, Typography } from '@mui/material';

export function Cargando() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
      <CircularProgress />
    </Box>
  );
}

export function ErrorCarga({ mensaje }) {
  return <Alert severity="error" sx={{ my: 2 }}>{mensaje}</Alert>;
}

/** Tarjeta con un indicador numérico (KPI). */
export function Indicador({ titulo, valor, detalle, color }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">{titulo}</Typography>
        <Typography variant="h5" sx={{ color: color ?? 'text.primary', my: 0.5 }}>{valor}</Typography>
        {detalle && <Typography variant="caption" color="text.secondary">{detalle}</Typography>}
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

export function Encabezado({ titulo, subtitulo, acciones }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 3 }}>
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
      <Typography sx={{ fontWeight: 600 }}>{valor}</Typography>
    </Box>
  );
}
