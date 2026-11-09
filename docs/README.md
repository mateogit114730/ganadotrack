# Documentación de GanadoTrack – entrega final

La documentación refleja el **sistema terminado** (versión `ganadotrack-1.1.1.1`).

## Entregables (`entregas/`)

| Archivo | Contenido |
|---|---|
| `GanadoTrack_EntregaFinal.docx` y `.pdf` | Documento final: secciones 1 a 21 y anexos I a V, con índice y figuras y tablas numeradas |
| `GanadoTrack_Defensa.pptx` y `.pdf` | Presentación de la defensa (17 diapositivas, con notas del orador) |
| `guion-defensa.md` | Guion de la demo en vivo y respuestas a las preguntas probables |
| `video-demo/` | Videos de demostración por rol (plan B de la demo) |
| `validacion-productor.md` | Mensaje, cuestionario y acta para la validación con el productor (pendiente) |

## Cómo se arma el documento

Cada sección se escribe en Markdown en `entrega2/`. Para regenerar el documento después de un cambio:

```bash
cd docs/entregas && python ensamblar.py          # une las secciones en GanadoTrack_EntregaFinal.md
cd ../../e2e && node render-diagramas.mjs        # solo si cambió un diagrama Mermaid o PlantUML
node generar-docx.mjs                            # Markdown → Word
powershell -ExecutionPolicy Bypass -File actualizar-docx.ps1   # índice y PDF (requiere Microsoft Word)
node generar-presentacion.mjs                    # presentación (y exportar-pptx.ps1 para el PDF)
```

## Secciones (`entrega2/`)

| Sección del documento | Archivo |
|---|---|
| 1–12. Análisis y definición del sistema | [01-analisis-y-definicion.md](entrega2/01-analisis-y-definicion.md) (incluye 03-link.md y partes de 10-alcance-y-requerimientos.md) |
| 13. Casos de uso | [13-casos-de-uso.md](entrega2/13-casos-de-uso.md) |
| 14. Arquitectura y herramientas | [15-arquitectura-y-herramientas.md](entrega2/15-arquitectura-y-herramientas.md) |
| 15. Modelo de datos | [modelo-de-datos.md](entrega2/modelo-de-datos.md) |
| 16. Módulos implementados | [17-modulos.md](entrega2/17-modulos.md) |
| 17. Descripción de la API | [api.md](entrega2/api.md) |
| 18. Estrategia de pruebas y validación | [pruebas.md](entrega2/pruebas.md) |
| 19. Seguimiento del proyecto | [16-seguimiento.md](entrega2/16-seguimiento.md) |
| 20. Resultados obtenidos y conclusiones | [17-resultados.md](entrega2/17-resultados.md) |
| 21. Trabajo futuro | [18-trabajo-futuro.md](entrega2/18-trabajo-futuro.md) |
| Anexo I: Relevamiento | [anexo-relevamiento.md](entrega2/anexo-relevamiento.md) |
| Anexo II: Manual de instalación | [manual-instalacion.md](entrega2/manual-instalacion.md) |
| Anexo III: Manual de usuario | [manual-usuario.md](entrega2/manual-usuario.md) |
| Anexo IV: Material de validación | [entregas/validacion-productor.md](entregas/validacion-productor.md) (cuestionario) |
| Anexo V: Correcciones a la 1ª entrega | [anexo-correcciones.md](entrega2/anexo-correcciones.md) (detalle en [00-correcciones.md](entrega2/00-correcciones.md)) |

Los archivos `15`, `16`, `17` y `18` conservan el número de la sección de la 1ª entrega; en el documento final pasan a ser las secciones 14, 19, 20 y 21. El cronograma (`14-cronograma.md`) se conserva en el repositorio pero no forma parte del documento final.

**Diagramas:** `diagramas/` contiene los diagramas en PNG, generados con `e2e/render-diagramas.mjs` a partir de los bloques Mermaid y PlantUML de la documentación, más los BPMN 3 y 4 de la 1ª entrega.

**Capturas:** `capturas/` contiene las pantallas del sistema, generadas por los recorridos E2E (`e2e/recorrido.mjs` y `e2e/offline.mjs`), y `capturas/github/` las de GitHub (`e2e/capturas-github.mjs`).
