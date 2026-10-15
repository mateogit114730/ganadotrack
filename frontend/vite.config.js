import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // El bloque principal (React + Material UI) pesa ~180 kB comprimido; el resto se carga por pantalla.
  build: { chunkSizeWarningLimit: 600 },
  server: {
    port: 5173,
    // En desarrollo, las peticiones a /api se redirigen al backend.
    proxy: { '/api': 'http://localhost:4000' },
  },
});
