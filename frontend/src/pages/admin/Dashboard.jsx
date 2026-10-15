import { useNavigate } from 'react-router-dom';
import {
  Badge, Box, Card, CardActionArea, CardContent, Chip, LinearProgress, Stack, Typography,
} from '@mui/material';
import { api } from '../../api/cliente.js';
import { useCarga } from '../../utils/useCarga.js';
import { Cargando, ErrorCarga, Grilla, Indicador, Dato, Encabezado } from '../../components/Comunes.jsx';
import ListaAlertas from '../../components/ListaAlertas.jsx';
import { fmtFecha, fmtGdp, fmtKg, fmtMoneda, fmtNumero, fmtToneladas } from '../../utils/formato.js';

/** CU12 – Dashboard: lotes activos, alertas, resumen financiero y stock (RF07). */
export default function Dashboard() {
  const navegar = useNavigate();
  const { datos, cargando, error } = useCarga(() => api.get('/dashboard').then((r) => r.data));

  if (cargando) return <Cargando />;
  if (error) return <ErrorCarga mensaje={error} />;

  const { resumen, lotes, alertas, insumos } = datos;

  return (
    <>
      <Encabezado titulo="Resumen del feedlot" subtitulo={`${resumen.lotesActivos} lote(s) activo(s)`} />

      <Grilla min={200}>
        <Indicador titulo="Cabezas en feedlot" valor={fmtNumero(resumen.cabezas)} detalle={`${resumen.lotesActivos} lotes activos`} />
        <Indicador titulo="Costo acumulado" valor={fmtMoneda(resumen.costoTotal)} detalle="Alimentación + sanidad" />
        <Indicador titulo="Carne estimada al gancho" valor={fmtKg(resumen.kgCarneEstimados)} detalle="Rendimiento 57 %" />
        <Indicador
          titulo="Margen bruto estimado"
          valor={fmtMoneda(resumen.margenEstimado)}
          detalle={resumen.lotesConPrecio ? `${resumen.lotesConPrecio} lote(s) con precio de venta` : 'Cargue el precio de venta en cada lote'}
          color={resumen.margenEstimado < 0 ? 'error.main' : 'primary.main'}
        />
      </Grilla>

      <Box sx={{ display: 'grid', gap: 3, mt: 3, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' } }}>
        <Box>
          <Typography variant="h6" gutterBottom>Lotes activos</Typography>
          {lotes.length === 0 && <Typography color="text.secondary">No hay lotes activos. Cree uno desde “Lotes”.</Typography>}
          <Stack spacing={2}>
            {lotes.map((l) => {
              const ind = l.indicadores;
              const avance = Math.min(100, ((ind.pesoActual - l.pesoIngreso) / (l.pesoObjetivo - l.pesoIngreso)) * 100);
              return (
                <Card key={l.id}>
                  <CardActionArea onClick={() => navegar(`/lotes/${l.id}`)}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>{l.nombre}</Typography>
                        {ind.bajoRendimiento && <Chip size="small" color="warning" label="GDP baja" />}
                        {ind.alcanzoObjetivo && <Chip size="small" color="success" label="Peso objetivo" />}
                        {l.alertas > 0 && (
                          <Badge badgeContent={l.alertas} color="error"><Chip size="small" label="Alertas" variant="outlined" /></Badge>
                        )}
                      </Box>
                      <Grilla min={130} gap={1.5}>
                        <Dato etiqueta="Días en feedlot" valor={ind.diasEnFeedlot} />
                        <Dato etiqueta="Cabezas" valor={ind.cabezasActuales} />
                        <Dato etiqueta="Peso actual" valor={fmtKg(ind.pesoActual, 1)} />
                        <Dato etiqueta="Última GDP" valor={fmtGdp(ind.ultimaGdp)} />
                        <Dato etiqueta="Costo acumulado" valor={fmtMoneda(ind.costoTotal)} />
                        <Dato etiqueta="Llegada estimada" valor={ind.fechaEstimadaObjetivo ? fmtFecha(ind.fechaEstimadaObjetivo) : '—'} />
                      </Grilla>
                      <Box sx={{ mt: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Avance hacia {fmtKg(l.pesoObjetivo)}: {fmtNumero(Math.max(0, avance))} %
                        </Typography>
                        <LinearProgress variant="determinate" value={Math.max(0, avance)} color="secondary" sx={{ height: 8, borderRadius: 4 }} />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Stack>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>Alertas ({alertas.length})</Typography>
          <ListaAlertas alertas={alertas} enlazarLotes />

          <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>Stock de insumos</Typography>
          <Stack spacing={1}>
            {insumos.map((i) => (
              <Card key={i.id} sx={{ borderColor: i.bajoMinimo ? 'warning.main' : undefined }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography sx={{ fontWeight: 600 }}>{i.nombre}</Typography>
                  <Typography variant="body2" color={i.bajoMinimo ? 'warning.main' : 'text.secondary'}>
                    {i.tipo === 'SILAJE' ? fmtToneladas(i.stockKg) : fmtKg(i.stockKg)} disponibles
                    {' · '}mínimo {i.tipo === 'SILAJE' ? fmtToneladas(i.stockMinimoKg) : fmtKg(i.stockMinimoKg)}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      </Box>
    </>
  );
}
