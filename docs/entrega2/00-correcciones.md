# Correcciones a la 1ª entrega — GanadoTrack

Revisión del documento *DocumentacionGanadoTrack_1erEntrega*. Cada punto indica **dónde** está el problema, **qué** pasa y el **texto corregido** para reemplazar en el Word.

Prioridad: 🔴 alta (incoherencia que la docente puede marcar) · 🟡 media · 🟢 redacción.

---

## 🔴 1. La numeración de los casos de uso no coincide con el diagrama

**Dónde:** Sección 13 (lista de CU) vs. Figura del diagrama de casos de uso.

**Problema:** la lista de texto dice CU01 = Iniciar sesión … CU12 = Generar alerta; el diagrama dice CU01 = Registrar lote … CU12 = Ver dashboard. Por ejemplo, "CU04" es *Registrar pesada mensual* en el texto y *Registrar compra de insumo* en el diagrama. Las fichas (CU03, CU04, CU06) siguen la numeración del texto, por lo que no se pueden rastrear en el diagrama.

**Corrección:** reemplazar la lista por la lista unificada (la misma que usa el diagrama corregido y el sistema):

| ID | Caso de uso | Actor principal |
|---|---|---|
| CU01 | Iniciar sesión | Administrador, Encargado, Veterinario |
| CU02 | Gestionar usuarios | Administrador |
| CU03 | Registrar lote | Administrador |
| CU04 | Registrar alimentación diaria | Encargado |
| CU05 | Actualizar stock de insumos (*incluido* por CU04 y CU06) | — |
| CU06 | Registrar compra de insumo | Administrador |
| CU07 | Registrar pesada mensual | Administrador |
| CU08 | Programar evento sanitario | Veterinario |
| CU09 | Registrar evento sanitario realizado | Veterinario |
| CU10 | Registrar baja de animales | Veterinario |
| CU11 | Consultar costos y rentabilidad del lote | Administrador |
| CU12 | Ver dashboard y alertas | Administrador (Veterinario: solo alertas sanitarias) |
| CU13 | Cerrar lote | Administrador |
| CU14 | Generar alertas automáticas | Sistema (actor temporal) |

Las fichas completas de los 14 CU y el diagrama corregido están en [13-casos-de-uso.md](13-casos-de-uso.md).

---

## 🔴 2. Ficha CU06 duplicada y fichas faltantes

**Dónde:** Sección 13.

**Problema:** la tabla "CU06: Registrar evento sanitario" aparece dos veces, idéntica. Solo hay 3 casos de uso detallados de 12.

**Corrección:** borrar la copia y reemplazar las fichas por las de [13-casos-de-uso.md](13-casos-de-uso.md) (con la numeración nueva: alimentación = CU04, pesada = CU07, evento sanitario = CU09).

---

## 🔴 3. Errores en el diagrama de casos de uso

**Dónde:** Figura del diagrama de CU.

| Problema | Por qué está mal | Corrección |
|---|---|---|
| El **Encargado** está conectado a "Consultar alertas sanitarias" | Contradice RF08: "el encargado solo puede acceder al módulo de registro de alimentación diaria" | Quitar esa asociación |
| `CU03 Registrar alimentación` **«include»** `CU05 Consultar stock` | Registrar alimentación no *consulta* el stock, lo *descuenta* | Renombrar el incluido a **"Actualizar stock de insumos"**; la compra de insumos también lo incluye |
| `CU09 Consultar alertas` **«extend»** `CU07 Registrar evento` con la flecha en sentido confuso | En «extend» la flecha va **desde** el caso que extiende **hacia** el caso base | Se elimina: el registro del evento se inicia desde la lista de pendientes (flujo principal) |
| Faltan casos | RF08 (login y roles), RF05 (calendario sanitario) y CU12 "Generar alerta (Sistema)" no aparecen en el diagrama | Agregar CU01 Iniciar sesión, CU02 Gestionar usuarios, CU08 Programar evento sanitario y CU14 Generar alertas con el actor **Sistema** |
| Líneas del Administrador a CU10, CU11 y CU05 se cruzan con otras líneas sin un significado claro | Hacen ilegible el diagrama | Reordenar (ver diagrama nuevo) |

El diagrama corregido (en PlantUML, para pegar en <https://www.plantuml.com/plantuml> y exportar como PNG) está en [13-casos-de-uso.md](13-casos-de-uso.md).

---

## 🟡 4. CU "Registrar pesada": la excepción no es una excepción

**Dónde:** ficha CU04 (pasa a ser CU07).

**Problema:** "Si el peso ingresado es mayor al peso objetivo → el sistema sugiere cerrar el lote" no es un error, sino un **flujo alternativo** (el proceso termina bien).

**Corrección:**
- **Flujo alternativo B:** si el peso promedio alcanza o supera el peso objetivo → el sistema informa que el lote llegó al objetivo y sugiere cerrarlo (CU13).
- **Excepciones:** (a) la fecha es anterior o igual a la última pesada → error "La fecha debe ser posterior a la última pesada"; (b) el peso es ≤ 0 o vacío → error de validación, no se guarda.

---

## 🟡 5. Cantidad de bloques de la entrevista

**Dónde:** Sección 9.3 y Anexo I.

**Problema:** el texto dice "cuestionario organizado en **8 bloques**", pero enumera del Bloque 0 al Bloque 8 (**9 bloques**). Además, el Anexo I arranca en el Bloque 1: el **Bloque 0** (tipo de operación y especie) no está transcripto.

**Corrección (9.3):**
> Se realizó una entrevista al productor/dueño del establecimiento mediante un cuestionario organizado en **9 bloques temáticos (0 a 8)**:

**Agregar al Anexo I, antes del Bloque 1:**
> **BLOQUE 0: Tipo de operación y especie**
> *Preguntas realizadas:* ¿Qué especie cría? ¿Qué raza? ¿Qué etapas del ciclo productivo realiza?
> *Respuestas obtenidas:* El establecimiento trabaja con ganado bovino de raza Angus y realiza el ciclo completo: cría, recría, engorde a corral (feedlot) y comercialización a través de carnicería propia.

*(Ajustar las respuestas a lo que efectivamente contestó el productor.)*

---

## 🟢 6. Redacción en la tabla de hallazgos (9.4)

**Dónde:** Sección 9.4, primera fila.

**Problema:** "El MVP no consta con competencia debido a que no hacen uso de ningún software de gestión." "Consta con" no es correcto y la idea no queda clara.

**Corrección:**
> No existe un sistema previo: no hay datos que migrar ni herramientas que reemplazar, por lo que el sistema puede diseñarse desde cero según el proceso real del establecimiento.

---

## 🟢 7. Índice y título de la sección 16 no coinciden

**Dónde:** Índice ("16. Seguimiento del proyecto") vs. título ("16. SEGUIMIENTO MEDIANTE HERRAMIENTA A ELECCIÓN").

**Corrección:** usar el mismo título en ambos lugares: **"16. Seguimiento del proyecto (GitHub Projects)"**.

---

## 🔴 8. Fórmulas de costo por kg y margen (RF06)

**Dónde:** RF06.

**Problema 1:** la fórmula usa "cantidad de animales" sin aclarar cuál. Si se usa la cantidad **de ingreso**, cuando hay bajas (muertes) el sistema calcula kg de carne de animales que ya no existen y el costo por kg sale **más bajo de lo real**.

**Problema 2:** el costo que calcula el sistema es solo alimentación + sanidad durante el feedlot. **No incluye el valor del animal al ingresar** (es cría propia y no tiene precio de compra). Si no se aclara, el "margen bruto" parece mayor de lo que es.

**Corrección (reemplazar las viñetas 2 y 4 de RF06):**
> - El sistema debe calcular las **cabezas actuales** del lote: cantidad de ingreso − bajas registradas.
> - El sistema debe calcular el **costo de engorde por kg de carne**: Costo total acumulado / (peso promedio actual × cabezas actuales × rendimiento al gancho). El rendimiento al gancho es un parámetro configurable (valor inicial 57 %).
> - El sistema debe mostrar el **margen bruto estimado de engorde** por lote: (precio de venta por kg × kg de carne estimados) − costo total acumulado.

**Agregar a Límites (sección 7):**
> ● Costo del animal al ingreso: el costo calculado corresponde a la etapa de engorde (alimentación + sanidad). No incluye el costo de cría/recría del animal ni los gastos generales del establecimiento.

---

## 🔴 9. GDP objetivo: falta el dato y el valor relevado es inusual

**Dónde:** RF01, RF04, Bloque 4 y el diagrama ER.

**Problema 1:** RF04 dice "alerta cuando la GDP sea inferior al **objetivo configurado**", pero ningún RF dice dónde se configura ese objetivo y el ER no tiene el campo.

**Corrección (RF01, primera viñeta):**
> El sistema debe permitir crear un nuevo lote ingresando: nombre/número de lote, fecha de ingreso, cantidad de animales, peso promedio de entrada (kg), peso objetivo de salida (kg) y **GDP objetivo (kg/día)**.

**Problema 2 (validar con el productor):** según el Bloque 4, el lote entra con **380 kg** y sale con **420 kg** después de **90–100 días**. Eso da una GDP de (420 − 380) / 95 ≈ **0,42 kg/día**. En un feedlot bovino lo habitual es **1,0 a 1,5 kg/día**. Puede ser un dato mal relevado (por ejemplo, el peso de ingreso es menor, o el objetivo es mayor) o una particularidad del establecimiento. **Conviene confirmarlo con el productor** antes de la presentación, porque la docente puede preguntarlo. El sistema no depende de este valor, ya que la GDP objetivo se carga por lote.

---

## 🟡 10. Stock de suplemento vs. lo relevado

**Dónde:** RF03 vs. Bloque 3 del Anexo.

**Problema:** el productor dijo que "el único stock que se mantiene físicamente es el silo de sorgo; el alimento comprado se adquiere sin necesidad de stockeo previo". Sin embargo, RF03 controla stock de suplemento.

**Corrección:** agregar al hallazgo de la tabla 9.4 o a RF03:
> El suplemento proteico se compra semanalmente; cada compra genera un stock de corto plazo que se consume durante la semana. Registrar ese stock permite anticipar la próxima compra y conocer el precio vigente para calcular el costo diario.

---

## 🟡 11. Unidades del silaje

**Dónde:** RF03 ("silaje de sorgo (en toneladas)") vs. RF02 (registro en kg).

**Problema:** mezclar toneladas y kg obliga a convertir en cada registro.

**Corrección (RF03, primera viñeta):**
> El sistema debe mantener el stock actual de suplemento proteico y de silaje de sorgo. Internamente ambos se registran en **kg**; el silaje se muestra además en toneladas para facilitar la lectura.

---

## 🟡 12. Gastos de servicios sin requerimiento

**Dónde:** Anexo I, Bloque 8 ("Administrador: carga gastos de insumos, **servicios (luz, etc.)**") vs. RF.

**Problema:** el productor pidió cargar gastos de servicios, pero ningún RF lo contempla y tampoco figura en Límites. La docente puede preguntar qué pasó con ese pedido.

**Corrección (agregar a Límites):**
> ● Gastos generales del establecimiento (energía eléctrica, combustible, arrendamiento): quedan fuera del MVP; se prevé su incorporación como "otros gastos por lote" en una versión futura.

---

## 🟢 13. Moneda

**Dónde:** 9.2 (pérdida en USD) y RF06 (costos sin moneda).

**Corrección:** agregar a RF06 o a Alcance:
> Todos los importes del sistema se expresan en **pesos argentinos (ARS)**.

En 9.2 se puede dejar el valor en USD porque es una estimación de mercado, pero conviene aclarar el tipo de cambio o la fecha de referencia.

---

## 🔴 14. Diagrama Entidad-Relación incompleto

**Dónde:** Figura del diagrama ER.

| Entidad | Problema | Corrección |
|---|---|---|
| LOTE | Faltan `gdp_objetivo`, `precio_venta_kg`, `fecha_cierre` y `peso_final`, que son necesarios para RF04, RF06 y el cierre (RF01) | Agregarlos |
| LOTE – USUARIO | La relación dice que un lote pertenece a un usuario, pero ningún RF lo pide. Lo que sí hace falta es saber **quién cargó** cada registro | Quitar la relación; agregar `usuario_id` (auditoría) en REGISTRO_ALIMENTACION, PESADA, EVENTO_SANITARIO, BAJA y COMPRA_INSUMO |
| EVENTO_SANITARIO | No distingue un evento **programado** (calendario, RF05) de uno **realizado**. Faltan `dosis` y `duracion_dias` (garrapata) | Agregar `nombre`, `fecha_programada`, `estado` (PENDIENTE/REALIZADO), `fecha_realizada`, `dosis` y `duracion_dias` |
| PESADA | `fecha_proyectada_venta` es un dato derivado: cambia con cada pesada | Se calcula al consultar; no se guarda |
| INSUMO | Falta `tipo` (suplemento/silaje) | Agregar `tipo`; el stock se guarda en kg |
| — | El 57 % de rendimiento y los 7 días de aviso están fijos en el texto | Nueva tabla PARAMETRO (clave, valor) |
| BAJA | `causa` es texto libre | Limitar a los valores de RF05: ENFERMEDAD, ACCIDENTE, SEQUIA, OTRA |

El modelo corregido, con el diccionario de datos, está en [modelo-de-datos.md](modelo-de-datos.md).
