import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
// Tipografías incluidas en la app (funcionan sin conexión).
import '@fontsource/bitter/600.css';
import '@fontsource/bitter/700.css';
import '@fontsource/nunito-sans/400.css';
import '@fontsource/nunito-sans/600.css';
import '@fontsource/nunito-sans/700.css';
import { theme } from './theme.js';
import { AuthProvider } from './context/AuthContext.jsx';
import { InteraccionProvider } from './components/Interaccion.jsx';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <InteraccionProvider>
            <App />
          </InteraccionProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
