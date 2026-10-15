import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Los tests de integración comparten la base de prueba: se ejecutan de a un archivo.
    fileParallelism: false,
    globalSetup: ['./tests/global-setup.js'],
    setupFiles: ['./tests/setup-env.js'],
    coverage: {
      include: ['src/**/*.js'],
      exclude: ['src/server.js'],
    },
  },
});
