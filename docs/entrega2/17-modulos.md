# Módulos implementados

El sistema se organiza en módulos funcionales. Cada uno responde a uno o más requerimientos y existe en las tres capas de la arquitectura: una o más pantallas en el frontend, un módulo en `backend/src/modules/` (rutas → controlador → servicio → esquema) y sus tablas en la base de datos. Los cálculos que comparten varios módulos están en los servicios de dominio de `backend/src/services/` (sección 15.3).

Tabla: Módulos implementados, requerimientos que cubren y componentes en cada capa

| Módulo | Qué hace | RF | Pantallas (rol) | Backend | Tablas |
|---|---|---|---|---|---|
| Autenticación y usuarios | Inicio de sesión con JWT, roles, alta y baja de usuarios, perfil propio | RF08 | Login, Usuarios (admin), Mi perfil (todos) | `auth`, `usuarios` | `usuario` |
| Lotes | Alta con protocolo, indicadores (días, cabezas, GDP, proyección), edición, cierre con resumen | RF01 | Lotes y Detalle del lote (admin) | `lotes` | `lote` |
| Alimentación | Registro diario con descuento de stock y costo en una transacción; carga sin conexión idempotente | RF02, RF14 | Comida de hoy (encargado, admin) | `alimentacion` | `registro_alimentacion` |
| Ración y conversión | Ración por lote con historial, kg del día sugeridos, conversión alimenticia | RF09 | Raciones (veterinario, admin), Comida de hoy | `racion` | `racion` |
| Insumos y proyección | Stock, compras y su corrección, días de cobertura, fecha de quiebre, compra sugerida | RF03, RF11 | Insumos y stock (admin) | `insumos` | `insumo`, `compra_insumo` |
| Pesadas | Registro de pesadas, GDP, proyección al peso objetivo, eliminación de la última | RF04 | Detalle del lote (admin) | `pesadas` | `pesada` |
| Sanidad | Calendario, eventos realizados, garrapata con control automático, bajas | RF05 | Sanidad (veterinario, admin) | `sanidad` | `evento_sanitario`, `baja` |
| Protocolos sanitarios | Plantillas de calendario y su aplicación a lotes | RF10 | Protocolos (veterinario, admin), Nuevo lote | `protocolos` | `protocolo_sanitario`, `protocolo_item` |
| Costos, dashboard y alertas | Costo por kg, margen, dashboard, alertas por rol | RF06, RF07 | Dashboard y Detalle del lote (admin), Sanidad (alertas del veterinario) | `reportes` (`/dashboard`, `/costos`, `/alertas`) | vista `v_resumen_lote` |
| Clima y riesgos | Clima, pronóstico, ITH y riesgos de garrapata y sequía, con caché | RF12 | Dashboard, barra superior, Configuración | `clima` | `parametro` (ubicación) |
| Reportes | Informe de lote y de cierre en PDF, reporte mensual, planilla Excel | RF13 | Reportes y Detalle del lote (admin) | `reportes` | todas (solo lectura) |
| Configuración | Parámetros: rendimiento al gancho, días de aviso, cobertura mínima, ubicación | RF04–RF06, RF11, RF12 | Configuración (admin) | `parametros` | `parametro` |

## Integración entre módulos

Los módulos no trabajan aislados: varias operaciones atraviesan más de uno, siempre dentro de una transacción para que los datos queden consistentes.

- **Alimentación → Insumos:** cada registro descuenta el stock y toma el precio vigente para el costo del día. Si un insumo no alcanza, se revierte todo el registro (CP-14).
- **Ración → Alimentación:** la pantalla del encargado propone los kg del día calculados con la ración vigente y las cabezas actuales (CP-53).
- **Lotes → Protocolos → Sanidad:** al crear un lote con protocolo, sus eventos se generan en la misma transacción; si algo falla, no se crea el lote (CP-60 a CP-62).
- **Sanidad → Lotes y Costos:** las bajas reducen las cabezas actuales y los eventos realizados suman el costo sanitario del lote.
- **Clima → Alertas:** el riesgo alto de garrapata genera alertas solo para los lotes sin tratamiento en los últimos 21 días (CP-70).
- **Pesadas → Alertas y Cierre:** una GDP baja genera una alerta; una pesada que alcanza el peso objetivo sugiere el cierre (CP-24 y CP-25).

## Reglas de negocio relevantes

Tabla: Reglas de negocio y dónde se garantizan

| Regla | Dónde se garantiza |
|---|---|
| El stock nunca queda negativo | Servicio (transacción) + CHECK en la base |
| Un solo registro por lote, insumo y día | Índice único en la base |
| No se cargan datos en un lote cerrado | Servicio + trigger `fn_validar_lote_activo` |
| La fecha de una pesada debe ser posterior a la anterior | Servicio (validación) |
| El peso objetivo debe superar al peso de entrada | Esquema Zod + CHECK |
| Solo un protocolo puede ser el protocolo por defecto | Índice único parcial |
| Una carga sin conexión reenviada no se duplica | Índice único (`operacion_id`, `insumo_id`) |
| Un evento realizado no se puede modificar | Servicio |
| Cada rol accede solo a sus funciones | Middleware `permitir(...)` en cada ruta |
