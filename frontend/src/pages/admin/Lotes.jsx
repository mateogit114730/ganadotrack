import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Card, InputAdornment, Tab, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Tabs, TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PetsIcon from '@mui/icons-material/Pets';
import { api } from '../../api/cliente.js';
import { useCarga } from '../../utils/useCarga.js';
import { Cargando, ErrorCarga, Encabezado, Grilla, ChipEstado, EstadoVacio } from '../../components/Comunes.jsx';
import DialogoFormulario from '../../components/DialogoFormulario.jsx';
import { fmtFecha, fmtGdp, fmtKg, fmtMoneda, hoyISO } from '../../utils/formato.js';

const LOTE_VACIO = {
  nombre: '', fechaIngreso: hoyISO(), cantidadInicial: '', pesoIngreso: '', pesoObjetivo: '', gdpObjetivo: '', observaciones: '',
};

const kgAdorno = (texto = 'kg') => ({ input: { endAdornment: <InputAdornment position="end">{texto}</InputAdornment> } });

/** CU03 – Registrar lote. */
function DialogoNuevoLote({ abierto, onCerrar, onCreado }) {
  const [lote, setLote] = useState(LOTE_VACIO);
  const campo = (nombre) => ({
    value: lote[nombre],
    onChange: (e) => setLote({ ...lote, [nombre]: e.target.value }),
  });

  const guardar = async () => {
    const { data } = await api.post('/lotes', lote);
    setLote(LOTE_VACIO);
    onCreado(data);
  };

  return (
    <DialogoFormulario abierto={abierto} titulo="Nuevo lote" onCerrar={onCerrar} onEnviar={guardar} textoEnviar="Crear lote">
      <TextField label="Nombre / número de lote" required {...campo('nombre')} />
      <Grilla min={180}>
        <TextField label="Fecha de ingreso" type="date" required {...campo('fechaIngreso')} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField label="Cantidad de animales" type="number" required {...campo('cantidadInicial')} />
        <TextField label="Peso promedio de ingreso" type="number" required {...campo('pesoIngreso')} slotProps={kgAdorno()} />
        <TextField label="Peso objetivo de salida" type="number" required {...campo('pesoObjetivo')} slotProps={kgAdorno()} />
        <TextField
          label="GDP objetivo"
          type="number"
          required
          {...campo('gdpObjetivo')}
          helperText="Ganancia diaria esperada, ej.: 0,45"
          slotProps={{ ...kgAdorno('kg/día'), htmlInput: { step: 0.01 } }}
        />
      </Grilla>
      <TextField label="Observaciones" multiline minRows={2} {...campo('observaciones')} />
    </DialogoFormulario>
  );
}

export default function Lotes() {
  const navegar = useNavigate();
  const [estado, setEstado] = useState('ACTIVO');
  const [dialogo, setDialogo] = useState(false);
  const { datos, cargando, error } = useCarga(
    () => api.get('/lotes', { params: { estado: estado || undefined } }).then((r) => r.data),
    [estado],
  );

  return (
    <>
      <Encabezado
        icono={<PetsIcon />}
        titulo="Lotes"
        subtitulo="Lotes de feedlot con su evolución y costos"
        acciones={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogo(true)}>Nuevo lote</Button>}
      />
      <Tabs value={estado} onChange={(_, v) => setEstado(v)} sx={{ mb: 2 }}>
        <Tab value="ACTIVO" label="Activos" />
        <Tab value="CERRADO" label="Cerrados" />
        <Tab value="" label="Todos" />
      </Tabs>

      {cargando && <Cargando />}
      {error && <ErrorCarga mensaje={error} />}
      {datos && (
        <Card>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 820 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Lote</TableCell>
                  <TableCell>Ingreso</TableCell>
                  <TableCell align="right">Días</TableCell>
                  <TableCell align="right">Cabezas</TableCell>
                  <TableCell align="right">Peso actual</TableCell>
                  <TableCell align="right">Última GDP</TableCell>
                  <TableCell align="right">Costo acumulado</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {datos.length === 0 && (
                  <TableRow><TableCell colSpan={8}><EstadoVacio titulo="No hay lotes para mostrar" texto="Cambiá el filtro o cargá un lote nuevo." /></TableCell></TableRow>
                )}
                {datos.map((l) => (
                  <TableRow key={l.id} hover sx={{ cursor: 'pointer' }} onClick={() => navegar(`/lotes/${l.id}`)}>
                    <TableCell sx={{ fontWeight: 600 }}>{l.nombre}</TableCell>
                    <TableCell>{fmtFecha(l.fechaIngreso)}</TableCell>
                    <TableCell align="right">{l.indicadores.diasEnFeedlot}</TableCell>
                    <TableCell align="right">{l.indicadores.cabezasActuales}</TableCell>
                    <TableCell align="right">{fmtKg(l.indicadores.pesoActual, 1)}</TableCell>
                    <TableCell align="right">
                      {fmtGdp(l.indicadores.ultimaGdp)}
                      {l.indicadores.bajoRendimiento && <ChipEstado estado="aviso" label="baja" sx={{ ml: 1 }} />}
                    </TableCell>
                    <TableCell align="right">{fmtMoneda(l.indicadores.costoTotal)}</TableCell>
                    <TableCell>
                      <ChipEstado estado={l.estado === 'ACTIVO' ? 'ok' : 'neutro'} label={l.estado === 'ACTIVO' ? 'Activo' : 'Cerrado'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <DialogoNuevoLote
        abierto={dialogo}
        onCerrar={() => setDialogo(false)}
        onCreado={(lote) => navegar(`/lotes/${lote.id}`)}
      />
    </>
  );
}
