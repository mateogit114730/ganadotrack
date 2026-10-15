import { createTheme, alpha } from '@mui/material/styles';
import { esES } from '@mui/material/locale';

// Estilo "Campo cálido": verdes del logo sobre fondos crema y acentos tierra.
export const COLORES = {
  bosque: '#1F5E2C',
  bosqueOscuro: '#16451F',
  hoja: '#7CAB3E',
  hojaClara: '#DCE9C5',
  tierra: '#8B6B43',
  tierraClara: '#E8DCC6',
  paja: '#F6F1E4',
  superficie: '#FFFDF8',
  tinta: '#2B2A22',
  ocre: '#C98A1B',
  teja: '#B23A2E',
};

const TITULOS = '"Bitter", Georgia, serif';
const TEXTO = '"Nunito Sans", "Segoe UI", Roboto, Arial, sans-serif';

export const theme = createTheme(
  {
    palette: {
      primary: { main: COLORES.bosque, dark: COLORES.bosqueOscuro, contrastText: '#fff' },
      secondary: { main: COLORES.hoja, contrastText: '#fff' },
      warning: { main: COLORES.ocre, contrastText: '#fff' },
      error: { main: COLORES.teja },
      success: { main: COLORES.hoja, dark: COLORES.bosque },
      info: { main: '#3F6E8C' },
      background: { default: COLORES.paja, paper: COLORES.superficie },
      text: { primary: COLORES.tinta, secondary: '#6B6556' },
      divider: COLORES.tierraClara,
      tierra: { main: COLORES.tierra, light: COLORES.tierraClara, contrastText: '#fff' },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: TEXTO,
      h4: { fontFamily: TITULOS, fontWeight: 700 },
      h5: { fontFamily: TITULOS, fontWeight: 700 },
      h6: { fontFamily: TITULOS, fontWeight: 600 },
      subtitle1: { fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 700 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: { body: { backgroundColor: COLORES.paja } },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 12, paddingInline: 18, minHeight: 42 },
          sizeLarge: { minHeight: 52, fontSize: 17 },
        },
      },
      MuiCard: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: {
          root: {
            borderColor: COLORES.tierraClara,
            backgroundColor: COLORES.superficie,
            boxShadow: `0 2px 6px ${alpha(COLORES.tierra, 0.08)}`,
          },
        },
      },
      MuiPaper: { styleOverrides: { rounded: { borderRadius: 14 } } },
      MuiTextField: { defaultProps: { fullWidth: true } },
      MuiOutlinedInput: {
        styleOverrides: { root: { backgroundColor: '#fff', borderRadius: 10 } },
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 700 } } },
      MuiTableHead: {
        styleOverrides: {
          root: { '& .MuiTableCell-head': { backgroundColor: COLORES.tierraClara, color: COLORES.tinta, fontWeight: 700 } },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: { '&:nth-of-type(even) td': { backgroundColor: alpha(COLORES.paja, 0.6) } },
        },
      },
      MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 700, fontSize: 15 } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 12 } } },
      MuiDialog: { styleOverrides: { paper: { backgroundColor: COLORES.superficie } } },
      MuiDialogTitle: { styleOverrides: { root: { fontFamily: TITULOS, fontWeight: 700 } } },
      MuiLinearProgress: {
        styleOverrides: { root: { backgroundColor: COLORES.hojaClara, borderRadius: 6 }, bar: { borderRadius: 6 } },
      },
    },
  },
  esES,
);
