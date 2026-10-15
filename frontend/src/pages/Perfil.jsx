import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/PersonOutline';
import { api, mensajeError } from '../api/cliente.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useAviso } from '../components/Interaccion.jsx';
import { Encabezado, Dato } from '../components/Comunes.jsx';
import { ETIQUETAS } from '../utils/formato.js';

function FormularioNombre() {
  const { usuario, actualizarUsuario } = useAuth();
  const avisar = useAviso();
  const [nombre, setNombre] = useState(usuario.nombre);
  const [error, setError] = useState(null);

  const guardar = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const { data } = await api.patch('/auth/perfil', { nombre });
      actualizarUsuario(data);
      avisar('Nombre actualizado');
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  return (
    <Card>
      <CardContent component="form" onSubmit={guardar} noValidate>
        <Typography variant="h6" gutterBottom>Mis datos</Typography>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Dato etiqueta="Email" valor={usuario.email} />
            <Dato etiqueta="Rol" valor={ETIQUETAS.rol[usuario.rol]} />
          </Box>
          <TextField label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          {error && <Alert severity="error">{error}</Alert>}
          <Box><Button type="submit" variant="contained" disabled={nombre.trim() === usuario.nombre}>Guardar nombre</Button></Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function FormularioPassword() {
  const avisar = useAviso();
  const [datos, setDatos] = useState({ actual: '', nueva: '', repetir: '' });
  const [error, setError] = useState(null);
  const campo = (n) => ({ value: datos[n], onChange: (e) => setDatos({ ...datos, [n]: e.target.value }) });

  const guardar = async (e) => {
    e.preventDefault();
    setError(null);
    if (datos.nueva !== datos.repetir) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }
    try {
      await api.patch('/auth/password', { actual: datos.actual, nueva: datos.nueva });
      setDatos({ actual: '', nueva: '', repetir: '' });
      avisar('Contraseña actualizada');
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  return (
    <Card>
      <CardContent component="form" onSubmit={guardar} noValidate>
        <Typography variant="h6" gutterBottom>Cambiar contraseña</Typography>
        <Stack spacing={2}>
          <TextField label="Contraseña actual" type="password" autoComplete="current-password" {...campo('actual')} />
          <TextField label="Nueva contraseña" type="password" autoComplete="new-password" helperText="Mínimo 8 caracteres" {...campo('nueva')} />
          <TextField label="Repetir la nueva contraseña" type="password" autoComplete="new-password" {...campo('repetir')} />
          {error && <Alert severity="error">{error}</Alert>}
          <Box><Button type="submit" variant="contained">Cambiar contraseña</Button></Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

/** Perfil propio: datos y cambio de contraseña (todos los roles). */
export default function Perfil() {
  return (
    <Box sx={{ maxWidth: 640 }}>
      <Encabezado icono={<PersonIcon />} titulo="Mi perfil" subtitulo="Tus datos de acceso a GanadoTrack" />
      <Stack spacing={2}>
        <FormularioNombre />
        <FormularioPassword />
      </Stack>
    </Box>
  );
}
