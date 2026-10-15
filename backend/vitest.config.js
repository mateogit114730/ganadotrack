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
      // La CI falla si la cobertura baja de estos valores.
      thresholds: { lines: 80, statements: 80, functions: 75, branches: 65 },
    },
  },
});
