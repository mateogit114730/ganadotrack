# Estrategia de pruebas y validación

## 1. Estrategia

| Tipo de prueba | Qué verifica | Herramienta | Cantidad | Ubicación |
|---|---|---|---|---|
| **De componente (unitarias)** | Funciones de cálculo puras: GDP, proyección, cabezas, kg de carne, costo por kg, margen, clasificación de alertas | Vitest | 21 | `backend/tests/unit/` |
| **De integración** | API + reglas de negocio + base de datos real (PostgreSQL de prueba): autenticación, roles, transacciones, triggers | Vitest + Supertest | 37 | `backend/tests/integration/` |
| **Funcionales end-to-end** | Recorrido completo en el navegador con los 3 roles, en escritorio y celular | Playwright (Microsoft Edge) | 10 pasos | `e2e/recorrido.mjs` |
| **De aceptación** | Validación con el productor sobre los datos de demostración | Manual, con checklist | Pendiente | Sección 5 |

**Proceso:**
1. Las pruebas unitarias e integración se ejecutan con `npm test` en `backend/`.
2. **GitHub Actions** las ejecuta automáticamente en cada *push* y *pull request*; una rama no se integra a `develop` si alguna falla.
3. Las pruebas de integración usan una base separada (`ganadotrack_test`) que se vacía antes de cada grupo de pruebas, de modo que son repetibles y no afectan los datos de desarrollo.
4. El recorrido E2E se ejecuta antes de cada entrega y genera las capturas del manual de usuario (`docs/capturas/`).

**Resultado de la última ejecución (08/10/2026):** 58 de 58 pruebas automatizadas aprobadas · recorrido E2E completo sin errores.

```
 Test Files  6 passed (6)
      Tests  58 passed (58)
```

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

Las pruebas unitarias (21) verifican con valores calculados a mano cada fórmula documentada. Por ejemplo, GDP(380 → 395 kg en 30 días) = 0,5; proyección de 395 a 420 kg con GDP 0,6 = 42 días (se redondea hacia arriba); el evento a exactamente 7 días genera alerta y el de 8 días no.

## 3. Incidencias detectadas y corregidas durante el desarrollo

| # | Incidencia | Detectada por | Corrección |
|---|---|---|---|
| 1 | La vista `v_resumen_lote` devolvía las cabezas como `bigint` (suma de enteros en PostgreSQL), que no se puede convertir a JSON | Prueba manual de la vista | Nueva migración que castea a `int` |
| 2 | Al editar un lote sin enviar "observaciones", el campo se borraba | Revisión de código | La validación distingue "no enviado" de "vacío" |
| 3 | Las reglas de React marcaban `setState` sincrónico en un efecto (riesgo de renders en cascada) | ESLint (react-hooks) | Se reescribió el hook `useCarga` |
| 4 | El gráfico de peso espaciaba las pesadas por igual aunque estuvieran separadas por distinta cantidad de días | Revisión de capturas E2E | Eje X temporal real |
| 5 | En la pantalla del encargado, el silaje aparecía antes que el suplemento, distinto al orden del CU04 | Revisión de capturas E2E | Orden por tipo |
| 6 | El paquete inicial del frontend pesaba más de 1 MB | Build de Vite | Carga diferida por pantalla: el encargado descarga ~180 kB comprimidos |

## 4. Matriz de trazabilidad

| Requerimiento | Casos de uso | Endpoints | Pantalla | Pruebas |
|---|---|---|---|---|
| RF01 Gestión de lotes | CU03, CU13 | `POST/GET/PATCH /lotes`, `POST /lotes/:id/cierre` | Lotes, Detalle del lote | CP-19, 20, 21, 35, 36, 37, 43 |
| RF02 Alimentación diaria | CU04 | `GET /alimentacion/opciones`, `POST /alimentacion` | Cargar alimentación | CP-10–14, 16, 18, 39 |
| RF03 Stock de insumos | CU05, CU06 | `GET/PATCH /insumos`, `POST /insumos/:id/compras` | Insumos y stock | CP-14, 15, 17, 18 |
| RF04 Pesadas y GDP | CU07 | `POST/GET /pesadas` | Detalle del lote · Pesadas | CP-22–26, unitarias de GDP/proyección |
| RF05 Sanidad y alertas | CU08, CU09, CU10, CU14 | `/sanidad/eventos…`, `/sanidad/bajas`, `/alertas` | Sanidad | CP-07, 28–34, 41, unitarias de alertas |
| RF06 Costos y rentabilidad | CU11 | `GET /costos/:id`, `PATCH /lotes/:id` | Detalle del lote · Costos | CP-27, 35, unitarias de costos |
| RF07 Dashboard | CU12 | `GET /dashboard` | Dashboard | CP-24, 42, 44 |
| RF08 Usuarios y roles | CU01, CU02 | `/auth/*`, `/usuarios` | Login, Usuarios | CP-01–09, 38, 40 |
| RNF01 Usabilidad | CU04 | — | Cargar alimentación | CP-39, 44 |
| RNF03 Rendimiento | CU04, CU12 | — | — | CP-39, 42 |
| RNF04 Seguridad | CU01 | todos | — | CP-01–09 |

## 5. Pruebas de aceptación (pendientes con el productor)

Checklist a validar con el productor usando los datos de demostración:

- [ ] El encargado puede cargar la alimentación del día desde su celular sin ayuda.
- [ ] El veterinario encuentra los eventos pendientes y registra un tratamiento de garrapata.
- [ ] El productor entiende el costo por kg de carne y el margen de cada lote.
- [ ] Las alertas (evento vencido, stock bajo, GDP baja) son claras y útiles.
- [ ] Los valores de referencia son correctos: GDP objetivo, rendimiento 57 %, precios de los insumos.

## 6. Análisis de resultados y mejoras identificadas

- Todas las funcionalidades del MVP pasan sus pruebas. Las reglas críticas (atomicidad del stock, bloqueo de lotes cerrados, permisos por rol) están cubiertas por pruebas automáticas y además protegidas en la base de datos.
- **Mejoras identificadas:**
  - Agregar pruebas unitarias de componentes React (por ejemplo, con Testing Library).
  - Incorporar el recorrido E2E al pipeline de CI.
  - Medir la cobertura en CI (`npm run test:coverage`).
  - Probar con conexión lenta, simulando la red del campo.
