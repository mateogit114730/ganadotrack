import { useState } from 'react';
import {
  Alert, AlertTitle, Box, Button, Card, CardActionArea, CardContent, Chip, InputAdornment, Stack,
  TextField, Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { api, mensajeError } from '../../api/cliente.js';
import { useCarga } from '../../utils/useCarga.js';
import { Cargando, ErrorCarga, Grilla } from '../../components/Comunes.jsx';
import { fmtFecha, fmtKg, fmtMoneda } from '../../utils/formato.js';

/**
 * CU04 – Registrar alimentación diaria.
 * Recorrido en 3 pasos (RNF01): 1) tocar el lote, 2) cargar los kg, 3) Confirmar.
 */
export default function CargarAlimentacion() {
  const { datos, cargando, error, recargar } = useCarga(() => api.get('/alimentacion/opciones').then((r) => r.data));
  const [loteId, setLoteId] = useState(null);
  const [kg, setKg] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [errorEnvio, setErrorEnvio] = useState(null);

  if (cargando && !datos) return <Cargando />;
  if (error) return <ErrorCarga mensaje={error} />;

  const lote = datos.lotes.find((l) => l.id === loteId);
  const yaCargado = (insumoId) => lote?.cargadoHoy.find((r) => r.insumoId === insumoId);

  const elegirLote = (id) => {
    setLoteId(id);
    setKg({});
    setErrorEnvio(null);
    setResultado(null);
  };

  const confirmar = async (e) => {
    e.preventDefault();
    const items = datos.insumos
      .filter((i) => !yaCargado(i.id))
      .map((i) => ({ insumoId: i.id, kg: Number(String(kg[i.id] ?? '').replace(',', '.')) || 0 }));
    if (!items.some((i) => i.kg > 0)) {
      setErrorEnvio('Ingresá los kg de al menos un insumo.');
      return;
    }
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const { data } = await api.post('/alimentacion', { loteId, items });
      setResultado(data);
      setLoteId(null);
      setKg({});
      recargar();
    } catch (err) {
      setErrorEnvio(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>Alimentación del día</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>{fmtFecha(datos.fecha)}</Typography>

      {resultado && (
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }} onClose={() => setResultado(null)}>
          <AlertTitle>Registro guardado – {resultado.lote.nombre}</AlertTitle>
          {resultado.registros.map((r) => (
            <div key={r.id}>{r.insumo.nombre}: {fmtKg(r.kg)}</div>
          ))}
          <strong>Costo del día: {fmtMoneda(resultado.costoDia)}</strong>
          {resultado.alertasStock.map((a) => (
            <Alert key={a} severity="warning" sx={{ mt: 1 }}>{a}</Alert>
          ))}
        </Alert>
      )}

      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>1. Elegí el lote</Typography>
      {datos.lotes.length === 0 && <Alert severity="info">No hay lotes activos.</Alert>}
      <Grilla min={200}>
        {datos.lotes.map((l) => {
          const completo = l.cargadoHoy.length >= datos.insumos.length;
          return (
            <Card
              key={l.id}
              sx={{
                borderColor: l.id === loteId ? 'primary.main' : undefined,
                borderWidth: l.id === loteId ? 2 : 1,
                bgcolor: l.id === loteId ? 'rgba(31,94,44,0.06)' : undefined,
              }}
            >
              <CardActionArea
                onClick={() => !completo && elegirLote(l.id)}
                aria-disabled={completo}
                sx={completo ? { cursor: 'default', '& .MuiCardActionArea-focusHighlight': { display: 'none' } } : undefined}
              >
                <CardContent>
                  <Typography sx={{ fontWeight: 600 }}>{l.nombre}</Typography>
                  {completo ? (
                    <Chip size="small" color="success" label="Cargado hoy" sx={{ mt: 1 }} />
                  ) : l.cargadoHoy.length > 0 ? (
                    <Chip size="small" color="warning" label="Carga parcial" sx={{ mt: 1 }} />
                  ) : (
                    <Chip size="small" label="Pendiente" sx={{ mt: 1 }} />
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Grilla>

      {lote && (
        <Card sx={{ mt: 3 }}>
          <CardContent component="form" onSubmit={confirmar} noValidate>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              2. Kilos entregados – {lote.nombre}
            </Typography>
            <Stack spacing={2}>
              {datos.insumos.map((i) => {
                const previo = yaCargado(i.id);
                return (
                  <TextField
                    key={i.id}
                    label={i.nombre}
                    value={previo ? previo.kg : (kg[i.id] ?? '')}
                    disabled={Boolean(previo)}
                    helperText={previo ? 'Ya cargado hoy' : `Stock disponible: ${fmtKg(i.stockKg)}`}
                    onChange={(e) => setKg({ ...kg, [i.id]: e.target.value })}
                    slotProps={{
                      htmlInput: { inputMode: 'decimal', style: { fontSize: 20 } },
                      input: { endAdornment: <InputAdornment position="end">kg</InputAdornment> },
                    }}
                  />
                );
              })}
              {errorEnvio && <Alert severity="error">{errorEnvio}</Alert>}
              <Button type="submit" variant="contained" size="large" disabled={enviando} sx={{ py: 1.5, fontSize: 18 }}>
                {enviando ? 'Guardando…' : '3. Confirmar'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
