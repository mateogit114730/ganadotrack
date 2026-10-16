import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardActionArea, CardContent, LinearProgress, Stack, Typography } from '@mui/material';
import PetsIcon from '@mui/icons-material/Pets';
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined';
import ScaleIcon from '@mui/icons-material/MonitorWeightOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VaccinesIcon from '@mui/icons-material/VaccinesOutlined';
import InventoryIcon from '@mui/icons-material/Inventory2Outlined';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WbSunnyIcon from '@mui/icons-material/WbSunnyOutlined';
import AddIcon from '@mui/icons-material/Add';
import { api } from '../../api/cliente.js';
import { useCarga } from '../../utils/useCarga.js';
import {
  Cargando, ErrorCarga, Grilla, Indicador, Dato, EstadoVacio, ChipEstado, Sparkline,
} from '../../components/Comunes.jsx';
import ListaAlertas from '../../components/ListaAlertas.jsx';
import { PaisajeCampo } from '../../components/ilustraciones/index.jsx';
import { PanelClima } from '../../components/Clima.jsx';
import { COLORES } from '../../theme.js';
import { fmtFecha, fmtGdp, fmtKg, fmtMoneda, fmtNumero, fmtToneladas } from '../../utils/formato.js';

const GRUPOS_ALERTA = [
  { tipos: ['SANITARIA'], titulo: 'Sanidad', icono: <VaccinesIcon fontSize="small" /> },
  { tipos: ['STOCK', 'STOCK_PROYECTADO'], titulo: 'Stock', icono: <InventoryIcon fontSize="small" /> },
  { tipos: ['GDP'], titulo: 'Ganancia de peso', icono: <TrendingDownIcon fontSize="small" /> },
  { tipos: ['CLIMA'], titulo: 'Clima', icono: <WbSunnyIcon fontSize="small" /> },
];

function TarjetaLote({ lote, onAbrir }) {
  const ind = lote.indicadores;
  const avance = Math.max(0, Math.min(100, ((ind.pesoActual - lote.pesoIngreso) / (lote.pesoObjetivo - lote.pesoIngreso)) * 100));
  return (
    <Card>
      <CardActionArea onClick={onAbrir}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 160 }}>
              <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{lote.nombre}</Typography>
              <Typography variant="body2" color="text.secondary">
                {ind.diasEnFeedlot} días en el corral · {ind.cabezasActuales} cabezas
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              {ind.bajoRendimiento && <ChipEstado estado="aviso" label="GDP baja" />}
              {ind.alcanzoObjetivo && <ChipEstado estado="ok" label="Llegó al objetivo" />}
              {lote.alertas > 0 && <ChipEstado estado="critico" label={`${lote.alertas} alerta${lote.alertas > 1 ? 's' : ''}`} />}
            </Stack>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 220 }}>
              <Grilla min={120} gap={1.5}>
                <Dato etiqueta="Peso actual" valor={fmtKg(ind.pesoActual, 1)} />
                <Dato etiqueta="Última GDP" valor={fmtGdp(ind.ultimaGdp)} />
                <Dato etiqueta="Costo acumulado" valor={fmtMoneda(ind.costoTotal)} />
                <Dato etiqueta="Llega al objetivo" valor={ind.fechaEstimadaObjetivo ? fmtFecha(ind.fechaEstimadaObjetivo) : '—'} />
              </Grilla>
            </Box>
            {lote.seriePeso.length > 1 && (
              <Box sx={{ textAlign: 'center' }}>
                <Sparkline valores={lote.seriePeso} ancho={130} alto={44} />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>evolución de peso</Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ mt: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">{fmtKg(lote.pesoIngreso)}</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>{fmtNumero(avance)} % del objetivo</Typography>
              <Typography variant="caption" color="text.secondary">{fmtKg(lote.pesoObjetivo)}</Typography>
            </Box>
            <LinearProgress variant="determinate" value={avance} color="secondary" sx={{ height: 10 }} />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function StockInsumo({ insumo }) {
  const escala = Math.max(insumo.stockKg, insumo.stockMinimoKg * 3, 1);
  const fmt = insumo.tipo === 'SILAJE' ? fmtToneladas : fmtKg;
  return (
    <Card sx={{ borderColor: insumo.bajoMinimo ? 'warning.main' : undefined }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>{insumo.nombre}</Typography>
          {insumo.bajoMinimo && <ChipEstado estado="aviso" label="Bajo mínimo" />}
        </Box>
        <Typography variant="h6" color={insumo.bajoMinimo ? 'warning.dark' : 'primary'}>{fmt(insumo.stockKg)}</Typography>
        <LinearProgress
          variant="determinate"
          value={(insumo.stockKg / escala) * 100}
          color={insumo.bajoMinimo ? 'warning' : 'secondary'}
          sx={{ height: 8, my: 0.5 }}
        />
        <Typography variant="caption" color="text.secondary">
          Mínimo {fmt(insumo.stockMinimoKg)}
          {insumo.diasCobertura !== null && ` · alcanza para ${insumo.diasCobertura} día(s), hasta el ${fmtFecha(insumo.fechaQuiebre)}`}
        </Typography>
      </CardContent>
    </Card>
  );
}

/** CU12 – Dashboard: lotes activos, alertas, resumen financiero y stock (RF07). */
export default function Dashboard() {
  const navegar = useNavigate();
  const { datos, cargando, error } = useCarga(() => api.get('/dashboard').then((r) => r.data));

  if (cargando && !datos) return <Cargando texto="Recorriendo los corrales…" />;
  if (error) return <ErrorCarga mensaje={error} />;

  const { resumen, lotes, alertas, insumos } = datos;

  return (
    <>
      <Card sx={{ position: 'relative', overflow: 'hidden', mb: 3, minHeight: 150, bgcolor: '#FBF6E9' }}>
        <PaisajeCampo
          sx={{ position: 'absolute', right: 0, top: 0, height: '100%', width: { xs: '100%', md: '62%' }, opacity: { xs: 0.35, md: 1 } }}
        />
        <Box
          sx={{
            position: 'absolute', inset: 0,
            background: { md: 'linear-gradient(90deg, #FBF6E9 38%, rgba(251,246,233,0) 60%)' },
          }}
        />
        <Box sx={{ position: 'relative', p: { xs: 2.5, md: 3.5 }, maxWidth: 520 }}>
          <Typography variant="h4" sx={{ color: 'primary.main', fontSize: { xs: 26, md: 32 } }}>Resumen del feedlot</Typography>
          <Typography sx={{ fontWeight: 600, mt: 0.5 }}>
            {resumen.lotesActivos} lote(s) en el corral · {fmtNumero(resumen.cabezas)} cabezas · {resumen.alertas} alerta(s)
          </Typography>
        </Box>
      </Card>

      <Grilla min={210}>
        <Indicador icono={<PetsIcon />} titulo="Cabezas en el feedlot" valor={fmtNumero(resumen.cabezas)} detalle={`${resumen.lotesActivos} lotes activos`} />
        <Indicador icono={<PaymentsIcon />} titulo="Costo acumulado" valor={fmtMoneda(resumen.costoTotal)} detalle="Alimentación + sanidad" />
        <Indicador icono={<ScaleIcon />} titulo="Carne estimada al gancho" valor={fmtKg(resumen.kgCarneEstimados)} detalle="Rendimiento 57 %" />
        <Indicador
          icono={<TrendingUpIcon />}
          titulo="Margen bruto estimado"
          valor={fmtMoneda(resumen.margenEstimado)}
          detalle={resumen.lotesConPrecio ? `${resumen.lotesConPrecio} lote(s) con precio de venta` : 'Cargue el precio de venta en cada lote'}
          color={resumen.margenEstimado < 0 ? 'error.main' : 'primary.main'}
        />
      </Grilla>

      <Box sx={{ display: 'grid', gap: 3, mt: 3, gridTemplateColumns: { xs: '1fr', lg: '1.7fr 1fr' } }}>
        <Box>
          <Typography variant="h6" gutterBottom>Lotes en el corral</Typography>
          {lotes.length === 0 ? (
            <EstadoVacio
              titulo="Todavía no hay lotes en el feedlot"
              texto="Cuando ingrese una tropa, cargala para empezar a seguir su engorde."
              accion={<Button variant="contained" startIcon={<AddIcon />} onClick={() => navegar('/lotes')}>Nuevo lote</Button>}
            />
          ) : (
            <Stack spacing={2}>
              {lotes.map((l) => <TarjetaLote key={l.id} lote={l} onAbrir={() => navegar(`/lotes/${l.id}`)} />)}
            </Stack>
          )}
        </Box>

        <Box>
          <Box sx={{ mb: 3 }}><PanelClima /></Box>
          <Typography variant="h6" gutterBottom>Alertas ({alertas.length})</Typography>
          {alertas.length === 0 && <ListaAlertas alertas={[]} />}
          <Stack spacing={2}>
            {GRUPOS_ALERTA.map((g) => {
              const delGrupo = alertas.filter((a) => g.tipos.includes(a.tipo));
              if (!delGrupo.length) return null;
              return (
                <Box key={g.titulo}>
                  <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1, color: COLORES.tierra }}>
                    {g.icono} {g.titulo}
                  </Typography>
                  <ListaAlertas alertas={delGrupo} enlazarLotes />
                </Box>
              );
            })}
          </Stack>

          <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>Stock de insumos</Typography>
          <Stack spacing={1.5}>
            {insumos.map((i) => <StockInsumo key={i.id} insumo={i} />)}
          </Stack>
        </Box>
      </Box>
    </>
  );
}
