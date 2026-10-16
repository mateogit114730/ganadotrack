# Guía de publicación – pasos de Mateo

Pasos que requieren tu cuenta o tu confirmación. Los marcados con ⏱ llevan unos 5 minutos cada uno.
Cuando termines cada bloque, avisá en la sesión de Claude Code y se continúa desde ahí.

## A. GitHub (repositorio, issues y tablero) ✅ hecho el 15/10

Repositorio: <https://github.com/mateogit114730/ganadotrack> · Tablero: <https://github.com/users/mateogit114730/projects/1>.

Pasos realizados (por si hay que repetirlos en otra PC):
1. Instalar GitHub CLI: `winget install GitHub.cli`.
2. Iniciar sesión con los permisos necesarios para la CI y el tablero:
   ```powershell
   gh auth login --scopes project,workflow
   ```
   Elegir: **GitHub.com → HTTPS → Login with a web browser**, y copiar el código que aparece.

## B. Base de datos – Neon ⏱

1. Entrar a <https://neon.tech> → **Sign up with GitHub**.
2. **Create project**:
   - nombre `ganadotrack`
   - Postgres 17
   - región **AWS US East 1 (N. Virginia)**, la misma que la API.
3. En **Connection string** copiar la cadena que empieza con `postgresql://…` (con la opción *Pooled connection* desactivada).
4. Guardarla para el paso C. **No la pegues en el chat ni en el repositorio**: es una contraseña.

## C. API – Render ⏱

1. Entrar a <https://render.com> → **Sign up with GitHub**.
2. **New → Blueprint** → elegir el repositorio `ganadotrack`. Render lee el archivo `render.yaml`.
3. Completar las variables que pide:
   - `DATABASE_URL`: la cadena de Neon.
   - `CORS_ORIGIN`: por ahora `https://ganadotrack.vercel.app`; se corrige en el paso D si Vercel asigna otra URL.
   - `SEED_PASSWORD`: la contraseña para los usuarios de demostración, que después se le pasa a la docente.
4. **Apply**. El primer despliegue tarda unos 5 minutos. Al terminar, abrir `https://<tu-servicio>.onrender.com/api/health`: tiene que responder `{"estado":"ok","baseDeDatos":"ok"}`.
5. Avisar en la sesión la URL de la API. Con tu confirmación se cargan los datos de demostración en la base de producción.

## D. Aplicación – Vercel ⏱

1. Entrar a <https://vercel.com> → **Continue with GitHub**.
2. **Add New → Project** → importar `ganadotrack`:
   - **Root Directory**: `frontend`.
   - **Environment Variables**: `VITE_API_URL` = `https://<tu-servicio>.onrender.com/api`.
3. **Deploy**. Si la URL final no es `https://ganadotrack.vercel.app`, actualizar `CORS_ORIGIN` en Render con la URL correcta.
4. Opcional: en GitHub → Settings → Secrets and variables → Actions → **Variables**, crear `API_URL` = `https://<tu-servicio>.onrender.com`. Así se activa el flujo que mantiene la API despierta en horario de uso.

## E. Validación con el productor (29/10)

1. Enviar por WhatsApp el mensaje de [validacion-productor.md](validacion-productor.md) y los 3 videos de la carpeta [video-demo/](video-demo/).
2. Pasarle aparte la contraseña de demostración.
3. Cuando responda, pegar sus respuestas en la sesión (o completar el acta). Con eso se ajustan los datos y la documentación.

## Notas

- **Primera visita del día:** el plan gratuito de Render "duerme" la API. La primera visita tarda unos 50 segundos; después responde normal. Antes de la defensa, abrir la app 2 minutos antes.
- **Respaldos:** Neon guarda el historial de la base y permite restaurarla a un momento anterior desde su panel.
