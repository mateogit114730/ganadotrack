import { Component } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { VacaSilueta } from './ilustraciones/index.jsx';

/** Captura errores inesperados de la interfaz y ofrece recargar, en lugar de una pantalla en blanco. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Error en la interfaz', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center', textAlign: 'center', p: 3 }}>
        <Box>
          <VacaSilueta sx={{ width: 140, opacity: 0.7 }} />
          <Typography variant="h5" sx={{ mt: 2 }}>Algo salió mal en esta pantalla</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>Los datos guardados no se perdieron. Probá recargar la página.</Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>Recargar</Button>
        </Box>
      </Box>
    );
  }
}
