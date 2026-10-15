import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['isotipo-64.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'GanadoTrack – Gestión de feedlot',
        short_name: 'GanadoTrack',
        description: 'Costos, ganancia de peso y sanidad del feedlot, desde el campo.',
        lang: 'es-AR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F6F1E4',
        theme_color: '#1F5E2C',
        icons: [
          { src: '/isotipo-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/isotipo-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/isotipo-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // Solo tipografías latinas y sin el logo original de alta resolución.
        globIgnores: ['**/*cyrillic*', '**/*greek*', '**/*vietnamese*', '**/*math*', '**/*symbols*', 'logo.png'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Datos de la API que se guardan para usar la app sin conexión (RF14): la pantalla del
            // encargado, el usuario de la sesión y el clima. Se intenta siempre la red primero.
            // La función se copia como texto al service worker: no puede usar variables de afuera.
            urlPattern: ({ url }) =>
              ['/api/alimentacion/opciones', '/api/auth/me', '/api/clima'].some((ruta) => url.pathname.endsWith(ruta)),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ganadotrack-api',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 20, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  // El bloque principal (React + Material UI) pesa ~180 kB comprimido; el resto se carga por pantalla.
  build: { chunkSizeWarningLimit: 600 },
  server: {
    port: 5173,
    // En desarrollo, las peticiones a /api se redirigen al backend.
    proxy: { '/api': 'http://localhost:4000' },
  },
  // La vista previa del build (con el service worker activo) también usa el backend local.
  preview: {
    port: 4173,
    proxy: { '/api': 'http://localhost:4000' },
  },
  test: {
    environment: 'node',
  },
});
