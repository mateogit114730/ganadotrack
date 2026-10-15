import { createTheme } from '@mui/material/styles';
import { esES } from '@mui/material/locale';

// Colores tomados del logo de GanadoTrack.
export const theme = createTheme(
  {
    palette: {
      primary: { main: '#1f5e2c', contrastText: '#ffffff' },
      secondary: { main: '#7cab3e', contrastText: '#ffffff' },
      background: { default: '#f5f7f2' },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
    },
    components: {
      MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
      MuiCard: { defaultProps: { variant: 'outlined' } },
      MuiTextField: { defaultProps: { fullWidth: true } },
    },
  },
  esES,
);
