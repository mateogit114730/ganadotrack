# Documentación de GanadoTrack – entrega final

Contenido para el documento de entrega (Word). Cada archivo corresponde a una sección del índice; la documentación refleja el **sistema terminado** (versión 1.1.x), no solo el MVP.

| Sección | Archivo | Qué hacer en el Word |
|---|---|---|
| — | [entrega2/00-correcciones.md](entrega2/00-correcciones.md) | Aplicar las 14 correcciones a las secciones 1–13 y al Anexo I |
| 3. Link a código / aplicación | [entrega2/03-link.md](entrega2/03-link.md) | Reemplazar "PENDIENTE" |
| 6, 7, 8, 10, 11. Objetivos, límites, alcance y requerimientos | [entrega2/10-alcance-y-requerimientos.md](entrega2/10-alcance-y-requerimientos.md) | Agregar los objetivos 6.9–6.14, actualizar Límites y Alcance, agregar RF09–RF14, las ampliaciones y RNF07 |
| 13. Casos de uso | [entrega2/13-casos-de-uso.md](entrega2/13-casos-de-uso.md) | Reemplazar la sección: lista unificada (CU01–CU22), diagrama y fichas |
| 14. Cronograma del trabajo | [entrega2/14-cronograma.md](entrega2/14-cronograma.md) | Reemplazar "PENDIENTE" (Gantt como imagen) |
| 15. Herramientas de arquitectura y desarrollo | [entrega2/15-arquitectura-y-herramientas.md](entrega2/15-arquitectura-y-herramientas.md) | Reemplazar "PENDIENTE" |
| 16. Seguimiento del proyecto | [entrega2/16-seguimiento.md](entrega2/16-seguimiento.md) | Reemplazar "PENDIENTE" y agregar las capturas de GitHub |
| 17. Resultados obtenidos | [entrega2/17-resultados.md](entrega2/17-resultados.md) | Reemplazar "PENDIENTE" |
| 18. Trabajo futuro | [entrega2/18-trabajo-futuro.md](entrega2/18-trabajo-futuro.md) | Reemplazar "PENDIENTE" |
| Nueva: Modelo de datos | [entrega2/modelo-de-datos.md](entrega2/modelo-de-datos.md) | Nueva sección (requerida por la guía, punto 4); reemplaza la figura del ER |
| Nueva: Descripción de la API | [entrega2/api.md](entrega2/api.md) | Nueva sección o anexo |
| Nueva: Pruebas | [entrega2/pruebas.md](entrega2/pruebas.md) | Nueva sección (guía, punto 7) |
| Anexo: Manual de instalación | [entrega2/manual-instalacion.md](entrega2/manual-instalacion.md) | Nuevo anexo |
| Anexo: Manual de usuario | [entrega2/manual-usuario.md](entrega2/manual-usuario.md) | Nuevo anexo, con las capturas de `capturas/` |
| Anexo: Acta de validación | [entregas/validacion-productor.md](entregas/validacion-productor.md) | Nuevo anexo, con las respuestas del productor |

**Diagramas:** `diagramas/` contiene los 10 diagramas en PNG, generados con `node render-diagramas.mjs` (en `e2e/`) a partir de los bloques ```mermaid``` y PlantUML de la documentación, con los colores del sistema. Si se modifica un diagrama en el Markdown, volver a ejecutar el script.

**Capturas de GitHub:** `capturas/github/` (tablero, milestones, issues, commits, Actions, tags y *pull request*), generadas con `node capturas-github.mjs` (en `e2e/`).

**Capturas:** `capturas/` contiene las pantallas del sistema, generadas automáticamente por los recorridos E2E (`e2e/recorrido.mjs` y `e2e/offline.mjs`).

**Entregables y material de trabajo:** `entregas/` contiene la lista de pendientes, la guía de publicación, el material de validación con el productor (mensaje, cuestionario, acta y videos) y, al final, el documento Word/PDF y la presentación.
