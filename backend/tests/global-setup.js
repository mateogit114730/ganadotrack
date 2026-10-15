// Antes de correr los tests se aplican las migraciones sobre la base de pruebas (ganadotrack_test).
import { execSync } from 'node:child_process';
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';

export default function setup() {
  if (existsSync('.env.test')) loadEnvFile('.env.test');
  if (!process.env.DATABASE_URL?.includes('test')) {
    throw new Error('Los tests deben usar una base de datos de prueba (DATABASE_URL con "test")');
  }
  execSync('npx prisma migrate deploy', { stdio: 'ignore', env: process.env });
}
