# 18. Trabajo futuro

Funcionalidades que quedaron fuera de la versión final (ver Límites) y mejoras detectadas durante el desarrollo, ordenadas por prioridad.

Varias mejoras previstas en la 2ª entrega se incorporaron a la versión final y ya no figuran en esta lista:
- Reportes PDF/Excel (RF13).
- Ración por lote con carga sugerida (RF09).
- Modo sin conexión / PWA (RF14).
- Conversión alimenticia (RF09).
- Planificación ante sequía (RF11 y RF12).

## Corto plazo (versión 1.1.3.x)

| Mejora | Motivo |
|---|---|
| **Costos completos:** valor del animal al ingreso (costo de cría/recría) y otros gastos por lote (energía, combustible, mano de obra, arrendamiento) | Hoy el margen es el **de engorde** y por eso resulta alto. Con estos costos se obtiene el margen real del ciclo. También era un pedido del productor (Bloque 8) |
| **Notificaciones fuera del sistema** (notificaciones *push* de la PWA, email o WhatsApp) para alertas sanitarias vencidas o próximas, stock por agotarse y riesgos de clima | Hoy las alertas se ven al entrar al sistema; el veterinario y el productor se comunican por WhatsApp (relevamiento) |
| **Ajustes surgidos de la validación con el productor** | *(Completar con el acta de validación.)* |

## Mediano plazo (versión 1.3.x.x)

| Mejora | Motivo |
|---|---|
| **Más pantallas sin conexión** (sanidad y pesadas en la manga) | Hoy solo la carga de alimentación funciona sin señal; el veterinario también trabaja en el corral |
| **Identificación individual por caravana** | El productor está en transición hacia la caravana (Bloque 2) |
| **Ración por fórmula** (porcentajes de la dieta y ajuste automático por peso) | Hoy la ración se define en kg por cabeza; con el peso promedio se podría calcular según el consumo esperado (% del peso vivo) |
| **Historial de precios de los insumos** y comparación entre lotes | Analizar cómo influye el precio del suplemento en el costo por kg |

## Largo plazo (versión 2.x)

| Mejora | Motivo |
|---|---|
| **Ciclo completo**: cría, parición, recría, pastoreo y control de nacimientos | Necesidades 1 y 2 del Bloque 7 (nacimientos, cantidad de vacas por lote) |
| **Integración con SENASA** (SIGSA) | Evitar la doble carga de la trazabilidad oficial |
| **Multiestablecimiento** (varios productores en la misma plataforma) | Modelo de negocio con suscripción (el productor valoró pagar ≈ $ 100.000/mes) |
| **Aplicación nativa** o integración con balanzas electrónicas | Cargar las pesadas directamente desde la balanza |

## Mejoras técnicas

- Pruebas de componentes React (Testing Library) y recorridos E2E dentro del pipeline de CI.
- Plan pago o servidor propio para evitar la demora de la primera visita (el plan gratuito "duerme" la API).
- Monitoreo y logs centralizados en producción.
- Respaldos automáticos programados con política de retención, además del historial de Neon.
- Auditoría completa de cambios (quién modificó qué y cuándo) en las ediciones y eliminaciones.
- Recuperación de contraseña por email, sin intervención del administrador.
