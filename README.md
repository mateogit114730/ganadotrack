# GanadoTrack

Sistema web de gestión de feedlot bovino: lotes, alimentación diaria, stock de insumos, pesadas con GDP y proyección, sanidad con alertas automáticas y costo de producción por kg de carne.

Proyecto de **Práctica Profesionalizante II** – Tecnicatura Superior en Análisis de Sistemas, IFES UCASAL (2026).
Alumno: Mateo Agustín Sgüerzo · Docente: Silvia Hoferek.

| Componente | Tecnología |
|---|---|
| Frontend | React 19 + Vite + Material UI (SPA responsive) |
| Backend | Node.js + Express 5 (API REST) |
| Base de datos | PostgreSQL 17 + Prisma ORM |
| Pruebas | Vitest + Supertest (unitarias e integración) |
| CI | GitHub Actions |

## Requisitos

- [Node.js](https://nodejs.org) 20 o superior
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para la base de datos)
- Git

## Instalación y ejecución local

```bash
# 1. Base de datos (PostgreSQL en el puerto 5433)
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env          # completar JWT_SECRET con una cadena larga y aleatoria
npm install
npx prisma migrate deploy     # crea las tablas, restricciones, vista y trigger
npm run db:seed               # carga datos de demostración (BORRA los datos existentes)
npm run dev                   # API en http://localhost:4000/api

# 3. Frontend (en otra terminal)
cd frontend
npm install
npm run dev                   # aplicación en http://localhost:5173
```

### Usuarios de demostración

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | admin@ganadotrack.local | valor de `SEED_PASSWORD` en `backend/.env` |
| Encargado | encargado@ganadotrack.local | ídem |
| Veterinario | veterinario@ganadotrack.local | ídem |

## Comandos útiles

| Comando (en `backend/`) | Descripción |
|---|---|
| `npm test` | Ejecuta las 58 pruebas (requiere la base de Docker levantada) |
| `npm run test:coverage` | Pruebas con reporte de cobertura |
| `npm run lint` | Análisis estático con ESLint |
| `npm run db:studio` | Explorador visual de la base de datos (Prisma Studio) |
| `npm run db:migrate` | Crea una nueva migración tras cambiar `schema.prisma` |

Documentación interactiva de la API: <http://localhost:4000/api/docs> (Swagger UI).

## Estructura del repositorio

```
backend/
  prisma/            schema.prisma, migraciones SQL, seed de demostración
  src/
    config/          variables de entorno y cliente Prisma
    middlewares/     autenticación JWT, control de roles, validación, errores
    modules/         un módulo por área: auth, usuarios, lotes, insumos,
                     alimentacion, pesadas, sanidad, reportes, parametros
                     (cada uno con routes → controller → service → schema)
    services/        cálculos de negocio (GDP, costos), indicadores, alertas
    docs/            especificación OpenAPI
  tests/             unit/ (cálculos) e integration/ (API + base de datos)
frontend/
  src/
    api/             cliente HTTP (token y renovación de sesión)
    context/         sesión del usuario
    components/      layout, diálogos y componentes reutilizables
    pages/           pantallas por rol: admin/, encargado/, veterinario/
docs/                documentación del proyecto (2ª entrega) y capturas
```

## Documentación

Ver [docs/README.md](docs/README.md).
