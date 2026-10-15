# Manual de instalación y configuración

## Requisitos

| Software | Versión | Para qué |
|---|---|---|
| Node.js | 20 o superior | Ejecutar el backend y compilar el frontend |
| Docker Desktop | Cualquier versión reciente | Base de datos PostgreSQL local |
| Git | — | Descargar el repositorio |

## Instalación local paso a paso

```bash
git clone https://github.com/<usuario>/ganadotrack.git
cd ganadotrack

# 1. Base de datos
docker compose up -d                 # PostgreSQL 17 en el puerto 5433 (bases ganadotrack y ganadotrack_test)

# 2. Backend
cd backend
cp .env.example .env                 # editar JWT_SECRET (cadena aleatoria larga) y SEED_PASSWORD
npm install                          # también genera el cliente de Prisma
npx prisma migrate deploy            # crea tablas, restricciones CHECK, vista y trigger
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
| `PORT` | `4000` | Puerto de la API |
| `JWT_SECRET` | *(cadena aleatoria de 64+ caracteres)* | Firma de los tokens; **nunca** publicarla |
| `JWT_EXPIRES_IN` | `8h` | Duración de la sesión sin actividad (RNF04) |
| `CORS_ORIGIN` | `http://localhost:5173` | URL del frontend autorizada a usar la API |
| `SEED_PASSWORD` | — | Contraseña de los usuarios de demostración |

Para generar un `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

### Variables del frontend (`frontend/.env`)

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL pública de la API. En desarrollo no hace falta (Vite redirige `/api` al backend) |

## Verificar la instalación

```bash
cd backend
npm test        # 58 pruebas: deben pasar todas
npm run lint
```

Recorrido end-to-end opcional (requiere Microsoft Edge; modifica los datos de demostración):
```bash
cd e2e && npm install && SEED_PASSWORD=... npm run recorrido   # genera las capturas en docs/capturas
cd ../backend && npm run db:seed               # restaurar los datos de demostración
```

## Problemas frecuentes

| Problema | Solución |
|---|---|
| `port is already allocated` al iniciar Docker | Otro servicio usa el puerto 5433. Cambiar el puerto en `docker-compose.yml` y en `DATABASE_URL` |
| `Falta la variable de entorno JWT_SECRET` | Falta el archivo `backend/.env` (copiarlo de `.env.example`) |
| `Can't reach database server` | Docker no está corriendo: abrir Docker Desktop y ejecutar `docker compose up -d` |
| El frontend muestra "No se pudo conectar con el servidor" | El backend no está corriendo en el puerto 4000 |

## Respaldo y restauración de la base

```bash
docker exec ganadotrack-db pg_dump -U ganadotrack ganadotrack > respaldo.sql
docker exec -i ganadotrack-db psql -U ganadotrack ganadotrack < respaldo.sql
```

## Despliegue online (opcional)

*Pendiente de confirmar con la docente.* Opción gratuita propuesta:

| Componente | Plataforma | Configuración |
|---|---|---|
| Base de datos | **Neon** (PostgreSQL gestionado) | Crear el proyecto y copiar la *connection string* |
| API | **Render** (Web Service) | Raíz: `backend` · Build: `npm install && npx prisma migrate deploy` · Start: `npm start` · Variables: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN=<url de Vercel>`, `NODE_ENV=production` |
| Frontend | **Vercel** | Raíz: `frontend` · Framework: Vite · Variable: `VITE_API_URL=<url de Render>/api` · Agregar `vercel.json` con *rewrite* de todas las rutas a `/index.html` (SPA) |

Las tres plataformas brindan HTTPS automático (RNF04). Para cargar los datos de demostración en producción: `npm run db:seed` con la `DATABASE_URL` de Neon (borra los datos existentes).
