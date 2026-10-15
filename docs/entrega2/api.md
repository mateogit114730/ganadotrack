# Descripción de la API

- **Base:** `/api` (en local: `http://localhost:4000/api`)
- **Formato:** JSON · fechas `AAAA-MM-DD` · pesos en kg · importes en ARS
- **Documentación interactiva:** `http://localhost:4000/api/docs` (Swagger UI, especificación en [`backend/src/docs/openapi.yaml`](../../backend/src/docs/openapi.yaml))
- **Autenticación:** encabezado `Authorization: Bearer <token>`, obtenido con `POST /auth/login`. El token vence a las 8 h sin actividad; las respuestas pueden traer un token renovado en `X-Token-Renovado`.

## Endpoints

| Método | Ruta | Rol | Descripción | CU |
|---|---|---|---|---|
| POST | `/auth/login` | Público | Inicia sesión; devuelve el token y el usuario | CU01 |
| GET | `/auth/me` | Todos | Usuario de la sesión | CU01 |
| GET | `/usuarios` | ADMIN | Lista los usuarios | CU02 |
| POST | `/usuarios` | ADMIN | Crea un usuario | CU02 |
| PATCH | `/usuarios/:id` | ADMIN | Modifica nombre, rol, estado o contraseña | CU02 |
| GET | `/lotes?estado=` | ADMIN | Lista los lotes con indicadores | CU12 |
| POST | `/lotes` | ADMIN | Crea un lote | CU03 |
| GET | `/lotes/:id` | ADMIN | Detalle del lote con indicadores | CU11 |
| PATCH | `/lotes/:id` | ADMIN | Edita el lote o carga el precio de venta | CU11 |
| POST | `/lotes/:id/cierre` | ADMIN | Cierra el lote (`simular: true` = vista previa) | CU13 |
| GET | `/insumos` | ADMIN | Stock de insumos | CU05 |
| PATCH | `/insumos/:id` | ADMIN | Configura el stock mínimo y el precio | CU06 |
| GET / POST | `/insumos/:id/compras` | ADMIN | Historial / nueva compra o carga | CU06 |
| GET | `/alimentacion/opciones` | ENCARGADO, ADMIN | Lotes activos, insumos y lo ya cargado hoy | CU04 |
| POST | `/alimentacion` | ENCARGADO, ADMIN | Registra la alimentación del día y descuenta el stock | CU04 |
| GET | `/alimentacion?loteId=&desde=&hasta=` | ADMIN | Historial | — |
| DELETE | `/alimentacion/:id` | ADMIN | Elimina un registro erróneo y devuelve el stock | — |
| GET | `/pesadas?loteId=` | ADMIN | Pesadas del lote | CU07 |
| POST | `/pesadas` | ADMIN | Registra una pesada, calcula la GDP y la proyección | CU07 |
| GET | `/sanidad/lotes` | VETERINARIO, ADMIN | Lotes activos con cabezas actuales | — |
| GET | `/sanidad/eventos?loteId=&estado=` | VETERINARIO, ADMIN | Calendario sanitario | CU08 |
| POST | `/sanidad/eventos` | VETERINARIO, ADMIN | Programa un evento | CU08 |
| POST | `/sanidad/eventos/:id/realizar` | VETERINARIO, ADMIN | Registra un evento programado como realizado | CU09 |
| POST | `/sanidad/eventos/realizados` | VETERINARIO, ADMIN | Registra un evento no programado | CU09 |
| DELETE | `/sanidad/eventos/:id` | VETERINARIO, ADMIN | Elimina un evento pendiente | — |
| GET / POST | `/sanidad/bajas` | VETERINARIO, ADMIN | Lista / registra bajas | CU10 |
| GET | `/dashboard` | ADMIN | Resumen, lotes activos, alertas y stock | CU12 |
| GET | `/costos/:loteId` | ADMIN | Costos con desglose y rentabilidad | CU11 |
| GET | `/alertas` | ADMIN, VETERINARIO | Alertas vigentes (el veterinario solo ve las sanitarias) | CU14 |
| GET / PUT | `/parametros[/:clave]` | ADMIN | Rendimiento al gancho, días de aviso | — |
| GET | `/health` | Público | Estado de la API | — |

## Ejemplo: registrar alimentación (CU04)

```http
POST /api/alimentacion
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json

{ "loteId": 2, "items": [ { "insumoId": 1, "kg": 180 }, { "insumoId": 2, "kg": 1800 } ] }
```

Respuesta `201 Created`:
```json
{
  "lote": { "id": 2, "nombre": "Lote 01 - Angus novillos" },
  "fecha": "2026-10-08T00:00:00.000Z",
  "registros": [
    { "id": 331, "insumoId": 1, "kg": 180, "precioKg": 480, "costo": 86400, "insumo": { "nombre": "Suplemento proteico 18%" } },
    { "id": 332, "insumoId": 2, "kg": 1800, "precioKg": 45, "costo": 81000, "insumo": { "nombre": "Silaje de sorgo (propio)" } }
  ],
  "costoDia": 167400,
  "alertasStock": ["Suplemento proteico 18% quedó por debajo del stock mínimo (1.320 kg)"]
}
```

Respuesta `409 Conflict` (stock insuficiente; no se guarda nada):
```json
{ "error": "Stock insuficiente de Suplemento proteico 18%: hay 1.320 kg disponibles" }
```

## Ejemplo: indicadores de un lote (`GET /api/lotes/2`)

```json
{
  "id": 2, "nombre": "Lote 01 - Angus novillos", "estado": "ACTIVO",
  "fechaIngreso": "2026-08-10T00:00:00.000Z", "cantidadInicial": 120,
  "pesoIngreso": 380, "pesoObjetivo": 420, "gdpObjetivo": 0.45, "precioVentaKg": 9800,
  "indicadores": {
    "diasEnFeedlot": 59, "cabezasActuales": 118, "bajas": 2,
    "pesoActual": 405, "ultimaGdp": 0.423, "bajoRendimiento": true,
    "diasRestantes": 36, "fechaEstimadaObjetivo": "2026-11-11T00:00:00.000Z",
    "costoAlimentacion": 9876600, "costoSanitario": 750000, "costoTotal": 10626600,
    "rendimientoGancho": 0.57, "kgCarneEstimados": 27240.3,
    "costoPorKgCarne": 390.11, "margenBruto": 256328340, "calculoPreliminar": false
  }
}
```

## Códigos de error

| Código | Significado |
|---|---|
| 400 | Datos inválidos (con `detalles` por campo) o regla de negocio violada |
| 401 | Sin sesión, token vencido o usuario desactivado |
| 403 | El rol no tiene permiso para la operación |
| 404 | Recurso inexistente |
| 409 | Conflicto: stock insuficiente, duplicado, lote cerrado, evento ya realizado |
| 429 | Demasiados intentos de login |
| 500 | Error interno |
