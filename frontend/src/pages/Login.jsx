import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useAuth, INICIO_POR_ROL } from '../context/AuthContext.jsx';
import { mensajeError } from '../api/cliente.js';

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
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2, bgcolor: 'background.default' }}>
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent sx={{ p: 4 }}>
          <Box component="img" src="/logo.png" alt="GanadoTrack" sx={{ width: 160, display: 'block', mx: 'auto', mb: 2 }} />
          <Typography variant="h6" align="center" gutterBottom>Iniciar sesión</Typography>
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
              />
              <TextField
                label="Contraseña"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {error && <Alert severity="error">{error}</Alert>}
              <Button type="submit" variant="contained" size="large" disabled={enviando}>
                {enviando ? 'Ingresando…' : 'Ingresar'}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
