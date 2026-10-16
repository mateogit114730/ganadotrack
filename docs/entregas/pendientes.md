# Pendientes para la entrega del 05/11/2026

Estado al 15/10/2026: el sistema está completo y probado (F1 a F3). Falta publicarlo, validarlo con el productor y cerrar la documentación.

👤 = lo hace Mateo · 🤖 = lo hace Claude · 👥 = Mateo da el visto bueno o confirma

---

## Prioridad 1 – Bloqueantes (hacer primero: lo demás depende de esto)

### 1. ✅ Habilitar GitHub — *hecho el 15/10*
1. En PowerShell: `winget install GitHub.cli`.
2. Cerrar y abrir la terminal: `gh auth login` → GitHub.com → HTTPS → Login with a web browser.
3. Avisar en la sesión.

### 2. ✅ Publicar el repositorio — *hecho el 15/10*
Repositorio: https://github.com/mateogit114730/ganadotrack · Tablero: https://github.com/users/mateogit114730/projects/1 · `main` = versión candidata `ganadotrack-1.1.1.0`, CI en verde.

1. Crear el repo `ganadotrack` y subir `main`, `develop` y los tags 1.0.5.0, 1.0.7.0, 1.0.9.0 y 1.1.0.0.
2. Crear las etiquetas, los milestones F1 a F6 y los issues #1 a #29 (los 17 originales + los nuevos), con el mismo número que usan los commits.
3. Crear el tablero de GitHub Projects y cerrar los issues ya resueltos.
4. Verificar que la CI quede en verde (lint, 118 + 6 pruebas, cobertura, build).

### 3. ✅ Crear las cuentas de publicación — *hecho el 15/10*
App: https://ganadotrack.vercel.app · API: https://ganadotrack-api.onrender.com (Neon en us-west-2, Render en Virginia: el dashboard responde en ≈ 1,25 s, dentro de RNF03).
Seguir `docs/entregas/guia-publicacion.md`, secciones B, C y D:
1. **Neon:** proyecto `ganadotrack`, región US East 1. Guardar la cadena de conexión (no pegarla en el chat).
2. **Render:** New → Blueprint con el repo. Cargar `DATABASE_URL`, `CORS_ORIGIN` y `SEED_PASSWORD`.
3. **Vercel:** importar el repo con raíz `frontend` y `VITE_API_URL` apuntando a Render.
4. Pasar en la sesión las dos URLs públicas.

### 4. ✅ Poner en marcha la producción — *hecho el 15/10*
- ✅ Seed cargado · ✅ CORS correcto · ✅ variable `API_URL` del flujo "mantener activa" · ✅ prueba de humo de solo lectura (`npm run humo` en `e2e/`).
- ✅ Prueba en un celular real: app instalada, carga en modo avión del Lote 01 y sincronización al volver la señal (2 registros, sin duplicados).
- ⚠️ 👤 **Antes del 29/10:** cambiar la contraseña de demostración (`ganadotrack` es fácil de adivinar y los emails son públicos). Repetir el seed con la nueva y guardarla en `e2e/.password-produccion`.
1. Cargar los datos de demostración en Neon (pido confirmación antes, porque borra lo que haya).
2. Ajustar `CORS_ORIGIN` si la URL de Vercel cambió, y activar la variable `API_URL` del flujo "mantener activa".
3. Correr el recorrido E2E contra las URLs públicas, sin los pasos que modifican datos.
4. Probar la instalación de la app en un celular real y el modo sin señal (👤 con tu teléfono: abrir el link, Instalar, modo avión, cargar, volver a conectar).

---

## Prioridad 2 – Validación con el productor (tiene fecha fija)

### 5. 👤 Enviar el material — *29/10*
1. Mandar por WhatsApp el mensaje de `docs/entregas/validacion-productor.md` con el link de la app.
2. Adjuntar los 3 videos de `docs/entregas/video-demo/`.
3. Pasar aparte la contraseña de demostración.

### 6. 👤🤖 Incorporar sus respuestas — *apenas responda, a más tardar el 02/11*
1. 👤 Pegar en la sesión sus respuestas (audios transcritos o mensajes).
2. 🤖 Completar el acta de validación.
3. 🤖 Ajustar el seed con sus valores reales: GDP objetivo, ración, precios, rendimiento y protocolo sanitario.
4. 🤖 Volver a cargar los datos en producción y regenerar las capturas.
5. 🤖 Pasar a "Trabajo futuro" lo que pida y no entre en el plazo.
6. Si no responde a tiempo: se documenta la validación como pendiente y se presentan los datos de ejemplo.

---

## Prioridad 3 – Documentación (lo que más pesa en la nota escrita)

### 7. ✅ Actualizar `docs/entrega2/` con todo lo nuevo — *hecho el 15/10* (revisión 👥 pendiente)
1. **Requerimientos:** agregar RF09 Ración y conversión, RF10 Protocolos, RF11 Proyección de stock, RF12 Clima y riesgos, RF13 Reportes, RF14 Modo sin conexión, y el RNF de uso sin señal.
2. **Casos de uso:** fichas CU15 a CU22 (definir ración, confirmar en 1 toque, gestionar y aplicar protocolos, consultar proyección, consultar clima, descargar reportes, cargar sin conexión, perfil propio) y el diagrama actualizado.
3. **Modelo de datos:**
   - Tablas `racion`, `protocolo_sanitario` y `protocolo_item`.
   - Campos `materia_seca_pct` y `operacion_id`.
   - Índice único parcial del protocolo por defecto.
   - DER y diccionario actualizados.
   - Lista de las 6 migraciones.
4. **Arquitectura:**
   - Componentes nuevos: service worker y cola offline, proxy de clima, generación de PDF y Excel, despliegue en Render, Vercel y Neon.
   - Diagrama y atributos de calidad actualizados.
5. **Herramientas:** sumar al cuadro pdfkit, exceljs, vite-plugin-pwa/Workbox, idb-keyval, Open-Meteo, sharp, fontsource, Render, Vercel y Neon.
6. **API:** tabla con los endpoints nuevos (el OpenAPI ya está completo, con 41 rutas).
7. **Pruebas:**
   - Casos CP-45 a CP-77, más el E2E del modo sin conexión y las descargas.
   - Cobertura: 88 % de líneas.
   - Matriz de trazabilidad con RF09 a RF14.
   - Incidencias nuevas detectadas y corregidas: ruta de Workbox, bloqueo de Prisma en Windows, filas del PDF, selector del E2E.
8. **Manual de usuario:** secciones nuevas para Raciones, Protocolos, Reportes, Mi perfil, Clima y ubicación, Proyección de stock, Instalar la app y Trabajar sin señal.
9. **Manual de instalación:** pasos reales de publicación y variables de producción.
10. **Secciones 3, 14, 16, 17 y 18:**
    - 3: links reales.
    - 14: cronograma con las fechas reales.
    - 16: capturas de GitHub (tablero, milestones, Actions, tags).
    - 17: métricas nuevas.
    - 18: "costos completos" y "notificaciones" como trabajo futuro.
11. **README del repositorio:** funciones nuevas, scripts (`test:coverage`, `e2e`) y link de producción.

### 8. ✅ Capturas y diagramas finales — *hecho el 15/10*
1. ✅ 28 capturas del sistema regeneradas con el diseño final (el menú lateral llega hasta abajo).
2. ✅ 8 capturas de GitHub en `docs/capturas/github/` (`e2e/capturas-github.mjs`).
3. ✅ 10 diagramas en PNG en `docs/diagramas/` (`e2e/render-diagramas.mjs`): arquitectura, DER (completo y resumido), Gantt, dos secuencias, despliegue, flujo de herramientas, flujo de ramas y casos de uso (PlantUML).

### 9. 🤖👥 Documento Word final — *27/10 al 31/10*
1. Generar `docs/entregas/GanadoTrack_EntregaFinal.docx`:
   - Portada con logo, institución, alumno, docente y año.
   - Índice automático.
   - Secciones 1 a 18 con las correcciones de la 1ª entrega aplicadas.
   - Secciones de Arquitectura, Modelo de datos, API y Pruebas.
   - Anexos I (relevamiento), II (instalación), III (manual de usuario) y IV (acta de validación).
2. Figuras y tablas numeradas, con el estilo del logo.
3. Exportar también a PDF.
4. 👥 Revisar: datos personales, redacción, que nada sobre o falte respecto de la consigna.

### 10. 🤖👥 Presentación de la defensa — *30/10 al 02/11*
1. Revisar `GanadoTrackDoc/GanadoTrack.pptx` (la presentación anterior) para mantener coherencia.
2. Generar `docs/entregas/GanadoTrack_Defensa.pptx` con unas 15 diapositivas:
   1. Problema.
   2. Relevamiento.
   3. Objetivos.
   4. Solución y roles.
   5. Arquitectura.
   6. Modelo de datos.
   7. Demo (QR al link).
   8. Funcionalidades destacadas.
   9. Pruebas.
   10. Seguimiento en GitHub.
   11. Resultados.
   12. Validación con el productor.
   13. Trabajo futuro.
   14. Cierre.
3. Notas del orador y un guion de demo en vivo de 5 minutos.
4. 👥 Revisar y ensayar.

---

## Prioridad 4 – Cierre — *03/11 y 04/11*

### 11. 🤖 Versión final
1. Merge `develop` → `main`.
2. Tag `ganadotrack-1.1.1.1` y release en GitHub con el changelog.
3. Redesplegar y probar la producción.

### 12. 👤 Checklist del día anterior
- [ ] CI en verde en `main`.
- [ ] Link de la app y del repositorio funcionando (abrir la app 2 minutos antes: la API "despierta" en unos 50 s).
- [ ] Word y PDF finales en `docs/entregas/`.
- [ ] Presentación final y ensayo de la demo.
- [ ] Contraseña de demostración lista para la docente (no publicada en el repositorio).
- [ ] Plan B sin internet: la demo local (`docker compose up`, `npm run dev`) y los videos.

---

## Decisiones que quedan abiertas (consultar si hace falta)
- **GDP objetivo** (0,45 kg/día): confirmarla con el productor (paso 6). Para un feedlot es baja.
- **Margen de engorde:** no incluye el valor del animal al ingresar, por eso da montos altos. Ya está aclarado en el sistema y en los informes. Si la docente lo objeta, "Costos completos" es una mejora de 1 día.
- **Si la cátedra no quiere la app online:** se entrega el repositorio con las instrucciones locales; la configuración de despliegue queda documentada.
