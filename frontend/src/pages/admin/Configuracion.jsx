import { useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, List, ListItemButton, ListItemIcon, ListItemText, Stack, TextField, Typography,
} from '@mui/material';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import { api, mensajeError } from '../../api/cliente.js';
import { useCarga } from '../../utils/useCarga.js';
import { Cargando, ErrorCarga, Encabezado } from '../../components/Comunes.jsx';
import { useAviso } from '../../components/Interaccion.jsx';

const AYUDA = {
  rendimiento_gancho: 'Proporción de kg de carne al gancho por kg vivo. Valor relevado para Angus: 0,57 (57 %).',
  dias_aviso_sanitario: 'Con cuántos días de anticipación se avisa de un evento sanitario programado.',
  dias_cobertura_minima: 'Si al ritmo de consumo previsto un insumo alcanza para menos días, se genera una alerta.',
  horizonte_compra_dias: 'La compra sugerida cubre el consumo de esta cantidad de días más el stock mínimo.',
};

function Parametro({ parametro, onGuardado }) {
  const [valor, setValor] = useState(String(parametro.valor));
  const [estado, setEstado] = useState(null);
  const guardar = async () => {
    try {
      await api.put(`/parametros/${parametro.clave}`, { valor });
      setEstado({ tipo: 'success', texto: 'Guardado' });
      onGuardado();
    } catch (err) {
      setEstado({ tipo: 'error', texto: mensajeError(err) });
    }
  };
  return (
    <Card>
      <CardContent>
        <Typography sx={{ fontWeight: 600 }}>{parametro.descripcion}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{AYUDA[parametro.clave]}</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <TextField size="small" type="number" value={valor} onChange={(e) => setValor(e.target.value)} sx={{ maxWidth: 180 }} />
          <Button variant="contained" onClick={guardar}>Guardar</Button>
        </Box>
        {estado && <Alert severity={estado.tipo} sx={{ mt: 1 }}>{estado.texto}</Alert>}
      </CardContent>
    </Card>
  );
}

/** Ubicación del establecimiento para el clima y los riesgos (RF12). */
function UbicacionClima() {
  const avisar = useAviso();
  const { datos: actual, recargar } = useCarga(() => api.get('/clima/ubicacion').then((r) => r.data));
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState(null);
  const [error, setError] = useState(null);

  const buscar = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const { data } = await api.get('/clima/buscar', { params: { q: texto } });
      setResultados(data);
    } catch (err) {
      setError(mensajeError(err));
    }
  };
  const elegir = async (localidad) => {
    try {
      await api.put('/clima/ubicacion', localidad);
      setResultados(null);
      setTexto('');
      avisar(`Ubicación configurada: ${localidad.nombre}`);
      recargar();
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography sx={{ fontWeight: 600 }}>Ubicación del establecimiento</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Se usa para el pronóstico y los riesgos de estrés térmico, garrapata y sequía.
          {actual?.nombre ? ` Actual: ${actual.nombre}.` : ' Todavía no está configurada.'}
        </Typography>
        <Box component="form" onSubmit={buscar} sx={{ display: 'flex', gap: 1 }}>
          <TextField size="small" label="Localidad" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej.: Pergamino" />
          <Button type="submit" variant="contained" disabled={texto.trim().length < 3}>Buscar</Button>
        </Box>
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
        {resultados && (
          resultados.length === 0 ? (
            <Typography color="text.secondary" sx={{ mt: 1 }}>No se encontraron localidades con ese nombre.</Typography>
          ) : (
            <List dense>
              {resultados.map((r) => (
                <ListItemButton key={`${r.latitud},${r.longitud}`} onClick={() => elegir(r)}>
                  <ListItemIcon><PlaceIcon /></ListItemIcon>
                  <ListItemText primary={r.nombre} secondary={`${r.latitud.toFixed(2)}, ${r.longitud.toFixed(2)}`} />
                </ListItemButton>
              ))}
            </List>
          )
        )}
      </CardContent>
    </Card>
  );
}

/** Parámetros del negocio usados en los cálculos y alertas. */
export default function Configuracion() {
  const { datos, cargando, error, recargar } = useCarga(() => api.get('/parametros').then((r) => r.data));
  if (cargando && !datos) return <Cargando />;
  if (error) return <ErrorCarga mensaje={error} />;
  return (
    <>
      <Encabezado icono={<SettingsIcon />} titulo="Configuración" subtitulo="Parámetros usados en los cálculos y las alertas" />
      <Stack spacing={2} sx={{ maxWidth: 640 }}>
        <UbicacionClima />
        {datos.map((p) => <Parametro key={p.clave} parametro={p} onGuardado={recargar} />)}
      </Stack>
    </>
  );
}
