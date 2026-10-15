// Carga .env.test antes de importar la aplicación: los tests usan la base ganadotrack_test.
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';

process.env.NODE_ENV = 'test';
if (existsSync('.env.test')) loadEnvFile('.env.test');
