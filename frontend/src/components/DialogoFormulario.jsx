import { useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { mensajeError } from '../api/cliente.js';

/**
 * Diálogo con formulario. Maneja el estado "guardando" y muestra el error de la API.
 * onEnviar debe ser async; si lanza un error, el diálogo queda abierto con el mensaje.
 */
export default function DialogoFormulario({ abierto, titulo, onCerrar, onEnviar, textoEnviar = 'Guardar', children, ancho = 'sm' }) {
  const theme = useTheme();
  const pantallaCompleta = useMediaQuery(theme.breakpoints.down('sm'));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const cerrar = () => {
    setError(null);
    onCerrar();
  };

  const enviar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await onEnviar();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={abierto} onClose={cerrar} fullWidth maxWidth={ancho} fullScreen={pantallaCompleta}>
      <form onSubmit={enviar} noValidate>
        <DialogTitle>{titulo}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {children}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={cerrar} disabled={guardando}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={guardando}>
            {guardando ? 'Guardando…' : textoEnviar}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
