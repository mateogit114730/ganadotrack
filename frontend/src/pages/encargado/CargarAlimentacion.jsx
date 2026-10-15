import { useState } from 'react';
import {
  Alert, AlertTitle, Box, Button, Card, CardContent, FormControlLabel, InputAdornment, Stack, Switch,
  TextField, Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GrassIcon from '@mui/icons-material/Grass';
import EditIcon from '@mui/icons-material/EditOutlined';
import { api, mensajeError } from '../../api/cliente.js';
import { useCarga } from '../../utils/useCarga.js';
import { Cargando, ErrorCarga, ChipEstado, EstadoVacio } from '../../components/Comunes.jsx';
import { VacaSilueta } from '../../components/ilustraciones/index.jsx';
import { COLORES } from '../../theme.js';
import { fmtFecha, fmtKg, fmtMoneda } from '../../utils/formato.js';

const CLAVE_MODO_SOL = 'ganadotrack.modoSol';

function leerModoSol() {
  try {
    return localStorage.getItem(CLAVE_MODO_SOL) === '1';
  } catch {
    return false;
  }
}

/** Estado de la carga de hoy de un lote según los insumos ya registrados. */
function estadoDelDia(lote, insumos) {
  if (lote.cargadoHoy.length >= insumos.length) return { estado: 'ok', texto: 'Cargado hoy' };
  if (lote.cargadoHoy.length > 0) return { estado: 'aviso', texto: 'Carga parcial' };
  return { estado: 'neutro', texto: 'Pendiente' };
}

/** Formulario de kilos (precargado con la ración sugerida si existe). */
function FormularioKilos({ lote, insumos, enviando, error, onConfirmar, onCancelar }) {
  const sugerido = Object.fromEntries(lote.racionSugerida.map((r) => [r.insumoId, r.kgDia]));
  const [kg, setKg] = useState(() => Object.fromEntries(insumos.map((i) => [i.id, sugerido[i.id] ?? ''])));
  const cargado = (insumoId) => lote.cargadoHoy.find((r) => r.insumoId === insumoId);

  const enviar = (e) => {
    e.preventDefault();
    const items = insumos
      .filter((i) => !cargado(i.id))
      .map((i) => ({ insumoId: i.id, kg: Number(String(kg[i.id] ?? '').replace(',', '.')) || 0 }));
    onConfirmar(items);
  };

  return (
    <Box component="form" onSubmit={enviar} noValidate sx={{ mt: 2 }}>
      <Stack spacing={2}>
        {insumos.map((i) => {
          const previo = cargado(i.id);
          return (
            <TextField
              key={i.id}
              label={i.nombre}
              value={previo ? previo.kg : kg[i.id]}
              disabled={Boolean(previo)}
              helperText={previo ? 'Ya cargado hoy' : `Stock disponible: ${fmtKg(i.stockKg)}`}
              onChange={(e) => setKg({ ...kg, [i.id]: e.target.value })}
              slotProps={{
                htmlInput: { inputMode: 'decimal', style: { fontSize: 22 } },
                input: { endAdornment: <InputAdornment position="end">kg</InputAdornment> },
              }}
            />
          );
        })}
        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction="row" spacing={1}>
          <Button onClick={onCancelar} disabled={enviando}>Cancelar</Button>
          <Button type="submit" variant="contained" size="large" disabled={enviando} sx={{ flex: 1 }}>
            {enviando ? 'Guardando…' : 'Confirmar'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

function TarjetaLote({ lote, insumos, abierto, enviando, error, onAbrir, onCerrar, onConfirmar }) {
  const { estado, texto } = estadoDelDia(lote, insumos);
  const completo = estado === 'ok';
  const conRacion = lote.racionSugerida.length > 0 && lote.cargadoHoy.length === 0;

  return (
    <Card sx={{ borderWidth: 2, borderColor: abierto ? 'primary.main' : 'divider', opacity: completo ? 0.75 : 1 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <VacaSilueta color={completo ? COLORES.hoja : COLORES.bosque} sx={{ width: 54, flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{lote.nombre}</Typography>
            <Typography color="text.secondary">{lote.cabezasActuales} cabezas</Typography>
          </Box>
          <ChipEstado estado={estado} label={texto} icon={completo ? <CheckCircleIcon /> : undefined} />
        </Box>

        {completo && (
          <Typography color="text.secondary" sx={{ mt: 1.5 }}>
            {lote.cargadoHoy.map((r) => `${insumos.find((i) => i.id === r.insumoId)?.nombre}: ${fmtKg(r.kg)}`).join(' · ')}
          </Typography>
        )}

        {!completo && !abierto && conRacion && (
          <>
            <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: 'rgba(124,171,62,0.12)' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>Ración de hoy</Typography>
              {lote.racionSugerida.map((r) => (
                <Box key={r.insumoId} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>{r.insumo.nombre}</Typography>
                  <Typography sx={{ fontWeight: 800 }}>{fmtKg(r.kgDia)}</Typography>
                </Box>
              ))}
            </Box>
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<CheckCircleIcon />}
              disabled={enviando}
              onClick={() => onConfirmar(lote.racionSugerida.map((r) => ({ insumoId: r.insumoId, kg: r.kgDia })))}
              sx={{ mt: 1.5, py: 1.6, fontSize: 18 }}
            >
              {enviando ? 'Guardando…' : 'Confirmar ración de hoy'}
            </Button>
            <Button fullWidth startIcon={<EditIcon />} onClick={onAbrir} sx={{ mt: 0.5 }}>
              Di otros kilos
            </Button>
          </>
        )}

        {!completo && !abierto && !conRacion && (
          <Button variant="contained" size="large" fullWidth startIcon={<GrassIcon />} onClick={onAbrir} sx={{ mt: 1.5, py: 1.4 }}>
            Cargar kilos
          </Button>
        )}

        {abierto && (
          <FormularioKilos lote={lote} insumos={insumos} enviando={enviando} error={error} onConfirmar={onConfirmar} onCancelar={onCerrar} />
        )}
        {!abierto && error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
      </CardContent>
    </Card>
  );
}

/**
 * CU04 – Registrar alimentación diaria.
 * Con ración definida: un toque en "Confirmar ración de hoy" (RF09, RNF01).
 * Sin ración o con otros kilos: se abre el formulario precargado.
 */
export default function CargarAlimentacion() {
  const { datos, cargando, error, recargar } = useCarga(() => api.get('/alimentacion/opciones').then((r) => r.data));
  const [abierto, setAbierto] = useState(null);
  const [enviando, setEnviando] = useState(null);
  const [errores, setErrores] = useState({});
  const [resultado, setResultado] = useState(null);
  const [modoSol, setModoSol] = useState(leerModoSol);

  if (cargando && !datos) return <Cargando texto="Buscando los lotes…" />;
  if (error) return <ErrorCarga mensaje={error} />;

  const cambiarModoSol = (valor) => {
    setModoSol(valor);
    try {
      localStorage.setItem(CLAVE_MODO_SOL, valor ? '1' : '0');
    } catch {
      // Sin almacenamiento disponible: el modo vale solo para esta sesión.
    }
  };

  const confirmar = async (loteId, items) => {
    if (!items.some((i) => i.kg > 0)) {
      setErrores({ ...errores, [loteId]: 'Ingresá los kilos de al menos un insumo.' });
      return;
    }
    setEnviando(loteId);
    setErrores({ ...errores, [loteId]: null });
    try {
      const { data } = await api.post('/alimentacion', { loteId, items });
      setResultado(data);
      setAbierto(null);
      recargar();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrores({ ...errores, [loteId]: mensajeError(err) });
    } finally {
      setEnviando(null);
    }
  };

  const pendientes = datos.lotes.filter((l) => estadoDelDia(l, datos.insumos).estado !== 'ok').length;

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto', zoom: modoSol ? 1.15 : 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5">Comida de hoy</Typography>
          <Typography color="text.secondary">
            {fmtFecha(datos.fecha)} · {pendientes ? `${pendientes} lote(s) por cargar` : 'Todo cargado'}
          </Typography>
        </Box>
        <FormControlLabel
          control={<Switch checked={modoSol} onChange={(e) => cambiarModoSol(e.target.checked)} />}
          label="Modo pleno sol"
        />
      </Box>

      {resultado && (
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }} onClose={() => setResultado(null)}>
          <AlertTitle>Registro guardado – {resultado.lote.nombre}</AlertTitle>
          {resultado.registros.map((r) => <div key={r.id}>{r.insumo.nombre}: {fmtKg(r.kg)}</div>)}
          <strong>Costo del día: {fmtMoneda(resultado.costoDia)}</strong>
          {resultado.alertasStock.map((a) => <Alert key={a} severity="warning" sx={{ mt: 1 }}>{a}</Alert>)}
        </Alert>
      )}

      {datos.lotes.length === 0 ? (
        <EstadoVacio titulo="No hay lotes en el corral" texto="Cuando el administrador cargue un lote, va a aparecer acá." />
      ) : (
        <Stack spacing={2} sx={modoSol ? { '& .MuiCard-root': { borderColor: COLORES.bosque, bgcolor: '#fff' } } : undefined}>
          {datos.lotes.map((l) => (
            <TarjetaLote
              key={l.id}
              lote={l}
              insumos={datos.insumos}
              abierto={abierto === l.id}
              enviando={enviando === l.id}
              error={errores[l.id]}
              onAbrir={() => setAbierto(l.id)}
              onCerrar={() => setAbierto(null)}
              onConfirmar={(items) => confirmar(l.id, items)}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
