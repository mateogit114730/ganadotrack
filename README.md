# GanadoTrack

Sistema web de gestión de feedlot bovino: lotes, alimentación diaria, stock de insumos, pesadas con GDP y proyección, sanidad con alertas automáticas y costo de producción por kg de carne. Se usa desde el navegador o instalado en el celular, y el encargado puede cargar la comida aunque no haya señal en el corral.

Proyecto de **Práctica Profesionalizante II** – Tecnicatura Superior en Análisis de Sistemas, IFES UCASAL (2026).
Alumno: Mateo Agustín Sgüerzo · Docente: Silvia Hoferek.

[![CI](https://github.com/mateogit114730/ganadotrack/actions/workflows/ci.yml/badge.svg)](https://github.com/mateogit114730/ganadotrack/actions/workflows/ci.yml)

- **Aplicación online:** <https://ganadotrack.vercel.app> (API: <https://ganadotrack-api.onrender.com/api/docs>)
- **Tablero del proyecto:** [GitHub Projects](https://github.com/users/mateogit114730/projects/1)
- **Documentación:** [docs/](docs/README.md)

## Funcionalidades

| Rol | Qué hace en GanadoTrack |
|---|---|
| **Administrador** (productor) | Dashboard con lotes, alertas y clima del campo · lotes con GDP, proyección al peso objetivo, conversión alimenticia, costo por kg y margen · stock con días de cobertura y compra sugerida · informes PDF y planilla Excel · usuarios y configuración |
| **Encargado** | Confirma la ración del día de cada lote **con un toque**, desde el celular y también **sin señal** (se envía sola al volver la conexión) |
| **Veterinario** | Calendario sanitario con alertas, tratamientos de garrapata con control automático, bajas, **protocolos sanitarios** que arman el calendario de cada tropa y **raciones** por lote |

Otras características:
- Riesgos orientativos de estrés térmico, garrapata y sequía a partir del pronóstico de la localidad (Open-Meteo).
- Alertas anticipadas de stock.
- Corrección de datos cargados por error.
- Diseño "Campo cálido" responsive.

## Tecnologías

| Componente | Tecnología |
|---|---|
| Frontend | React 19 + Vite + Material UI · PWA (vite-plugin-pwa / Workbox) · IndexedDB para la cola sin conexión |
| Backend | Node.js 24 + Express 5 (API REST) · Zod · JWT + bcrypt · pdfkit y exceljs |
| Base de datos | PostgreSQL 17 + Prisma ORM |
| Pruebas | Vitest + Supertest (unitarias e integración, con cobertura) · Playwright (E2E) |
| CI / despliegue | GitHub Actions · Vercel (frontend) · Render (API) · Neon (base de datos) |

## Requisitos

- [Node.js](https://nodejs.org) 22 o superior (recomendado 24)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para la base de datos)
- Git

## Instalación y ejecución local

```bash
# 1. Base de datos (PostgreSQL en el puerto 5433)
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env          # completar JWT_SECRET con una cadena larga y aleatoria, y SEED_PASSWORD
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

| Comando | Dónde | Descripción |
|---|---|---|
| `npm test` | `backend/` | 112 pruebas unitarias y de integración (requiere la base de Docker levantada) |
| `npm run test:coverage` | `backend/` | Pruebas con reporte de cobertura |
| `npm test` | `frontend/` | 6 pruebas de la cola sin conexión |
| `npm run lint` | `backend/`, `frontend/` | Análisis estático con ESLint |
| `npm run build` y `npm run preview` | `frontend/` | Compila la app con el *service worker* y la sirve en http://localhost:4173 |
| `npm run db:studio` | `backend/` | Explorador visual de la base de datos (Prisma Studio) |
| `npm run db:migrate` | `backend/` | Crea una nueva migración tras cambiar `schema.prisma` |
| `npm run recorrido` | `e2e/` | Recorrido E2E con los 3 roles en Microsoft Edge (requiere `SEED_PASSWORD`; genera las capturas) |
| `node offline.mjs <carpeta>` | `e2e/` | Prueba E2E del modo sin conexión contra `npm run preview` |
| `node render-diagramas.mjs` | `e2e/` | Convierte a PNG los diagramas de la documentación (`docs/diagramas/`) |
| `node capturas-github.mjs` | `e2e/` | Capturas del tablero, milestones, Actions y tags para la sección 16 |
| `npm run humo` | `e2e/` | Prueba de humo de **solo lectura** contra la app publicada (contraseña en `e2e/.password-produccion`) |

Documentación interactiva de la API: <http://localhost:4000/api/docs> (Swagger UI).

## Estructura del repositorio

```
backend/
  prisma/            schema.prisma, migraciones SQL, seed de demostración
  src/
    config/          variables de entorno y cliente Prisma
    middlewares/     autenticación JWT, control de roles, validación, errores
    modules/         un módulo por área: auth, usuarios, lotes, insumos, alimentacion,
                     racion, pesadas, sanidad, protocolos, clima, reportes, parametros
                     (cada uno con routes → controller → service → schema)
    services/        cálculos de negocio, indicadores, alertas, raciones, conversión,
                     proyección de stock, protocolos, clima y riesgos
    docs/            especificación OpenAPI
  tests/             unit/ (cálculos) e integration/ (API + base de datos)
frontend/
  src/
    api/             cliente HTTP (token y renovación de sesión)
    context/         sesión del usuario
    components/      layout, ilustraciones, clima, diálogos y componentes reutilizables
    offline/         cola de cargas sin conexión e instalación de la app
    pages/           pantallas por rol: admin/, encargado/, veterinario/
  scripts/           generación de los íconos a partir del logo
e2e/                 recorridos end-to-end y videos de demostración (Playwright)
docs/                documentación del proyecto, capturas y entregables
render.yaml          configuración de la API en Render
```

## Publicación

La API se publica en Render con `render.yaml` y el frontend en Vercel con `frontend/vercel.json`. Cada *push* a `main` vuelve a publicar ambos y aplica las migraciones. Los pasos están en el [manual de instalación](docs/entrega2/manual-instalacion.md#despliegue-online).

## Flujo de trabajo

- **Commits:** cada commit referencia su issue (`#21 - Protocolos sanitarios: …`).
- **Ramas:** una rama `feature/<n>-…` por issue. Se integra en `develop` y las versiones se liberan en `main` con un tag `ganadotrack-W.X.Y.Z`. El detalle está en la [sección 16](docs/entrega2/16-seguimiento.md).
