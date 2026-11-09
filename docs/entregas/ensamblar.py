"""Arma el documento final (Markdown) a partir de las secciones de docs/entrega2.

Uso: python ensamblar.py   ->  genera GanadoTrack_EntregaFinal.md en esta carpeta.
Después, generar-docx.mjs lo convierte a Word.
"""
import re
from pathlib import Path

AQUI = Path(__file__).resolve().parent
SEC = AQUI.parent / 'entrega2'
SALIDA = AQUI / 'GanadoTrack_EntregaFinal.md'

# Pie de figura de cada diagrama, en el orden en que aparecen los bloques ```mermaid de cada archivo.
DIAGRAMAS = {
    '10-alcance-y-requerimientos.md': [
        ('bpmn-1-ingreso-lote', 'Proceso 1 (ampliado): ingreso de un lote con su protocolo sanitario'),
        ('bpmn-2-alimentacion', 'Proceso 2 (ampliado): alimentación diaria con ración en un toque y carga sin conexión'),
        ('bpmn-5-abastecimiento', 'Proceso 5 (nuevo): abastecimiento de insumos'),
        ('bpmn-6-cierre', 'Proceso 6 (nuevo): cierre del lote'),
    ],
    '14-cronograma.md': [('gantt', 'Diagrama de Gantt: fases, tareas e hitos del proyecto')],
    '15-arquitectura-y-herramientas.md': [
        ('arquitectura', 'Arquitectura de GanadoTrack: componentes y comunicación'),
        ('secuencia-alimentacion', 'Secuencia del registro de alimentación diaria (CU04)'),
        ('secuencia-sin-conexion', 'Secuencia de la carga sin conexión y su sincronización (CU21)'),
        ('flujo-herramientas', 'Integración de las herramientas en el proceso de desarrollo'),
        ('despliegue', 'Diagrama de despliegue en producción'),
    ],
    '16-seguimiento.md': [('flujo-ramas', 'Flujo de ramas del repositorio')],
    'modelo-de-datos.md': [('der-resumido', 'Diagrama entidad-relación: entidades y relaciones de negocio')],
}

# Las secciones 16 a 18 de la 1ª entrega pasan a ser 20 a 22 en el documento final.
RENUMERAR_REFS = {'16': '20', '17': '21', '18': '22'}


def leer(nombre):
    return (SEC / nombre).read_text(encoding='utf-8').replace('\r\n', '\n')


def fuera_de_codigo(texto, funcion):
    """Aplica funcion(linea) solo a las líneas que no están dentro de un bloque de código."""
    salida, en_codigo = [], False
    for linea in texto.split('\n'):
        if linea.startswith('```'):
            en_codigo = not en_codigo
            salida.append(linea)
            continue
        salida.append(linea if en_codigo else funcion(linea))
    return '\n'.join(salida)


def diagramas_a_imagen(texto, archivo):
    lista = list(DIAGRAMAS.get(archivo, []))
    def reemplazar(m):
        nombre, pie = lista.pop(0)
        return f'![{pie}](../diagramas/{nombre}.png)'
    texto = re.sub(r'```mermaid\n.*?```', reemplazar, texto, flags=re.S)
    if lista:
        raise SystemExit(f'{archivo}: sobran nombres de diagramas {lista}')
    return texto


def sin_titulo(texto):
    """Quita el título de primer nivel del archivo."""
    return re.sub(r'\A# .*\n', '', texto.lstrip('\n'), count=1)


def numerar_h2(texto, prefijo):
    """'## 3. Título' o '## Título' -> '## <prefijo>.<n> Título' (fuera de los bloques de código)."""
    n = 0
    def f(linea):
        nonlocal n
        m = re.match(r'## (?:\d+(?:\.\d+)?\.? )?(.*)', linea)
        if not linea.startswith('## ') or not m:
            return linea
        n += 1
        return f'## {prefijo}.{n} {m.group(1)}'
    return fuera_de_codigo(texto, f)


def refs_secciones(texto):
    return re.sub(r'(secci[oó]n(?:es)? )(1[678])\b', lambda m: m.group(1) + RENUMERAR_REFS[m.group(2)], texto)


def seccion_md(texto, desde, hasta=None):
    i = texto.index(desde)
    i = texto.index('\n', i) + 1
    j = texto.index(hasta, i) if hasta else len(texto)
    return texto[i:j].strip('\n')


partes = []

# ---------- 1 a 12 ----------
t = leer('01-analisis-y-definicion.md')
t = t[t.index('# 1. Nombre'):]
link = sin_titulo(leer('03-link.md'))
link = link.replace('(ver el manual de usuario, sección 6)', '(ver el Anexo III, sección 6)')
link = link.replace('seguir el [README del repositorio](../../README.md) o el [manual de instalación](manual-instalacion.md)',
                    'seguir el README del repositorio o el manual de instalación (Anexo II)')
t = t.replace('<!-- incluir:03-link.md -->', link)
alc = diagramas_a_imagen(leer('10-alcance-y-requerimientos.md'), '10-alcance-y-requerimientos.md')
rf_nuevos = seccion_md(alc, '### 10.1 Requerimientos nuevos', '### 10.2')
t = t.replace('<!-- incluir:10-alcance-y-requerimientos.md#10.1-sin-titulo -->', rf_nuevos)
procesos = seccion_md(alc, '## 12. Procesos automatizados')
procesos = procesos.replace('### Modelos de los procesos ampliados y nuevos', '## 12.2 Modelos de los procesos ampliados y nuevos')
t = t.replace('<!-- incluir:10-alcance-y-requerimientos.md#12-sin-titulo -->', procesos)
partes.append(t)

# ---------- 13 Casos de uso ----------
t = leer('13-casos-de-uso.md')
t = re.sub(r'Código PlantUML\..*?\n', '', t)
t = re.sub(r'```plantuml\n.*?```', '![Diagrama de casos de uso de GanadoTrack](../diagramas/casos-de-uso.png)', t, flags=re.S)
partes.append(t)

# El cronograma (14-cronograma.md) no se incluye en el documento final: las secciones 15 a 22 se renumeran
# como 14 a 21 al final (ver renumerar()).

# ---------- 15 Arquitectura y herramientas ----------
t = diagramas_a_imagen(leer('15-arquitectura-y-herramientas.md'), '15-arquitectura-y-herramientas.md')
t = re.sub(r'> Imagen para el Word:.*\n', '', t)
partes.append(refs_secciones(t))

# ---------- 16 Modelo de datos ----------
t = diagramas_a_imagen(leer('modelo-de-datos.md'), 'modelo-de-datos.md')
t = re.sub(r'> Imágenes para el Word.*?\n(?:> .*\n)*', '![Diagrama entidad-relación completo, con los atributos de cada entidad](../diagramas/der.png)\n', t)
t = '# 16. Modelo de datos\n' + numerar_h2(sin_titulo(t), '16')
partes.append(refs_secciones(t))

# ---------- 17 Módulos ----------
partes.append('# 17. Módulos implementados\n' + numerar_h2(sin_titulo(leer('17-modulos.md')), '17'))

# ---------- 18 API ----------
partes.append('# 18. Descripción de la API\n' + refs_secciones(numerar_h2(sin_titulo(leer('api.md')), '18')))

# ---------- 19 Pruebas ----------
t = leer('pruebas.md')
t = t.replace('[sección 3](#3-incidencias-detectadas-y-corregidas-durante-el-desarrollo)', 'sección 19.3')
t = '# 19. Estrategia de pruebas y validación\n' + numerar_h2(sin_titulo(t), '19')
partes.append(refs_secciones(t))

# ---------- 20 Seguimiento ----------
t = diagramas_a_imagen(leer('16-seguimiento.md'), '16-seguimiento.md')
t = re.sub(r'\A# 16\.', '# 20.', t)
t = fuera_de_codigo(t, lambda l: re.sub(r'^(#{2,3}) 16\.', r'\1 20.', l))
capturas = re.findall(r'^\| (.+?) \| <http[^|]*> \| `(capturas/github/[\w-]+\.png)` \|$', t, flags=re.M)
if capturas:
    # Las capturas van como figuras debajo de la tabla: la columna con el nombre del archivo ya no hace falta.
    t = t.replace('| Evidencia | Enlace | Figura |\n|---|---|---|', '| Evidencia | Enlace |\n|---|---|')
    t = re.sub(r'^(\| .+? \| <http[^|]*> \|) `capturas/github/[\w-]+\.png` \|$', r'\1', t, flags=re.M)
    figuras ='\n\n'.join(f'![{texto}](../{ruta})' for texto, ruta in capturas)
    t = t.replace('**Ejemplo de control de cambios (PR #30):**', figuras + '\n\n**Ejemplo de control de cambios (PR #30):**')
# Sin la sección de cronograma, los milestones se describen por fase del proyecto.
t = t.replace('(uno por hito del cronograma)', '(uno por fase del proyecto)')
t = t.replace('uno por fase del cronograma (sección 14), con su fecha límite', 'uno por fase del proyecto, con su fecha límite')
partes.append(refs_secciones(t))

# ---------- 21 Resultados ----------
t = leer('17-resultados.md')
t = re.sub(r'\A# 17\. Resultados obtenidos hasta la fecha', '# 21. Resultados obtenidos y conclusiones', t)
t = fuera_de_codigo(t, lambda l: re.sub(r'^## 17\.', '## 21.', l))
partes.append(refs_secciones(t))

# ---------- 22 Trabajo futuro ----------
t = leer('18-trabajo-futuro.md')
t = '# 22. Trabajo futuro\n' + numerar_h2(sin_titulo(t), '22')
partes.append(refs_secciones(t))

# ---------- Anexos ----------
partes.append(leer('anexo-relevamiento.md'))

t = leer('manual-instalacion.md')
partes.append('# Anexo II: Manual de instalación y configuración\n' + refs_secciones(sin_titulo(t)))

t = leer('manual-usuario.md')
partes.append('# Anexo III: Manual de usuario\n' + refs_secciones(sin_titulo(t)))

v = (AQUI / 'validacion-productor.md').read_text(encoding='utf-8').replace('\r\n', '\n')
cuestionario = seccion_md(v, '## 2. Cuestionario (8 preguntas)', '## 3. Acta')
partes.append(
    '# Anexo IV: Material para la validación con el productor\n\n'
    'La validación con el productor no se completó antes de la entrega (ver sección 19.5). Para hacerla se prepararon '
    'tres videos de demostración generados con Playwright (el encargado en el celular, el productor y el veterinario), '
    'un acceso de prueba a la aplicación publicada y el siguiente cuestionario, que se enviará por WhatsApp. '
    'Sus respuestas se usarán para ajustar los valores de referencia del sistema.\n\n'
    '## Cuestionario (8 preguntas)\n\n' + cuestionario)

partes.append(leer('anexo-correcciones.md'))

def renumerar(texto):
    """Sin el cronograma, las secciones 15 a 22 pasan a ser 14 a 21: títulos y referencias "sección N".
    En el Anexo V solo se renumera la columna "Sección" (el texto cita la numeración de la 1ª entrega)."""
    bajar = lambda m: str(int(m.group(0)) - 1)
    numero = r'\b(?:1[5-9]|2[0-2])\b'
    def cuerpo(t):
        t = fuera_de_codigo(t, lambda l: re.sub(r'^(#{1,3}) (' + numero + r')(?=\.)', lambda m: f'{m.group(1)} {int(m.group(2)) - 1}', l))
        return re.sub(r'(secci[oó]n(?:es)?\s+)(' + numero + r')', lambda m: m.group(1) + str(int(m.group(2)) - 1), t)
    i = texto.index('# Anexo V:')
    anexo = re.sub(r'^(\|.*\| )([^|]*)( \|)$', lambda m: m.group(1) + re.sub(numero, bajar, m.group(2)) + m.group(3), texto[i:], flags=re.M)
    return cuerpo(texto[:i]) + anexo


doc = '\n\n'.join(p.strip('\n') for p in partes) + '\n'
doc = renumerar(doc)
# Los enlaces relativos de entrega2 apuntan a archivos del repositorio: en el documento quedan como texto.
doc = re.sub(r'(?<!!)\[([^\]]+)\]\((?!https?://|#)[^)]+\)', r'\1', doc)
SALIDA.write_text(doc, encoding='utf-8', newline='\n')
print(f'{SALIDA.name}: {len(doc.splitlines())} líneas')
for linea in doc.splitlines():
    if linea.startswith('# '):
        print(' ', linea)
