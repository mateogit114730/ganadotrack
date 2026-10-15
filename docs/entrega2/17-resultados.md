# 17. Resultados obtenidos hasta la fecha

## 17.1 Producto desarrollado

Se implementó la versión MVP de GanadoTrack: una aplicación web funcional que cubre los **8 requerimientos funcionales** y los **14 casos de uso** definidos, con frontend, backend y base de datos integrados.

| Módulo | Requerimiento | Estado | Funcionalidad implementada |
|---|---|---|---|
| Gestión de lotes | RF01 | ✅ | Alta con validaciones, días en feedlot, edición, cierre con resumen final previo, historial de lotes cerrados |
| Alimentación diaria | RF02 | ✅ | Pantalla para celular en 3 pasos, costo diario automático, acumulado por lote, corrección de errores |
| Stock de insumos | RF03 | ✅ | Stock en kg (silaje mostrado en toneladas), descuento automático, compras, alerta de mínimo |
| Pesadas y GDP | RF04 | ✅ | GDP automática, proyección de la fecha de llegada, alerta de GDP baja, gráfico de evolución |
| Sanidad y alertas | RF05 | ✅ | Calendario por lote, alerta 7 días antes y de vencidos, garrapata con reprogramación automática, bajas por causa, costo sanitario |
| Costos y rentabilidad | RF06 | ✅ | Costo acumulado, costo por kg de carne (57 %, descontando bajas), precio de venta y margen bruto |
| Dashboard | RF07 | ✅ | Lotes activos con indicadores, panel de alertas, resumen financiero, stock |
| Usuarios y roles | RF08 | ✅ | 3 roles con acceso restringido en el servidor, gestión de usuarios, sesión de 8 h |

## 17.2 Cumplimiento de los requerimientos no funcionales

| RNF | Exigencia | Resultado medido |
|---|---|---|
| RNF01 Usabilidad | Encargado: ≤ 3 clics desde el login; uso en el celular | 2 clics (elegir lote + Confirmar) más el ingreso de los kg; probado en una pantalla de 390 px |
| RNF02 Disponibilidad | ≥ 95 % | Depende de la plataforma de despliegue (pendiente) |
| RNF03 Rendimiento | Dashboard < 3 s; registro < 2 s | Dashboard ≈ 1 s; registro ≈ 0,13 s |
| RNF04 Seguridad | bcrypt, 8 h, RBAC, HTTPS | bcrypt ✅, expiración por inactividad ✅, RBAC en el servidor ✅ (9 pruebas), HTTPS en el despliegue |
| RNF05 Escalabilidad | Agregar módulos sin rediseño | Arquitectura modular por dominio |
| RNF06 Mantenibilidad | Cálculos comentados, estructura estándar | ✅ `calculos.js` documentado; estructura React/Node estándar; ESLint y CI |

## 17.3 Métricas del proyecto

| Métrica | Valor |
|---|---|
| Pruebas automatizadas | 58 (21 unitarias + 37 de integración), **100 % aprobadas** |
| Recorrido end-to-end | 10 pasos con los 3 roles, sin errores |
| Endpoints de la API | 34 (33 de negocio + estado), documentados en OpenAPI/Swagger |
| Tablas / vistas / triggers | 9 / 1 / 3 |
| Restricciones CHECK | 19 |
| Pantallas | 9 (login + 6 del administrador + 1 del encargado + 1 de sanidad) |

## 17.4 Respuesta a los problemas del relevamiento

| Problema relevado | Respuesta de GanadoTrack |
|---|---|
| **Pain point #1:** el productor no conoce su costo de producción por kg de carne | Costo de engorde por kg y margen calculados automáticamente para cada lote, actualizados con cada carga diaria |
| **Pain point #2:** 26 vacas muertas por falta de control sanitario (anaplasmosis) | Calendario sanitario con alertas 7 días antes, alertas de eventos vencidos y reprogramación automática del control de garrapata al terminar cada tratamiento |
| Registros en papel o verbales | Toda la operación queda registrada, con fecha y usuario responsable |
| Pesadas anotadas sin análisis | GDP automática, comparación con el objetivo y fecha estimada de venta |
| Veterinario comunicado solo por WhatsApp | El veterinario carga los eventos directamente en el sistema |

## 17.5 Conclusiones

- El MVP resuelve las dos necesidades principales del productor: conocer el costo por kg de carne y no perder el control sanitario. Todo el sistema funciona con datos reales de la operación: Angus, 380 → 420 kg, rendimiento 57 %.
- Separar la lógica de cálculo en funciones puras permitió verificarla con pruebas automáticas, lo que da confianza en los números que el productor usará para decidir.
- Las reglas críticas se protegen en dos niveles (API y base de datos), de modo que un error de la aplicación no puede dejar el stock o los costos inconsistentes.
- **Pendientes antes de la entrega:** validar el sistema con el productor (pruebas de aceptación), confirmar el valor de GDP objetivo relevado, publicar el repositorio en GitHub y definir el despliegue con la docente.
