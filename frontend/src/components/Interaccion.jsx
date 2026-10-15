// Confirmaciones y avisos breves compartidos por toda la aplicación.
//   const confirmar = useConfirmar();  if (await confirmar({ titulo, texto })) { ... }
//   const avisar = useAviso();          avisar('Registro eliminado');  avisar('Error', 'error');
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Snackbar,
} from '@mui/material';

const ConfirmarContext = createContext(null);
const AvisoContext = createContext(null);

export function InteraccionProvider({ children }) {
  const [confirmacion, setConfirmacion] = useState(null);
  const resolver = useRef(null);
  const [aviso, setAviso] = useState(null);

  const confirmar = useCallback(
    (opciones) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setConfirmacion(opciones);
      }),
    [],
  );

  const responder = (valor) => {
    resolver.current?.(valor);
    setConfirmacion(null);
  };

  const avisar = useCallback((mensaje, severidad = 'success') => setAviso({ mensaje, severidad, clave: Date.now() }), []);

  return (
    <ConfirmarContext.Provider value={confirmar}>
      <AvisoContext.Provider value={avisar}>
        {children}

        <Dialog open={Boolean(confirmacion)} onClose={() => responder(false)} maxWidth="xs" fullWidth>
          <DialogTitle>{confirmacion?.titulo ?? '¿Confirmar?'}</DialogTitle>
          {confirmacion?.texto && (
            <DialogContent>
              <DialogContentText>{confirmacion.texto}</DialogContentText>
            </DialogContent>
          )}
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => responder(false)}>Cancelar</Button>
            <Button variant="contained" color={confirmacion?.peligro ? 'error' : 'primary'} onClick={() => responder(true)} autoFocus>
              {confirmacion?.textoConfirmar ?? 'Confirmar'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          key={aviso?.clave}
          open={Boolean(aviso)}
          autoHideDuration={4000}
          onClose={() => setAviso(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          {aviso ? (
            <Alert severity={aviso.severidad} variant="filled" onClose={() => setAviso(null)} sx={{ width: '100%' }}>
              {aviso.mensaje}
            </Alert>
          ) : undefined}
        </Snackbar>
      </AvisoContext.Provider>
    </ConfirmarContext.Provider>
  );
}

export const useConfirmar = () => useContext(ConfirmarContext);
export const useAviso = () => useContext(AvisoContext);
