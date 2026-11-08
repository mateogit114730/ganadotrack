# Descripción de la API

- **Base:** `/api` (en local: `http://localhost:4000/api`; en producción: `https://ganadotrack-api.onrender.com/api`)
- **Formato:** JSON · fechas `AAAA-MM-DD` · pesos en kg · importes en ARS. Los reportes devuelven archivos PDF o Excel.
- **Documentación interactiva:** `/api/docs` (Swagger UI). La especificación OpenAPI 3 está en [`backend/src/docs/openapi.yaml`](../../backend/src/docs/openapi.yaml): 41 rutas y 54 operaciones.
- **Autenticación:** encabezado `Authorization: Bearer <token>`, obtenido con `POST /auth/login`. El token vence a las 8 h sin actividad; las respuestas pueden traer un token renovado en `X-Token-Renovado`.

## Endpoints

Los marcados con ★ se agregaron en la versión final.

| Método | Ruta | Rol | Descripción | CU |
|---|---|---|---|---|
| POST | `/auth/login` | Público | Inicia sesión; devuelve el token y el usuario | CU01 |
| GET | `/auth/me` | Todos | Usuario de la sesión | CU01 |
| PATCH | `/auth/perfil` ★ | Todos | Cambia el nombre propio | CU22 |
| PATCH | `/auth/password` ★ | Todos | Cambia la contraseña propia (exige la actual) | CU22 |
| GET | `/usuarios` | ADMIN | Lista los usuarios | CU02 |
| POST | `/usuarios` | ADMIN | Crea un usuario | CU02 |
| PATCH | `/usuarios/:id` | ADMIN | Modifica nombre, rol, estado o contraseña | CU02 |
| GET | `/lotes?estado=` | ADMIN | Lista los lotes con indicadores | CU12 |
| POST | `/lotes` | ADMIN | Crea un lote y aplica el protocolo elegido ★ (`protocoloId`, `omitirEventosPasados`) | CU03, CU17 |
| GET | `/lotes/:id` | ADMIN | Detalle del lote con indicadores | CU11 |
| PATCH | `/lotes/:id` | ADMIN | Edita el lote o carga el precio de venta | CU11 |
| POST | `/lotes/:id/cierre` | ADMIN | Cierra el lote (`simular: true` = vista previa) | CU13 |
| GET | `/raciones` ★ | VETERINARIO, ADMIN | Lotes activos con su ración vigente y los kg del día | CU15 |
| GET | `/lotes/:loteId/racion` ★ | VETERINARIO, ADMIN | Ración vigente e historial de un lote | CU15 |
| PUT | `/lotes/:loteId/racion` ★ | VETERINARIO, ADMIN | Define la ración desde una fecha (0 kg quita el insumo) | CU15 |
| GET | `/protocolos` ★ | VETERINARIO, ADMIN | Lista los protocolos con sus eventos | CU17 |
| POST | `/protocolos` ★ | VETERINARIO, ADMIN | Crea un protocolo | CU17 |
| PUT | `/protocolos/:id` ★ | VETERINARIO, ADMIN | Modifica un protocolo y sus eventos | CU17 |
| DELETE | `/protocolos/:id` ★ | VETERINARIO, ADMIN | Elimina un protocolo (los lotes ya creados no cambian) | CU17 |
| POST | `/lotes/:loteId/aplicar-protocolo` ★ | VETERINARIO, ADMIN | Genera los eventos de un protocolo en un lote existente | CU17 |
| GET | `/insumos` | ADMIN | Stock de insumos con su proyección ★ (cobertura, quiebre, compra sugerida, curva a 30 días) | CU05, CU18 |
| PATCH | `/insumos/:id` | ADMIN | Configura el stock mínimo, el precio y el % de materia seca ★ | CU06 |
| GET / POST | `/insumos/:id/compras` | ADMIN | Historial / nueva compra o carga | CU06 |
| PUT | `/insumos/:id/compras/:compraId` ★ | ADMIN | Corrige una compra y ajusta el stock | CU06 |
| GET | `/alimentacion/opciones` | ENCARGADO, ADMIN | Lotes activos, insumos, lo ya cargado hoy y la ración sugerida ★ | CU04, CU16 |
| POST | `/alimentacion` | ENCARGADO, ADMIN | Registra la alimentación y descuenta el stock; idempotente con `operacionId` ★ | CU04, CU16, CU21 |
| GET | `/alimentacion?loteId=&desde=&hasta=` | ADMIN | Historial | — |
| DELETE | `/alimentacion/:id` | ADMIN | Elimina un registro erróneo y devuelve el stock | — |
| GET | `/pesadas?loteId=` | ADMIN | Pesadas del lote con la conversión alimenticia ★ | CU07 |
| POST | `/pesadas` | ADMIN | Registra una pesada, calcula la GDP y la proyección | CU07 |
| DELETE | `/pesadas/:id` ★ | ADMIN | Elimina la última pesada del lote | CU07 |
| GET | `/sanidad/lotes` | VETERINARIO, ADMIN | Lotes activos con cabezas actuales | — |
| GET | `/sanidad/eventos?loteId=&estado=` | VETERINARIO, ADMIN | Calendario sanitario | CU08 |
| POST | `/sanidad/eventos` | VETERINARIO, ADMIN | Programa un evento | CU08 |
| PATCH | `/sanidad/eventos/:id` ★ | VETERINARIO, ADMIN | Reprograma o corrige un evento pendiente | CU08 |
| POST | `/sanidad/eventos/:id/realizar` | VETERINARIO, ADMIN | Registra un evento programado como realizado | CU09 |
| POST | `/sanidad/eventos/realizados` | VETERINARIO, ADMIN | Registra un evento no programado | CU09 |
| DELETE | `/sanidad/eventos/:id` | VETERINARIO, ADMIN | Elimina un evento pendiente | CU08 |
| GET / POST | `/sanidad/bajas` | VETERINARIO, ADMIN | Lista / registra bajas | CU10 |
| DELETE | `/sanidad/bajas/:id` ★ | ADMIN | Elimina una baja cargada por error | CU10 |
| GET | `/clima` ★ | Todos | Clima actual, pronóstico de 7 días, lluvia de 30 días y riesgos | CU19 |
| GET / PUT | `/clima/ubicacion` ★ | ADMIN | Consulta / guarda la ubicación del establecimiento | CU19 |
| GET | `/clima/buscar?q=` ★ | ADMIN | Busca localidades por nombre | CU19 |
| GET | `/dashboard` | ADMIN | Resumen, lotes activos, alertas y stock | CU12 |
| GET | `/costos/:id` | ADMIN | Costos con desglose, conversión ★ y rentabilidad | CU11 |
| GET | `/alertas` | ADMIN, VETERINARIO | Alertas vigentes (el veterinario solo ve las sanitarias y las de clima sanitario) | CU14 |
| GET | `/reportes/lotes/:id/informe.pdf` ★ | ADMIN | Informe del lote (de cierre si está cerrado) | CU20 |
| GET | `/reportes/mensual.pdf?mes=AAAA-MM` ★ | ADMIN | Reporte mensual | CU20 |
| GET | `/reportes/planilla.xlsx?desde=&hasta=` ★ | ADMIN | Planilla Excel para el contador | CU20 |
| GET | `/parametros` · PUT `/parametros/:clave` | ADMIN | Rendimiento, días de aviso, cobertura mínima ★ y horizonte de compra ★ | — |
| GET | `/health` | Público | Estado de la API y de la base de datos | — |

## Ejemplo: ración sugerida para el encargado (CU16)

`GET /api/alimentacion/opciones` (fragmento):

```json
{
  "fecha": "2026-10-15T00:00:00.000Z",
  "insumos": [
    { "id": 55, "nombre": "Suplemento proteico 18%", "tipo": "SUPLEMENTO", "stockKg": 1500, "precioKg": 480 },
    { "id": 56, "nombre": "Silaje de sorgo (propio)", "tipo": "SILAJE", "stockKg": 180000, "precioKg": 45 }
  ],
  "lotes": [{
    "id": 124, "nombre": "Lote 01 - Angus novillos", "cabezasActuales": 118,
    "racionSugerida": [
      { "insumoId": 55, "kgCabezaDia": 1.5, "vigenteDesde": "2026-08-17T00:00:00.000Z", "kgDia": 177 },
      { "insumoId": 56, "kgCabezaDia": 15,  "vigenteDesde": "2026-08-17T00:00:00.000Z", "kgDia": 1770 }
    ],
    "cargadoHoy": []
  }]
}
```

`kgDia` = `kgCabezaDia` × `cabezasActuales` (1,5 × 118 = 177). El botón "Confirmar ración de hoy" envía esos kg en un `POST /alimentacion`.

## Ejemplo: registrar alimentación (CU04 / CU21)

```http
POST /api/alimentacion
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json

{ "loteId": 124, "items": [ { "insumoId": 55, "kg": 177 }, { "insumoId": 56, "kg": 1770 } ],
  "operacionId": "5f0c2a8e-3b7d-4c1e-9a52-1d2e3f4a5b6c", "fecha": "2026-10-15" }
```

`operacionId` y `fecha` son opcionales. Los envía la app cuando sincroniza una carga hecha sin conexión: la fecha es la de captura.

Respuesta `201 Created`:
```json
{
  "lote": { "id": 124, "nombre": "Lote 01 - Angus novillos" },
  "fecha": "2026-10-15T00:00:00.000Z",
  "registros": [
    { "id": 331, "insumoId": 55, "kg": 177, "precioKg": 480, "costo": 84960, "insumo": { "nombre": "Suplemento proteico 18%" } },
    { "id": 332, "insumoId": 56, "kg": 1770, "precioKg": 45, "costo": 79650, "insumo": { "nombre": "Silaje de sorgo (propio)" } }
  ],
  "costoDia": 164610,
  "alertasStock": ["Suplemento proteico 18% quedó por debajo del stock mínimo (1.323 kg)"]
}
```

Si se reenvía la misma `operacionId`, la respuesta es `200 OK` con `"repetido": true` y los registros ya guardados: no se duplica nada ni se descuenta el stock otra vez.

Respuesta `409 Conflict` (stock insuficiente; no se guarda nada):
```json
{ "error": "Stock insuficiente de Suplemento proteico 18%: hay 1.323 kg disponibles" }
```

## Ejemplo: clima y riesgos (CU19)

`GET /api/clima` (fragmento; el pronóstico trae 7 días):

```json
{
  "configurado": true, "disponible": true,
  "ubicacion": { "nombre": "Pergamino, Buenos Aires", "latitud": -33.89101, "longitud": -60.57462 },
  "actual": { "temperatura": 13, "humedad": 93, "viento": 12.3, "lluvia": 0, "texto": "Despejado",
              "ith": 55.5, "estresTermico": "normal" },
  "pronostico": [{ "fecha": "2026-10-15", "maxima": 19.3, "minima": 11.3, "lluvia": 4.4,
                   "texto": "Lluvia", "ith": 66.1, "estresTermico": "normal" }],
  "riesgos": {
    "estresTermico": { "nivel": "normal", "dia": "2026-10-15" },
    "garrapata": { "nivel": "bajo", "temperaturaMedia7": 13.5, "humedadMedia7": 81 },
    "sequia": { "nivel": "bajo", "lluvia30": 72.2, "lluviaPronostico7": 14.1 }
  }
}
```

Si el servicio externo no responde, la respuesta es `200` con `"disponible": false`, y el resto del sistema sigue funcionando.

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
| 400 | Datos inválidos (con `detalles` por campo), regla de negocio violada o contraseña actual incorrecta |
| 401 | Sin sesión, token vencido o usuario desactivado |
| 403 | El rol no tiene permiso para la operación |
| 404 | Recurso o ruta inexistente |
| 409 | Conflicto: stock insuficiente, duplicado, lote cerrado, evento ya realizado, solo se puede eliminar la última pesada |
| 429 | Demasiados intentos de login o de cambio de contraseña |
| 500 | Error interno |
