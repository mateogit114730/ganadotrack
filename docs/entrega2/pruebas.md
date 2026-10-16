# Estrategia de pruebas y validación

## 1. Estrategia

| Tipo de prueba | Qué verifica | Herramienta | Cantidad | Ubicación |
|---|---|---|---|---|
| **De componente (unitarias)** | Funciones puras del backend: GDP, proyección, cabezas, kg de carne, costo por kg, margen, ración, materia seca, conversión, cobertura y compra sugerida; alertas; fechas de los protocolos; índices de clima | Vitest | 42 | `backend/tests/unit/` |
| **De componente (frontend)** | Cola de cargas sin conexión: guardado, orden de envío, corte de señal, rechazos y concurrencia | Vitest + fake-indexeddb | 6 | `frontend/src/offline/` |
| **De integración** | API + reglas de negocio + base de datos real (PostgreSQL de prueba): autenticación, roles, transacciones, triggers, idempotencia, reportes; el servicio de clima se simula | Vitest + Supertest | 70 | `backend/tests/integration/` |
| **Funcionales end-to-end** | Recorrido completo en el navegador con los 3 roles, en escritorio y celular, con descarga de reportes; pérdida y recuperación de la conexión | Playwright (Microsoft Edge) | 15 + 3 pasos | `e2e/recorrido.mjs`, `e2e/offline.mjs` |
| **De aceptación** | Validación con el productor sobre los datos de demostración | Videos + acceso de prueba + cuestionario (WhatsApp) | En curso | Sección 5 |

**Proceso:**
1. Las pruebas unitarias y de integración se ejecutan con `npm test` en `backend/` y en `frontend/`; `npm run test:coverage` agrega el reporte de cobertura.
2. **GitHub Actions** ejecuta lint, pruebas con cobertura y *build* en cada *push* y *pull request*. Una rama no se integra a `develop` si alguna prueba falla (por ejemplo, el PR #30 se integró recién con la CI en verde).
3. Las pruebas de integración usan una base separada (`ganadotrack_test`) que se vacía antes de cada prueba, de modo que son repetibles y no afectan los datos de desarrollo.
4. Las pruebas no dependen de internet: la respuesta de Open-Meteo se simula con datos fijos (`vi.stubGlobal('fetch')`), así los riesgos de clima se prueban con valores conocidos.
5. Los recorridos E2E se ejecutan antes de cada entrega y generan las capturas del manual de usuario (`docs/capturas/`).

**Resultado de la última ejecución (15/10/2026):** 118 de 118 pruebas automatizadas aprobadas (112 del backend + 6 del frontend) · recorridos E2E completos sin errores de consola ni de servidor.

```
backend   Test Files  14 passed (14)      Tests  112 passed (112)
frontend  Test Files   1 passed (1)       Tests    6 passed (6)
```

**Cobertura del backend** (Vitest + v8):

| Alcance | Sentencias | Ramas | Funciones | Líneas |
|---|---|---|---|---|
| Todo el backend | 85,2 % | 72,3 % | 80,0 % | **88,4 %** |
| Servicios de dominio (`src/services`) | — | 86,7 % | 95,1 % | **97,9 %** |

Las líneas sin cubrir corresponden sobre todo a ramas de error poco probables (por ejemplo, fallas de red en el servicio de clima ya cubiertas por el caso general) y a controladores triviales.

## 2. Casos de prueba

Los identificadores **CP-xx** coinciden con el nombre de cada prueba automatizada en el código (`it('CP-10 …')`), lo que permite rastrear cada caso hasta su implementación.

Condición inicial común a CP-01 a CP-37: base de pruebas vacía, con un usuario por rol, dos insumos (suplemento: 1.000 kg a $ 400/kg, mínimo 500 kg; silaje: 20.000 kg a $ 40/kg) y un lote de 100 animales ingresado hace 30 días con 380 kg (objetivo 420 kg, GDP objetivo 0,45).

### Autenticación y roles (RF08, RNF04)

| ID | Funcionalidad | Condiciones iniciales | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|
| CP-01 | Login (CU01) | Usuario admin activo | Email y contraseña correctos | 200, token JWT y rol ADMIN; no se devuelve el hash | Según lo esperado | ✅ Aprobado |
| CP-02 | Login inválido | Ídem | Contraseña incorrecta | 401 "Email o contraseña incorrectos" | Según lo esperado | ✅ Aprobado |
| CP-03 | Acceso sin sesión | — | Petición sin token / con token falso | 401 | Según lo esperado | ✅ Aprobado |
| CP-04 | Contraseñas hasheadas | Usuario creado | — | El campo guardado es un hash bcrypt (`$2…`), distinto a la contraseña | Según lo esperado | ✅ Aprobado |
| CP-05 | RBAC encargado | Sesión de encargado | GET /lotes, /dashboard, /sanidad | 403 en todas; 200 en /alimentacion/opciones | Según lo esperado | ✅ Aprobado |
| CP-06 | RBAC veterinario | Sesión de veterinario | POST /alimentacion, GET /insumos | 403; 200 en /sanidad/eventos | Según lo esperado | ✅ Aprobado |
| CP-07 | Alertas por rol | Stock bajo y evento hoy | GET /alertas con cada rol | Admin: STOCK y SANITARIA; veterinario: solo SANITARIA | Según lo esperado | ✅ Aprobado |
| CP-08 | Usuario desactivado | Encargado con token vigente | El admin lo desactiva | El token deja de funcionar (401) | Según lo esperado | ✅ Aprobado |
| CP-09 | Autodesactivación | Sesión admin | PATCH a sí mismo `activo: false` | 400, no se desactiva | Según lo esperado | ✅ Aprobado |

### Alimentación y stock (RF02, RF03 · CU04, CU05, CU06)

| ID | Funcionalidad | Condiciones iniciales | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|
| CP-10 | Registrar alimentación | Común | 150 kg suplemento + 1.500 kg silaje | 201; costo del día $ 120.000; stock 850 kg y 18.500 kg | Según lo esperado | ✅ Aprobado |
| CP-11 | Un solo insumo | Común | Suplemento 0, silaje 1.000 | Se guarda 1 registro | Según lo esperado | ✅ Aprobado |
| CP-12 | Sin valores (excepción CU04) | Común | Ambos en 0 | 400, no se guarda nada | Según lo esperado | ✅ Aprobado |
| CP-13 | Registro duplicado del día | Silaje ya cargado hoy | Silaje 1.000 kg otra vez | 409; el stock no cambia | Según lo esperado | ✅ Aprobado |
| CP-14 | Stock insuficiente (atomicidad) | Suplemento 1.000 kg | Silaje 1.000 + suplemento 5.000 | 409 "Stock insuficiente"; **tampoco** se descuenta el silaje | Según lo esperado | ✅ Aprobado |
| CP-15 | Alerta de stock mínimo | Mínimo 500 kg | 600 kg de suplemento | 201 con aviso; aparece alerta STOCK | Según lo esperado | ✅ Aprobado |
| CP-16 | Validación de fechas | Común | Fecha futura / anterior al ingreso | 400 en ambos casos | Según lo esperado | ✅ Aprobado |
| CP-17 | Compra de insumo (CU06) | Común | 2.000 kg por $ 1.000.000 | Stock 3.000 kg; precio $ 500/kg | Según lo esperado | ✅ Aprobado |
| CP-18 | Corrección de un registro | Registro de 100 kg | DELETE como admin | 200; el stock vuelve a 1.000 kg | Según lo esperado | ✅ Aprobado |

### Lotes, pesadas y costos (RF01, RF04, RF06 · CU03, CU07, CU11)

| ID | Funcionalidad | Condiciones iniciales | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|
| CP-19 | Validación de lote | — | Peso objetivo 380 < ingreso 400 | 400, error en el campo `pesoObjetivo` | Según lo esperado | ✅ Aprobado |
| CP-20 | Nombre duplicado | Lote existente | Mismo nombre | 409 | Según lo esperado | ✅ Aprobado |
| CP-21 | Días en feedlot | Ingreso hace 30 días | GET /lotes/:id | `diasEnFeedlot = 30`; cálculo preliminar | Según lo esperado | ✅ Aprobado |
| CP-22 | Primera pesada | Sin pesadas | 395 kg hoy | GDP 0,5; 50 días restantes; fecha = hoy + 50 | Según lo esperado | ✅ Aprobado |
| CP-23 | Pesada sucesiva | Pesada de 390 kg hace 10 días | 396 kg hoy | GDP 0,6 (calculada desde la anterior) | Según lo esperado | ✅ Aprobado |
| CP-24 | GDP bajo objetivo (alt. A CU07) | Común | 386 kg hoy (0,2 kg/día) | Aviso y alerta GDP en el dashboard | Según lo esperado | ✅ Aprobado |
| CP-25 | Objetivo alcanzado (alt. B CU07) | Común | 421 kg | `alcanzoObjetivo`, sugiere cierre | Según lo esperado | ✅ Aprobado |
| CP-26 | Fecha de pesada inválida | Pesada hace 5 días | Otra pesada en la misma fecha | 400 "posterior a la última pesada" | Según lo esperado | ✅ Aprobado |
| CP-27 | Costos y margen (RF06) | $ 40.000 de alimentación, $ 10.000 de sanidad, 10 bajas, pesada de 400 kg, precio $ 9.000 | GET /costos/:id | Costo $ 50.000; 90 cab.; 20.520 kg carne; $ 2,44/kg; margen $ 184.630.000 | Según lo esperado | ✅ Aprobado |

### Sanidad, bajas y cierre (RF05, RF01, RF07 · CU08–CU10, CU13, CU14)

| ID | Funcionalidad | Condiciones iniciales | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|
| CP-28 | Alerta 7 días antes (RF05) | Eventos a 7 y 8 días | GET /alertas | Solo alerta el de 7 días | Según lo esperado | ✅ Aprobado |
| CP-29 | Programar en el pasado | Común | Fecha de ayer | 400 | Según lo esperado | ✅ Aprobado |
| CP-30 | Registrar evento realizado | Evento pendiente | Fecha, dosis, $ 25.000 | REALIZADO; costo sanitario del lote $ 25.000 | Según lo esperado | ✅ Aprobado |
| CP-31 | Garrapata (alt. A CU09) | Evento GARRAPATA | Sin duración → con 21 días | 400 sin duración; con duración se programa un control a +21 días | Según lo esperado | ✅ Aprobado |
| CP-32 | Costo omitido (excepción CU09) | Evento pendiente | Sin costo | Guarda $ 0 con advertencia | Según lo esperado | ✅ Aprobado |
| CP-33 | Doble registro | Evento ya realizado | Registrar otra vez | 409 | Según lo esperado | ✅ Aprobado |
| CP-34 | Baja (CU10) | 100 cabezas | Baja de 95; luego de 6 | Quedan 5; la segunda: 400 | Según lo esperado | ✅ Aprobado |
| CP-35 | Simulación de cierre | Lote activo | 421 kg, $ 9.500, `simular` | Resumen (23.997 kg carne); el lote sigue ACTIVO | Según lo esperado | ✅ Aprobado |
| CP-36 | Cierre de lote (CU13) | Evento pendiente | Cierre real | CERRADO + advertencia; alimentación posterior: 409; sin alertas del lote | Según lo esperado | ✅ Aprobado |
| CP-37 | Trigger de la base | Lote cerrado | INSERT directo de una pesada (sin la API) | La base rechaza la operación | Según lo esperado | ✅ Aprobado |

### Pruebas end-to-end y no funcionales (navegador)

| ID | Funcionalidad | Condiciones iniciales | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|
| CP-38 | Login inválido en la interfaz | Datos de demo | Contraseña errónea | Mensaje de error visible | Según lo esperado | ✅ Aprobado |
| CP-39 | Carga del encargado en celular (RNF01) | Pantalla de 390 px | Lote 01, 180 kg / 1.800 kg | Confirmación con costo del día; 2 clics (lote + Confirmar) más el tipeo de los kg | 2 clics; confirmación en **127 ms** (RNF03 < 2 s) | ✅ Aprobado |
| CP-40 | Restricción de pantallas | Sesión de encargado | Navegar a /dashboard | Redirige a su pantalla | Según lo esperado | ✅ Aprobado |
| CP-41 | Garrapata desde la interfaz | Sesión de veterinario | Registrar control con 21 días | Aviso "Se programó un control…" | Según lo esperado | ✅ Aprobado |
| CP-42 | Tiempo de carga del dashboard (RNF03) | 3 lotes activos, ~330 registros | Abrir el dashboard | < 3 s | **≈ 970 ms** | ✅ Aprobado |
| CP-43 | Alta, pesada y cierre desde la interfaz | Sesión admin | Lote nuevo; pesada; cierre con resumen | Cada acción confirma y actualiza los indicadores | Según lo esperado | ✅ Aprobado |
| CP-44 | Diseño responsive | Pantalla de 390 px | Dashboard y menú | Sin desplazamiento horizontal; menú desplegable | Según lo esperado | ✅ Aprobado |

### Perfil y corrección de datos (RF08, RF03–RF05 · CU22, CU06–CU10)

| ID | Funcionalidad | Condiciones iniciales | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|
| CP-45 | Cambiar el nombre propio (CU22) | Sesión de encargado | Nombre "Juan Encargado" | 200 con el nombre nuevo | Según lo esperado | ✅ Aprobado |
| CP-46 | Cambiar la contraseña (CU22) | Sesión de veterinario | Actual incorrecta; luego la correcta | 400 con la incorrecta; con la correcta, 200 y la nueva sirve para el login | Según lo esperado | ✅ Aprobado |
| CP-47 | Eliminar la última pesada (CU07) | Pesadas hace 10 días y hoy | DELETE de la primera y de la segunda | 409 la primera; 200 la última; queda 1 pesada | Según lo esperado | ✅ Aprobado |
| CP-48 | Eliminar una baja (CU10) | Baja de 3 animales | DELETE como veterinario y como admin | 403 / 200; las cabezas vuelven a 100 | Según lo esperado | ✅ Aprobado |
| CP-49 | Reprogramar un evento (CU08) | Evento pendiente a 3 días | Nueva fecha a 10 días; luego editar el realizado | 200 con la fecha nueva; 409 si ya está realizado | Según lo esperado | ✅ Aprobado |
| CP-50 | Corregir una compra (CU06) | Compra de 2.000 kg por $ 1.000.000 | 2.500 kg; luego 100 kg con el stock ya consumido | Stock 3.500 kg y $ 400/kg; la segunda: 409 (no deja stock negativo) | Según lo esperado | ✅ Aprobado |
| CP-51 | Estado del servicio | API y base en funcionamiento | GET /health | `{estado: ok, baseDeDatos: ok}` | Según lo esperado | ✅ Aprobado |

### Ración y conversión alimenticia (RF09 · CU15, CU16)

Condición inicial: la común (lote de 100 cabezas; suplemento a $ 400/kg y silaje a $ 40/kg).

| ID | Funcionalidad | Condiciones iniciales | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|
| CP-52 | Definir la ración (CU15) | Común | 1,5 kg de suplemento y 15 kg de silaje por cabeza | 200; kg del día: 150 y 1.500 | Según lo esperado | ✅ Aprobado |
| CP-53 | Ración sugerida y carga en un envío (CU16) | Ración definida | El encargado envía la sugerida | Opciones con 100 cabezas y 2 insumos; 201 con costo $ 120.000 | Según lo esperado | ✅ Aprobado |
| CP-54 | Historial de la ración | Ración de 1,5 kg vigente | Cambio a 2 kg desde mañana; luego 0 kg | Hoy rige 1,5 kg con 2 registros de historial; con 0 kg el insumo sale de la ración | Según lo esperado | ✅ Aprobado |
| CP-55 | Permisos de la ración | Sesión de encargado | PUT de la ración | 403 | Según lo esperado | ✅ Aprobado |
| CP-56 | Conversión alimenticia | Silaje con 35 % MS | 2 días de 100 kg de silaje; pesada +1 kg | 70 kg MS / 100 kg ganados = 0,70 (por pesada y acumulada) | Según lo esperado | ✅ Aprobado |

### Protocolos sanitarios (RF10 · CU17, CU03)

Protocolo de prueba: clostridial (día 0), refuerzo (día 21) y control de garrapata (día 21, cada 21 días, 3 aplicaciones).

| ID | Funcionalidad | Condiciones iniciales | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|
| CP-57 | Crear un protocolo | Sesión de veterinario | Protocolo de prueba; luego como encargado | 201 con 3 ítems; el encargado: 403 | Según lo esperado | ✅ Aprobado |
| CP-58 | Único protocolo por defecto | Protocolo por defecto existente | Otro protocolo marcado por defecto | Solo el último queda por defecto | Según lo esperado | ✅ Aprobado |
| CP-59 | Validación de repeticiones | — | Ítem con 3 aplicaciones sin frecuencia | 400 | Según lo esperado | ✅ Aprobado |
| CP-60 | Alta de lote con protocolo (CU03 + CU17) | Protocolo de prueba | Lote que ingresa hoy | 5 eventos PENDIENTES en los días 0, 21, 21, 42 y 63 | Según lo esperado | ✅ Aprobado |
| CP-61 | Lote cargado con atraso | Protocolo de prueba | Lote que ingresó hace 30 días | Se omiten los eventos pasados: quedan 2 (días 42 y 63) | Según lo esperado | ✅ Aprobado |
| CP-62 | Atomicidad del alta | — | Lote con un protocolo inexistente | 404 y no se crea el lote | Según lo esperado | ✅ Aprobado |
| CP-63 | Aplicar a un lote existente | Lote sin eventos | Aplicar el protocolo de prueba | 201 con 5 eventos; los de hoy aparecen en las alertas | Según lo esperado | ✅ Aprobado |

### Proyección de stock (RF11 · CU18)

Condición inicial: la común (suplemento: 1.000 kg, mínimo 500 kg; silaje: 20.000 kg, mínimo 1.000 kg).

| ID | Funcionalidad | Condiciones iniciales | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|
| CP-64 | Proyección con ración | Ración de 1,5 kg de suplemento (150 kg/día) | GET /insumos | Cobertura 6 días; quiebre hoy + 6; compra sugerida 1.600 kg (150 × 14 + 500 − 1.000); alerta STOCK_PROYECTADO | Según lo esperado | ✅ Aprobado |
| CP-65 | Proyección sin ración | 2 cargas de 700 kg de silaje en los últimos 14 días | GET /insumos | Consumo 100 kg/día (1.400 / 14); cobertura 186 días; sin alerta | Según lo esperado | ✅ Aprobado |
| CP-66 | Cobertura mínima configurable | Ración de CP-64 | Cobertura mínima = 3 días | Sin cobertura baja ni alerta | Según lo esperado | ✅ Aprobado |

### Clima y riesgos (RF12 · CU19, CU14)

Clima simulado: máxima 34 °C, media 24 °C, humedad 80 % y sin lluvias en 30 días ni en el pronóstico.

| ID | Funcionalidad | Condiciones iniciales | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|
| CP-67 | Sin ubicación | Ubicación no configurada | GET /clima | `{configurado: false}` | Según lo esperado | ✅ Aprobado |
| CP-68 | Clima y riesgos | Ubicación configurada | GET /clima | Temperatura 28 °C; 7 días de pronóstico; garrapata alto, sequía alto, estrés térmico en emergencia | Según lo esperado | ✅ Aprobado |
| CP-69 | Alertas de clima por rol | Ídem | GET /alertas como admin y veterinario | Admin: estrés, garrapata y sequía; veterinario: estrés y garrapata | Según lo esperado | ✅ Aprobado |
| CP-70 | Garrapata con tratamiento reciente | Tratamiento hace 5 días | GET /alertas | Sin alerta de garrapata para ese lote | Según lo esperado | ✅ Aprobado |
| CP-71 | Servicio de clima caído | El servicio no responde | GET /clima y /alertas | `{disponible: false}`; las alertas responden 200 | Según lo esperado | ✅ Aprobado |

### Reportes (RF13 · CU20)

| ID | Funcionalidad | Condiciones iniciales | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|
| CP-72 | Informe de lote en PDF | "Lote Ñandú 1" con alimentación y pesada | GET informe.pdf | 200, `application/pdf`, archivo `informe-lote-nandu-1.pdf` que empieza con `%PDF` | Según lo esperado | ✅ Aprobado |
| CP-73 | Reporte mensual | Ídem | Mes actual; mes `2026-13` | PDF válido; 400 para el mes inválido | Según lo esperado | ✅ Aprobado |
| CP-74 | Planilla Excel | Ídem | GET planilla.xlsx | Hojas Lotes, Alimentación, Compras, Sanidad, Pesadas y Bajas; la fila de alimentación con 500 kg y $ 20.000 | Según lo esperado | ✅ Aprobado |
| CP-75 | Permisos de los reportes | — | Encargado y veterinario | 403 | Según lo esperado | ✅ Aprobado |

### Carga sin conexión (RF14, RNF07 · CU21)

| ID | Funcionalidad | Condiciones iniciales | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|
| CP-76 | Idempotencia del reenvío | Común | La misma `operacionId` dos veces (100 kg + 1.000 kg) | 201 y luego 200 `repetido`; 2 registros; stock de suplemento 900 kg (descontado una sola vez) | Según lo esperado | ✅ Aprobado |
| CP-77 | Fecha de captura | Común | Carga de ayer enviada hoy | Registro con la fecha de ayer | Según lo esperado | ✅ Aprobado |

### Pruebas end-to-end de la versión final (navegador)

Ejecutadas el 15/10/2026 sobre los datos de demostración recién cargados.

| ID | Funcionalidad | Condiciones iniciales | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|
| CP-78 | Ración en un toque (CU16, RNF01) | Encargado en 390 px; Lote 01 con ración | "Confirmar ración de hoy" | La tarjeta pasa a "Cargado hoy" en < 2 s | 1 toque; confirmación en **166 ms** | ✅ Aprobado |
| CP-79 | Otros kilos (CU16 alt.) | Lote 02 con ración | "Di otros kilos" → modificar → Confirmar | Formulario precargado; registro guardado | Según lo esperado | ✅ Aprobado |
| CP-80 | Alta de lote con protocolo (CU03) | Protocolo por defecto | Nuevo lote desde la interfaz | Aviso "Lote creado · N evento(s) sanitario(s) programado(s)" | Según lo esperado | ✅ Aprobado |
| CP-81 | Eliminar la última pesada (CU07) | Pesada recién registrada | Eliminar y confirmar en el diálogo | Diálogo de confirmación; la pesada desaparece | Según lo esperado | ✅ Aprobado |
| CP-82 | Descarga de reportes (CU20) | Sesión de administrador | Informe de lote y planilla | Descarga de `informe-lote-….pdf` y `ganadotrack-planilla-….xlsx` | Según lo esperado | ✅ Aprobado |
| CP-83 | Perfil y ruta inexistente | Sesión iniciada | "Mi perfil"; URL inexistente | Pantalla de perfil; página 404 con regreso al inicio | Según lo esperado | ✅ Aprobado |
| CP-84 | Carga sin conexión de punta a punta (CU21) | App de producción (*preview*) abierta con señal | Cortar la red, recargar, confirmar la ración; restablecer la red | Sin red, la app abre y la carga queda "En el teléfono"; al volver la señal se envía sola | *Service worker* activo; **2 registros** sincronizados, sin duplicados | ✅ Aprobado |
| CP-85 | Rendimiento del dashboard (RNF03) | 3 lotes activos, clima configurado | Abrir el dashboard | < 3 s | **≈ 1.070 ms** | ✅ Aprobado |

Las pruebas unitarias (42) verifican con valores calculados a mano cada fórmula documentada. Por ejemplo:
- GDP(380 → 395 kg en 30 días) = 0,5.
- Proyección de 395 a 420 kg con GDP 0,6 = 42 días (se redondea hacia arriba).
- El evento a exactamente 7 días genera alerta y el de 8 días no.
- ITH con 30 °C y 60 % de humedad = 79,8 (nivel peligro).
- La compra sugerida se redondea a múltiplos de 100 kg.
- Un ítem de protocolo "día 21, cada 21 días, 3 aplicaciones" genera los días 21, 42 y 63.

## 3. Incidencias detectadas y corregidas durante el desarrollo

| # | Incidencia | Detectada por | Corrección |
|---|---|---|---|
| 1 | La vista `v_resumen_lote` devolvía las cabezas como `bigint` (suma de enteros en PostgreSQL), que no se puede convertir a JSON | Prueba manual de la vista | Nueva migración que castea a `int` |
| 2 | Al editar un lote sin enviar "observaciones", el campo se borraba | Revisión de código | La validación distingue "no enviado" de "vacío" |
| 3 | Las reglas de React marcaban `setState` sincrónico en un efecto (riesgo de renders en cascada) | ESLint (react-hooks) | Se reescribió el hook `useCarga` |
| 4 | El gráfico de peso espaciaba las pesadas por igual aunque estuvieran separadas por distinta cantidad de días | Revisión de capturas E2E | Eje X temporal real |
| 5 | En la pantalla del encargado, el silaje aparecía antes que el suplemento, distinto al orden del CU04 | Revisión de capturas E2E | Orden por tipo |
| 6 | El paquete inicial del frontend pesaba más de 1 MB | Build de Vite | Carga diferida por pantalla: el encargado descarga ~180 kB comprimidos |
| 7 | Las reglas de caché del *service worker* no reconocían las rutas de la API: Workbox copia la función de filtro como texto y pierde las constantes definidas fuera de ella | E2E sin conexión (la app no abría los datos sin red) | La lista de rutas se escribió dentro de la propia función |
| 8 | En Windows, regenerar el cliente de Prisma fallaba (EPERM) mientras la API estaba corriendo, porque el archivo del motor estaba en uso | Al agregar la migración de la ración | Procedimiento documentado: detener la API, ejecutar `prisma generate` y volver a iniciarla |
| 9 | En las tablas de los PDF, cada fila ocupaba el doble de alto: pdfkit mueve el cursor al escribir cada celda | Revisión visual de los PDF generados | Las celdas se dibujan con una posición vertical fija por fila |
| 10 | El pie de página del PDF generaba páginas en blanco al escribirse dentro del margen inferior | Revisión visual de los PDF generados | Se anula el margen inferior al dibujar el pie |
| 11 | El recorrido E2E fallaba al buscar un texto que aparecía también en un subtítulo | Recorrido E2E | Búsqueda por texto exacto |
| 12 | Las rutas inexistentes de la API respondían 401 en lugar de 404, porque la autenticación de los reportes se aplicaba a todo `/api` | Revisión de la API | La autenticación se declara en cada ruta de reportes |
| 13 | El primer *build* de la PWA guardaba 3,1 MB en el teléfono (fuentes de alfabetos que no se usan y el logo en alta resolución) | Build de Vite | Se excluyeron esas fuentes y se generó un logo de 420 px: 1,9 MB |
| 14 | La CI en GitHub fallaba en la instalación: el *lockfile* no era válido para npm 10 (Node 22) y ESLint marcaba un script de Node | Primera ejecución de GitHub Actions | *Lockfile* regenerado para npm 10 y 11, Node 24 en CI y Render, *globals* de Node para los scripts (PR #30) |

## 4. Matriz de trazabilidad

| Requerimiento | Casos de uso | Endpoints | Pantalla | Pruebas |
|---|---|---|---|---|
| RF01 Gestión de lotes | CU03, CU13 | `POST/GET/PATCH /lotes`, `POST /lotes/:id/cierre` | Lotes, Detalle del lote | CP-19, 20, 21, 35, 36, 37, 43, 80 |
| RF02 Alimentación diaria | CU04 | `GET /alimentacion/opciones`, `POST /alimentacion` | Comida de hoy | CP-10–14, 16, 18, 39, 79 |
| RF03 Stock de insumos | CU05, CU06 | `GET/PATCH /insumos`, `POST/PUT /insumos/:id/compras` | Insumos y stock | CP-14, 15, 17, 18, 50 |
| RF04 Pesadas y GDP | CU07 | `POST/GET/DELETE /pesadas` | Detalle del lote · Pesadas | CP-22–26, 47, 81, unitarias de GDP/proyección |
| RF05 Sanidad y alertas | CU08, CU09, CU10, CU14 | `/sanidad/eventos…`, `/sanidad/bajas`, `/alertas` | Sanidad | CP-07, 28–34, 41, 48, 49, unitarias de alertas |
| RF06 Costos y rentabilidad | CU11 | `GET /costos/:id`, `PATCH /lotes/:id` | Detalle del lote · Costos | CP-27, 35, unitarias de costos |
| RF07 Dashboard | CU12 | `GET /dashboard` | Dashboard | CP-24, 42, 44, 85 |
| RF08 Usuarios y roles | CU01, CU02, CU22 | `/auth/*`, `/usuarios` | Login, Usuarios, Mi perfil | CP-01–09, 38, 40, 45, 46, 83 |
| RF09 Ración y conversión | CU15, CU16 | `/raciones`, `/lotes/:id/racion`, `GET /alimentacion/opciones`, `GET /pesadas` | Raciones, Comida de hoy, Detalle del lote | CP-52–56, 78, 79, unitarias de ración y conversión |
| RF10 Protocolos sanitarios | CU17, CU03 | `/protocolos`, `POST /lotes`, `/lotes/:id/aplicar-protocolo` | Protocolos, Nuevo lote, Detalle del lote | CP-57–63, 80, unitarias de protocolo |
| RF11 Proyección de stock | CU18, CU14 | `GET /insumos`, `/alertas`, `/parametros` | Insumos y stock | CP-64–66, unitarias de cobertura y compra |
| RF12 Clima y riesgos | CU19, CU14 | `/clima`, `/clima/ubicacion`, `/clima/buscar`, `/alertas` | Dashboard, Configuración, barra superior | CP-67–71, unitarias de riesgos |
| RF13 Reportes | CU20 | `/reportes/*` | Reportes, Detalle del lote | CP-72–75, 82 |
| RF14 App instalable y sin conexión | CU21 | `POST /alimentacion` (`operacionId`, `fecha`) | Comida de hoy | CP-76, 77, 84, pruebas de la cola (frontend) |
| RNF01 Usabilidad | CU04, CU16 | — | Comida de hoy | CP-39, 44, 78 |
| RNF03 Rendimiento | CU04, CU12 | — | — | CP-39, 42, 78, 85 |
| RNF04 Seguridad | CU01 | todos | — | CP-01–09, 46, 55, 75 |
| RNF07 Operación sin conexión | CU21 | `POST /alimentacion` | Comida de hoy | CP-76, 77, 84 |

## 5. Pruebas de aceptación con el productor

El productor no tiene disponibilidad para una reunión antes de la entrega, así que la validación se hace por **WhatsApp**. Se le envían tres videos de demostración (encargado en el celular, productor y veterinario), generados automáticamente con Playwright, y un acceso de prueba a la aplicación publicada. Además, se le pide responder un cuestionario de 8 preguntas. El mensaje, el cuestionario y el acta están en [`docs/entregas/validacion-productor.md`](../entregas/validacion-productor.md).

Criterios de aceptación:

- [ ] El encargado puede cargar la alimentación del día desde su celular sin ayuda.
- [ ] El veterinario encuentra los eventos pendientes y registra un tratamiento de garrapata.
- [ ] El productor entiende el costo por kg de carne y el margen de cada lote.
- [ ] Las alertas (evento vencido, stock bajo o por agotarse, GDP baja, clima) son claras y útiles.
- [ ] Los valores de referencia son correctos o quedaron ajustados: GDP objetivo, ración, rendimiento 57 %, precios de los insumos y protocolo sanitario.

*(Completar con el acta de validación una vez recibidas las respuestas.)*

## 6. Análisis de resultados y mejoras identificadas

- Todas las funcionalidades pasan sus pruebas: 118 automatizadas y 18 pasos E2E. Las reglas críticas están cubiertas por pruebas automáticas y además protegidas en la base de datos: atomicidad del stock, bloqueo de lotes cerrados, permisos por rol, alta de lote con su protocolo e idempotencia de la carga sin conexión.
- Las mejoras identificadas en la 2ª entrega se incorporaron:
  - La cobertura se mide en CI.
  - El frontend tiene sus primeras pruebas automatizadas (la cola sin conexión).
  - El E2E prueba la pérdida de conexión.
- Las pruebas de integración del clima no dependen de internet: los riesgos se verifican con datos simulados. El funcionamiento con el servicio real se comprobó manualmente con la ubicación de demostración.
- **Mejoras pendientes:**
  - Pruebas de componentes React (Testing Library) para las pantallas.
  - Ejecutar los recorridos E2E dentro del pipeline de CI.
  - Pruebas con conexión lenta (simulando la red del campo) y en celulares de gama baja.
