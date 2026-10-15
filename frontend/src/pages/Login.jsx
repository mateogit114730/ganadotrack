import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import MailIcon from '@mui/icons-material/MailOutline';
import LockIcon from '@mui/icons-material/LockOutlined';
import { useAuth, INICIO_POR_ROL } from '../context/AuthContext.jsx';
import { mensajeError } from '../api/cliente.js';
import { PaisajeCampo } from '../components/ilustraciones/index.jsx';
import { COLORES } from '../theme.js';

const icono = (Icono) => ({ input: { startAdornment: <InputAdornment position="start"><Icono color="action" /></InputAdornment> } });

/** CU01 – Iniciar sesión. */
export default function Login() {
  const { usuario, login } = useAuth();
  const navegar = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={INICIO_POR_ROL[usuario.rol]} replace />;

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const u = await login(email.trim(), password);
      navegar(INICIO_POR_ROL[u.rol], { replace: true });
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.15fr 1fr' }, bgcolor: 'background.default' }}>
      {/* Paisaje: columna en escritorio, franja superior en celular */}
      <Box sx={{ position: 'relative', minHeight: { xs: 190, md: '100vh' }, overflow: 'hidden' }}>
        <PaisajeCampo sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        <Box sx={{ position: 'absolute', left: { xs: 20, md: 56 }, top: { xs: 20, md: 64 }, maxWidth: 420, display: { xs: 'none', md: 'block' } }}>
          <Typography sx={{ fontFamily: '"Bitter", serif', fontWeight: 700, fontSize: 40, color: COLORES.bosque, lineHeight: 1.1 }}>
            Llevá el control de tus bovinos y alimentos
          </Typography>
          <Typography sx={{ mt: 2, fontSize: 18, color: COLORES.tinta, opacity: 0.85 }}>
            Costos por kilo, ganancia de peso y sanidad del feedlot, al día y desde el campo.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', placeItems: 'center', p: { xs: 2.5, md: 6 } }}>
        <Box sx={{ width: '100%', maxWidth: 380 }}>
          <Box component="img" src="/logo-420.png" alt="GanadoTrack" sx={{ width: { xs: 170, md: 210 }, display: 'block', mx: 'auto', mt: { xs: -8, md: 0 }, mb: 1, bgcolor: '#fff', borderRadius: '50%', position: 'relative' }} />
          <Typography variant="h5" align="center" gutterBottom>Ingresá a tu campo</Typography>
          <Typography align="center" color="text.secondary" sx={{ mb: 3 }}>Usá el email y la contraseña que te dio el administrador.</Typography>
          <form onSubmit={enviar}>
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                slotProps={icono(MailIcon)}
              />
              <TextField
                label="Contraseña"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                slotProps={icono(LockIcon)}
              />
              {error && <Alert severity="error">{error}</Alert>}
              <Button type="submit" variant="contained" size="large" disabled={enviando}>
                {enviando ? 'Ingresando…' : 'Ingresar'}
              </Button>
            </Stack>
          </form>
        </Box>
      </Box>
    </Box>
  );
}
