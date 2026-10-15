import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert, AlertTitle, Box, Button, Card, CardContent, IconButton, InputAdornment, Stack, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MonitorWeightIcon from '@mui/icons-material/MonitorWeight';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { api, mensajeError } from '../../api/cliente.js';
import { useCarga } from '../../utils/useCarga.js';
import { Cargando, ErrorCarga, Grilla, Indicador, Dato, ChipEstado } from '../../components/Comunes.jsx';
import DialogoFormulario from '../../components/DialogoFormulario.jsx';
import { useConfirmar, useAviso } from '../../components/Interaccion.jsx';
import {
  ETIQUETAS, fmtFecha, fmtGdp, fmtKg, fmtMoneda, fmtMonedaDecimales, fmtNumero, hoyISO,
} from '../../utils/formato.js';

const conUnidad = (unidad) => ({ input: { endAdornment: <InputAdornment position="end">{unidad}</InputAdornment> } });

async function cargarLote(id) {
  const [costos, pesadas, alimentacion, eventos, bajas] = await Promise.all([
    api.get(`/costos/${id}`),
    api.get('/pesadas', { params: { loteId: id } }),
    api.get('/alimentacion', { params: { loteId: id } }),
    api.get('/sanidad/eventos', { params: { loteId: id } }),
    api.get('/sanidad/bajas', { params: { loteId: id } }),
  ]);
  return {
    ...costos.data,
    pesadas: pesadas.data,
    alimentacion: alimentacion.data,
    eventos: eventos.data,
    bajas: bajas.data,
  };
}

/* ---------------------------- Diálogos ---------------------------- */

/** CU07 – Registrar pesada mensual. */
function DialogoPesada({ lote, abierto, onCerrar, onGuardado }) {
  const [fecha, setFecha] = useState(hoyISO());
  const [peso, setPeso] = useState('');
  const guardar = async () => {
    const { data } = await api.post('/pesadas', { loteId: lote.id, fecha, pesoPromedio: peso });
    setPeso('');
    onGuardado(data);
  };
  return (
    <DialogoFormulario abierto={abierto} titulo={`Registrar pesada – ${lote.nombre}`} onCerrar={onCerrar} onEnviar={guardar}>
      <TextField label="Fecha de la pesada" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      <TextField label="Peso promedio del lote" type="number" value={peso} onChange={(e) => setPeso(e.target.value)} slotProps={conUnidad('kg')} autoFocus />
    </DialogoFormulario>
  );
}

/** Edición del lote activo y carga del precio de venta (CU11, flujo alternativo). */
function DialogoEditar({ lote, abierto, onCerrar, onGuardado }) {
  const [datos, setDatos] = useState({
    nombre: lote.nombre,
    pesoObjetivo: lote.pesoObjetivo,
    gdpObjetivo: lote.gdpObjetivo,
    precioVentaKg: lote.precioVentaKg ?? '',
    observaciones: lote.observaciones ?? '',
  });
  const campo = (n) => ({ value: datos[n], onChange: (e) => setDatos({ ...datos, [n]: e.target.value }) });
  const guardar = async () => {
    await api.patch(`/lotes/${lote.id}`, { ...datos, precioVentaKg: datos.precioVentaKg === '' ? null : datos.precioVentaKg });
    onGuardado();
  };
  return (
    <DialogoFormulario abierto={abierto} titulo="Editar lote" onCerrar={onCerrar} onEnviar={guardar}>
      <TextField label="Nombre" {...campo('nombre')} />
      <Grilla min={180}>
        <TextField label="Peso objetivo" type="number" {...campo('pesoObjetivo')} slotProps={conUnidad('kg')} />
        <TextField label="GDP objetivo" type="number" {...campo('gdpObjetivo')} slotProps={{ ...conUnidad('kg/día'), htmlInput: { step: 0.01 } }} />
        <TextField label="Precio de venta por kg al gancho" type="number" {...campo('precioVentaKg')} slotProps={conUnidad('$/kg')} helperText="Se usa para calcular el margen" />
      </Grilla>
      <TextField label="Observaciones" multiline minRows={2} {...campo('observaciones')} />
    </DialogoFormulario>
  );
}

/** CU13 – Cerrar lote: primero muestra el resumen final (simulación) y luego confirma. */
function DialogoCierre({ lote, abierto, onCerrar, onCerrado }) {
  const [datos, setDatos] = useState({
    fechaCierre: hoyISO(),
    pesoFinal: lote.indicadores.pesoActual,
    precioVentaKg: lote.precioVentaKg ?? '',
  });
  const [simulacion, setSimulacion] = useState(null);
  const campo = (n) => ({
    value: datos[n],
    onChange: (e) => {
      setDatos({ ...datos, [n]: e.target.value });
      setSimulacion(null);
    },
  });

  const enviar = async () => {
    if (!simulacion) {
      const { data } = await api.post(`/lotes/${lote.id}/cierre`, { ...datos, simular: true });
      setSimulacion(data);
      return;
    }
    await api.post(`/lotes/${lote.id}/cierre`, datos);
    onCerrado();
  };

  const ind = simulacion?.lote.indicadores;
  return (
    <DialogoFormulario
      abierto={abierto}
      titulo={`Cerrar lote – ${lote.nombre}`}
      onCerrar={() => { setSimulacion(null); onCerrar(); }}
      onEnviar={enviar}
      textoEnviar={simulacion ? 'Confirmar cierre' : 'Ver resumen final'}
    >
      <Grilla min={170}>
        <TextField label="Fecha de venta / faena" type="date" {...campo('fechaCierre')} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField label="Peso final promedio" type="number" {...campo('pesoFinal')} slotProps={conUnidad('kg')} />
        <TextField label="Precio de venta por kg" type="number" {...campo('precioVentaKg')} slotProps={conUnidad('$/kg')} />
      </Grilla>
      {simulacion && (
        <Alert severity="info">
          <AlertTitle>Resumen final del lote</AlertTitle>
          {ind.diasEnFeedlot} días · {ind.cabezasActuales} cabezas · {fmtKg(ind.kgCarneEstimados)} de carne<br />
          Costo total: <strong>{fmtMoneda(ind.costoTotal)}</strong> · Costo por kg: <strong>{fmtMonedaDecimales(ind.costoPorKgCarne)}</strong><br />
          Margen bruto de engorde: <strong>{fmtMoneda(ind.margenBruto)}</strong>
          {simulacion.advertencias.map((a) => <Box key={a} sx={{ mt: 1, color: 'warning.dark' }}>⚠ {a}</Box>)}
          <Box sx={{ mt: 1 }}>Al confirmar, el lote no admitirá nuevos registros.</Box>
        </Alert>
      )}
    </DialogoFormulario>
  );
}

/* ---------------------------- Pestañas ---------------------------- */

function TabPesadas({ lote, pesadas, activo, onEliminar }) {
  // Eje X en tiempo real: la distancia entre puntos refleja los días transcurridos.
  const datosGrafico = [
    { ts: Date.parse(lote.fechaIngreso), peso: lote.pesoIngreso },
    ...pesadas.map((p) => ({ ts: Date.parse(p.fecha), peso: p.pesoPromedio })),
  ];
  const fechaCorta = (ts) => fmtFecha(new Date(ts).toISOString()).slice(0, 5);
  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Evolución del peso promedio</Typography>
          <Box sx={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={datosGrafico} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={fechaCorta} />
                <YAxis domain={[(min) => Math.floor(min - 10), (max) => Math.ceil(Math.max(max, lote.pesoObjetivo) + 5)]} unit=" kg" width={70} />
                <Tooltip formatter={(v) => fmtKg(v, 1)} labelFormatter={fechaCorta} />
                <ReferenceLine y={lote.pesoObjetivo} stroke="#7cab3e" strokeDasharray="6 4" label={{ value: 'Objetivo', position: 'insideTopRight' }} />
                <Line type="monotone" dataKey="peso" name="Peso" stroke="#1f5e2c" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell align="right">Peso promedio</TableCell>
                <TableCell align="right">GDP</TableCell>
                <TableCell align="right" title="Kg de materia seca por kg ganado en el período">Conversión</TableCell>
                {activo && <TableCell />}
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>{fmtFecha(lote.fechaIngreso)} (ingreso)</TableCell>
                <TableCell align="right">{fmtKg(lote.pesoIngreso, 1)}</TableCell>
                <TableCell align="right">—</TableCell>
                <TableCell align="right">—</TableCell>
                {activo && <TableCell />}
              </TableRow>
              {pesadas.map((p, i) => (
                <TableRow key={p.id}>
                  <TableCell>{fmtFecha(p.fecha)}</TableCell>
                  <TableCell align="right">{fmtKg(p.pesoPromedio, 1)}</TableCell>
                  <TableCell align="right" sx={{ color: p.gdp < lote.gdpObjetivo ? 'warning.dark' : undefined }}>{fmtGdp(p.gdp)}</TableCell>
                  <TableCell align="right">{p.conversion ? `${fmtNumero(p.conversion, 1)} : 1` : '—'}</TableCell>
                  {activo && (
                    <TableCell padding="checkbox">
                      {i === pesadas.length - 1 && (
                        <IconButton size="small" title="Eliminar la última pesada" onClick={() => onEliminar(p)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );
}

function TabAlimentacion({ registros, activo, onEliminar }) {
  return (
    <Card>
      <TableContainer sx={{ maxHeight: 480 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Insumo</TableCell>
              <TableCell align="right">Kg</TableCell>
              <TableCell align="right">$/kg</TableCell>
              <TableCell align="right">Costo</TableCell>
              <TableCell>Cargó</TableCell>
              {activo && <TableCell />}
            </TableRow>
          </TableHead>
          <TableBody>
            {registros.length === 0 && <TableRow><TableCell colSpan={7} align="center">Sin registros.</TableCell></TableRow>}
            {registros.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{fmtFecha(r.fecha)}</TableCell>
                <TableCell>{r.insumo.nombre}</TableCell>
                <TableCell align="right">{fmtNumero(r.kg)}</TableCell>
                <TableCell align="right">{fmtMonedaDecimales(r.precioKg)}</TableCell>
                <TableCell align="right">{fmtMoneda(r.costo)}</TableCell>
                <TableCell>{r.usuario.nombre}</TableCell>
                {activo && (
                  <TableCell padding="checkbox">
                    <IconButton size="small" title="Eliminar registro (devuelve el stock)" onClick={() => onEliminar(r)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

function TabSanidad({ eventos, bajas, activo, onEliminarBaja }) {
  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button component={RouterLink} to="/sanidad">Ir al módulo de sanidad</Button>
      </Box>
      <Card>
        <CardContent sx={{ pb: 0 }}><Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Calendario sanitario</Typography></CardContent>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Evento</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Producto / dosis</TableCell>
                <TableCell align="right">Costo</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {eventos.length === 0 && <TableRow><TableCell colSpan={6} align="center">Sin eventos.</TableCell></TableRow>}
              {eventos.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{fmtFecha(e.fechaRealizada ?? e.fechaProgramada)}</TableCell>
                  <TableCell>{e.nombre}</TableCell>
                  <TableCell>{ETIQUETAS.tipoEvento[e.tipo]}</TableCell>
                  <TableCell>{[e.producto, e.dosis].filter(Boolean).join(' · ') || '—'}</TableCell>
                  <TableCell align="right">{e.estado === 'REALIZADO' ? fmtMoneda(e.costo) : '—'}</TableCell>
                  <TableCell>
                    <ChipEstado estado={e.estado === 'REALIZADO' ? 'ok' : 'aviso'} label={e.estado === 'REALIZADO' ? 'Realizado' : 'Pendiente'} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
      <Card>
        <CardContent sx={{ pb: 0 }}><Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Bajas</Typography></CardContent>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell align="right">Cantidad</TableCell>
                <TableCell>Causa</TableCell>
                <TableCell>Observaciones</TableCell>
                {activo && <TableCell />}
              </TableRow>
            </TableHead>
            <TableBody>
              {bajas.length === 0 && <TableRow><TableCell colSpan={5} align="center">Sin bajas registradas.</TableCell></TableRow>}
              {bajas.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{fmtFecha(b.fecha)}</TableCell>
                  <TableCell align="right">{b.cantidad}</TableCell>
                  <TableCell>{ETIQUETAS.causaBaja[b.causa]}</TableCell>
                  <TableCell>{b.observaciones ?? '—'}</TableCell>
                  {activo && (
                    <TableCell padding="checkbox">
                      <IconButton size="small" title="Eliminar baja (devuelve las cabezas)" onClick={() => onEliminarBaja(b)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );
}

function TabCostos({ lote, alimentacionPorInsumo, sanidadPorTipo, conversion }) {
  const ind = lote.indicadores;
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Costo de alimentación</Typography>
          {alimentacionPorInsumo.map((a) => (
            <Box key={a.insumoId} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
              <span>{a.insumo} ({fmtKg(a.kg)})</span><strong>{fmtMoneda(a.costo)}</strong>
            </Box>
          ))}
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>Costo sanitario</Typography>
          {sanidadPorTipo.length === 0 && <Typography color="text.secondary">Sin eventos realizados.</Typography>}
          {sanidadPorTipo.map((s) => (
            <Box key={s.tipo} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
              <span>{ETIQUETAS.tipoEvento[s.tipo]} ({s.eventos})</span><strong>{fmtMoneda(s.costo)}</strong>
            </Box>
          ))}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: 1, borderColor: 'divider', mt: 2, pt: 1 }}>
            <strong>Costo total acumulado</strong><strong>{fmtMoneda(ind.costoTotal)}</strong>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Rentabilidad estimada</Typography>
          <Stack spacing={1}>
            <Dato etiqueta="Kg de carne al gancho" valor={`${fmtNumero(ind.pesoActual, 1)} kg × ${ind.cabezasActuales} cab. × ${fmtNumero(ind.rendimientoGancho * 100)} % = ${fmtKg(ind.kgCarneEstimados)}`} />
            <Dato
              etiqueta="Conversión alimenticia acumulada (kg de materia seca por kg ganado)"
              valor={conversion.acumulada ? `${fmtNumero(conversion.acumulada, 2)} : 1 · ${fmtKg(conversion.kgMsTotal)} de MS consumidos` : 'Requiere al menos una pesada'}
            />
            <Dato etiqueta="Costo de engorde por kg de carne" valor={fmtMonedaDecimales(ind.costoPorKgCarne)} />
            <Dato etiqueta="Precio de venta por kg" valor={ind.precioVentaKg ? fmtMoneda(ind.precioVentaKg) : 'No cargado (use “Editar”)'} />
            <Dato etiqueta="Margen bruto estimado de engorde" valor={fmtMoneda(ind.margenBruto)} />
          </Stack>
          <Alert severity="info" sx={{ mt: 2 }}>
            El costo corresponde a la etapa de engorde (alimentación + sanidad); no incluye el valor del animal al ingresar.
            {ind.calculoPreliminar && ' El lote aún no tiene pesadas: el cálculo usa el peso de ingreso.'}
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
}

/* ---------------------------- Página ---------------------------- */

export default function LoteDetalle() {
  const { id } = useParams();
  const { datos, cargando, error, recargar } = useCarga(() => cargarLote(id), [id]);
  const [pestana, setPestana] = useState('pesadas');
  const [dialogo, setDialogo] = useState(null);
  const [aviso, setAviso] = useState(null);
  const confirmar = useConfirmar();
  const avisar = useAviso();

  if (cargando && !datos) return <Cargando />;
  if (error) return <ErrorCarga mensaje={error} />;

  const { lote } = datos;
  const ind = lote.indicadores;
  const activo = lote.estado === 'ACTIVO';
  const cerrarDialogo = () => setDialogo(null);

  const alGuardarPesada = (resultado) => {
    cerrarDialogo();
    setAviso({
      severidad: resultado.avisos.length ? 'warning' : 'success',
      titulo: `Pesada registrada: GDP ${fmtGdp(resultado.pesada.gdp)}`,
      texto: [
        resultado.indicadores.diasRestantes !== null && `Días restantes estimados: ${resultado.indicadores.diasRestantes}`,
        `Costo acumulado: ${fmtMoneda(resultado.indicadores.costoTotal)}`,
        ...resultado.avisos,
      ].filter(Boolean),
    });
    recargar();
  };

  /** Pide confirmación, elimina en la API y avisa el resultado. */
  const eliminar = async ({ url, titulo, texto, exito }) => {
    if (!(await confirmar({ titulo, texto, textoConfirmar: 'Eliminar', peligro: true }))) return;
    try {
      await api.delete(url);
      avisar(exito);
      recargar();
    } catch (err) {
      avisar(mensajeError(err), 'error');
    }
  };
  const eliminarRegistro = (r) => eliminar({
    url: `/alimentacion/${r.id}`,
    titulo: '¿Eliminar el registro de alimentación?',
    texto: `${r.insumo.nombre}, ${fmtKg(r.kg)} del ${fmtFecha(r.fecha)}. Los kilos vuelven al stock.`,
    exito: `Se devolvieron ${fmtKg(r.kg)} al stock de ${r.insumo.nombre}`,
  });
  const eliminarPesada = (p) => eliminar({
    url: `/pesadas/${p.id}`,
    titulo: '¿Eliminar la última pesada?',
    texto: `Pesada del ${fmtFecha(p.fecha)} (${fmtKg(p.pesoPromedio, 1)}). La proyección se recalcula con la pesada anterior.`,
    exito: 'Pesada eliminada',
  });
  const eliminarBaja = (b) => eliminar({
    url: `/sanidad/bajas/${b.id}`,
    titulo: '¿Eliminar la baja?',
    texto: `${b.cantidad} animal(es) del ${fmtFecha(b.fecha)}. Las cabezas vuelven a sumarse al lote.`,
    exito: 'Baja eliminada',
  });

  return (
    <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton component={RouterLink} to="/lotes" aria-label="Volver"><ArrowBackIcon /></IconButton>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h5">{lote.nombre}</Typography>
          <Typography color="text.secondary">
            Ingreso {fmtFecha(lote.fechaIngreso)} · {lote.cantidadInicial} animales · {fmtKg(lote.pesoIngreso)} → {fmtKg(lote.pesoObjetivo)}
            {!activo && ` · Cerrado el ${fmtFecha(lote.fechaCierre)}`}
          </Typography>
        </Box>
        <ChipEstado estado={activo ? 'ok' : 'neutro'} label={activo ? 'Activo' : 'Cerrado'} sx={{ height: 30, fontSize: 14 }} />
        {activo && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button variant="contained" startIcon={<MonitorWeightIcon />} onClick={() => setDialogo('pesada')}>Registrar pesada</Button>
            <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setDialogo('editar')}>Editar</Button>
            <Button variant="outlined" color="error" startIcon={<LockIcon />} onClick={() => setDialogo('cierre')}>Cerrar lote</Button>
          </Stack>
        )}
      </Box>

      {aviso && (
        <Alert severity={aviso.severidad} onClose={() => setAviso(null)} sx={{ mb: 2 }}>
          <AlertTitle>{aviso.titulo}</AlertTitle>
          {aviso.texto.map((t) => <div key={t}>{t}</div>)}
        </Alert>
      )}
      {activo && ind.alcanzoObjetivo && !aviso && (
        <Alert severity="success" sx={{ mb: 2 }}>El lote alcanzó el peso objetivo. Puede evaluar su cierre.</Alert>
      )}

      <Grilla min={170}>
        <Indicador titulo="Días en feedlot" valor={ind.diasEnFeedlot} />
        <Indicador titulo="Cabezas actuales" valor={ind.cabezasActuales} detalle={ind.bajas ? `${ind.bajas} baja(s)` : 'Sin bajas'} />
        <Indicador titulo={activo ? 'Peso actual' : 'Peso final'} valor={fmtKg(ind.pesoActual, 1)} detalle={`Objetivo ${fmtKg(lote.pesoObjetivo)}`} />
        <Indicador
          titulo="Última GDP"
          valor={fmtGdp(ind.ultimaGdp)}
          detalle={`Objetivo ${fmtGdp(ind.gdpObjetivo)}`}
          color={ind.bajoRendimiento ? 'warning.dark' : undefined}
        />
        {activo && (
          <Indicador
            titulo="Llegada estimada al objetivo"
            valor={ind.fechaEstimadaObjetivo ? fmtFecha(ind.fechaEstimadaObjetivo) : '—'}
            detalle={ind.diasRestantes !== null ? `En ${ind.diasRestantes} días` : 'Requiere pesadas con GDP positiva'}
          />
        )}
        <Indicador titulo="Costo acumulado" valor={fmtMoneda(ind.costoTotal)} />
        <Indicador titulo="Costo por kg de carne" valor={fmtMonedaDecimales(ind.costoPorKgCarne)} />
        <Indicador titulo="Margen bruto estimado" valor={fmtMoneda(ind.margenBruto)} color={ind.margenBruto < 0 ? 'error.main' : 'primary.main'} />
      </Grilla>

      <Tabs value={pestana} onChange={(_, v) => setPestana(v)} variant="scrollable" sx={{ my: 2 }}>
        <Tab value="pesadas" label="Pesadas" />
        <Tab value="alimentacion" label="Alimentación" />
        <Tab value="sanidad" label="Sanidad" />
        <Tab value="costos" label="Costos" />
      </Tabs>

      {pestana === 'pesadas' && <TabPesadas lote={lote} pesadas={datos.pesadas} activo={activo} onEliminar={eliminarPesada} />}
      {pestana === 'alimentacion' && <TabAlimentacion registros={datos.alimentacion} activo={activo} onEliminar={eliminarRegistro} />}
      {pestana === 'sanidad' && <TabSanidad eventos={datos.eventos} bajas={datos.bajas} activo={activo} onEliminarBaja={eliminarBaja} />}
      {pestana === 'costos' && <TabCostos lote={lote} alimentacionPorInsumo={datos.alimentacionPorInsumo} sanidadPorTipo={datos.sanidadPorTipo} conversion={datos.conversion} />}

      {activo && (
        <>
          <DialogoPesada lote={lote} abierto={dialogo === 'pesada'} onCerrar={cerrarDialogo} onGuardado={alGuardarPesada} />
          {dialogo === 'editar' && (
            <DialogoEditar lote={lote} abierto onCerrar={cerrarDialogo} onGuardado={() => { cerrarDialogo(); recargar(); }} />
          )}
          {dialogo === 'cierre' && (
            <DialogoCierre
              lote={lote}
              abierto
              onCerrar={cerrarDialogo}
              onCerrado={() => { cerrarDialogo(); setAviso({ severidad: 'success', titulo: 'Lote cerrado', texto: ['El lote quedó en el historial con su resumen final.'] }); recargar(); }}
            />
          )}
        </>
      )}
    </>
  );
}
