# Módulo de Reclutamiento de Producción — Especificación de implementación

Plataforma: Mainstage Pro (mainstagepro.vercel.app)
Implementa: Claude Code
Archivo de datos que acompaña esta spec: `reclutamiento-produccion-seed.json`

---

## 0. Instrucciones para Claude Code

1. **Antes de escribir código, explora el repositorio** y documenta en un plan breve:
   - Stack, framework, ORM o cliente de base de datos, sistema de autenticación y de roles ("Usuarios y accesos").
   - Cómo están implementados hoy estos módulos y sus tablas: Organización → Puestos, Organización → Candidatos, RRHH (Administración → Recursos Humanos) → Tabulador freelancers, Producción → Directorio → Técnicos.
   - Componentes de UI, estilos y patrones existentes (tabs, tablas, modales, tableros kanban).
2. **Reutiliza** las tablas, componentes y convenciones existentes. No dupliques entidades que ya existen (puestos, candidatos, roles del tabulador, técnicos del directorio): extiéndelas.
3. Trabaja **por fases** (sección 9). Al terminar cada fase: migraciones aplicadas, build sin errores, pruebas de los criterios de aceptación y un resumen de cambios.
4. Cualquier cambio destructivo sobre datos existentes (renombrar o fusionar puestos, cambiar roles del tabulador) se hace con migración reversible y **se confirma con el Director antes de ejecutarse en producción**.
5. Todo el texto visible en la plataforma va en español.

---

## 1. Contexto

Mainstage Pro necesita reclutar con un estándar claro al Jefe de Producción, al Encargado de Bodega y al crew técnico (técnico, operador e ingeniero) de cada disciplina. Ya están definidos:

- **Perfiles de puesto** (en el JSON: `competenciasTransversales`, `puestos`, `perfilesTecnicos`).
- **Formulario de postulación** con ramificación por puesto, disciplina y nivel, y un sistema de valoración (en el JSON: `formularios`, `config`).

### Lo que ya existe en la plataforma (relevado el 8 nov 2026)

| Módulo | Ruta | Estado actual |
| --- | --- | --- |
| Puestos | `/organizacion/puestos` | Registro de 8 campos por puesto: subáreas, misión, responsabilidades permanentes, criterios de calidad, reportes a Dirección, perfil requerido (valores, aptitudes, conocimientos con nivel e indispensable), condiciones, resultados clave y titular. Producción tiene "Coordinador de producción" y dos "Auxiliar de producción" duplicados. |
| Candidatos | `/organizacion/candidatos` | Pipeline vacío (tablero y lista) con etapas Nuevo, Evaluación, Propuesta enviada, Aprobado, Contratado, Rechazados. Alta manual: nombre, teléfono, ciudad, correo, puesto (o puesto manual + área). |
| Tabulador freelancers | `/personal/tabulador` | 25 roles por categoría (Producción, Audio, Iluminación, Video, Electricidad, Escenario, Rigging, DJ, General) con tarifa por jornada, por proyecto, plana o por hora, y bonos. |
| Directorio de técnicos | `/directorio/tecnicos` | 72 técnicos con roles del tabulador, preferente, zona y contacto; filtros por categoría. |

---

## 2. Resumen de cambios

| # | Tipo | Qué |
| --- | --- | --- |
| A | **Nuevo** | **Organización → Formularios**: constructor de formularios tipo Google Forms con editor, vista de respuestas y enlace público. |
| B | Nuevo | Página pública de postulación `/postular/[slug]`, sin login. |
| C | Nuevo | Motor de valoración automática (excluyentes, puntuación, bandas, sugerencia de nivel). |
| D | Mejora | Candidatos: alta automática desde el formulario, puntaje y desglose en la ficha, calificación manual, etapa nueva "Prueba práctica", conversión a técnico del directorio. |
| E | Mejora | Puestos: Jefe de Producción y Encargado de Bodega cargados desde el JSON, campo de criterios de exclusión, vínculo a formulario, vacante abierta o cerrada. |
| F | Mejora | Tabulador: perfil técnico por rol (propósito, competencias, exclusión) y roles faltantes. |
| G | Mejora | Directorio: alta de técnico desde candidato aprobado y consulta del perfil del rol. |
| H | Opcional | Página pública de vacantes `/vacantes`. |

---

## 3. A — Organización → Formularios

Nueva pestaña **"Formularios"** en Organización, junto a Candidatos. Es el espacio para ver, crear, editar formularios y consultar sus respuestas.

### 3.1 Lista de formularios

- Tarjetas o tabla con: título, puesto(s) vinculado(s), estado (Borrador / Publicado / Cerrado), número de respuestas, respuestas nuevas sin revisar, última respuesta, acciones (Editar, Respuestas, Copiar enlace, Duplicar, Cerrar o reabrir, Eliminar con confirmación en la UI, no `confirm()` del navegador).
- Botón **+ Nuevo formulario** (en blanco o duplicando uno existente).

### 3.2 Editor (pestaña "Preguntas")

Comportamiento de referencia: Google Forms.

- **Encabezado del formulario:** título, descripción, imagen o logo opcional.
- **Secciones:** título, descripción, orden por arrastre, duplicar, eliminar. Cada sección puede tener **condición de visibilidad**: se muestra si una respuesta previa toma ciertos valores (ver modelo `mostrarSi` en el JSON). Debe soportar condiciones compuestas (todas se cumplen).
- **Preguntas:** texto, descripción o ayuda, obligatoria sí/no, reordenar por arrastre, duplicar, mover a otra sección, eliminar. Condición de visibilidad por pregunta igual que en secciones.
- **Tipos de campo:**

| Tipo (`tipo` en JSON) | UI |
| --- | --- |
| `texto_corto` | Input de una línea |
| `parrafo` | Textarea |
| `opcion_unica` | Radio |
| `opcion_multiple` | Checkboxes |
| `si_no` | Radio Sí / No |
| `lista` | Dropdown (para escalas tipo "Ninguno / Básico / Intermedio / Avanzado") |
| `archivo_o_liga` | Subir archivo (PDF/imagen, máx. 10 MB) o pegar URL |
| `casilla` | Checkbox único de aceptación |

- **Panel de valoración por pregunta** (visible para el editor, nunca en la página pública):
  - Tipo de valoración: **E** Excluyente, **P** Puntuable, **M** Manual, **I** Informativa.
  - Para opciones: marcar respuesta correcta, puntos por opción, opciones que excluyen.
  - Para opción múltiple: puntos por opción marcada y máximo, o lista de opciones requeridas.
  - Para M: puntaje máximo (3 por defecto) y rúbrica visible al evaluador.
  - Una pregunta puede ser E y P a la vez (excluye con ciertas respuestas y puntúa con otras).
- **Vista previa** del formulario tal como lo verá el candidato, incluida la lógica condicional.
- **Guardado automático** con indicador de estado.

### 3.3 Configuración (pestaña "Configuración")

- Acepta respuestas: sí/no (cerrar el formulario muestra un mensaje en la página pública).
- Slug del enlace público, botón copiar enlace y código QR descargable.
- Puesto(s) vinculado(s).
- Umbrales de banda (por defecto 75 y 50).
- Mensaje de confirmación al enviar.
- Correo o notificación interna al Director y al Jefe de Producción al recibir una respuesta (usar el sistema de notificaciones existente si lo hay).

### 3.4 Respuestas (pestaña "Respuestas")

Tres vistas, como en Google Forms:

1. **Resumen:** por pregunta, gráfica de barras para opción única, múltiple, sí/no y lista; porcentaje de aciertos en preguntas con respuesta correcta; lista de respuestas en preguntas abiertas. Filtro por puesto, disciplina y nivel.
2. **Individual:** navegar respuesta por respuesta (anterior / siguiente). Muestra puntaje, banda, desglose por bloque y cada respuesta con su valoración. Las preguntas M se califican aquí mismo de 0 a 3 con la rúbrica a la vista; el puntaje se recalcula al guardar. Enlace a la ficha del candidato.
3. **Tabla:** una fila por respuesta, columnas por pregunta más puntaje, banda, estado de excluyentes y etapa del candidato. Ordenar, filtrar, buscar y **exportar a CSV y Excel**.

### 3.5 Versionado de preguntas

Editar un formulario con respuestas no debe alterar respuestas pasadas. Cada respuesta guarda una **instantánea** del texto de la pregunta, sus opciones y su valoración al momento de responder. Eliminar una pregunta la archiva; sus respuestas históricas se siguen mostrando.

---

## 4. B — Página pública `/postular/[slug]`

- Sin login, fuera del layout interno, con la identidad de Mainstage Pro y diseño mobile first.
- Una sección por pantalla con barra de progreso; las secciones condicionadas aparecen u ocultan según respuestas.
- Validación de obligatorias en cliente y servidor. Borrador guardado en el navegador para no perder avances (envuelto en try/catch).
- Aviso de privacidad obligatorio antes de enviar (pregunta `5.5` del JSON).
- Protección contra spam: límite por IP, campo honeypot y validación de tamaño y tipo de archivo.
- Al enviar: pantalla de confirmación. **Nunca** se muestran puntajes ni respuestas correctas al candidato.
- Si el formulario está cerrado: mensaje "Esta convocatoria no está recibiendo postulaciones".

---

## 5. C — Motor de valoración

Se ejecuta en servidor al recibir la respuesta y cada vez que se califica una pregunta manual.

1. **Excluyentes:** si cualquier pregunta E visible tiene una respuesta que excluye (`excluyeSi`, respuesta distinta a `correcta` cuando `excluyeSi: "incorrecta"`, opciones `requiere` no marcadas o calificación manual igual a `excluyeSiCalificacion`), el candidato queda **Rechazado automáticamente** con el motivo registrado (pregunta y respuesta).
2. **Puntos posibles:** solo de preguntas visibles para ese candidato:
   - P con `correcta` → `puntos` (1 por defecto).
   - P con mapa de puntos → el valor más alto del mapa.
   - P múltiple con `porOpcion` o `puntosPorOpcion` → `max`.
   - M → `max` (3 por defecto).
   - E sin puntos e I → 0.
3. **Puntos obtenidos:** automáticos al recibir; los M suman cuando se califican.
4. **Porcentaje** = obtenidos ÷ posibles × 100. Se muestran dos valores:
   - **Preliminar:** solo automáticos (con los M fuera del cálculo).
   - **Final:** cuando todas las M están calificadas.
5. **Banda** sobre el final (o el preliminar mientras no exista):
   - ≥ `config.umbrales.avanza` (75) → **Avanza a prueba práctica**.
   - ≥ `config.umbrales.banco` (50) → **Banco de talento o nivel inferior**.
   - Menor → **Descartar (sugerido)**.
6. **Desglose por bloque:** porcentaje del bloque general, del base de disciplina y de cada nivel (técnico, operador, ingeniero).
7. **Sugerencia de nivel inferior:** si aplicó a operador o ingeniero, su bloque de nivel queda bajo 50% y los bloques inferiores están en 75% o más, sugerir el nivel inferior.
8. Las bandas son **sugerencias**: la única transición automática es Rechazado por excluyente. Las demás decisiones las toma una persona.

---

## 6. D — Mejoras a Candidatos

- **Alta automática:** cada respuesta crea o actualiza un candidato (deduplicar por teléfono o correo) con puesto, disciplina, nivel, etapa "Nuevo" (o "Rechazados" si hubo excluyente) y origen "Formulario".
- **Nueva etapa "Prueba práctica"** entre Evaluación y Propuesta enviada.
- **Tarjeta del tablero:** puntaje, banda con color, puesto, disciplina y nivel, e indicador de calificaciones manuales pendientes.
- **Ficha del candidato**, en pestañas:
  - Resumen: datos, puntaje preliminar y final, banda, desglose por bloque, sugerencia de nivel y motivo de exclusión si lo hay.
  - Respuestas: todas las respuestas con su valoración y calificación manual en línea.
  - Prueba práctica: fecha, evaluador, checklist libre, calificación de 0 a 10 y notas.
  - Notas e historial de cambios de etapa.
- **Filtros** por puesto, disciplina, nivel, banda y etapa.
- **Convertir en técnico** (etapa Aprobado o Contratado, solo crew técnico): crea el registro en el Directorio con nombre, contacto y zona, y el rol del tabulador correspondiente a su disciplina y nivel (mapa `rolTabulador` del JSON). Si ya existe un técnico con el mismo teléfono, ofrecer vincularlo.
- **Contratado** en Jefe de Producción o Bodega: ofrecer asignarlo como titular del puesto.

---

## 7. E, F, G — Mejoras a Puestos, Tabulador y Directorio

### Puestos

- Renombrar "Coordinador de producción" a **Jefe de Producción** y cargar sus campos desde `puestos[0]`.
- Fusionar los dos "Auxiliar de producción" en **Encargado de Bodega** y cargar `puestos[1]`. Reporta a Jefe de Producción.
- Agregar al registro del puesto el campo **Criterios de exclusión** (lista).
- Las competencias transversales (`competenciasTransversales`) se guardan una sola vez como configuración global y se muestran en todos los puestos, en el bloque que hoy dice "Lo que esperamos de cualquier persona en Mainstage".
- Agregar **Formulario vinculado** y **Vacante abierta** (sí/no).

### Tabulador

- Cada rol puede tener un **perfil técnico**: propósito, competencias, competencias comunes de su disciplina y criterios de exclusión. Se cargan desde `perfilesTecnicos`.
- Botón "Ver perfil" en cada rol.
- Roles referenciados en el JSON que no existan (por ejemplo, **Ingeniero de Rigging** y **Operador de Rigging**): crearlos **sin tarifa** y marcarlos "Tarifa pendiente" para que el Director la defina. No modificar tarifas existentes.

### Directorio

- Al asignar o consultar un rol en un técnico, mostrar el perfil del rol.
- Origen del técnico ("Formulario" o "Manual") y enlace a su postulación si existe.

---

## 8. Modelo de datos sugerido

Adaptar nombres y tipos al ORM y convenciones del repositorio. Reutilizar tablas existentes de puestos, candidatos, roles del tabulador y técnicos.

```
forms
  id, slug (único), titulo, descripcion, estado (borrador|publicado|cerrado),
  acepta_respuestas, umbral_avanza, umbral_banco, mensaje_confirmacion,
  creado_por, timestamps

form_puestos            (form_id, puesto_id)

form_sections
  id, form_id, orden, titulo, descripcion, bloque (general|puesto|base|tecnico|operador|ingeniero),
  mostrar_si (json), archivada

form_questions
  id, section_id, orden, codigo (ej. "A.11"), texto, ayuda, tipo, obligatoria,
  opciones (json), mostrar_si (json), valoracion (json), archivada

form_submissions
  id, form_id, candidato_id, enviado_at, ip_hash,
  excluido, motivo_exclusion, puntos_obtenidos, puntos_posibles,
  porcentaje_preliminar, porcentaje_final, banda, desglose (json), nivel_sugerido

submission_answers
  id, submission_id, question_id, valor (json),
  snapshot_pregunta (json: texto, opciones, valoracion),
  puntos_auto, calificacion_manual, calificado_por, calificado_at

candidatos (existente) + campos:
  origen, disciplina, nivel, submission_id, prueba_practica (json), tecnico_id

puestos (existente) + campos:
  criterios_exclusion (json), form_id, vacante_abierta

tabulador_roles (existente) + campos:
  perfil (json), tarifa_pendiente

config_global: competencias_transversales (json)
```

Permisos: Formularios, respuestas y candidatos visibles solo para roles Administrador y Director (usar "Usuarios y accesos"). El Jefe de Producción puede ver y calificar candidatos de crew técnico.

---

## 9. Fases y criterios de aceptación

### Fase 1 — Formularios (A + B)

- Crear, editar, duplicar, publicar y cerrar un formulario con secciones, los 8 tipos de campo, lógica condicional y panel de valoración.
- Página pública funcional en móvil; enviar crea un `form_submission` con instantáneas.
- Pestaña Respuestas con Resumen, Individual y Tabla, y exportación CSV/Excel.
- **Prueba:** construir a mano un formulario de 3 secciones con una sección condicional, responderlo desde el celular y verlo en las tres vistas.

### Fase 2 — Valoración y Candidatos (C + D)

- Motor de valoración según sección 5, con pruebas unitarias de: excluyente simple, `excluyeSi: "incorrecta"`, `requiere`, opción múltiple con máximo, sección oculta que no suma posibles, preliminar vs. final y sugerencia de nivel inferior.
- Alta automática de candidatos, etapa Prueba práctica, ficha con pestañas y conversión a técnico.

### Fase 3 — Datos semilla y perfiles (E + F + G)

- **Importador idempotente** de `reclutamiento-produccion-seed.json` (volver a ejecutarlo no duplica nada). Crea el formulario "Postulación — Producción", carga competencias transversales, actualiza puestos y perfiles de roles, y crea roles faltantes con tarifa pendiente.
- Migraciones de puestos (renombrar y fusionar) confirmadas con el Director antes de correr en producción.
- **Prueba:** responder el formulario como candidato a Operador de Iluminación; verificar que aparecen las secciones general, base, técnico y operador de iluminación y ninguna otra, y que el puntaje y la banda se calculan.

### Fase 4 — Vacantes (H, opcional)

- `/vacantes` pública con los puestos de vacante abierta, su perfil resumido y el botón "Postularme" al formulario vinculado.

---

## 10. Estructura del archivo de datos

```
config                     umbrales y rúbrica de preguntas manuales
competenciasTransversales  10 competencias + criterio de exclusión general
puestos[]                  Jefe de Producción, Encargado de Bodega (campos mapeados al registro de Puestos)
perfilesTecnicos[]         por disciplina: alcance, competencias comunes, exclusión y niveles
                           (nivel, rolTabulador, proposito, competencias)
formularios[]              "postulacion-produccion": secciones con mostrarSi y preguntas
```

**Pregunta:** `{ codigo, texto, tipo, obligatoria, opciones?, mostrarSi?, valoracion }`

**valoracion:**
- `tipo`: `"E" | "P" | "M" | "I"`
- `correcta`: etiqueta de la opción correcta
- `puntos`: número (si hay `correcta`) o mapa `{ opcion: puntos }`
- `porOpcion` + `max`: opción múltiple con el mismo valor por opción
- `puntosPorOpcion` + `max`: opción múltiple con valor distinto por opción (ej. L.11: grandMA vale más)
- `excluyeSi`: lista de opciones que excluyen, o `"incorrecta"`
- `requiere`: opciones que deben marcarse (opción múltiple)
- `max` + `rubrica`: preguntas M
- `excluyeSiCalificacion`: calificación manual que excluye (por ejemplo, 0)

**mostrarSi:** `{ "pregunta": "5.1", "valorEn": ["..."] }` o `{ "todas": [ condición, ... ] }`

**Disciplinas** con los nombres de la plataforma: Audio, Iluminación, Video, Escenario y Rigging, Electricidad.

---

## 11. Prompt sugerido para iniciar en Claude Code

> Lee `SPEC-reclutamiento-produccion.md` y `reclutamiento-produccion-seed.json`. Explora el repositorio y entrégame un plan de implementación de la Fase 1 que reutilice los módulos existentes de Organización, Candidatos, Tabulador y Directorio, con las migraciones propuestas. No escribas código hasta que apruebe el plan.
