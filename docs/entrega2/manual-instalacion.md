# Manual de instalación y configuración

## Requisitos

| Software | Versión | Para qué |
|---|---|---|
| Node.js | 22 o superior (recomendado **24**, el usado en desarrollo, CI y producción) | Ejecutar el backend y compilar el frontend |
| Docker Desktop | Cualquier versión reciente | Base de datos PostgreSQL local |
| Git | — | Descargar el repositorio |
| Microsoft Edge | — | Solo para los recorridos E2E (opcional) |

## Instalación local paso a paso

```bash
git clone https://github.com/mateogit114730/ganadotrack.git
cd ganadotrack

# 1. Base de datos
docker compose up -d                 # PostgreSQL 17 en el puerto 5433 (bases ganadotrack y ganadotrack_test)

# 2. Backend
cd backend
cp .env.example .env                 # editar JWT_SECRET (cadena aleatoria larga) y SEED_PASSWORD
npm install                          # también genera el cliente de Prisma
npx prisma migrate deploy            # crea tablas, restricciones CHECK, vista, trigger e índices (6 migraciones)
npm run db:seed                      # datos de demostración (borra los existentes)
npm run dev                          # http://localhost:4000/api  ·  docs: /api/docs

# 3. Frontend (otra terminal)
cd ../frontend
npm install
npm run dev                          # http://localhost:5173
```

### Variables de entorno del backend (`backend/.env`)

| Variable | Ejemplo | Descripción |
|---|---|---|
| `DATABASE_URL` | `postgresql://ganadotrack:ganadotrack@localhost:5433/ganadotrack?schema=public` | Conexión a PostgreSQL |
| `PORT` | `4000` | Puerto de la API (Render lo asigna solo) |
| `JWT_SECRET` | *(cadena aleatoria de 64+ caracteres)* | Firma de los tokens; **nunca** publicarla |
| `JWT_EXPIRES_IN` | `8h` | Duración de la sesión sin actividad (RNF04) |
| `CORS_ORIGIN` | `http://localhost:5173` | URL del frontend autorizada a usar la API |
| `SEED_PASSWORD` | — | Contraseña de los usuarios de demostración |
| `NODE_ENV` | `production` | Solo en producción: registro de peticiones en formato *combined* |

Para generar un `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

### Variables del frontend (`frontend/.env`)

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL pública de la API (por ejemplo `https://ganadotrack-api.onrender.com/api`). En desarrollo no hace falta: Vite redirige `/api` al backend |

### Datos de demostración

El seed carga:
- **3 usuarios:** administrador, encargado y veterinario, con la contraseña de `SEED_PASSWORD`.
- **2 insumos:** suplemento y silaje, con su % de materia seca.
- **4 lotes:** uno cerrado y tres activos, con raciones, pesadas, alimentación, eventos sanitarios y bajas.
- **2 protocolos sanitarios.**
- **La ubicación de demostración:** Pergamino, Buenos Aires.

Las fechas son relativas al día en que se ejecuta, así que los datos siempre se ven actuales.

## Verificar la instalación

```bash
cd backend
npm test                # 112 pruebas (requiere la base de Docker levantada)
npm run test:coverage   # ídem, con reporte de cobertura en coverage/
npm run lint

cd ../frontend
npm test                # 6 pruebas de la cola sin conexión
npm run lint
npm run build           # compila la app y genera el service worker
```

Recorridos end-to-end opcionales (requieren Microsoft Edge y modifican los datos de demostración):
```bash
cd e2e && npm install
SEED_PASSWORD=... npm run recorrido                    # 15 pasos con los 3 roles; capturas en docs/capturas

# Modo sin conexión: necesita la app compilada, porque el service worker solo existe en el build
cd ../frontend && npm run build && npm run preview     # http://localhost:4173 (otra terminal)
cd ../e2e && SEED_PASSWORD=... node offline.mjs ../docs/capturas

cd ../backend && npm run db:seed                       # restaurar los datos de demostración
```

> En Git Bash para Windows, anteponer `MSYS_NO_PATHCONV=1` a los comandos de `e2e/` para que no se modifiquen las rutas de los argumentos.

## Problemas frecuentes

| Problema | Solución |
|---|---|
| `port is already allocated` al iniciar Docker | Otro servicio usa el puerto 5433. Cambiar el puerto en `docker-compose.yml` y en `DATABASE_URL` |
| `Falta la variable de entorno JWT_SECRET` | Falta el archivo `backend/.env` (copiarlo de `.env.example`) |
| `Can't reach database server` | Docker no está corriendo: abrir Docker Desktop y ejecutar `docker compose up -d` |
| El frontend muestra "No se pudo conectar con el servidor" | El backend no está corriendo en el puerto 4000 |
| `EPERM` al ejecutar `npm install` o `prisma generate` en Windows | La API está corriendo y bloquea el motor de Prisma: detenerla, repetir el comando y volver a iniciarla |
| `npm ci` falla en la CI con "package.json and package-lock.json are not in sync" | Regenerar el *lockfile* con la misma versión de npm de la CI (`npx npm@10 install --package-lock-only`) |
| El clima dice "Configurá la localidad…" | Configurar la ubicación en *Configuración* (o ejecutar el seed, que carga Pergamino) |
| La app instalada no muestra los cambios nuevos | Cerrarla y volver a abrirla con conexión: el *service worker* se actualiza solo |

## Respaldo y restauración de la base

```bash
# Local
docker exec ganadotrack-db pg_dump -U ganadotrack ganadotrack > respaldo.sql
docker exec -i ganadotrack-db psql -U ganadotrack ganadotrack < respaldo.sql
```

En producción, Neon guarda el historial de la base y permite restaurarla a un momento anterior desde su panel. También se puede usar `pg_dump` con la cadena de conexión de Neon.

## Despliegue online

Arquitectura de producción: frontend en **Vercel**, API en **Render** y base de datos en **Neon**, todo en planes gratuitos y con HTTPS (ver la sección 15.12). La configuración está versionada en el repositorio:

| Archivo | Qué define |
|---|---|
| `render.yaml` | Servicio web de la API: carpeta `backend`, Node 24, *build* `npm ci --include=dev && npx prisma migrate deploy`, inicio `npm start`, *health check* `/api/health`, región Virginia y variables (las secretas se cargan en el panel) |
| `frontend/vercel.json` | *Rewrite* de todas las rutas a `index.html` (SPA) y caché: el *service worker* se revalida en cada visita y los archivos con *hash* se guardan un año |
| `.github/workflows/ci.yml` | Lint, pruebas con cobertura y *build* en cada *push* y *pull request* |
| `.github/workflows/mantener-activa.yml` | Consulta `/api/health` cada 14 minutos en días hábiles de 8 a 22 h (hora argentina) para que la API no "duerma" |

### Pasos

1. **Neon:** crear el proyecto `ganadotrack` (Postgres 17, región *AWS US East 1*). Copiar la cadena de conexión directa (sin *pooling*).
2. **Render:** *New → Blueprint* con el repositorio. Cargar `DATABASE_URL` (la cadena de Neon), `CORS_ORIGIN` (la URL de Vercel) y `SEED_PASSWORD`. `JWT_SECRET` lo genera Render. Cada despliegue aplica las migraciones pendientes antes de iniciar.
3. **Vercel:** importar el repositorio con *Root Directory* `frontend` y la variable `VITE_API_URL` = `https://<servicio>.onrender.com/api`. Si la URL final de Vercel es otra, corregir `CORS_ORIGIN` en Render.
4. **Datos de demostración** (solo la primera vez; borra los datos existentes):
   ```bash
   cd backend
   DATABASE_URL="<cadena de Neon>" SEED_PASSWORD="<contraseña>" npx prisma db seed
   ```
5. **Verificar:**
   - `https://<servicio>.onrender.com/api/health` responde `{"estado":"ok","baseDeDatos":"ok"}`.
   - La app abre en la URL de Vercel e inicia sesión.
6. **Opcional:** en GitHub → *Settings → Secrets and variables → Actions → Variables*, crear `API_URL` = `https://<servicio>.onrender.com` para activar el flujo que mantiene la API activa.

Desde entonces, cada *push* a `main` vuelve a publicar la API y el frontend automáticamente.

> **Plan gratuito de Render:** la API se "duerme" tras 15 minutos sin uso y la primera visita tarda unos 50 segundos. Antes de una demostración, abrir la app unos minutos antes.

La guía paso a paso para crear las cuentas está en [`docs/entregas/guia-publicacion.md`](../entregas/guia-publicacion.md).
