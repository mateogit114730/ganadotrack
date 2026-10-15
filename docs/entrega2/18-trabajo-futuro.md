# 18. Trabajo futuro

Funcionalidades que quedaron fuera del MVP (ver Límites) y mejoras detectadas durante el desarrollo, ordenadas por prioridad.

## Corto plazo (versión 1.1.3.x)

| Mejora | Motivo |
|---|---|
| **Notificaciones fuera del sistema** (email o WhatsApp) para alertas sanitarias vencidas o próximas | Hoy las alertas se ven al entrar al sistema; el veterinario y el productor se comunican por WhatsApp (relevamiento) |
| **Otros gastos por lote** (energía, combustible, mano de obra) | Pedido del productor en el Bloque 8 que no entró en el MVP; mejora la precisión del costo por kg |
| **Valor del animal al ingreso** (costo de cría/recría) | Para pasar del margen de engorde al margen real del ciclo |
| **Reportes exportables** (PDF/Excel) de lotes cerrados | Para compartir con el contador |
| **Ración definida por lote** (kg por cabeza/día) con carga sugerida | Agiliza aún más la carga del encargado |

## Mediano plazo (versión 1.3.x.x)

| Mejora | Motivo |
|---|---|
| **Modo offline / PWA**: carga sin conexión y sincronización posterior | Zonas del campo sin señal; hoy depende de Starlink |
| **Identificación individual por caravana** | El productor está en transición hacia la caravana (Bloque 2) |
| **Conversión alimenticia** (kg de alimento / kg ganado) | Indicador que el productor ya controla en el feedlot |

## Largo plazo (versión 2.x)

| Mejora | Motivo |
|---|---|
| **Ciclo completo**: cría, parición, recría, pastoreo y control de nacimientos | Necesidades 1 y 2 del Bloque 7 (nacimientos, cantidad de vacas por lote) |
| **Integración con SENASA** (SIGSA) | Evitar la doble carga de la trazabilidad oficial |
| **Planificación ante sequía**: proyección de consumo de silaje y compras de emergencia | Problema de abastecimiento relevado en el Bloque 3 |
| **Multiestablecimiento** (varios productores en la misma plataforma) | Modelo de negocio con suscripción (el productor valoró pagar ≈ $ 100.000/mes) |

## Mejoras técnicas

- Pruebas de componentes React (Testing Library) y recorrido E2E dentro del pipeline de CI.
- Monitoreo y logs centralizados en producción.
- Respaldos automáticos programados con política de retención.
- Auditoría completa de cambios (quién modificó qué y cuándo) en las ediciones y eliminaciones.
