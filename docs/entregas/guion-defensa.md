# Guion de la defensa

Presentación: `GanadoTrack_Defensa.pptx` (17 diapositivas, unos 20 minutos más la demo). Cada diapositiva tiene notas del orador.

## Antes de empezar (10 minutos antes)

1. Abrir <https://ganadotrack.vercel.app> en la PC y en el celular: la API gratuita "se duerme" y tarda unos 50 segundos en despertar.
2. Tener a mano la contraseña de demostración (no está en el repositorio).
3. En el celular, la app instalada con la sesión del **encargado**; en la PC, una pestaña con el **administrador** y otra (ventana privada) con el **veterinario**.
4. Plan B sin internet: los videos de `docs/entregas/video-demo/`, o la versión local (`docker compose up -d`, `npm run dev` en `backend/` y `frontend/`).

## Demo en vivo (5 minutos)

| Min. | Rol | Qué mostrar | Qué decir |
|---|---|---|---|
| 0:00 | Encargado (celular) | Pantalla "Comida de hoy" → **Confirmar ración de hoy** en el Lote 01 | "Un toque por lote: la ración la definió el veterinario y el sistema calcula los kilos según las cabezas." |
| 0:45 | Encargado | Activar **modo avión** → confirmar el Lote 02 → aparece *En el teléfono* | "En el corral no hay señal: la carga queda guardada en el celular con su fecha." |
| 1:15 | Encargado | Desactivar el modo avión → la carga se envía sola | "Al volver la señal se envía sola, y aunque se reenvíe no se duplica: cada carga tiene un identificador único." |
| 1:45 | Veterinario (PC) | **Sanidad**: alertas de eventos vencidos y próximos → **Registrar realizado** en un control de garrapata, con 21 días | "El sistema programa solo el próximo control. Esto es lo que faltó cuando murieron las 26 vacas." |
| 2:30 | Veterinario | **Protocolos**: el protocolo por defecto | "Al crear un lote, el calendario sanitario se arma solo con este protocolo." |
| 3:00 | Administrador (PC) | **Dashboard**: alertas, clima y riesgos, lotes en el corral | "Todo lo que pasó recién ya está acá: la alimentación, la sanidad y las alertas." |
| 3:30 | Administrador | **Detalle del Lote 01**: GDP, fecha estimada de venta, costo por kg y margen; pestaña Costos | "Esta es la respuesta al problema principal: cuánto cuesta producir un kilo de carne en este lote." |
| 4:15 | Administrador | **Insumos y stock**: días de cobertura y compra sugerida → **Informe PDF** del lote | "El sistema avisa antes de quedarse sin silaje, y el informe se descarga listo para el contador." |
| 4:45 | — | Volver a la presentación | — |

## Preguntas probables

**¿Por qué la GDP objetivo es tan baja (0,45 kg/día)?**
Es el valor que surge del relevamiento: 380 → 420 kg en 90–100 días ≈ 0,42 kg/día. Es bajo para un feedlot (lo habitual es 1 a 1,5 kg/día) y quedó como lo primero a confirmar con el productor. Como la GDP objetivo se carga por lote, corregirla no requiere cambios en el sistema.

**¿Por qué el margen da tan alto?**
Porque es el margen **de engorde**: el costo incluye alimentación y sanidad, pero no el valor del animal al ingresar (es cría propia y no tiene precio de compra) ni los gastos generales. Está declarado en los Límites, aclarado en la pantalla y en los informes, y "costos completos" es la primera mejora del trabajo futuro.

**¿Por qué no hiciste una app nativa?**
Una PWA instalable cubre lo que necesita el encargado (ícono en el celular, uso sin señal) con un solo código para todos los dispositivos, sin pasar por las tiendas ni mantener dos apps.

**¿Por qué no microservicios?**
Para un solo establecimiento agregan complejidad operativa (varios despliegues, comunicación entre servicios) sin beneficio. La API está separada por módulos de negocio, así que se puede crecer sin rediseñar: en la versión final se agregaron tres módulos sin tocar la arquitectura.

**¿Qué pasa si dos personas cargan la alimentación del mismo lote el mismo día?**
La base tiene un índice único por lote, insumo y día: la segunda carga se rechaza con un 409 y el stock no cambia (CP-13). La corrección la hace el administrador.

**¿Cómo garantizás que el stock no quede inconsistente?**
El registro de alimentación y el descuento de stock van en una misma transacción: si un insumo no alcanza, se revierte todo (CP-14). Además, la base tiene un CHECK de stock ≥ 0.

**¿Cómo funciona la carga sin señal sin duplicar?**
Cada carga recibe en el celular un identificador único (`operacion_id`). Si el envío se repite, la API reconoce el identificador y responde "repetido" sin volver a descontar stock; un índice único en la base lo garantiza (CP-76).

**¿Cómo se protegen los datos y los accesos?**
Contraseñas con bcrypt, sesión JWT que vence a las 8 h, permisos verificados en el servidor en cada ruta, HTTPS, límite de intentos de login, helmet y validación de todo dato de entrada con Zod. Las credenciales están en variables de entorno, fuera del repositorio.

**¿Validaste el sistema con el usuario?**
Se validó internamente contra los criterios de aceptación con los escenarios E2E (sección 18.5). La validación con el productor no se completó antes de la entrega; el material (videos, acceso de prueba y cuestionario) está preparado y es la primera tarea del trabajo futuro.

**¿Qué cambiaste respecto de la 1ª entrega?**
Las 14 correcciones del Anexo V: numeración y diagrama de casos de uso, fórmulas de costo con cabezas actuales, GDP objetivo por lote, modelo de datos completo, entre otras. Además, el alcance pasó de MVP a sistema terminado, con los RF09 a RF14.
