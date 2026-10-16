# Modelo de datos

## 1. Entidades principales

| Entidad | Representa | Requerimientos |
|---|---|---|
| USUARIO | Persona que usa el sistema, con su rol | RF08 |
| LOTE | Tropa de animales que ingresa al feedlot | RF01 |
| INSUMO | Suplemento proteico o silaje de sorgo, con su stock | RF03 |
| COMPRA_INSUMO | Compra (o carga de silaje propio) que suma stock | RF03 |
| REGISTRO_ALIMENTACION | Kg de un insumo entregados a un lote en un día | RF02 |
| PESADA | Pesada mensual del lote con la GDP calculada | RF04 |
| EVENTO_SANITARIO | Evento del calendario sanitario: programado o realizado | RF05 |
| BAJA | Muerte de animales del lote, con su causa | RF05 |
| PARAMETRO | Valores configurables (rendimiento al gancho, días de aviso, cobertura de stock, ubicación) | RF04, RF05, RF06, RF11, RF12 |
| RACION | Kg de un insumo por cabeza y por día para un lote, desde una fecha (historial) | RF09 |
| PROTOCOLO_SANITARIO | Plan sanitario tipo que se aplica al crear un lote | RF10 |
| PROTOCOLO_ITEM | Evento del protocolo: qué se aplica, a los cuántos días del ingreso y cada cuánto se repite | RF10 |

Las tres últimas entidades se agregaron en la versión final. Además, INSUMO incorporó el **porcentaje de materia seca** (RF09) y REGISTRO_ALIMENTACION, el **identificador de operación** para la carga sin conexión (RF14).

## 2. Diagrama Entidad-Relación

```mermaid
erDiagram
  USUARIO ||--o{ REGISTRO_ALIMENTACION : "carga"
  USUARIO ||--o{ COMPRA_INSUMO : "registra"
  USUARIO ||--o{ PESADA : "registra"
  USUARIO |o--o{ EVENTO_SANITARIO : "ejecuta"
  USUARIO ||--o{ BAJA : "registra"
  LOTE ||--o{ REGISTRO_ALIMENTACION : "recibe"
  LOTE ||--o{ PESADA : "tiene"
  LOTE ||--o{ EVENTO_SANITARIO : "tiene"
  LOTE ||--o{ BAJA : "sufre"
  INSUMO ||--o{ REGISTRO_ALIMENTACION : "se consume en"
  INSUMO ||--o{ COMPRA_INSUMO : "se repone con"
  LOTE ||--o{ RACION : "tiene"
  INSUMO ||--o{ RACION : "forma parte de"
  USUARIO |o--o{ RACION : "define"
  PROTOCOLO_SANITARIO ||--|{ PROTOCOLO_ITEM : "contiene"

  USUARIO {
    int id PK
    varchar nombre
    varchar email UK
    varchar password_hash
    enum rol "ADMIN | ENCARGADO | VETERINARIO"
    boolean activo
    timestamp created_at
  }
  LOTE {
    int id PK
    varchar nombre UK
    date fecha_ingreso
    int cantidad_inicial
    decimal peso_ingreso
    decimal peso_objetivo
    decimal gdp_objetivo
    decimal precio_venta_kg "nullable"
    enum estado "ACTIVO | CERRADO"
    date fecha_cierre "nullable"
    decimal peso_final "nullable"
    varchar observaciones
  }
  INSUMO {
    int id PK
    varchar nombre UK
    enum tipo "SUPLEMENTO | SILAJE"
    decimal stock_kg
    decimal stock_minimo_kg
    decimal precio_kg
    decimal materia_seca_pct
  }
  COMPRA_INSUMO {
    int id PK
    int insumo_id FK
    date fecha
    decimal cantidad_kg
    decimal precio_total
    int usuario_id FK
  }
  REGISTRO_ALIMENTACION {
    int id PK
    int lote_id FK
    int insumo_id FK
    date fecha
    decimal kg
    decimal precio_kg
    decimal costo
    int usuario_id FK
    varchar operacion_id "nullable"
  }
  PESADA {
    int id PK
    int lote_id FK
    date fecha
    decimal peso_promedio
    decimal gdp
    int usuario_id FK
  }
  EVENTO_SANITARIO {
    int id PK
    int lote_id FK
    enum tipo "VACUNA | ANTIPARASITARIO | GARRAPATA | OTRO"
    varchar nombre
    varchar producto
    date fecha_programada
    enum estado "PENDIENTE | REALIZADO"
    date fecha_realizada "nullable"
    varchar dosis
    decimal costo
    int duracion_dias "nullable"
    int usuario_id FK "nullable"
  }
  BAJA {
    int id PK
    int lote_id FK
    date fecha
    int cantidad
    enum causa "ENFERMEDAD | ACCIDENTE | SEQUIA | OTRA"
    varchar observaciones
    int usuario_id FK
  }
  PARAMETRO {
    varchar clave PK
    varchar valor
    varchar descripcion
  }
  RACION {
    int id PK
    int lote_id FK
    int insumo_id FK
    decimal kg_cabeza_dia
    date vigente_desde
    int usuario_id FK "nullable"
  }
  PROTOCOLO_SANITARIO {
    int id PK
    varchar nombre UK
    varchar descripcion
    boolean por_defecto
  }
  PROTOCOLO_ITEM {
    int id PK
    int protocolo_id FK
    enum tipo "VACUNA | ANTIPARASITARIO | GARRAPATA | OTRO"
    varchar nombre
    varchar producto
    int dia_desde_ingreso
    int repetir_cada_dias "nullable"
    int aplicaciones
  }
```

> PROTOCOLO_SANITARIO no tiene una relación con LOTE ni con EVENTO_SANITARIO. Al aplicarlo, el sistema **copia** sus ítems como eventos pendientes del lote. Así, si el veterinario modifica el protocolo después, los calendarios ya generados no cambian, y cada evento se puede reprogramar en forma individual.

> Para la entrega en Word: pegar en <https://mermaid.live> y exportar como PNG (reemplaza la figura del ER de la 1ª entrega).

### Cardinalidades

| Relación | Cardinalidad | Lectura |
|---|---|---|
| LOTE – REGISTRO_ALIMENTACION | 1 : N | Un lote recibe muchos registros diarios; cada registro es de un lote |
| INSUMO – REGISTRO_ALIMENTACION | 1 : N | Cada registro corresponde a un insumo |
| LOTE – PESADA | 1 : N | Un lote tiene una pesada mensual (0 al ingresar) |
| LOTE – EVENTO_SANITARIO | 1 : N | Calendario sanitario del lote |
| LOTE – BAJA | 1 : N | Un lote puede tener varias bajas |
| INSUMO – COMPRA_INSUMO | 1 : N | Historial de compras del insumo |
| USUARIO – registros | 1 : N | Auditoría: quién cargó cada dato. En EVENTO_SANITARIO es opcional (0..1) porque un evento programado todavía no tiene ejecutor |
| LOTE – RACION | 1 : N | Un lote tiene varias raciones a lo largo del tiempo (una vigente por insumo) |
| INSUMO – RACION | 1 : N | Un insumo forma parte de la ración de varios lotes |
| PROTOCOLO_SANITARIO – PROTOCOLO_ITEM | 1 : N (al menos 1) | Un protocolo contiene uno o más eventos; si se elimina el protocolo, se eliminan sus ítems (cascada) |

**Relaciones N:M resueltas:** LOTE e INSUMO tienen dos relaciones muchos a muchos (un lote consume varios insumos y un insumo alimenta varios lotes):
- **REGISTRO_ALIMENTACION** registra lo que **se entregó**: fecha, kg, precio aplicado y costo.
- **RACION** registra lo que **se planifica entregar**: kg por cabeza por día y fecha de vigencia.

## 3. Normalización

El modelo está en **tercera forma normal (3FN)**:
- **1FN:** todos los atributos son atómicos; no hay listas dentro de un campo. Por ejemplo, cada insumo entregado en el día es una fila distinta.
- **2FN:** las tablas usan una clave primaria simple (`id`), por lo que no hay dependencias parciales.
- **3FN:** no hay dependencias transitivas. Los datos derivados (cabezas actuales, costo acumulado, días en feedlot, fecha proyectada) **no se guardan**: se calculan a partir de los datos base.

**Desnormalizaciones deliberadas:**

| Campo | Motivo |
|---|---|
| `registro_alimentacion.precio_kg` y `costo` | Guardan el precio **vigente al momento de la carga**. Si el precio del insumo cambia después, el costo histórico no debe cambiar |
| `pesada.gdp` | Se guarda calculada al registrar la pesada. Es un dato histórico que no debe variar si se corrige una pesada posterior |
| `insumo.stock_kg` | Saldo actual, mantenido en las mismas transacciones que lo modifican. Evita recalcular "compras − consumos" en cada consulta |
| Eventos generados por un protocolo | Copian el tipo, el nombre y el producto del ítem: el calendario del lote es independiente de cambios posteriores al protocolo |

Los datos derivados de la versión final tampoco se guardan: los kg del día de la ración, la conversión alimenticia, los días de cobertura y la compra sugerida se calculan en cada consulta.

## 4. Diccionario de datos

Convenciones: claves `SERIAL`; importes en **ARS** (`NUMERIC(14,2)`); pesos y cantidades en **kg**; fechas de negocio `DATE`.

### USUARIO (`usuario`)
| Campo | Tipo | Nulo | Restricciones | Descripción |
|---|---|---|---|---|
| id | SERIAL | No | PK | Identificador |
| nombre | VARCHAR(100) | No | | Nombre visible |
| email | VARCHAR(150) | No | UNIQUE | Usuario de inicio de sesión (minúsculas) |
| password_hash | VARCHAR(100) | No | | Hash bcrypt de la contraseña; nunca se guarda en texto plano |
| rol | ENUM Rol | No | ADMIN, ENCARGADO, VETERINARIO | Define los permisos (RF08) |
| activo | BOOLEAN | No | DEFAULT true | Un usuario inactivo no puede iniciar sesión |
| created_at | TIMESTAMP | No | DEFAULT now() | Alta del registro |

### LOTE (`lote`)
| Campo | Tipo | Nulo | Restricciones | Descripción |
|---|---|---|---|---|
| id | SERIAL | No | PK | |
| nombre | VARCHAR(60) | No | UNIQUE | Nombre o número de tropa |
| fecha_ingreso | DATE | No | | Ingreso al feedlot |
| cantidad_inicial | INT | No | CHECK > 0 | Animales al ingreso |
| peso_ingreso | NUMERIC(7,2) | No | CHECK > 0 | Peso promedio de entrada (kg) |
| peso_objetivo | NUMERIC(7,2) | No | CHECK > peso_ingreso | Peso promedio de salida esperado (kg) |
| gdp_objetivo | NUMERIC(5,3) | No | CHECK > 0 | GDP esperada (kg/día); por debajo genera alerta |
| precio_venta_kg | NUMERIC(12,2) | Sí | CHECK > 0 | Precio de venta por kg al gancho, para el margen |
| estado | ENUM | No | ACTIVO, CERRADO · DEFAULT ACTIVO · índice | |
| fecha_cierre | DATE | Sí | CHECK ≥ fecha_ingreso; obligatorio si CERRADO | Venta/faena |
| peso_final | NUMERIC(7,2) | Sí | | Peso promedio al cierre |
| observaciones | VARCHAR(500) | Sí | | |

### INSUMO (`insumo`)
| Campo | Tipo | Nulo | Restricciones | Descripción |
|---|---|---|---|---|
| id | SERIAL | No | PK | |
| nombre | VARCHAR(80) | No | UNIQUE | |
| tipo | ENUM | No | SUPLEMENTO, SILAJE | |
| stock_kg | NUMERIC(12,2) | No | CHECK ≥ 0 | Stock actual (el silaje se muestra en toneladas) |
| stock_minimo_kg | NUMERIC(12,2) | No | CHECK ≥ 0 | Por debajo genera alerta |
| precio_kg | NUMERIC(12,2) | No | CHECK ≥ 0 | Precio vigente (última compra o costo de producción) |
| materia_seca_pct | NUMERIC(5,2) | No | CHECK > 0 y ≤ 100 · DEFAULT 100 | % de materia seca, para la conversión alimenticia (suplemento ≈ 90, silaje ≈ 35) |

### COMPRA_INSUMO (`compra_insumo`)
| Campo | Tipo | Nulo | Restricciones | Descripción |
|---|---|---|---|---|
| id | SERIAL | No | PK | |
| insumo_id | INT | No | FK → insumo | |
| fecha | DATE | No | índice (insumo_id, fecha) | |
| cantidad_kg | NUMERIC(12,2) | No | CHECK > 0 | |
| precio_total | NUMERIC(14,2) | No | CHECK ≥ 0 | |
| usuario_id | INT | No | FK → usuario | Quién la registró |

### REGISTRO_ALIMENTACION (`registro_alimentacion`)
| Campo | Tipo | Nulo | Restricciones | Descripción |
|---|---|---|---|---|
| id | SERIAL | No | PK | |
| lote_id | INT | No | FK → lote | |
| insumo_id | INT | No | FK → insumo | |
| fecha | DATE | No | UNIQUE (lote_id, insumo_id, fecha) | Un registro por insumo, lote y día |
| kg | NUMERIC(10,2) | No | CHECK > 0 | Kg entregados |
| precio_kg | NUMERIC(12,2) | No | | Precio aplicado (histórico) |
| costo | NUMERIC(14,2) | No | CHECK ≥ 0 | kg × precio_kg |
| usuario_id | INT | No | FK → usuario | Encargado que cargó |
| operacion_id | VARCHAR(36) | Sí | UNIQUE (operacion_id, insumo_id) | UUID generado en el celular para cada carga; evita duplicados al reenviar una carga hecha sin conexión |

### PESADA (`pesada`)
| Campo | Tipo | Nulo | Restricciones | Descripción |
|---|---|---|---|---|
| id | SERIAL | No | PK | |
| lote_id | INT | No | FK → lote | |
| fecha | DATE | No | UNIQUE (lote_id, fecha) | |
| peso_promedio | NUMERIC(7,2) | No | CHECK > 0 | |
| gdp | NUMERIC(6,3) | No | | (peso − peso anterior) / días; puede ser negativa |
| usuario_id | INT | No | FK → usuario | |

### EVENTO_SANITARIO (`evento_sanitario`)
| Campo | Tipo | Nulo | Restricciones | Descripción |
|---|---|---|---|---|
| id | SERIAL | No | PK | |
| lote_id | INT | No | FK → lote · índice | |
| tipo | ENUM | No | VACUNA, ANTIPARASITARIO, GARRAPATA, OTRO | |
| nombre | VARCHAR(100) | No | | Ej.: "Vacuna clostridial" |
| producto | VARCHAR(100) | Sí | | |
| fecha_programada | DATE | No | índice (estado, fecha_programada) | Base de las alertas |
| estado | ENUM | No | PENDIENTE, REALIZADO | |
| fecha_realizada | DATE | Sí | Obligatoria si REALIZADO | |
| dosis | VARCHAR(60) | Sí | | |
| costo | NUMERIC(14,2) | No | CHECK ≥ 0 · DEFAULT 0 | Suma al costo sanitario |
| duracion_dias | INT | Sí | CHECK > 0 | Duración del tratamiento de garrapata |
| observaciones | VARCHAR(500) | Sí | | |
| usuario_id | INT | Sí | FK → usuario | Quién lo ejecutó |

### BAJA (`baja`)
| Campo | Tipo | Nulo | Restricciones | Descripción |
|---|---|---|---|---|
| id | SERIAL | No | PK | |
| lote_id | INT | No | FK → lote | |
| fecha | DATE | No | | |
| cantidad | INT | No | CHECK > 0; ≤ cabezas actuales (validado en la API) | |
| causa | ENUM | No | ENFERMEDAD, ACCIDENTE, SEQUIA, OTRA | |
| observaciones | VARCHAR(500) | Sí | | |
| usuario_id | INT | No | FK → usuario | |

### RACION (`racion`)
| Campo | Tipo | Nulo | Restricciones | Descripción |
|---|---|---|---|---|
| id | SERIAL | No | PK | |
| lote_id | INT | No | FK → lote | |
| insumo_id | INT | No | FK → insumo | |
| kg_cabeza_dia | NUMERIC(8,3) | No | CHECK ≥ 0 (la API limita a 80) | Kg por cabeza por día; 0 quita el insumo de la ración desde esa fecha |
| vigente_desde | DATE | No | UNIQUE (lote_id, insumo_id, vigente_desde) | La ración vigente de un insumo es la de mayor `vigente_desde` que no supere la fecha consultada |
| usuario_id | INT | Sí | FK → usuario | Quién la definió |
| created_at | TIMESTAMP | No | DEFAULT now() | |

### PROTOCOLO_SANITARIO (`protocolo_sanitario`)
| Campo | Tipo | Nulo | Restricciones | Descripción |
|---|---|---|---|---|
| id | SERIAL | No | PK | |
| nombre | VARCHAR(100) | No | UNIQUE | Ej.: "Protocolo feedlot estándar" |
| descripcion | VARCHAR(500) | Sí | | |
| por_defecto | BOOLEAN | No | DEFAULT false · índice único parcial `WHERE por_defecto` | Se propone al crear un lote; solo uno puede estar marcado |
| created_at | TIMESTAMP | No | DEFAULT now() | |

### PROTOCOLO_ITEM (`protocolo_item`)
| Campo | Tipo | Nulo | Restricciones | Descripción |
|---|---|---|---|---|
| id | SERIAL | No | PK | |
| protocolo_id | INT | No | FK → protocolo_sanitario (ON DELETE CASCADE) · índice | |
| tipo | ENUM | No | VACUNA, ANTIPARASITARIO, GARRAPATA, OTRO | Mismo tipo que EVENTO_SANITARIO |
| nombre | VARCHAR(100) | No | | Nombre del evento a generar |
| producto | VARCHAR(100) | Sí | | Producto previsto |
| dia_desde_ingreso | INT | No | CHECK entre 0 y 365 | Primera aplicación: fecha de ingreso + días |
| repetir_cada_dias | INT | Sí | CHECK > 0 | Frecuencia de repetición |
| aplicaciones | INT | No | DEFAULT 1 · CHECK entre 1 y 52; si es mayor a 1, `repetir_cada_dias` es obligatorio | Cantidad total de aplicaciones |

**Ejemplo:** el ítem "Control de garrapata", día 21, cada 21 días, 4 aplicaciones, genera eventos en los días 21, 42, 63 y 84 desde el ingreso.

### PARAMETRO (`parametro`)
| Clave | Valor inicial | Uso |
|---|---|---|
| rendimiento_gancho | 0.57 | kg de carne = peso × cabezas × rendimiento (RF06) |
| dias_aviso_sanitario | 7 | Anticipación de las alertas sanitarias (RF05) |
| dias_cobertura_minima | 7 | Por debajo, alerta de stock proyectado (RF11) |
| horizonte_compra_dias | 14 | Días de consumo que cubre la compra sugerida (RF11) |
| ubicacion_nombre, ubicacion_latitud, ubicacion_longitud | Pergamino, Buenos Aires (−33,89; −60,57) en los datos de demostración | Localidad del establecimiento para el clima (RF12) |

## 5. Implementación física

El esquema se define en [`backend/prisma/schema.prisma`](../../backend/prisma/schema.prisma) y se crea con migraciones SQL versionadas en `backend/prisma/migrations/`:

| Migración | Contenido |
|---|---|
| `…_init` | Tablas, tipos ENUM, claves primarias y foráneas, índices y restricciones UNIQUE (generada por Prisma) |
| `…_checks_y_vistas` | **Escrita a mano:** restricciones CHECK, vista `v_resumen_lote` y trigger de lote cerrado |
| `…_vista_resumen_tipos` | Ajusta los tipos de la vista (las sumas de enteros devuelven `bigint`) |
| `…_racion_y_materia_seca` | Tabla `racion` y campo `insumo.materia_seca_pct`, con sus CHECK (RF09) |
| `…_protocolos_sanitarios` | Tablas `protocolo_sanitario` y `protocolo_item`, CHECK de días y repeticiones, e índice único parcial `protocolo_unico_por_defecto` (RF10) |
| `…_operacion_offline` | **Escrita a mano:** campo `registro_alimentacion.operacion_id` e índice único (operacion_id, insumo_id) para la sincronización sin duplicados (RF14) |

Todas las migraciones son **aditivas**: agregan tablas, columnas o restricciones sin borrar datos. Por eso la base de producción se actualiza con `prisma migrate deploy` al publicar cada versión.

### Índice único parcial del protocolo por defecto

```sql
CREATE UNIQUE INDEX protocolo_unico_por_defecto ON protocolo_sanitario (por_defecto) WHERE por_defecto;
```

Solo indexa las filas con `por_defecto = true`, de modo que la base rechaza un segundo protocolo marcado por defecto. La API, al marcar uno nuevo, desmarca el anterior en la misma transacción.

### Vista `v_resumen_lote`

Concentra los acumulados de cada lote que usan el dashboard y el módulo de costos: cabezas actuales, peso de la última pesada, última GDP, costo de alimentación, costo sanitario y costo total. Evita repetir estas consultas en distintos lugares del código.

### Trigger `fn_validar_lote_activo`

Antes de insertar en `registro_alimentacion`, `pesada` o `baja`, verifica que el lote no esté CERRADO. La API ya valida esta regla; el trigger es una segunda barrera por si se intenta cargar datos por otra vía (verificado por la prueba CP-37).

### Seguridad de la información

- Contraseñas almacenadas solo como hash bcrypt.
- Las credenciales de la base de datos están en variables de entorno, no en el código.
- Se registra el usuario que realizó cada operación (auditoría).
- **Respaldo:** en producción se usan los respaldos automáticos de la plataforma. En local, el respaldo se hace con `docker exec ganadotrack-db pg_dump -U ganadotrack ganadotrack > respaldo.sql`.

## 6. Consultas de ejemplo

**a) Resumen de los lotes activos** (lo que muestra el dashboard):
```sql
SELECT nombre, cabezas_actuales, peso_actual, ultima_gdp, costo_total
FROM v_resumen_lote
WHERE estado = 'ACTIVO'
ORDER BY fecha_ingreso;
```

**b) Costo por kg de carne y margen de cada lote** (RF06):
```sql
SELECT r.nombre,
       r.costo_total,
       ROUND(r.peso_actual * r.cabezas_actuales * 0.57, 2)                      AS kg_carne,
       ROUND(r.costo_total / NULLIF(r.peso_actual * r.cabezas_actuales * 0.57, 0), 2) AS costo_por_kg,
       ROUND(l.precio_venta_kg * r.peso_actual * r.cabezas_actuales * 0.57 - r.costo_total, 2) AS margen
FROM v_resumen_lote r
JOIN lote l ON l.id = r.lote_id;
```

**c) Eventos sanitarios que vencen en los próximos 7 días o ya vencidos** (alertas, RF05):
```sql
SELECT l.nombre AS lote, e.nombre AS evento, e.fecha_programada,
       e.fecha_programada - CURRENT_DATE AS dias_restantes
FROM evento_sanitario e
JOIN lote l ON l.id = e.lote_id
WHERE e.estado = 'PENDIENTE' AND l.estado = 'ACTIVO'
  AND e.fecha_programada <= CURRENT_DATE + 7
ORDER BY e.fecha_programada;
```

**d) Insumos por debajo del stock mínimo** (RF03):
```sql
SELECT nombre, stock_kg, stock_minimo_kg FROM insumo WHERE stock_kg < stock_minimo_kg;
```

**e) Consumo y costo de alimentación por lote e insumo en el último mes:**
```sql
SELECT l.nombre, i.nombre AS insumo, SUM(r.kg) AS kg, SUM(r.costo) AS costo
FROM registro_alimentacion r
JOIN lote l ON l.id = r.lote_id
JOIN insumo i ON i.id = r.insumo_id
WHERE r.fecha >= CURRENT_DATE - 30
GROUP BY l.nombre, i.nombre
ORDER BY l.nombre, i.nombre;
```

**f) Bajas por causa** (relacionado con el caso de anaplasmosis del relevamiento):
```sql
SELECT causa, SUM(cantidad) AS animales FROM baja GROUP BY causa ORDER BY animales DESC;
```

**g) Ración vigente hoy y kg del día por lote** (RF09):
```sql
SELECT DISTINCT ON (r.lote_id, r.insumo_id)
       v.nombre AS lote, i.nombre AS insumo, r.kg_cabeza_dia,
       ROUND(r.kg_cabeza_dia * v.cabezas_actuales) AS kg_del_dia
FROM racion r
JOIN v_resumen_lote v ON v.lote_id = r.lote_id AND v.estado = 'ACTIVO'
JOIN insumo i ON i.id = r.insumo_id
WHERE r.vigente_desde <= CURRENT_DATE
ORDER BY r.lote_id, r.insumo_id, r.vigente_desde DESC;
```
*(Las filas con 0 kg indican que el insumo se quitó de la ración.)*

**h) Cargas sincronizadas desde el celular** (RF14):
```sql
SELECT fecha, operacion_id, COUNT(*) AS insumos, SUM(costo) AS costo
FROM registro_alimentacion
WHERE operacion_id IS NOT NULL
GROUP BY fecha, operacion_id
ORDER BY fecha DESC;
```

Estas consultas se pueden ejecutar con `docker exec -it ganadotrack-db psql -U ganadotrack` o desde Prisma Studio (`npm run db:studio`).
