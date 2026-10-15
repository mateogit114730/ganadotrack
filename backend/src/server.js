import { crearApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';

const app = crearApp();

const servidor = app.listen(env.port, () => {
  console.log(`GanadoTrack API escuchando en http://localhost:${env.port}/api`);
  console.log(`Documentación: http://localhost:${env.port}/api/docs`);
});

async function apagar() {
  servidor.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
