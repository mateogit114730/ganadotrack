// Clima del campo y riesgos (RF12): chip de la barra superior y panel del dashboard.
import { Box, Button, Card, CardContent, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import WbSunnyIcon from '@mui/icons-material/WbSunnyOutlined';
import FilterDramaIcon from '@mui/icons-material/FilterDramaOutlined';
import CloudIcon from '@mui/icons-material/CloudOutlined';
import DehazeIcon from '@mui/icons-material/Dehaze';
import WaterDropIcon from '@mui/icons-material/WaterDropOutlined';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import ThunderstormIcon from '@mui/icons-material/ThunderstormOutlined';
import { api } from '../api/cliente.js';
import { useCarga } from '../utils/useCarga.js';
import { COLORES } from '../theme.js';
import { ChipEstado } from './Comunes.jsx';

const ICONOS = {
  sol: WbSunnyIcon,
  parcial: FilterDramaIcon,
  nublado: CloudIcon,
  niebla: DehazeIcon,
  lluvia: WaterDropIcon,
  nieve: AcUnitIcon,
  tormenta: ThunderstormIcon,
};

export function IconoTiempo({ icono, ...props }) {
  const Icono = ICONOS[icono] ?? CloudIcon;
  return <Icono {...props} />;
}

const cargarClima = () => api.get('/clima').then((r) => r.data);

const ESTADO_NIVEL = { bajo: 'ok', normal: 'ok', medio: 'aviso', alerta: 'aviso', alto: 'critico', peligro: 'critico', emergencia: 'critico' };
const nombreDia = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '');

/** Chip compacto con la temperatura actual (barra superior). */
export function ChipClima() {
  const { datos } = useCarga(cargarClima);
  if (!datos?.disponible) return null;
  return (
    <Tooltip title={`${datos.ubicacion.nombre}: ${datos.actual.texto}, humedad ${datos.actual.humedad} %`}>
      <Chip
        icon={<IconoTiempo icono={datos.actual.icono} />}
        label={`${Math.round(datos.actual.temperatura)}°`}
        variant="outlined"
        sx={{ borderColor: 'divider', bgcolor: '#fff', fontSize: 15, '& .MuiChip-icon': { color: COLORES.ocre } }}
      />
    </Tooltip>
  );
}

/** Panel de clima del dashboard: ahora, próximos 7 días y riesgos orientativos. */
export function PanelClima() {
  const { datos, cargando } = useCarga(cargarClima);
  if (cargando && !datos) return null;

  if (!datos?.configurado) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">Clima del campo</Typography>
          <Typography color="text.secondary" sx={{ mb: 1 }}>Configurá la localidad del establecimiento para ver el pronóstico y los riesgos.</Typography>
          <Button component={RouterLink} to="/configuracion" variant="outlined">Configurar ubicación</Button>
        </CardContent>
      </Card>
    );
  }
  if (!datos.disponible) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">Clima del campo</Typography>
          <Typography color="text.secondary">El servicio de clima no responde en este momento.</Typography>
        </CardContent>
      </Card>
    );
  }

  const { actual, pronostico, riesgos, ubicacion } = datos;
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconoTiempo icono={actual.icono} sx={{ fontSize: 52, color: COLORES.ocre }} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontFamily: '"Bitter", serif', fontWeight: 700, fontSize: 34, lineHeight: 1 }}>
              {Math.round(actual.temperatura)}°C
            </Typography>
            <Typography color="text.secondary">{actual.texto} · humedad {actual.humedad} % · viento {Math.round(actual.viento)} km/h</Typography>
          </Box>
        </Box>
        <Typography variant="caption" color="text.secondary">{ubicacion.nombre}</Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mt: 1.5, textAlign: 'center' }}>
          {pronostico.map((d, i) => (
            <Tooltip key={d.fecha} title={`${d.texto} · lluvia ${d.lluvia} mm · ITH ${d.ith}`}>
              <Box sx={{ py: 0.75, borderRadius: 2, bgcolor: d.estresTermico === 'normal' ? 'transparent' : 'rgba(178,58,46,0.08)' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>{i === 0 ? 'Hoy' : nombreDia(d.fecha)}</Typography>
                <IconoTiempo icono={d.icono} sx={{ display: 'block', mx: 'auto', fontSize: 22, color: COLORES.tierra }} />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{Math.round(d.maxima)}°</Typography>
                <Typography variant="caption" color="text.secondary">{Math.round(d.minima)}°</Typography>
              </Box>
            </Tooltip>
          ))}
        </Box>

        <Typography variant="body2" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>Riesgos (orientativos)</Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Tooltip title="Índice de temperatura y humedad (ITH) de los próximos 3 días. Desde 72 hay estrés térmico.">
            <span><ChipEstado estado={ESTADO_NIVEL[riesgos.estresTermico.nivel]} label={`Estrés térmico: ${riesgos.estresTermico.nivel}`} /></span>
          </Tooltip>
          <Tooltip title={`Últimos 7 días: ${riesgos.garrapata.temperaturaMedia7} °C de media y ${riesgos.garrapata.humedadMedia7} % de humedad`}>
            <span><ChipEstado estado={ESTADO_NIVEL[riesgos.garrapata.nivel]} label={`Garrapata: ${riesgos.garrapata.nivel}`} /></span>
          </Tooltip>
          <Tooltip title={`Lluvia: ${riesgos.sequia.lluvia30} mm en 30 días · ${riesgos.sequia.lluviaPronostico7} mm pronosticados`}>
            <span><ChipEstado estado={ESTADO_NIVEL[riesgos.sequia.nivel]} label={`Sequía: ${riesgos.sequia.nivel}`} /></span>
          </Tooltip>
        </Stack>
      </CardContent>
    </Card>
  );
}
