import { useState } from 'react';
import {
  Button, Card, Chip, IconButton, MenuItem, Switch, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/PersonAdd';
import KeyIcon from '@mui/icons-material/Key';
import PeopleIcon from '@mui/icons-material/PeopleOutline';
import { api, mensajeError } from '../../api/cliente.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCarga } from '../../utils/useCarga.js';
import { Cargando, ErrorCarga, Encabezado } from '../../components/Comunes.jsx';
import DialogoFormulario from '../../components/DialogoFormulario.jsx';
import { ETIQUETAS } from '../../utils/formato.js';

const ROLES = Object.entries(ETIQUETAS.rol);

/** CU02 – Gestionar usuarios. */
function DialogoUsuario({ onCerrar, onGuardado }) {
  const [datos, setDatos] = useState({ nombre: '', email: '', rol: 'ENCARGADO', password: '' });
  const campo = (n) => ({ value: datos[n], onChange: (e) => setDatos({ ...datos, [n]: e.target.value }) });
  const guardar = async () => {
    await api.post('/usuarios', datos);
    onGuardado();
  };
  return (
    <DialogoFormulario abierto titulo="Nuevo usuario" onCerrar={onCerrar} onEnviar={guardar} textoEnviar="Crear usuario">
      <TextField label="Nombre" {...campo('nombre')} />
      <TextField label="Email" type="email" {...campo('email')} />
      <TextField label="Rol" select {...campo('rol')}>
        {ROLES.map(([valor, texto]) => <MenuItem key={valor} value={valor}>{texto}</MenuItem>)}
      </TextField>
      <TextField label="Contraseña inicial" type="password" {...campo('password')} helperText="Mínimo 8 caracteres" />
    </DialogoFormulario>
  );
}

function DialogoPassword({ usuario, onCerrar, onGuardado }) {
  const [password, setPassword] = useState('');
  const guardar = async () => {
    await api.patch(`/usuarios/${usuario.id}`, { password });
    onGuardado();
  };
  return (
    <DialogoFormulario abierto titulo={`Nueva contraseña – ${usuario.nombre}`} onCerrar={onCerrar} onEnviar={guardar}>
      <TextField label="Nueva contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} helperText="Mínimo 8 caracteres" autoFocus />
    </DialogoFormulario>
  );
}

export default function Usuarios() {
  const { usuario: actual } = useAuth();
  const { datos, cargando, error, recargar } = useCarga(() => api.get('/usuarios').then((r) => r.data));
  const [dialogo, setDialogo] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  if (cargando && !datos) return <Cargando />;
  if (error) return <ErrorCarga mensaje={error} />;

  const actualizar = async (u, cambios) => {
    setErrorAccion(null);
    try {
      await api.patch(`/usuarios/${u.id}`, cambios);
      recargar();
    } catch (err) {
      setErrorAccion(mensajeError(err));
    }
  };
  const listo = () => {
    setDialogo(null);
    recargar();
  };

  return (
    <>
      <Encabezado
        icono={<PeopleIcon />}
        titulo="Usuarios"
        subtitulo="Administrador: acceso completo · Encargado: alimentación · Veterinario: sanidad"
        acciones={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogo({ tipo: 'nuevo' })}>Nuevo usuario</Button>}
      />
      {errorAccion && <ErrorCarga mensaje={errorAccion} />}
      <Card>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Activo</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {datos.map((u) => (
                <TableRow key={u.id} sx={{ opacity: u.activo ? 1 : 0.5 }}>
                  <TableCell>
                    {u.nombre} {u.id === actual.id && <Chip size="small" label="Vos" sx={{ ml: 1 }} />}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      value={u.rol}
                      disabled={u.id === actual.id}
                      onChange={(e) => actualizar(u, { rol: e.target.value })}
                      sx={{ minWidth: 160 }}
                    >
                      {ROLES.map(([valor, texto]) => <MenuItem key={valor} value={valor}>{texto}</MenuItem>)}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <Switch checked={u.activo} disabled={u.id === actual.id} onChange={(e) => actualizar(u, { activo: e.target.checked })} />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Cambiar contraseña">
                      <IconButton onClick={() => setDialogo({ tipo: 'password', usuario: u })}><KeyIcon /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
      {dialogo?.tipo === 'nuevo' && <DialogoUsuario onCerrar={() => setDialogo(null)} onGuardado={listo} />}
      {dialogo?.tipo === 'password' && <DialogoPassword usuario={dialogo.usuario} onCerrar={() => setDialogo(null)} onGuardado={listo} />}
    </>
  );
}
