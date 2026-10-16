import { useState } from 'react';
import {
  Alert, Box, Button, Card, CardActions, CardContent, IconButton, InputAdornment, Tab, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory2Outlined';
import EditIcon from '@mui/icons-material/EditOutlined';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCartOutlined';
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COLORES } from '../../theme.js';
import { api } from '../../api/cliente.js';
import { useCarga } from '../../utils/useCarga.js';
import { Cargando, ErrorCarga, Encabezado, Grilla, Dato, ChipEstado } from '../../components/Comunes.jsx';
import DialogoFormulario from '../../components/DialogoFormulario.jsx';
import { fmtFecha, fmtKg, fmtMoneda, fmtMonedaDecimales, fmtToneladas, hoyISO } from '../../utils/formato.js';

const unidad = (u) => ({ input: { endAdornment: <InputAdornment position="end">{u}</InputAdornment> } });
const fmtStock = (insumo, kg) => (insumo.tipo === 'SILAJE' ? `${fmtToneladas(kg)} (${fmtKg(kg)})` : fmtKg(kg));

/**
 * CU06 – Registrar compra o carga de insumo (el silaje propio se carga con su costo estimado).
 * Si recibe "compra", corrige una compra existente y el stock se ajusta por la diferencia.
 */
function DialogoCompra({ insumo, compra, cantidadSugerida, onCerrar, onGuardado }) {
  const [datos, setDatos] = useState(
    compra
      ? { fecha: compra.fecha.slice(0, 10), cantidadKg: compra.cantidadKg, precioTotal: compra.precioTotal }
      : { fecha: hoyISO(), cantidadKg: cantidadSugerida ?? '', precioTotal: '' },
  );
  const campo = (n) => ({ value: datos[n], onChange: (e) => setDatos({ ...datos, [n]: e.target.value }) });
  const precioKg = Number(datos.precioTotal) / Number(datos.cantidadKg);
  const guardar = async () => {
    if (compra) await api.put(`/insumos/${insumo.id}/compras/${compra.id}`, datos);
    else await api.post(`/insumos/${insumo.id}/compras`, datos);
    onGuardado();
  };
  return (
    <DialogoFormulario
      abierto
      titulo={compra ? `Corregir compra – ${insumo.nombre}` : insumo.tipo === 'SILAJE' ? `Cargar silaje – ${insumo.nombre}` : `Registrar compra – ${insumo.nombre}`}
      onCerrar={onCerrar}
      onEnviar={guardar}
    >
      <TextField label="Fecha" type="date" {...campo('fecha')} slotProps={{ inputLabel: { shrink: true } }} />
      <TextField label="Cantidad" type="number" {...campo('cantidadKg')} slotProps={unidad('kg')} helperText={insumo.tipo === 'SILAJE' ? '1 tonelada = 1.000 kg' : undefined} />
      <TextField
        label={insumo.tipo === 'SILAJE' ? 'Costo total estimado de producción' : 'Precio total pagado'}
        type="number"
        {...campo('precioTotal')}
        slotProps={unidad('$')}
      />
      {precioKg > 0 && Number.isFinite(precioKg) && (
        <Alert severity="info">Nuevo precio por kg: {fmtMonedaDecimales(precioKg)}</Alert>
      )}
    </DialogoFormulario>
  );
}

function DialogoConfigurar({ insumo, onCerrar, onGuardado }) {
  const [datos, setDatos] = useState({
    stockMinimoKg: insumo.stockMinimoKg,
    precioKg: insumo.precioKg,
    materiaSecaPct: insumo.materiaSecaPct,
  });
  const campo = (n) => ({ value: datos[n], onChange: (e) => setDatos({ ...datos, [n]: e.target.value }) });
  const guardar = async () => {
    await api.patch(`/insumos/${insumo.id}`, datos);
    onGuardado();
  };
  return (
    <DialogoFormulario abierto titulo={`Configurar – ${insumo.nombre}`} onCerrar={onCerrar} onEnviar={guardar}>
      <TextField label="Stock mínimo (genera alerta)" type="number" {...campo('stockMinimoKg')} slotProps={unidad('kg')} />
      <TextField label="Precio por kg" type="number" {...campo('precioKg')} slotProps={unidad('$/kg')} helperText="Se usa para calcular el costo de cada día de alimentación" />
      <TextField label="Materia seca" type="number" {...campo('materiaSecaPct')} slotProps={unidad('%')} helperText="Silaje ≈ 35 %, suplemento ≈ 90 %. Se usa para la conversión alimenticia" />
    </DialogoFormulario>
  );
}

function HistorialCompras({ insumo, onEditar }) {
  const { datos, cargando, error } = useCarga(
    () => api.get(`/insumos/${insumo.id}/compras`).then((r) => r.data),
    [insumo.id, insumo.stockKg, insumo.precioKg],
  );
  if (cargando) return <Cargando />;
  if (error) return <ErrorCarga mensaje={error} />;
  return (
    <Card>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell align="right">Cantidad</TableCell>
              <TableCell align="right">Precio total</TableCell>
              <TableCell align="right">$/kg</TableCell>
              <TableCell>Registró</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {datos.length === 0 && <TableRow><TableCell colSpan={6} align="center">Sin compras registradas.</TableCell></TableRow>}
            {datos.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{fmtFecha(c.fecha)}</TableCell>
                <TableCell align="right">{fmtStock(insumo, c.cantidadKg)}</TableCell>
                <TableCell align="right">{fmtMoneda(c.precioTotal)}</TableCell>
                <TableCell align="right">{fmtMonedaDecimales(c.precioTotal / c.cantidadKg)}</TableCell>
                <TableCell>{c.usuario.nombre}</TableCell>
                <TableCell padding="checkbox">
                  <IconButton size="small" title="Corregir compra" onClick={() => onEditar(c)}><EditIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

/** RF11 – Cuánto dura el stock al ritmo de consumo previsto. */
function Proyeccion({ insumo }) {
  const p = insumo.proyeccion;
  if (!p.consumoDiarioKg) {
    return <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Sin consumo previsto: definí las raciones de los lotes.</Typography>;
  }
  const estado = p.coberturaBaja ? (p.diasCobertura <= 3 ? 'critico' : 'aviso') : 'ok';
  const fuente = p.fuenteConsumo === 'racion' ? 'según las raciones' : 'promedio de los últimos 14 días';
  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <ChipEstado estado={estado} label={`Alcanza para ${p.diasCobertura} día(s)`} />
        <Typography variant="body2" color="text.secondary">hasta el {fmtFecha(p.fechaQuiebre)}</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Consumo previsto: {fmtKg(p.consumoDiarioKg)}/día ({fuente})
      </Typography>
      <Box sx={{ width: '100%', height: 110, mt: 1 }}>
        <ResponsiveContainer>
          <AreaChart data={p.serie} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="dia" tickFormatter={(d) => (d === 0 ? 'hoy' : `+${d}`)} interval={9} tick={{ fontSize: 11 }} padding={{ left: 14, right: 14 }} />
            {/* El eje incluye el stock mínimo aunque el stock actual esté por debajo. */}
            <YAxis hide domain={[0, (max) => Math.max(max, insumo.stockMinimoKg) * 1.05]} />
            <Tooltip formatter={(v) => fmtKg(v)} labelFormatter={(d) => (d === 0 ? 'Hoy' : `Dentro de ${d} días`)} />
            <ReferenceLine y={insumo.stockMinimoKg} stroke={COLORES.ocre} strokeDasharray="5 4" />
            <Area type="monotone" dataKey="kg" stroke={COLORES.bosque} fill={COLORES.hojaClara} strokeWidth={2} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
      <Typography variant="caption" color="text.secondary">Stock proyectado a 30 días · línea punteada: stock mínimo</Typography>
    </Box>
  );
}

export default function Insumos() {
  const { datos, cargando, error, recargar } = useCarga(() => api.get('/insumos').then((r) => r.data));
  const [dialogo, setDialogo] = useState(null); // { tipo: 'compra' | 'config', insumo }
  const [historial, setHistorial] = useState(0);

  if (cargando && !datos) return <Cargando />;
  if (error) return <ErrorCarga mensaje={error} />;

  const listo = () => {
    setDialogo(null);
    recargar();
  };

  return (
    <>
      <Encabezado icono={<InventoryIcon />} titulo="Insumos y stock" subtitulo="Stock, consumo previsto y compras de suplemento y silaje" />
      <Grilla min={280}>
        {datos.map((i) => (
          <Card key={i.id} sx={{ borderColor: i.bajoMinimo ? 'warning.main' : undefined }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h6" sx={{ flex: 1 }}>{i.nombre}</Typography>
                {i.bajoMinimo && <ChipEstado estado="aviso" label="Bajo mínimo" />}
              </Box>
              <Typography variant="h4" color={i.bajoMinimo ? 'warning.dark' : 'primary'}>
                {i.tipo === 'SILAJE' ? fmtToneladas(i.stockKg) : fmtKg(i.stockKg)}
              </Typography>
              <Grilla min={120} gap={1}>
                <Dato etiqueta="Stock mínimo" valor={fmtStock(i, i.stockMinimoKg)} />
                <Dato etiqueta="Precio vigente" valor={`${fmtMonedaDecimales(i.precioKg)}/kg`} />
              </Grilla>
              <Proyeccion insumo={i} />
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Button variant="contained" onClick={() => setDialogo({ tipo: 'compra', insumo: i })}>
                {i.tipo === 'SILAJE' ? 'Cargar silaje' : 'Registrar compra'}
              </Button>
              {i.proyeccion.compraSugeridaKg > 0 && (
                <Button
                  color="warning"
                  startIcon={<ShoppingCartIcon />}
                  onClick={() => setDialogo({ tipo: 'compra', insumo: i, cantidadSugerida: i.proyeccion.compraSugeridaKg })}
                >
                  Comprar {fmtKg(i.proyeccion.compraSugeridaKg)}
                </Button>
              )}
              <Button onClick={() => setDialogo({ tipo: 'config', insumo: i })}>Configurar</Button>
            </CardActions>
          </Card>
        ))}
      </Grilla>

      <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>Historial de compras y cargas</Typography>
      <Tabs value={historial} onChange={(_, v) => setHistorial(v)} sx={{ mb: 2 }}>
        {datos.map((i, n) => <Tab key={i.id} value={n} label={i.nombre} />)}
      </Tabs>
      {datos[historial] && (
        <HistorialCompras insumo={datos[historial]} onEditar={(c) => setDialogo({ tipo: 'compra', insumo: datos[historial], compra: c })} />
      )}

      {dialogo?.tipo === 'compra' && <DialogoCompra insumo={dialogo.insumo} compra={dialogo.compra} cantidadSugerida={dialogo.cantidadSugerida} onCerrar={() => setDialogo(null)} onGuardado={listo} />}
      {dialogo?.tipo === 'config' && <DialogoConfigurar insumo={dialogo.insumo} onCerrar={() => setDialogo(null)} onGuardado={listo} />}
    </>
  );
}
