import { useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, InputAdornment, Stack, TextField, Typography,
} from '@mui/material';
import RestaurantIcon from '@mui/icons-material/RestaurantMenu';
import { api, mensajeError } from '../../api/cliente.js';
import { useCarga } from '../../utils/useCarga.js';
import { useAviso } from '../../components/Interaccion.jsx';
import { Cargando, ErrorCarga, Encabezado, EstadoVacio, Grilla } from '../../components/Comunes.jsx';
import { fmtFecha, fmtKg, fmtNumero, hoyISO } from '../../utils/formato.js';

/** Editor de la ración de un lote: kg por cabeza por día de cada insumo. */
function RacionLote({ lote, insumos, onGuardada }) {
  const avisar = useAviso();
  const vigente = Object.fromEntries(lote.racion.map((r) => [r.insumoId, r.kgCabezaDia]));
  const [kg, setKg] = useState(() => Object.fromEntries(insumos.map((i) => [i.id, vigente[i.id] ?? ''])));
  const [desde, setDesde] = useState(hoyISO());
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const numero = (v) => Number(String(v ?? '').replace(',', '.')) || 0;

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await api.put(`/lotes/${lote.id}/racion`, {
        vigenteDesde: desde,
        items: insumos.map((i) => ({ insumoId: i.id, kgCabezaDia: numero(kg[i.id]) })),
      });
      avisar(`Ración de ${lote.nombre} guardada`);
      onGuardada();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card>
      <CardContent component="form" onSubmit={guardar} noValidate>
        <Typography variant="h6">{lote.nombre}</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {lote.cabezasActuales} cabezas
          {lote.racion.length > 0 && ` · vigente desde ${fmtFecha(lote.racion[0].vigenteDesde)}`}
        </Typography>
        <Stack spacing={2}>
          {insumos.map((i) => (
            <TextField
              key={i.id}
              label={`${i.nombre} por cabeza`}
              value={kg[i.id]}
              onChange={(e) => setKg({ ...kg, [i.id]: e.target.value })}
              helperText={`Total del día: ${fmtKg(Math.round(numero(kg[i.id]) * lote.cabezasActuales))}`}
              slotProps={{
                htmlInput: { inputMode: 'decimal' },
                input: { endAdornment: <InputAdornment position="end">kg/día</InputAdornment> },
              }}
            />
          ))}
          <TextField
            label="Rige desde"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            helperText="La ración anterior queda en el historial"
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Box><Button type="submit" variant="contained" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar ración'}</Button></Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

/** RF09 – Raciones por lote (definidas por el veterinario; las usa el encargado al cargar). */
export default function Raciones() {
  const { datos, cargando, error, recargar } = useCarga(() => api.get('/raciones').then((r) => r.data));
  if (cargando && !datos) return <Cargando />;
  if (error) return <ErrorCarga mensaje={error} />;

  const totalDia = (insumoId) =>
    datos.lotes.reduce((t, l) => t + (l.racion.find((r) => r.insumoId === insumoId)?.kgDia ?? 0), 0);

  return (
    <>
      <Encabezado
        icono={<RestaurantIcon />}
        titulo="Raciones"
        subtitulo="Kilos por cabeza por día de cada lote. El encargado ve la ración del día lista para confirmar."
      />
      {datos.lotes.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Consumo total diario según las raciones:{' '}
          {datos.insumos.map((i) => `${i.nombre} ${fmtKg(totalDia(i.id))}`).join(' · ')}
          {' '}({fmtNumero(datos.lotes.reduce((t, l) => t + l.cabezasActuales, 0))} cabezas)
        </Alert>
      )}
      {datos.lotes.length === 0 ? (
        <EstadoVacio titulo="No hay lotes activos" texto="Las raciones se definen para los lotes que están en el corral." />
      ) : (
        <Grilla min={320}>
          {datos.lotes.map((l) => (
            <RacionLote key={l.id} lote={l} insumos={datos.insumos} onGuardada={recargar} />
          ))}
        </Grilla>
      )}
    </>
  );
}
