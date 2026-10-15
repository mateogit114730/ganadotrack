import { Navigate, Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth, INICIO_POR_ROL } from '../context/AuthContext.jsx';

/** Solo deja pasar a usuarios con sesión y con alguno de los roles indicados (RF08). */
export default function RutaProtegida({ roles }) {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!usuario) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to={INICIO_POR_ROL[usuario.rol]} replace />;
  return <Outlet />;
}
