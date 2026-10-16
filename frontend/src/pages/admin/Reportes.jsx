import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from '@mui/material';
import SummarizeIcon from '@mui/icons-material/SummarizeOutlined';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdfOutlined';
import TableViewIcon from '@mui/icons-material/TableViewOutlined';
import { api, mensajeError } from '../../api/cliente.js';
import { useCarga } from '../../utils/useCarga.js';
import { descargar } from '../../utils/descargar.js';
import { Encabezado, Grilla } from '../../components/Comunes.jsx';
import { hoyISO } from '../../utils/formato.js';

/** Tarjeta de un reporte con su formulario y botón de descarga. */
function TarjetaReporte({ icono, titulo, descripcion, textoBoton, onDescargar, children }) {
  const [estado, setEstado] = useState({ descargando: false, error: null });
  const ejecutar = async () => {
    setEstado({ descargando: true, error: null });
    try {
      await onDescargar();
      setEstado({ descargando: false, error: null });
    } catch (err) {
      setEstado({ descargando: false, error: mensajeError(err) });
    }
  };
  return (
    <Card sx={{ display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 1 }}>
          <Box sx={{ color: 'primary.main', display: 'flex', '& svg': { fontSize: 34 } }}>{icono}</Box>
          <Typography variant="h6">{titulo}</Typography>
        </Box>
        <Typography color="text.secondary" sx={{ mb: 2 }}>{descripcion}</Typography>
        <Stack spacing={2}>
          {children}
          {estado.error && <Alert severity="error">{estado.error}</Alert>}
          <Box>
            <Button variant="contained" onClick={ejecutar} disabled={estado.descargando}>
              {estado.descargando ? 'Generando…' : textoBoton}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

/** RF13 – Reportes descargables en PDF y Excel. */
export default function Reportes() {
  const { datos: lotes } = useCarga(() => api.get('/lotes').then((r) => r.data));
  const [loteId, setLoteId] = useState('');
  const [mes, setMes] = useState(hoyISO().slice(0, 7));
  const [rango, setRango] = useState({ desde: `${hoyISO().slice(0, 4)}-01-01`, hasta: hoyISO() });
  const loteElegido = loteId || lotes?.[0]?.id || '';

  return (
    <>
      <Encabezado icono={<SummarizeIcon />} titulo="Reportes" subtitulo="Informes para imprimir o compartir, y la planilla para el contador" />
      <Grilla min={300}>
        <TarjetaReporte
          icono={<PictureAsPdfIcon />}
          titulo="Informe de lote"
          descripcion="Indicadores, evolución del peso, alimentación, sanidad y resultado económico. Para un lote cerrado es el informe de cierre."
          textoBoton="Descargar PDF"
          onDescargar={() => descargar(`/reportes/lotes/${loteElegido}/informe.pdf`, { nombre: 'informe-lote.pdf' })}
        >
          <TextField select label="Lote" value={loteElegido} onChange={(e) => setLoteId(e.target.value)}>
            {(lotes ?? []).map((l) => (
              <MenuItem key={l.id} value={l.id}>{l.nombre}{l.estado === 'CERRADO' ? ' (cerrado)' : ''}</MenuItem>
            ))}
          </TextField>
        </TarjetaReporte>

        <TarjetaReporte
          icono={<PictureAsPdfIcon />}
          titulo="Reporte mensual"
          descripcion="Costos del mes por lote, consumo y compras de insumos, pesadas, eventos sanitarios y bajas."
          textoBoton="Descargar PDF"
          onDescargar={() => descargar('/reportes/mensual.pdf', { params: { mes }, nombre: `reporte-mensual-${mes}.pdf` })}
        >
          <TextField label="Mes" type="month" value={mes} onChange={(e) => setMes(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        </TarjetaReporte>

        <TarjetaReporte
          icono={<TableViewIcon />}
          titulo="Planilla para el contador"
          descripcion="Excel con una hoja por tipo de dato: lotes, alimentación, compras, sanidad, pesadas y bajas."
          textoBoton="Descargar Excel"
          onDescargar={() => descargar('/reportes/planilla.xlsx', { params: rango, nombre: 'ganadotrack-planilla.xlsx' })}
        >
          <Grilla min={140} gap={1.5}>
            <TextField label="Desde" type="date" value={rango.desde} onChange={(e) => setRango({ ...rango, desde: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Hasta" type="date" value={rango.hasta} onChange={(e) => setRango({ ...rango, hasta: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          </Grilla>
        </TarjetaReporte>
      </Grilla>
    </>
  );
}
