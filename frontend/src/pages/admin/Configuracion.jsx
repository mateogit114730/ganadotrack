import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import { api, mensajeError } from '../../api/cliente.js';
import { useCarga } from '../../utils/useCarga.js';
import { Cargando, ErrorCarga, Encabezado } from '../../components/Comunes.jsx';

const AYUDA = {
  rendimiento_gancho: 'Proporción de kg de carne al gancho por kg vivo. Valor relevado para Angus: 0,57 (57 %).',
  dias_aviso_sanitario: 'Con cuántos días de anticipación se avisa de un evento sanitario programado.',
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

/** Parámetros del negocio usados en los cálculos y alertas. */
export default function Configuracion() {
  const { datos, cargando, error, recargar } = useCarga(() => api.get('/parametros').then((r) => r.data));
  if (cargando && !datos) return <Cargando />;
  if (error) return <ErrorCarga mensaje={error} />;
  return (
    <>
      <Encabezado icono={<SettingsIcon />} titulo="Configuración" subtitulo="Parámetros usados en los cálculos y las alertas" />
      <Stack spacing={2} sx={{ maxWidth: 640 }}>
        {datos.map((p) => <Parametro key={p.clave} parametro={p} onGuardado={recargar} />)}
      </Stack>
    </>
  );
}
