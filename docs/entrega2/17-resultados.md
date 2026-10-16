# 17. Resultados obtenidos hasta la fecha

## 17.1 Producto desarrollado

GanadoTrack pasó de MVP a **sistema terminado**: una aplicación web instalable que cubre los **14 requerimientos funcionales** y los **22 casos de uso**, con frontend, backend y base de datos integrados, pruebas automatizadas y la configuración para publicarla en internet.

| Módulo | Requerimiento | Estado | Funcionalidad implementada |
|---|---|---|---|
| Gestión de lotes | RF01 | ✅ | Alta con validaciones y protocolo sanitario, días en feedlot, edición, cierre con resumen final previo, historial de lotes cerrados |
| Alimentación diaria | RF02 | ✅ | Pantalla para celular, costo diario automático, acumulado por lote, corrección de errores |
| Stock de insumos | RF03 | ✅ | Stock en kg (silaje mostrado en toneladas), descuento automático, compras y su corrección, alerta de mínimo |
| Pesadas y GDP | RF04 | ✅ | GDP automática, proyección de la fecha de llegada, alerta de GDP baja, gráfico de evolución, eliminación de la última pesada |
| Sanidad y alertas | RF05 | ✅ | Calendario por lote, alerta 7 días antes y de vencidos, garrapata con reprogramación automática, reprogramación de eventos, bajas por causa, costo sanitario |
| Costos y rentabilidad | RF06 | ✅ | Costo acumulado, costo por kg de carne (57 %, descontando bajas), precio de venta y margen bruto |
| Dashboard | RF07 | ✅ | Lotes activos con indicadores, panel de alertas agrupadas, resumen financiero, clima y stock |
| Usuarios y roles | RF08 | ✅ | 3 roles con acceso restringido en el servidor, gestión de usuarios, perfil propio, sesión de 8 h |
| **Ración y conversión** | **RF09** | ✅ | Ración por cabeza con historial, **carga en un toque**, conversión alimenticia en materia seca |
| **Protocolos sanitarios** | **RF10** | ✅ | Editor de protocolos; el calendario de cada tropa se arma solo al crear el lote |
| **Proyección de stock** | **RF11** | ✅ | Días de cobertura, fecha de quiebre, compra sugerida, alerta anticipada y gráfico a 30 días |
| **Clima y riesgos** | **RF12** | ✅ | Pronóstico de la localidad configurada, índice de estrés térmico, riesgo de garrapata y de sequía, alertas |
| **Reportes** | **RF13** | ✅ | Informe de lote y de cierre en PDF, reporte mensual en PDF y planilla Excel para el contador |
| **App instalable y sin conexión** | **RF14** | ✅ | Instalación en el celular; carga sin señal con envío automático y sin duplicados |

Además del alcance funcional, se rediseñó toda la interfaz con el estilo **"Campo cálido"**:
- La paleta y la tipografía acompañan al logo.
- Hay ilustraciones propias (paisaje, alambrado, silueta Angus).
- La pantalla del encargado tiene botones grandes y un modo de alto contraste para usar a pleno sol.

## 17.2 Cumplimiento de los requerimientos no funcionales

| RNF | Exigencia | Resultado medido |
|---|---|---|
| RNF01 Usabilidad | Encargado: ≤ 3 clics desde el login; uso en el celular | **1 toque** por lote con la ración definida ("Confirmar ración de hoy"); probado en una pantalla de 390 px |
| RNF02 Disponibilidad | ≥ 95 % | Plataformas gestionadas con HTTPS (Vercel, Render, Neon); la carga del encargado funciona sin señal; si el servicio de clima falla, el resto sigue funcionando |
| RNF03 Rendimiento | Dashboard < 3 s; registro < 2 s | Dashboard ≈ 1,1 s; confirmación de la ración ≈ 0,17 s |
| RNF04 Seguridad | bcrypt, 8 h, RBAC, HTTPS | bcrypt ✅, expiración por inactividad ✅, RBAC en el servidor ✅ (pruebas en cada módulo), HTTPS en el despliegue ✅ |
| RNF05 Escalabilidad | Agregar módulos sin rediseño | Se agregaron 3 módulos nuevos (ración, protocolos, clima) con la misma arquitectura; todas las migraciones fueron aditivas |
| RNF06 Mantenibilidad | Cálculos comentados, estructura estándar | ✅ Funciones de cálculo puras y documentadas; ESLint; CI con cobertura del 88 % |
| RNF07 Operación sin conexión | Carga sin señal, sin duplicados | ✅ Cola local + identificador de operación; probado de punta a punta (CP-84) |

## 17.3 Métricas del proyecto

| Métrica | MVP (2ª entrega) | Versión final |
|---|---|---|
| Pruebas automatizadas | 58 | **118** (42 unitarias + 70 de integración + 6 del frontend), **100 % aprobadas** |
| Cobertura de líneas del backend | No medida | **88 %** (servicios de dominio: 98 %) |
| Recorridos end-to-end | 10 pasos | 15 pasos con los 3 roles + 3 pasos del modo sin conexión, sin errores |
| Operaciones de la API | 34 | **54** (41 rutas), documentadas en OpenAPI/Swagger |
| Tablas / vistas / triggers | 9 / 1 / 3 | **12** / 1 / 3 |
| Restricciones CHECK / índices | 19 / — | 25 / 16 (incluido un índice único parcial) |
| Pantallas | 9 | **14** |
| Casos de uso | 14 | **22** |
| Issues / commits / tags | — | 29 issues, 7 milestones, 5 tags, CI en verde en `main` y `develop` |
| Líneas de código (backend + frontend, sin pruebas) | — | ≈ 7.500 |

## 17.4 Respuesta a los problemas del relevamiento

| Problema relevado | Respuesta de GanadoTrack |
|---|---|
| **Pain point #1:** el productor no conoce su costo de producción por kg de carne | Costo de engorde por kg y margen calculados automáticamente para cada lote, actualizados con cada carga diaria. También se pueden descargar en PDF |
| **Pain point #2:** 26 vacas muertas por falta de control sanitario (anaplasmosis) | Calendario sanitario armado **automáticamente** al ingresar cada tropa, alertas 7 días antes y de vencidos, reprogramación automática del control de garrapata y **alerta de riesgo de garrapata** según el clima en los lotes sin tratamiento reciente |
| Registros en papel o verbales | Toda la operación queda registrada, con fecha y usuario responsable; el encargado carga en un toque desde el celular, incluso sin señal |
| Pesadas anotadas sin análisis | GDP automática, comparación con el objetivo, fecha estimada de venta y conversión alimenticia |
| Problemas de abastecimiento en sequía (Bloque 3) | Proyección de cuántos días alcanza cada insumo, compra sugerida y alerta de riesgo de sequía |
| Veterinario comunicado solo por WhatsApp | El veterinario carga los eventos, define los protocolos y la ración directamente en el sistema |
| Información para el contador | Planilla Excel con una hoja por tipo de dato |

## 17.5 Conclusiones

- El sistema resuelve las dos necesidades principales del productor: conocer el costo por kg de carne y no perder el control sanitario. Las funcionalidades agregadas atacan la causa del problema sanitario relevado: el calendario se arma solo y el clima anticipa el riesgo de garrapata.
- Separar la lógica de cálculo en funciones puras permitió verificarla con pruebas automáticas (98 % de cobertura en los servicios de dominio), lo que da confianza en los números que el productor usará para decidir.
- Las reglas críticas se protegen en dos niveles (API y base de datos), de modo que un error de la aplicación no puede dejar el stock o los costos inconsistentes. La carga sin conexión mantiene esa garantía gracias a la idempotencia.
- La arquitectura en capas por módulo permitió sumar seis funcionalidades nuevas (tres de ellas como módulos nuevos) sin rediseñar lo existente, como se había previsto en RNF05.
- **Pendientes antes de la entrega:**
  - Publicar la aplicación online.
  - Validar el sistema con el productor (envío el 29/10) y confirmar con él el valor de GDP objetivo relevado.
  - Generar el documento final y la presentación.
