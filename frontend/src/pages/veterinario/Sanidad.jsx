import { useState } from 'react';
import {
  Alert, AlertTitle, Box, Button, Card, CardActions, CardContent, Chip, InputAdornment, MenuItem,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import EventIcon from '@mui/icons-material/EventAvailable';
import AddTaskIcon from '@mui/icons-material/AddTask';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircleOutline';
import { api, mensajeError } from '../../api/cliente.js';
import { useCarga } from '../../utils/useCarga.js';
import { Cargando, ErrorCarga, Encabezado, Grilla } from '../../components/Comunes.jsx';
import DialogoFormulario from '../../components/DialogoFormulario.jsx';
import ListaAlertas from '../../components/ListaAlertas.jsx';
import { ETIQUETAS, fmtFecha, fmtMoneda, hoyISO } from '../../utils/formato.js';

const TIPOS = Object.entries(ETIQUETAS.tipoEvento);
const CAUSAS = Object.entries(ETIQUETAS.causaBaja);
const pesos = { input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } };

/** Datos de ejecución comunes a eventos programados y no programados (CU09). */
function CamposEjecucion({ datos, campo, tipo }) {
  return (
    <>
      <Grilla min={180}>
        <TextField label="Fecha de realización" type="date" {...campo('fechaRealizada')} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField label="Producto utilizado" {...campo('producto')} />
        <TextField label="Dosis" {...campo('dosis')} placeholder="Ej.: 5 ml/animal" />
        <TextField label="Costo total" type="number" {...campo('costo')} slotProps={pesos} helperText={datos.costo === '' ? 'Si lo deja vacío se guarda en $ 0' : ' '} />
      </Grilla>
      {tipo === 'GARRAPATA' && (
        <TextField
          label="Duración del tratamiento"
          type="number"
          required
          {...campo('duracionDias')}
          slotProps={{ input: { endAdornment: <InputAdornment position="end">días</InputAdornment> } }}
          helperText="Al finalizar el tratamiento se programa automáticamente un control"
        />
      )}
    </>
  );
}

/** Convierte el formulario en el cuerpo de la petición (los vacíos no se envían). */
function cuerpoEjecucion(datos) {
  const cuerpo = { ...datos };
  for (const clave of ['costo', 'duracionDias', 'producto', 'dosis']) if (cuerpo[clave] === '') delete cuerpo[clave];
  return cuerpo;
}

function useFormulario(inicial) {
  const [datos, setDatos] = useState(inicial);
  const campo = (n) => ({ value: datos[n], onChange: (e) => setDatos({ ...datos, [n]: e.target.value }) });
  return [datos, campo];
}

/** CU08 – Programar evento sanitario. */
function DialogoProgramar({ lotes, loteInicial, onCerrar, onGuardado }) {
  const [datos, campo] = useFormulario({ loteId: loteInicial ?? '', tipo: 'VACUNA', nombre: '', producto: '', fechaProgramada: hoyISO() });
  const guardar = async () => {
    const { data } = await api.post('/sanidad/eventos', datos);
    onGuardado({ severidad: 'success', titulo: 'Evento programado', texto: [`${data.nombre} – ${data.lote.nombre} el ${fmtFecha(data.fechaProgramada)}`] });
  };
  return (
    <DialogoFormulario abierto titulo="Programar evento sanitario" onCerrar={onCerrar} onEnviar={guardar} textoEnviar="Programar">
      <TextField select label="Lote" {...campo('loteId')}>
        {lotes.map((l) => <MenuItem key={l.id} value={l.id}>{l.nombre}</MenuItem>)}
      </TextField>
      <Grilla min={180}>
        <TextField select label="Tipo" {...campo('tipo')}>
          {TIPOS.map(([v, t]) => <MenuItem key={v} value={v}>{t}</MenuItem>)}
        </TextField>
        <TextField label="Fecha programada" type="date" {...campo('fechaProgramada')} slotProps={{ inputLabel: { shrink: true } }} />
      </Grilla>
      <TextField label="Nombre del evento" {...campo('nombre')} placeholder="Ej.: Vacuna clostridial" />
      <TextField label="Producto previsto" {...campo('producto')} />
    </DialogoFormulario>
  );
}

function avisoEjecucion(resultado) {
  return {
    severidad: resultado.advertencias.length ? 'warning' : 'success',
    titulo: `Evento registrado: ${resultado.evento.nombre} – ${resultado.evento.lote.nombre}`,
    texto: [
      ...resultado.advertencias,
      resultado.proximoEvento && `Se programó un control para el ${fmtFecha(resultado.proximoEvento.fechaProgramada)}`,
    ].filter(Boolean),
  };
}

/** CU09 – Registrar un evento programado como realizado. */
function DialogoRealizar({ evento, onCerrar, onGuardado }) {
  const [datos, campo] = useFormulario({ fechaRealizada: hoyISO(), producto: evento.producto ?? '', dosis: '', costo: '', duracionDias: '' });
  const guardar = async () => {
    const { data } = await api.post(`/sanidad/eventos/${evento.id}/realizar`, cuerpoEjecucion(datos));
    onGuardado(avisoEjecucion(data));
  };
  return (
    <DialogoFormulario abierto titulo={`${evento.nombre} – ${evento.lote.nombre}`} onCerrar={onCerrar} onEnviar={guardar} textoEnviar="Registrar como realizado">
      <CamposEjecucion datos={datos} campo={campo} tipo={evento.tipo} />
    </DialogoFormulario>
  );
}

/** CU09 – Registrar un evento que no estaba programado. */
function DialogoNoProgramado({ lotes, loteInicial, onCerrar, onGuardado }) {
  const [datos, campo] = useFormulario({
    loteId: loteInicial ?? '', tipo: 'VACUNA', nombre: '', fechaRealizada: hoyISO(), producto: '', dosis: '', costo: '', duracionDias: '',
  });
  const guardar = async () => {
    const { data } = await api.post('/sanidad/eventos/realizados', cuerpoEjecucion(datos));
    onGuardado(avisoEjecucion(data));
  };
  return (
    <DialogoFormulario abierto titulo="Registrar evento no programado" onCerrar={onCerrar} onEnviar={guardar}>
      <Grilla min={180}>
        <TextField select label="Lote" {...campo('loteId')}>
          {lotes.map((l) => <MenuItem key={l.id} value={l.id}>{l.nombre}</MenuItem>)}
        </TextField>
        <TextField select label="Tipo" {...campo('tipo')}>
          {TIPOS.map(([v, t]) => <MenuItem key={v} value={v}>{t}</MenuItem>)}
        </TextField>
      </Grilla>
      <TextField label="Nombre del evento" {...campo('nombre')} placeholder="Ej.: Tratamiento antibiótico" />
      <CamposEjecucion datos={datos} campo={campo} tipo={datos.tipo} />
    </DialogoFormulario>
  );
}

/** CU10 – Registrar baja de animales. */
function DialogoBaja({ lotes, loteInicial, onCerrar, onGuardado }) {
  const [datos, campo] = useFormulario({ loteId: loteInicial ?? '', fecha: hoyISO(), cantidad: '', causa: 'ENFERMEDAD', observaciones: '' });
  const guardar = async () => {
    const { data } = await api.post('/sanidad/bajas', datos);
    onGuardado({ severidad: 'success', titulo: 'Baja registrada', texto: [`${data.baja.lote.nombre}: quedan ${data.cabezasActuales} cabezas`] });
  };
  return (
    <DialogoFormulario abierto titulo="Registrar baja de animales" onCerrar={onCerrar} onEnviar={guardar}>
      <TextField select label="Lote" {...campo('loteId')}>
        {lotes.map((l) => <MenuItem key={l.id} value={l.id}>{l.nombre} ({l.cabezasActuales} cabezas)</MenuItem>)}
      </TextField>
      <Grilla min={160}>
        <TextField label="Fecha" type="date" {...campo('fecha')} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField label="Cantidad de animales" type="number" {...campo('cantidad')} />
        <TextField select label="Causa" {...campo('causa')}>
          {CAUSAS.map(([v, t]) => <MenuItem key={v} value={v}>{t}</MenuItem>)}
        </TextField>
      </Grilla>
      <TextField label="Observaciones" multiline minRows={2} {...campo('observaciones')} />
    </DialogoFormulario>
  );
}

async function cargarSanidad(loteId) {
  const filtro = { params: { loteId: loteId || undefined } };
  const [lotes, eventos, bajas, alertas] = await Promise.all([
    api.get('/sanidad/lotes'),
    api.get('/sanidad/eventos', filtro),
    api.get('/sanidad/bajas', filtro),
    api.get('/alertas'),
  ]);
  return {
    lotes: lotes.data,
    eventos: eventos.data,
    bajas: bajas.data,
    alertas: alertas.data.filter((a) => a.tipo === 'SANITARIA' && (!loteId || a.loteId === loteId)),
  };
}

export default function Sanidad() {
  const [loteId, setLoteId] = useState('');
  const { datos, cargando, error, recargar } = useCarga(() => cargarSanidad(loteId), [loteId]);
  const [dialogo, setDialogo] = useState(null);
  const [aviso, setAviso] = useState(null);

  if (cargando && !datos) return <Cargando />;
  if (error) return <ErrorCarga mensaje={error} />;

  const pendientes = datos.eventos.filter((e) => e.estado === 'PENDIENTE' && e.lote.estado === 'ACTIVO');
  const realizados = datos.eventos.filter((e) => e.estado === 'REALIZADO');
  const listo = (nuevoAviso) => {
    setDialogo(null);
    setAviso(nuevoAviso);
    recargar();
  };
  const eliminar = async (evento) => {
    try {
      await api.delete(`/sanidad/eventos/${evento.id}`);
      listo({ severidad: 'success', titulo: 'Evento eliminado', texto: [evento.nombre] });
    } catch (err) {
      setAviso({ severidad: 'error', titulo: 'No se pudo eliminar', texto: [mensajeError(err)] });
    }
  };
  const propsDialogo = { lotes: datos.lotes, loteInicial: loteId || undefined, onCerrar: () => setDialogo(null), onGuardado: listo };

  return (
    <>
      <Encabezado
        titulo="Sanidad"
        subtitulo="Calendario sanitario, tratamientos y bajas (RF05)"
        acciones={
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button variant="contained" startIcon={<EventIcon />} onClick={() => setDialogo({ tipo: 'programar' })}>Programar evento</Button>
            <Button variant="outlined" startIcon={<AddTaskIcon />} onClick={() => setDialogo({ tipo: 'noProgramado' })}>Evento no programado</Button>
            <Button variant="outlined" color="error" startIcon={<RemoveCircleIcon />} onClick={() => setDialogo({ tipo: 'baja' })}>Registrar baja</Button>
          </Stack>
        }
      />

      <TextField
        select
        label="Lote"
        value={loteId}
        onChange={(e) => setLoteId(e.target.value)}
        sx={{ maxWidth: 320, mb: 2 }}
        size="small"
        slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
      >
        <MenuItem value="">Todos los lotes</MenuItem>
        {datos.lotes.map((l) => <MenuItem key={l.id} value={l.id}>{l.nombre}</MenuItem>)}
      </TextField>

      {aviso && (
        <Alert severity={aviso.severidad} onClose={() => setAviso(null)} sx={{ mb: 2 }}>
          <AlertTitle>{aviso.titulo}</AlertTitle>
          {aviso.texto.map((t) => <div key={t}>{t}</div>)}
        </Alert>
      )}

      <Typography variant="h6" gutterBottom>Alertas sanitarias</Typography>
      <ListaAlertas alertas={datos.alertas} />

      <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>Eventos pendientes ({pendientes.length})</Typography>
      {pendientes.length === 0 && <Typography color="text.secondary">No hay eventos pendientes.</Typography>}
      <Grilla min={260}>
        {pendientes.map((e) => (
          <Card key={e.id}>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                <Chip size="small" label={ETIQUETAS.tipoEvento[e.tipo]} color={e.tipo === 'GARRAPATA' ? 'secondary' : 'default'} />
                <Typography variant="body2" color="text.secondary">{fmtFecha(e.fechaProgramada)}</Typography>
              </Box>
              <Typography sx={{ fontWeight: 600 }}>{e.nombre}</Typography>
              <Typography variant="body2" color="text.secondary">{e.lote.nombre}{e.producto ? ` · ${e.producto}` : ''}</Typography>
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2 }}>
              <Button variant="contained" size="small" onClick={() => setDialogo({ tipo: 'realizar', evento: e })}>Registrar realizado</Button>
              <Button size="small" color="inherit" onClick={() => eliminar(e)}>Eliminar</Button>
            </CardActions>
          </Card>
        ))}
      </Grilla>

      <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>Eventos realizados</Typography>
      <Card>
        <TableContainer sx={{ maxHeight: 420 }}>
          <Table size="small" stickyHeader sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Lote</TableCell>
                <TableCell>Evento</TableCell>
                <TableCell>Producto / dosis</TableCell>
                <TableCell align="right">Costo</TableCell>
                <TableCell>Registró</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {realizados.length === 0 && <TableRow><TableCell colSpan={6} align="center">Sin eventos realizados.</TableCell></TableRow>}
              {realizados.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{fmtFecha(e.fechaRealizada)}</TableCell>
                  <TableCell>{e.lote.nombre}</TableCell>
                  <TableCell>{e.nombre}</TableCell>
                  <TableCell>{[e.producto, e.dosis].filter(Boolean).join(' · ') || '—'}</TableCell>
                  <TableCell align="right">{fmtMoneda(e.costo)}</TableCell>
                  <TableCell>{e.usuario?.nombre ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>Bajas</Typography>
      <Card>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Lote</TableCell>
                <TableCell align="right">Cantidad</TableCell>
                <TableCell>Causa</TableCell>
                <TableCell>Observaciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {datos.bajas.length === 0 && <TableRow><TableCell colSpan={5} align="center">Sin bajas registradas.</TableCell></TableRow>}
              {datos.bajas.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{fmtFecha(b.fecha)}</TableCell>
                  <TableCell>{b.lote.nombre}</TableCell>
                  <TableCell align="right">{b.cantidad}</TableCell>
                  <TableCell>{ETIQUETAS.causaBaja[b.causa]}</TableCell>
                  <TableCell>{b.observaciones ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {dialogo?.tipo === 'programar' && <DialogoProgramar {...propsDialogo} />}
      {dialogo?.tipo === 'noProgramado' && <DialogoNoProgramado {...propsDialogo} />}
      {dialogo?.tipo === 'baja' && <DialogoBaja {...propsDialogo} />}
      {dialogo?.tipo === 'realizar' && <DialogoRealizar evento={dialogo.evento} onCerrar={() => setDialogo(null)} onGuardado={listo} />}
    </>
  );
}
