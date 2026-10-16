import { useState } from 'react';
import {
  Box, Button, Card, CardActions, CardContent, Divider, FormControlLabel, IconButton, MenuItem, Stack,
  Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import ChecklistIcon from '@mui/icons-material/ChecklistRtl';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import StarIcon from '@mui/icons-material/Star';
import { api, mensajeError } from '../../api/cliente.js';
import { useCarga } from '../../utils/useCarga.js';
import { useAviso, useConfirmar } from '../../components/Interaccion.jsx';
import { Cargando, ChipEstado, Encabezado, ErrorCarga, EstadoVacio, Grilla } from '../../components/Comunes.jsx';
import DialogoFormulario from '../../components/DialogoFormulario.jsx';
import { ETIQUETAS } from '../../utils/formato.js';

const TIPOS = Object.entries(ETIQUETAS.tipoEvento);
const ITEM_VACIO = { tipo: 'VACUNA', nombre: '', producto: '', diaDesdeIngreso: 0, aplicaciones: 1, repetirCadaDias: '' };

/** Texto legible de cuándo se aplica un ítem del protocolo. */
function describirItem(item) {
  const inicio = item.diaDesdeIngreso === 0 ? 'al ingresar' : `día ${item.diaDesdeIngreso}`;
  if (item.aplicaciones > 1) return `${inicio}, luego cada ${item.repetirCadaDias} días (${item.aplicaciones} aplicaciones)`;
  return inicio;
}

/** Alta y edición de un protocolo con su lista de eventos. */
function DialogoProtocolo({ protocolo, onCerrar, onGuardado }) {
  const [datos, setDatos] = useState(
    protocolo
      ? {
          nombre: protocolo.nombre,
          descripcion: protocolo.descripcion ?? '',
          porDefecto: protocolo.porDefecto,
          items: protocolo.items.map((i) => ({ ...i, producto: i.producto ?? '', repetirCadaDias: i.repetirCadaDias ?? '' })),
        }
      : { nombre: '', descripcion: '', porDefecto: false, items: [{ ...ITEM_VACIO }] },
  );
  const cambiarItem = (n, campo, valor) =>
    setDatos({ ...datos, items: datos.items.map((it, i) => (i === n ? { ...it, [campo]: valor } : it)) });

  const guardar = async () => {
    const cuerpo = {
      ...datos,
      items: datos.items.map((i) => ({
        tipo: i.tipo,
        nombre: i.nombre,
        producto: i.producto,
        diaDesdeIngreso: i.diaDesdeIngreso,
        aplicaciones: i.aplicaciones || 1,
        repetirCadaDias: Number(i.aplicaciones) > 1 ? i.repetirCadaDias : null,
      })),
    };
    if (protocolo) await api.put(`/protocolos/${protocolo.id}`, cuerpo);
    else await api.post('/protocolos', cuerpo);
    onGuardado(protocolo ? 'Protocolo actualizado' : 'Protocolo creado');
  };

  return (
    <DialogoFormulario abierto ancho="md" titulo={protocolo ? 'Editar protocolo' : 'Nuevo protocolo sanitario'} onCerrar={onCerrar} onEnviar={guardar}>
      <TextField label="Nombre" value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} />
      <TextField label="Descripción" value={datos.descripcion} onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })} />
      <FormControlLabel
        control={<Switch checked={datos.porDefecto} onChange={(e) => setDatos({ ...datos, porDefecto: e.target.checked })} />}
        label="Usar por defecto al crear lotes"
      />
      <Divider />
      <Typography variant="subtitle1">Eventos del protocolo</Typography>
      {datos.items.map((it, n) => (
        <Box key={n} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2, position: 'relative' }}>
          <Grilla min={150} gap={1.5}>
            <TextField select size="small" label="Tipo" value={it.tipo} onChange={(e) => cambiarItem(n, 'tipo', e.target.value)}>
              {TIPOS.map(([v, t]) => <MenuItem key={v} value={v}>{t}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Evento" value={it.nombre} onChange={(e) => cambiarItem(n, 'nombre', e.target.value)} />
            <TextField size="small" label="Producto" value={it.producto} onChange={(e) => cambiarItem(n, 'producto', e.target.value)} />
            <TextField size="small" type="number" label="Día desde el ingreso" value={it.diaDesdeIngreso} onChange={(e) => cambiarItem(n, 'diaDesdeIngreso', e.target.value)} />
            <TextField size="small" type="number" label="Aplicaciones" value={it.aplicaciones} onChange={(e) => cambiarItem(n, 'aplicaciones', e.target.value)} />
            <TextField
              size="small"
              type="number"
              label="Cada (días)"
              value={it.repetirCadaDias}
              disabled={Number(it.aplicaciones) <= 1}
              onChange={(e) => cambiarItem(n, 'repetirCadaDias', e.target.value)}
            />
          </Grilla>
          {datos.items.length > 1 && (
            <IconButton
              size="small"
              title="Quitar evento"
              onClick={() => setDatos({ ...datos, items: datos.items.filter((_, i) => i !== n) })}
              sx={{ position: 'absolute', top: -14, right: -10, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ))}
      <Box>
        <Button startIcon={<AddIcon />} onClick={() => setDatos({ ...datos, items: [...datos.items, { ...ITEM_VACIO }] })}>
          Agregar evento
        </Button>
      </Box>
    </DialogoFormulario>
  );
}

/** RF10 – Protocolos sanitarios: planes que generan el calendario de cada lote nuevo. */
export default function Protocolos() {
  const { datos, cargando, error, recargar } = useCarga(() => api.get('/protocolos').then((r) => r.data));
  const [dialogo, setDialogo] = useState(null);
  const confirmar = useConfirmar();
  const avisar = useAviso();

  if (cargando && !datos) return <Cargando />;
  if (error) return <ErrorCarga mensaje={error} />;

  const listo = (mensaje) => {
    setDialogo(null);
    avisar(mensaje);
    recargar();
  };
  const eliminar = async (p) => {
    const ok = await confirmar({
      titulo: `¿Eliminar "${p.nombre}"?`,
      texto: 'Los eventos que ya se generaron en los lotes no se modifican.',
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/protocolos/${p.id}`);
      listo('Protocolo eliminado');
    } catch (err) {
      avisar(mensajeError(err), 'error');
    }
  };

  return (
    <>
      <Encabezado
        icono={<ChecklistIcon />}
        titulo="Protocolos sanitarios"
        subtitulo="Al crear un lote, el protocolo arma solo su calendario de vacunas y tratamientos."
        acciones={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogo({ protocolo: null })}>Nuevo protocolo</Button>}
      />
      {datos.length === 0 ? (
        <EstadoVacio titulo="Todavía no hay protocolos" texto="Creá el plan sanitario que se aplica a cada tropa que ingresa." />
      ) : (
        <Grilla min={420}>
          {datos.map((p) => (
            <Card key={p.id}>
              <CardContent>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="h6" sx={{ flex: 1 }}>{p.nombre}</Typography>
                  {p.porDefecto && <ChipEstado estado="ok" label="Por defecto" icon={<StarIcon />} />}
                </Box>
                {p.descripcion && <Typography color="text.secondary" sx={{ mb: 1 }}>{p.descripcion}</Typography>}
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Evento</TableCell>
                        <TableCell>Cuándo</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {p.items.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                              <ChipEstado estado={i.tipo === 'GARRAPATA' ? 'aviso' : 'neutro'} label={ETIQUETAS.tipoEvento[i.tipo]} />
                              <span>{i.nombre}</span>
                            </Stack>
                          </TableCell>
                          <TableCell>{describirItem(i)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button onClick={() => setDialogo({ protocolo: p })}>Editar</Button>
                <Button color="inherit" onClick={() => eliminar(p)}>Eliminar</Button>
              </CardActions>
            </Card>
          ))}
        </Grilla>
      )}
      {dialogo && <DialogoProtocolo protocolo={dialogo.protocolo} onCerrar={() => setDialogo(null)} onGuardado={listo} />}
    </>
  );
}
