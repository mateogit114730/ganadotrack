import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { useAuth, INICIO_POR_ROL } from '../context/AuthContext.jsx';
import { PaisajeCampo } from '../components/ilustraciones/index.jsx';

/** Página 404. */
export default function NoEncontrada() {
  const { usuario } = useAuth();
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateRows: '1fr auto', bgcolor: 'background.default' }}>
      <Box sx={{ display: 'grid', placeItems: 'center', textAlign: 'center', p: 3 }}>
        <Box>
          <Typography variant="h4" color="primary">Esta tranquera está cerrada</Typography>
          <Typography color="text.secondary" sx={{ my: 2 }}>La página que buscás no existe o fue movida.</Typography>
          <Button variant="contained" component={RouterLink} to={usuario ? INICIO_POR_ROL[usuario.rol] : '/login'}>
            Volver al inicio
          </Button>
        </Box>
      </Box>
      <PaisajeCampo sx={{ width: '100%', height: { xs: 160, md: 240 }, display: 'block' }} />
    </Box>
  );
}
