import { Alert, AlertTitle, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Link } from '@mui/material';

const SEVERIDAD_MUI = { alta: 'error', media: 'warning' };

/** Lista de alertas generadas por el sistema (CU14). */
export default function ListaAlertas({ alertas, enlazarLotes = false }) {
  if (!alertas?.length) {
    return <Typography color="text.secondary">No hay alertas activas.</Typography>;
  }
  return (
    <Stack spacing={1}>
      {alertas.map((a) => (
        <Alert key={a.id} severity={SEVERIDAD_MUI[a.severidad]} variant="outlined">
          <AlertTitle sx={{ mb: 0 }}>{a.titulo}</AlertTitle>
          {a.mensaje}
          {enlazarLotes && a.loteId && (
            <>
              {' · '}
              <Link component={RouterLink} to={`/lotes/${a.loteId}`}>Ver lote</Link>
            </>
          )}
        </Alert>
      ))}
    </Stack>
  );
}
