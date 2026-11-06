# Grupo Mainstage — Fase 4: mapa de decisiones comerciales (Live + Creative)

> Documento de diseño, no de implementación. Objetivo: cerrar el esquema
> comercial (qué vendemos, cómo lo cobramos, qué proceso sigue la oportunidad
> desde que entra hasta que se ejecuta) de Mainstage Live y Mainstage Creative,
> replicando el esqueleto ya maduro de Mainstage Pro. Nada de lo aquí escrito
> se construye todavía — es la base para decidir juntos antes de tocar código.
>
> Cada sección trae: (a) lo que dijiste tal cual, (b) lo que ya existe en el
> código hoy, (c) benchmarks de mercado que investigué, (d) una propuesta
> concreta, y (e) las preguntas que me faltan para cerrarla. Nada se marca
> como "decidido" salvo que lo hayas dicho explícitamente.

---

## 0. Lo que ya existe en el código (para no reconstruir nada)

Antes de proponer nada nuevo, esto es lo que YA está construido y es
reutilizable 1:1 o con ajustes menores. Lo saqué de una exploración completa
del repo (`Trato`, `Cotizacion`, `Proyecto`, `Gira`, `ProyectoCreativo`,
`PropuestaServicio`, `ServicioPM` en `prisma/schema.prisma`).

### Arquitectura compartida (ya funciona para las 3 unidades)

| Pieza | Estado | Dónde vive |
|---|---|---|
| **Trato** (pipeline comercial) | ✅ 100% agnóstico. Etapas `PROSPECCION → DESCUBRIMIENTO → OPORTUNIDAD → VENTA_CERRADA / VENTA_PERDIDA` no dependen de qué se vende. `canalOperativo` (`EVENTO`/`SHOW`) ya distingue Pro de Live/Creative. `tratoId` es opcional en `Gira` y `ProyectoCreativo` — ya pueden colgar del mismo pipeline. | `prisma/schema.prisma` (Trato, líneas ~239-398) |
| **PropuestaServicio** + **PropuestaServicioLinea** | ✅ 100% compartido entre Live y Creative ya hoy. Selecciona servicios de `ServicioPM`, pone precio por línea, calcula subtotales (honorarios, equipo, logística, reembolsables, diseño), IVA, total. Estados `BORRADOR → ENVIADA → EN_REVISION → APROBADA/RECHAZADA/VENCIDA`. | `prisma/schema.prisma` (líneas ~7068-7129) |
| **PDF de propuesta** | ✅ `PropuestaServicioPDF.tsx` ya es compartido entre Live y Creative. | `src/components/pdf/giras/PropuestaServicioPDF.tsx` |
| **Portal de aprobación del cliente** | ✅ `/aprobacion/propuesta/[token]` ya es compartido. Cliente firma, se marca `APROBADA`. | `src/app/aprobacion/propuesta/[token]/page.tsx` |
| **Catálogo ServicioPM** | ✅ Ya filtra por `unidad` (LIVE/CREATIVE), tiene `nivelServicio`, `unidadDefault` (SHOW/DIA/GIRA/PLAZA/PIEZA/MES/HORA/GLOBAL), `precioSugerido`. Hoy sembrado con 16 servicios LIVE + 3 CREATIVE (`scripts/seed-servicios-pm.ts`). | `prisma/schema.prisma`, `scripts/seed-servicios-pm.ts` |

### Lo que es específico de Pro y NO se reusa tal cual

| Pieza | Por qué no aplica directo |
|---|---|
| `Cotizacion` + `CotizacionLinea` | Pensada para equipo físico (días de renta, equipo propio/externo, operación técnica por rol). Live/Creative no rentan equipo propio como negocio base — su unidad de venta es honorario/servicio, no inventario. `PropuestaServicio` ya cubre ese caso. |
| `Proyecto` (ejecución de Pro) | Trae personal, equipos, checklist operativo, finanzas de montaje — pensado para producción técnica física. Live ya tiene su propia ejecución (`Gira`/`GiraShow` con crew, hospedaje, setlist, documentos). Creative no necesita algo tan pesado. |

### El hueco real (lo que falta, no lo que sobra)

1. **Live no tiene descubrimiento propio.** Si una `Gira` nace sin `Trato`, no pasa por ningún paso de "qué necesita el cliente" — nace directo en `PLANEACION`. Si nace de un `Trato`, reusa el `DiscoveryForm` de Pro, que está diseñado para eventos de renta, no para giras.
2. **Creative tampoco tiene descubrimiento propio.** Mismo problema: `ProyectoCreativo` nace en `BRIEF` sin que nadie haya capturado briefing estructurado antes.
3. **El catálogo `ServicioPM` de Live hoy vende "production management" como 6+ líneas sueltas** (ver sección 2) en vez de un servicio con alcance. Esto es justo lo que señalas en tu punto 2.
4. **Creative no tiene aún ninguna variable comercial de precio** (fixtures, revisiones, documentación técnica) — hoy `PropuestaServicioLinea` es un precio libre por línea, sin campos que ayuden a calcularlo.
5. **Cuando una propuesta de Creative se aprueba, el `ProyectoCreativo` no avanza de estado solo** — hay que entrar manualmente a moverlo de `BRIEF` a `EN_PROCESO`.
6. **No existe hoy un lugar que muestre "Production Management" como un solo servicio con una lista de qué incluye** — el catálogo de `/giras/servicios` muestra cada clave como línea independiente seleccionable.

---

## 1. Catálogo actual de Live (punto de partida real, no supuesto)

> **Nota 2026-11-06:** esta sección describe el catálogo ANTES de la
> reestructura de la sección 2.3, que ya se aplicó en producción. Se deja
> como referencia histórica de por qué se tomó la decisión. El estado actual
> real está al final de 2.3.

Esto es lo que HOY está sembrado en producción (`scripts/seed-servicios-pm.ts`),
agrupado como se ve en `/giras/servicios`:

**Categoría PRODUCTION_MANAGEMENT (6 líneas sueltas hoy):**
- `PM_GIRA` — Production management de gira (unidad: GIRA)
- `ADVANCE_PLAZA` — Advance técnico por plaza (unidad: PLAZA)
- `COORD_PROVEEDORES` — Coordinación de proveedores locales (unidad: PLAZA)
- `PREPRODUCCION` — Preproducción, ensayo o residencia (unidad: DIA)
- `DIA_VIAJE` — Día de viaje o día muerto (unidad: DIA)
- `ADVANCE_HORA` — Hora de advance en oficina (unidad: HORA)

**Otras categorías (hoy también sueltas, debajo de Production Management en la pantalla):**
- AUDIO: `AUDIO_BANDA` — Responsable de audio del artista (SHOW, $3,000 sugerido)
- ILUMINACION: `ILUMINACION_SHOW` — Diseño y operación de iluminación (SHOW)
- VIDEO: `VISUALES_SHOW` — Operación de visuales y contenido (SHOW)
- LOGISTICA: `LOGISTICA_TOUR` — Logística de crew y artistas (GIRA)
- DOCUMENTACION: `DOCUMENTACION_TOUR` — Documentación técnica de gira (GLOBAL)
- EQUIPO: `BACKLINE_COMPLEMENTARIO` — Renta de equipo complementario (PIEZA)

Esto confirma exactamente lo que describes: "sale production management y abajo
una serie de servicios" — son 6 ítems de PM + 6 categorías más, todos
seleccionables uno por uno como si fueran productos de catálogo independientes.

---

## 2. Mainstage Live — esquema comercial

### 2.1 Lo que dijiste

- Hoy cobras por show/fecha.
- Quieres explorar: por gira completa, retainer (según el proyecto), y
  add-ons específicamente para cuando Mainstage también asume **tour
  management** y **stage management** (y "otros servicios").
- El servicio vendible debe ser **"Production Management"** como UNA sola
  cosa, y lo que hoy son servicios sueltos (los 6 de arriba) deberían
  convertirse en un **listado de alcance** ("qué incluye Production
  Management"), no en opciones de catálogo independientes.
- Hay que cobrar distinto según complejidad: show chico/mediano, festival
  (más responsabilidad), gira de 5 fechas, gira de 25 fechas.
- Posiblemente también según alcance geográfico: local, nacional,
  internacional.
- La cotización debe dejar explícito qué corre por cuenta de la
  promotora/management: transporte, hospedaje, viáticos (comida y gastos).

### 2.2 Benchmark de mercado (industria del touring, fuentes abajo)

- **Day rate (por día):** tour managers de club/teatro cobran ~£250/día en
  UK; internacional ~£400/día; tour managers/directores senior £500-650+/día
  en producciones grandes. En USD, equivalente a semanas de $500-2,500/semana
  según experiencia, o $150-500+ por show para quien cobra por show.
- **Día de show (day-of-show manager), por capacidad de venue:** club
  (<500 cap) $100-200, teatro/mediano $200-400, festival $300-500, headliner
  de mercado mayor $400-750 **por show**. Esto valida tu instinto de que un
  show no vale lo mismo que un festival.
- **Tour fee (cerrado por toda la gira):** se usa cuando el ruteo ya está
  cerrado y el alcance es claro — "una cantidad total por toda la gira,
  incluyendo advance". Riesgo medio si se agregan fechas después de cotizar
  (hay que dejarlo explícito en condiciones).
- **Porcentaje del budget/ingreso:** mueve el riesgo hacia quien cobra —
  "proyectos donde el riesgo se comparte, pero alto riesgo si hay
  cancelaciones o pérdidas". Es el modelo menos usado para producción pura;
  más común en management de carrera, no en PM técnico.
- **Per diem (viáticos):** es presupuesto de la gira, independiente de lo que
  dé el promotor — "el per diem sale del presupuesto operativo de la gira sin
  importar qué dé el promotor"; se ajusta por costo de vida si es
  internacional. El tour manager/management arma el presupuesto de la gira
  (garantías, crew, per diem, viajes, hoteles) — es quien lo controla, no el
  promotor.

**Lectura para Mainstage Live:** el mercado SÍ valida tus 3 ejes (por
show/día, por gira cerrada, por % — poco común) y SÍ valida que el precio
cambia por capacidad/complejidad del evento. No encontré un benchmark
específico de "festival vs gira" en términos de multiplicador, así que ese
número lo definimos nosotros con tu experiencia real de costos.

### 2.3 Catálogo reestructurado — ✅ DECIDIDO (2026-11-06)

Corrección de Mauricio sobre la primera propuesta: **Production Management,
Tour Management y Stage Management son TRES servicios independientes**, no
uno base con los otros dos como add-on. Cada uno:

- Se puede vender **solo** (ej. un cliente solo quiere Stage Management del
  día del show, sin que Mainstage lleve el resto de la gira).
- Se puede **combinar con cualquiera de los otros dos** en la misma
  propuesta (ej. PM + TM, o PM + SM, o los tres juntos) — al combinarse,
  cada uno sigue siendo una línea de precio propia, no un add-on subordinado
  a otro.
- Tiene **su propio checklist de alcance** (igual patrón que ya tenía PM):
  lo que hoy son los 6 `ServicioPM` sueltos de la categoría
  PRODUCTION_MANAGEMENT dejan de ser líneas de catálogo independientes y se
  convierten en el checklist de alcance DEL servicio "Production
  Management" (no se cotizan por separado).

**Production Management — checklist de alcance** (de los 6 `ServicioPM`
actuales):
- Advance técnico por plaza
- Coordinación de proveedores locales
- Preproducción / ensayo / residencia (si aplica)
- Logística de crew y artistas
- Documentación técnica de la gira
- Horas de advance en oficina (hasta cierto límite, luego se cobra aparte)

**Tour Management — checklist de alcance — ✅ DECIDIDO (criterio Claude,
2026-11-06, ajustable sin problema):**
- Control del presupuesto completo de la gira (ingresos/egresos, settlement
  por fecha)
- Representación directa del management/artista frente a promotores
- Distribución de per diem y manejo de caja de gira
- Supervisión general del crew (no solo técnico)
- Decisiones de ruteo/logística de alto nivel durante la gira

**Stage Management — checklist de alcance — ✅ DECIDIDO (criterio Claude,
2026-11-06, ajustable sin problema):**
- Manejo de stage call / cueing el día del show
- Coordinación de crew local de escenario (el que pone el venue/promotor)
- Enlace con producción local durante montaje/show/desmontaje del día
- Resolución de contingencias de escenario en tiempo real

Las categorías que ya eran servicios sueltos — Audio (`AUDIO_BANDA`,
`INGENIERO_FOH`, `INGENIERO_MONITORES`), Iluminación (`ILUMINACION_SHOW`,
`DISENO_ILUMINACION`, `INGENIERO_ILUMINACION`), Video (`VISUALES_SHOW`),
Backline (`BACKLINE_COMPLEMENTARIO`) — **no cambian**: siguen siendo add-ons
independientes que se pueden sumar a cualquiera de los tres servicios
anteriores (PM, TM o SM) o venderse junto con ellos.

### ✅ IMPLEMENTADO EN PRODUCCIÓN (2026-11-06)

Se aplicó vía `scripts/seed-servicios-pm.ts` +
`scripts/_apply-plegar-servicios-pm-en-production-management.ts` +
`scripts/_apply-recategorizar-run-of-show-stage-management.ts`:

- `PM_GIRA` → renombrado a **"Production Management"**, con `incluye`
  reescrito para absorber el alcance de los 6 servicios plegados.
- Desactivados (`activo = false`, no borrados — por si ya tienen historial
  en alguna `PropuestaServicioLinea`): `ADVANCE_PLAZA`, `COORD_PROVEEDORES`,
  `PREPRODUCCION`, `LOGISTICA_TOUR`, `DOCUMENTACION_TOUR`, `ADVANCE_HORA`.
  `DIA_VIAJE` **no** se tocó: sigue siendo un renglón de cobro aparte (día de
  traslado/muerto), no una tarea dentro del alcance de PM.
- `TOUR_MANAGEMENT_GIRA` → servicio nuevo, categoría `TOUR_MANAGEMENT`.
- **Hallazgo durante la implementación:** Mauricio ya había dado de alta el
  25/26 de octubre, directo desde `/giras/servicios`, cinco servicios que no
  estaban en `seed-servicios-pm.ts` (se crean ahí sin pasar por la semilla):
  `INGENIERO_FOH`, `INGENIERO_MONITORES` (partieron `AUDIO_BANDA` en dos
  roles), `DISENO_ILUMINACION`, `INGENIERO_ILUMINACION` (partieron
  `ILUMINACION_SHOW` en diseño vs. operación) y, el relevante para esta
  fase, **`RUN_OF_SHOW`** ("Run of show: soundcheck y stage") — que es
  exactamente el alcance de Stage Management de gira que se iba a construir
  aquí. En vez de crear un servicio nuevo que compitiera con el mismo
  alcance, se recategorizó `RUN_OF_SHOW` a la categoría nueva
  `STAGE_MANAGEMENT`, se le puso el nombre de venta **"Stage Management"**
  (igual que PM y TM) y se le amplió el `incluye` con lo que traía el
  borrador de esta sección (coordinación de crew local de escenario,
  resolución de contingencias en tiempo real). La clave de código sigue
  siendo `RUN_OF_SHOW` — igual que `PM_GIRA` no se llama
  `PRODUCTION_MANAGEMENT`, la clave es un identificador interno, no el
  nombre de venta.
- `src/lib/giras.ts`: `CATEGORIAS_SERVICIO` y `CATEGORIA_SERVICIO_LABEL`
  ganaron las entradas `TOUR_MANAGEMENT` y `STAGE_MANAGEMENT` (antes solo
  existía `PRODUCTION_MANAGEMENT`) — esto alimenta el filtro y el
  agrupamiento tanto en `/giras/servicios` como en `/presentacion/giras`
  sin tocar esas pantallas.
- Catálogo LIVE/GIRA activo resultante (confirmado en producción):
  Production Management (`PM_GIRA`), Tour Management
  (`TOUR_MANAGEMENT_GIRA`), Stage Management (`RUN_OF_SHOW`), Audio
  (`AUDIO_BANDA`/`INGENIERO_FOH`/`INGENIERO_MONITORES`), Iluminación
  (`ILUMINACION_SHOW`/`DISENO_ILUMINACION`/`INGENIERO_ILUMINACION`), Video
  (`VISUALES_SHOW`), Día de viaje (`DIA_VIAJE`), Equipo
  (`BACKLINE_COMPLEMENTARIO`).
- `npm run build` verde. El selector de servicios de `PropuestaEditor.tsx`
  no agrupa por categoría (lista plana) — no necesitó cambios de código.

### 2.4 Propuesta: ejes de precio (los 4 que mencionas + 1 que detecté)

1. **Modalidad de cobro** (cómo se agrupa el precio):
   - Por show/fecha (lo que ya haces)
   - Por gira completa (tour fee cerrado)
   - Retainer (mensual, para proyectos de management continuo, no por
     evento — aplicaría más a artistas con los que trabajas todo el año)
   - *(el modelo `PropuestaServicio` ya tiene el campo `modeloCobro` con
     exactamente estos 4 valores: `POR_SHOW | POR_DIA | POR_GIRA | RETAINER |
     PORCENTAJE` — ya está pensado en el schema, solo falta que la UI lo use
     bien)*

2. **Complejidad del evento** (multiplicador o tarifa propia):
   - Show chico/mediano
   - Festival (más responsabilidad — múltiples stages, horarios ajustados,
     más proveedores que coordinar)
   - Gira corta (ej. 5 fechas)
   - Gira larga (ej. 25 fechas) — normalmente con descuento por volumen de
     fechas, igual que Pro ya tiene descuento multidía

3. **Alcance geográfico:**
   - Local (misma ciudad/zona del artista)
   - Nacional (requiere viáticos, vuelos domésticos)
   - Internacional (per diem ajustado a costo de vida local, logística de
     visas/aduana, posible fee adicional de complejidad)

4. **Servicios/add-ons activos** (Production Management, Tour Management,
   Stage Management — cada uno independiente y combinable entre sí — más
   Audio, Iluminación, Visuales, Backline como add-ons adicionales) — cada
   uno suma al total como su propia línea.

5. **(Detectado, no mencionado por ti) Responsabilidad de gastos repetibles:**
   tu punto de "qué corre por cuenta de quién" no es realmente un eje de
   PRECIO sino un eje de **ALCANCE/CONDICIONES** — ver 2.6.

### 2.5 Esquema de precio — ✅ DECIDIDO (2026-11-06)

1. ~~¿Confirmas la reestructura del catálogo?~~ **✅** PM, TM y SM son tres
   servicios independientes y combinables, cada uno con su propio checklist.
2. **Complejidad: multiplicador** sobre una tarifa única de PM, no tarifas
   base separadas por tipo (criterio Claude, delegado por Mauricio: un solo
   número ancla es más fácil de sostener/ajustar que mantener 5 tarifas
   independientes, y el mismo multiplicador se puede aplicar a TM/SM si algún
   día se cobran con la misma lógica). Tabla de referencia (no automatizada
   en código — guía para que el vendedor fije `precioUnitario` al armar la
   propuesta):

   | Complejidad (`Gira.complejidad`) | Multiplicador | Precio PM por show |
   |---|---|---|
   | Show chico | ×0.85 | $3,400 |
   | Show mediano (ancla) | ×1.00 | $4,000 |
   | Festival | ×1.40 | $5,600 |
   | Gira corta (2-5 fechas) | ×0.95/show | $3,800/show |
   | Gira larga (6+ fechas) | ×0.80/show | $3,200/show |

3. **Geografía: solo ajusta viáticos/per diem** (bloque de responsabilidad de
   gastos, §2.6) — el honorario de PM/TM/SM NO cambia por ser internacional.
   `Gira.alcanceGeografico` se queda como dato informativo/logístico (anticipa
   aduanas/visas), no como multiplicador de precio.
4. **Retainer: por artista**, no por proyecto (Mauricio: "por artista y por
   proyecto, no lo sé aún, tú defínelo" → se eligió por artista porque un
   retainer por proyecto ya es básicamente cotizar shows sueltos de esa gira;
   el valor real del retainer es la relación continua con el artista).
   Fórmula de partida:
   - Retainer mensual = $4,000 × shows incluidos/mes × 0.80 (20% descuento de
     volumen). Ejemplo con 4 shows/mes: **$12,800/mes**.
   - Shows que excedan el paquete mensual: tarifa marginal normal (ancla ×
     complejidad, sin descuento adicional).
   - Mínimo de permanencia: 3 meses.
   - TM/SM se pueden incluir en el mismo retainer como líneas propias, mismo
     criterio de descuento.
   - **Pendiente real:** calibrar con el primer caso real que aparezca — la
     fórmula es punto de partida, no número grabado en piedra.
5. **Ancla confirmada por Mauricio: $4,000 MXN por show.**
6. Responsabilidad de gastos: ya resuelto en §2.6 (4 líneas, implementado en
   producción).

### 2.6 Condiciones de la cotización: quién paga qué

Esto no es un precio, es una **condición contractual** que debe quedar
explícita en cada propuesta (ya existe el campo `condicionesPago` en
`PropuestaServicio`, pero esto es distinto — es "qué corre por cuenta de
quién", no "cómo se paga"). Propongo agregar un bloque de **checkboxes de
responsabilidad de gastos** en la propuesta, con 3 estados por partida:
"incluido en nuestro precio" / "corre por cuenta del promotor" / "corre por
cuenta del management del artista":

- Transporte (vuelos/terrestre del equipo de Mainstage)
- Hospedaje
- Viáticos — comidas
- Viáticos — gastos generales/incidentales

Esto se imprime en el PDF de la propuesta como una tabla de "alcance de
gastos" para que no haya ambigüedad con el cliente. **✅ DECIDIDO (criterio
Claude, 2026-11-06):** se queda en 4 líneas (transporte, hospedaje, viáticos
comida, viáticos generales) para no sobre-complicar la propuesta; si en la
práctica se necesita separar transporte aéreo de terrestre, se ajusta
después sin fricción — el campo nace como texto libre por línea, no como
enum cerrado.

---

## 3. Mainstage Creative — esquema comercial

### 3.1 Lo que dijiste

- Carlos Luna te dio una referencia: tarifa de render basada en el **número
  de fixtures de iluminación** — te parece bien esa base.
- Variables que ya identificas:
  - Si el render es **solo estético** vs. si también incluye
    **documentación técnica / plots de producción para ejecución**.
  - **Cuántos cambios/revisiones** estamos dispuestos a hacer por render sin
    costo adicional.
- Me pides investigar qué otras variables suele usar el mercado.

### 3.2 Benchmark de mercado

- **Rendering 3D en general:** $250-$5,000 por imagen según complejidad;
  proyectos con elementos custom (fixtures/materiales complejos, múltiples
  escenas/horas del día) $1,500-$2,500 por imagen; modelado custom adicional
  (muebles únicos, materiales complejos, elementos de iluminación
  específicos) $75-$200 **por elemento** — esto valida directamente la idea
  de "precio por fixture/elemento": el mercado de rendering arquitectónico ya
  cobra por pieza compleja agregada, no solo por imagen plana.
- **Diseño de iluminación arquitectónica:** $125-$250/hora, o 5-10% del
  costo total del proyecto en esquemas de porcentaje (proyectos
  comerciales/integrados grandes).
- **Diseño de iluminación de conciertos/giras (el comparable más cercano a
  lo que hace Creative):** honorario de diseño completo (no solo un render,
  sino diseño + patch + programación) típicamente **$5,000-$20,000**, según
  tamaño del rig, complejidad musical, número de canciones, duración del
  show; mega-giras pueden llegar a **$50,000+**. Esto es el techo de
  referencia para un proyecto grande de Creative (diseño conceptual completo
  de una gira), no para un render individual.
- **Documentación técnica (light plots):** el plot + patch + simulación de
  cobertura para validar fixture count y ángulos de haz es una entrega
  estándar separada del render estético — valida tu intuición de que
  "estético" y "documentación técnica/plots para ejecución" son dos
  productos distintos con esfuerzo distinto.
- **Mercado freelance de bajo costo (Fiverr-tier):** $100-$450 por render de
  stage design — esto es el piso del mercado genérico, probablemente muy por
  debajo de lo que Mainstage Creative debe cobrar dado que tu posicionamiento
  es producción profesional de giras/eventos, no un render genérico de
  freelancer. Lo incluyo solo como referencia de qué NO es tu benchmark.

**Lectura para Creative:** tu instinto de anclar en fixtures está respaldado
por cómo ya cobra el mercado de rendering ("por elemento complejo agregado").
Las variables adicionales que detecté en la investigación y que deberíamos
sumar a las tuyas:

1. **Tipo de entregable:** still (imagen fija) vs. walkthrough/animación
   (mucho más caro — múltiples frames) vs. vista 360°.
2. **Número de ángulos/escenas por render** (una vista del escenario vs.
   varias cámaras/momentos del show).
3. **Complejidad del diseño además del conteo de fixtures:** no es solo
   "cuántos fixtures" sino también cuántos **tipos distintos** de fixture
   (un rig de 200 moving lights idénticos es más simple de renderizar que
   100 fixtures de 15 modelos distintos) y si hay set/escenografía custom
   además de iluminación.
4. **Turnaround time:** entrega estándar vs. urgente (fee por rush, común en
   toda la industria creativa).
5. **Uso/licencia de la imagen:** uso interno (pitch al cliente) vs. uso en
   marketing/publicidad/redes del artista — esto normalmente cambia el precio
   en fotografía/render comercial, puede aplicar aquí también.
6. **Plataforma/software de origen:** si Creative ya factura con base en
   Capture (herramienta mencionada), probablemente no varía el precio al
   cliente, pero sí el tiempo interno — relevante para calcular margen, no
   para la tarifa pública.

### 3.3 Propuesta: estructura de tarifa para Creative

Propongo una tarifa en 2 capas, aterrizando tu ancla de "precio por fixture"
más las variables de arriba — **esto es un borrador para que lo ajustes con
tus números reales de Carlos Luna**, yo no tengo el precio base:

**Capa 1 — Precio base del render (según fixture count, tu ancla):**

| Rango de fixtures | Precio base sugerido (placeholder, ajustar con tu dato real) |
|---|---|
| 1-50 fixtures | $X |
| 51-150 fixtures | $X + incremento |
| 151-300 fixtures | $X + incremento |
| 300+ fixtures | cotización a medida / precio por tramo adicional |

**Capa 2 — Multiplicadores/add-ons sobre la base:**

- `+ %` si incluye **documentación técnica/plots de producción** (entregable
  separado del render estético, para que el equipo de ejecución pueda montar
  con eso)
- `N revisiones incluidas` (ej. 2 rondas de cambios incluidas; ronda extra =
  fee fijo por ronda)
- `+ %` si es walkthrough/animación en vez de still
- `+ %` por rush/turnaround urgente
- `+ %` si hay más de 1 tipo de fixture distinto / diseño más complejo que
  el promedio (esto puede quedar como ajuste manual del vendedor en vez de
  fórmula rígida, igual que Pro ya permite ajustar líneas de cotización a
  mano)

### 3.4 Esquema de precio — ✅ DECIDIDO (2026-11-06)

Mauricio mandó el tabulador real de Carlos Luna (PDF "Tabulador de Renders"):
precio por fixture count (Bajo 1-30 = $300, Medio 31-60 = $600, Alto 61+ =
$1,000), modelado de venue sencillo/complejo (+$200/+$400), urgencia <48h
(+$250), 3er cambio en adelante ($100 c/u), 2 cambios incluidos. Carlos
aprendió con Mauricio, la licencia de Capture y el equipo son de Mauricio —
ese tabulador es precio a costo, no precio de venta. Decisión: **subir el
precio a lo que vale el entregable y pagarle a Carlos por % de lo cobrado**
(pidió algo cercano a 70% Mainstage / 30% Carlos, rango ~$2,000 A / $4,000 AA
/ $6,000 AAA, sin complicar la cotización. Resuelto con criterio Claude:

**1. Carlos Luna — tabulador final + split 70/30:** escalado limpio 1×/2×/3×
sobre $2,000 (igual proporción que el tabulador original: Medio = 2× Bajo,
Alto ≈ 3× Bajo). El split vive en el campo `costoSugerido` que YA existe en
`ServicioPM` (sin tocar schema): precio al cliente = `precioSugerido`, lo que
percibe Carlos = `costoSugerido`, margen de Mainstage = la diferencia.

| Nivel | Fixtures | Precio cliente | Mainstage (70%) | Carlos Luna (30%) |
|---|---|---|---|---|
| A | 1-30 | $2,000 | $1,400 | $600 |
| AA | 31-60 | $4,000 | $2,800 | $1,200 |
| AAA | 61+ | $6,000 | $4,200 | $1,800 |

**2. Revisiones: 3 incluidas por default** (Mauricio: "sí deben ir por
default, incluimos 3 cambios y el 4° tiene costo adicional, esto lo
definiremos por nivel/tamaño del evento"). El costo del 4° en adelante escala
con el nivel: A = $150, AA = $250, AAA = $350 (más fixtures = más tiempo por
cambio), split 70/30 igual que el resto.

**3. Documentación técnica: siempre obligatoria** en el entregable final
(Mauricio, tal cual) — ya viene empaquetada en el precio base de cada nivel,
no se cobra ni se excluye aparte.

**4. Diseño conceptual: va de la mano de la documentación técnica** (Mauricio,
tal cual) — no se vende como producto aparte. Esto implica retirar del
catálogo el modelo anterior de 2 líneas sueltas ("Render de producción" +
"Diseño y concepto del evento") y reemplazarlo por los 3 niveles de arriba,
cada uno con render + documentación técnica + diseño conceptual integrados.

**5. Niveles de urgencia = SLA estándar por nivel** (Mauricio fue explícito
con el calendario; se interpretó que nivel de urgencia y nivel de complejidad
A/AA/AAA son el mismo eje, no dos sistemas paralelos):

| Nivel | Inicio de trabajo | Días hábiles de trabajo | Entrega |
|---|---|---|---|
| A | día siguiente a aprobación | 1 día | día 2 |
| AA | día siguiente a aprobación | 2 días | día 3 |
| AAA | día siguiente a aprobación | 3 días | día 4 |

Rush opcional, **solo disponible en Nivel A**, sujeto a disponibilidad:
entrega al día siguiente de la solicitud, fee fijo +$600 (split 70/30: Carlos
$180 / Mainstage $420).

**6. Variables adicionales que pidió sumar Mauricio:**

- **Elementos adicionales por categoría** (más allá del conteo de fixtures de
  iluminación) — flat fee, independiente del nivel, se suman a cualquiera de
  los 3 niveles:

  | Elemento | Precio cliente | Mainstage (70%) | Carlos (30%) |
  |---|---|---|---|
  | Sistema de audio (arrays/torres) | $600 | $420 | $180 |
  | Pantalla LED | $500 | $350 | $150 |
  | Stage / entarimado | $400 | $280 | $120 |
  | Rigging y puntos de colgado | $500 | $350 | $150 |
  | Estructuras adicionales (trusses, torres) | $600 | $420 | $180 |

- **Extras** (trabajo base adicional que no está en la base de Capture, no
  son "más fixtures" sino más modelado desde cero):

  | Extra | Precio cliente | Mainstage | Carlos |
  |---|---|---|---|
  | Modelado de venue/escenografía — sencillo (una vez por venue, reutilizable) | $500 | $350 | $150 |
  | Modelado de venue/escenografía — complejo | $1,000 | $700 | $300 |
  | Urgencia (solo Nivel A) | $600 | $420 | $180 |
  | Cambio adicional (4° en adelante) | ver tabla del punto 2 | — | — |

- **Extra premium:**

  | Extra premium | Precio cliente | Mainstage | Carlos |
  |---|---|---|---|
  | Demo de operación de iluminación | $1,500 | $1,050 | $450 |

- **Cruce con Mainstage Live** (Mauricio: "esto lo agregaría estrictamente a
  algún servicio de Mainstage Live" — nacen del trabajo de Creative pero se
  venden/entregan como Live porque es quien los usa en piso):

  | Servicio (catálogo LIVE) | Precio sugerido | Regla |
  |---|---|---|
  | Desarrollo y entrega de patch | $1,000/gira | Obligatorio en toda propuesta con render Nivel A o superior |
  | Predictivo de audio y dispersión | $1,500/plaza | Add-on opcional |
  | Desarrollo de SMPTE / show control | $2,000/gira | Add-on opcional |

### ✅ IMPLEMENTADO EN PRODUCCIÓN (2026-11-06)

Aplicado vía `scripts/seed-servicios-pm.ts` (18 servicios nuevos) +
`scripts/_apply-restructurar-catalogo-creative-render.ts` (desactiva
`RENDER_PRODUCCION` y `DISENO_CONCEPTO`, sin borrar — preserva historial de
`PropuestaServicioLinea`). Sin cambios de schema: el split 70/30 vive en el
campo `costoSugerido` que ya existía.

- Catálogo `unidad=CREATIVE` activo resultante: `RENDER_NIVEL_A/AA/AAA`
  (categoría DISENO), `RENDER_AUDIO`, `RENDER_PANTALLA_LED`, `RENDER_STAGE`,
  `RENDER_RIGGING`, `RENDER_ESTRUCTURAS` (elementos adicionales),
  `MODELADO_VENUE_SENCILLO/COMPLEJO`, `URGENCIA_RENDER`,
  `CAMBIO_ADICIONAL_RENDER_A/AA/AAA`, `DEMO_OPERACION_ILUMINACION` (extra
  premium), más `PLANO_MONTAJE` que sigue vivo sin tocarse (layout de sitio,
  entregable distinto a la documentación de iluminación).
- Catálogo `unidad=LIVE` ganó `PATCH_DESARROLLO`, `PREDICTIVO_AUDIO`,
  `DESARROLLO_SMPTE`.
- `npm run build` verde. No hizo falta tocar `src/lib/giras.ts`: todas las
  categorías usadas (DISENO, AUDIO, VIDEO, EQUIPO, DOCUMENTACION) ya
  existían, así que el selector de propuesta (`ModalCatalogo` en
  `PropuestaEditor.tsx`) agrupa los add-ons nuevos automáticamente sin
  cambios de código.

---

## 4. Proceso end-to-end: Descubrimiento → Trato → Propuesta → Proyecto

Esto aplica a ambas unidades con el mismo esqueleto de Pro, pero cada paso
tiene que capturar lo que esa unidad necesita.

### 4.1 Lo que dijiste

Quieres diseñar: registro de la oportunidad → descubrimiento de servicios
internos → fecha, nombre del proyecto, cliente, notas → que se guarde un
Trato dentro de un módulo de pipeline comercial (desarrollar uno si no
existe) → módulo de cotización/propuesta (seleccionar servicios, poner
precio, ajustar, guardar, descargar presentación/PDF) → al aprobarse, generar
un Proyecto donde se empieza a trabajar lo cotizado. Cada unidad distinta,
pero basada en la base sólida de Pro, identificando qué features/módulos
necesita cada una.

### 4.2 Buena noticia: el "módulo de pipeline comercial" ya existe

No hay que construirlo desde cero — es el `Trato`. Ya es agnóstico de unidad
(etapas `PROSPECCION → DESCUBRIMIENTO → OPORTUNIDAD → VENTA_CERRADA`), y
`Gira`/`ProyectoCreativo` ya pueden colgar de un `Trato` (`tratoId`
opcional). Lo que falta no es el pipeline — es que **Live y Creative lo usen
siempre** (hoy es opcional, pueden nacer sin pasar por ahí) y que el paso de
Descubrimiento capture los campos correctos para cada unidad en vez de los
campos de Pro (equipo, renta, nivel de involucramiento técnico de montaje).

### 4.3 Paso 1 — Descubrimiento propio por unidad (lo que hay que construir)

**Para Live**, en vez del `DiscoveryForm` de Pro (pensado para renta de
equipo), un formulario de descubrimiento con:
- Nombre del proyecto/gira, artista, cliente (igual que Pro)
- Tipo: show único / festival / gira corta / gira larga (alimenta la
  complejidad del punto 2.4)
- Fecha(s) — si es gira, rango de fechas y número de fechas
- Alcance geográfico: local/nacional/internacional
- Qué necesita el cliente: ¿solo Production Management? ¿ya sabe que quiere
  add-ons (tour/stage management, audio, iluminación, visuales)?
- Notas

**Para Creative**, un formulario de descubrimiento con:
- Nombre del proyecto, cliente/artista
- Tipo de entregable esperado: ¿solo render estético? ¿también
  documentación técnica? ¿diseño conceptual desde cero (brief) o ya tienen
  dirección definida?
- Fecha de entrega esperada
- Fixture count estimado (si ya se conoce) o referencia del show/escenario
- Notas / referencias visuales

### 4.4 Paso 2 — Propuesta/Cotización (reusar `PropuestaServicio`, no reinventar)

Ya existe el modelo y el PDF. Lo que falta:
- **Live:** que la UI de armado de propuesta refleje la reestructura del
  catálogo (sección 2.3): tres bloques independientes y combinables
  (Production Management, Tour Management, Stage Management), cada uno con
  su propio checklist de alcance, más un selector de add-ons (Audio,
  Iluminación, Visuales, Backline) — en vez de la lista plana actual de
  `/giras/servicios`.
- **Creative:** agregar a `PropuestaServicioLinea` (o a un campo nuevo
  ligado a la propuesta) los campos que alimentan la tarifa: conteo de
  fixtures, si incluye documentación técnica, número de revisiones
  incluidas — para que el precio se pueda calcular con ayuda en vez de
  escribirse a mano.
- **Ambas:** ya heredan el PDF, el portal de aprobación y el token — no hay
  que tocar esa parte.

### 4.5 Paso 3 — Aprobación → Proyecto (el hueco real)

- **Live:** cuando se aprueba la propuesta, hoy confirma el `GiraShow` y
  cierra el `Trato`, pero el `GiraShow` solo genera un `Proyecto` (de Pro) si
  esa fecha también se cotiza como renta de equipo. Para el caso puro de
  "solo vendimos Production Management", la ejecución YA vive en `Gira` +
  `GiraShow` + sus relaciones (crew, hospedaje, setlist, documentos,
  advance) — **no hace falta un "Proyecto" nuevo**, la gira YA es el
  proyecto. Lo que hay que confirmar es que, al aprobar, el flujo de trabajo
  operativo (crew, logística, documentos) se desbloquee/visibilice
  correctamente, no que se cree una entidad nueva.
- **Creative:** aquí SÍ hay un hueco real. `ProyectoCreativo` existe pero es
  ligero (solo `briefing`, `notas`, estado `BRIEF→EN_PROCESO→REVISION→
  ENTREGADO`) y **no avanza de estado automáticamente** cuando se aprueba la
  propuesta. Hay que decidir: ¿qué información de la propuesta aprobada se
  debe volcar al proyecto para "empezar a trabajar" (fixture count,
  referencias, deadline, número de revisiones contratadas)? ¿Se necesita un
  checklist/tareas de ejecución (como el checklist de Pro), o basta con los
  4 estados actuales?

### 4.6 Proceso — ✅ DECIDIDO (criterio Claude, 2026-11-06; Mauricio: "no lo sé, tú defínelo")

1. **Live: NO se construye un "Proyecto" nuevo ni un tablero adicional.**
   `Gira`/`GiraShow` ya tiene suficiente profundidad operativa (crew,
   logística, documentos, advance) — agregar un tablero encima sería
   duplicar lo que ya existe sin un vacío real que lo justifique.
2. **Creative: se mantienen los 4 estados actuales** (`BRIEF → EN_PROCESO →
   REVISION → ENTREGADO`), sin construir un tablero nuevo por ronda de
   revisión (sería sobre-ingeniería para "cliente pide cambios → se ajusta →
   se reenvía"). Dos ajustes mínimos — ✅ hechos 2026-11-06:
   - Avanzar `BRIEF → EN_PROCESO` automáticamente al aprobarse la propuesta
     (cierra el hueco real de §4.5): `confirmarProyectoCreativoDesdePropuesta`
     (`src/lib/confirmar-proyecto-creativo-desde-propuesta.ts`), espejo de
     `confirmarGiraDesdePropuesta`, enganchado en los dos canales de
     aprobación (`/api/propuestas-servicio/[id]` y
     `/api/propuestas-servicio/publica/[token]`). Idempotente: solo toca
     proyectos en `BRIEF`, nunca retrocede ni resucita uno ya cerrado.
   - Contador simple "revisiones usadas / incluidas" visible en el proyecto,
     para que el vendedor sepa cuándo ya toca cobrar el cambio extra (tabla
     de §3.4 punto 2) — no un Kanban, solo un contador. Dos columnas nuevas
     en `ProyectoCreativo` (`revisionesIncluidas` default 2,
     `revisionesUsadas` default 0, DDL
     `scripts/_apply-contador-revisiones-proyecto-creativo.ts`), con
     botones +/− y aviso visual en `/creative/[id]` cuando se pasa del
     incluido.
3. **El brief conceptual NO necesita un paso formal nuevo.** El campo
   `briefing` libre que ya existe en `ProyectoCreativo` es suficiente, porque
   el diseño conceptual ya no es un producto que se capture aparte — va
   empaquetado dentro del render (§3.4 punto 4).

---

## 5. Orden sugerido de construcción (para cuando pasemos a código)

Esto es solo una sugerencia de secuencia, no un compromiso de fechas:

1. Cerrar las preguntas abiertas de este documento (secciones 2.5, 3.4, 4.6).
2. **Live primero** (como pediste), en paralelo evaluando Creative:
   - ~~Reestructurar catálogo `ServicioPM` de Live~~ ✅ hecho 2026-11-06 (ver
     sección 2.3).
   - ~~Descubrimiento propio de Live~~ ✅ hecho 2026-11-06 — **no se construyó
     ligado a `Trato`**: al revisar el modelo real se confirmó que `Gira` (no
     `Trato`) es la entidad raíz de Live en producción (`Gira.tratoId` existe
     pero casi nunca se usa; las giras nacen directo). El descubrimiento se
     extendió sobre lo que ya existía en vez de inventar un flujo paralelo:
     - `GiraDescubrimientoForm` (el formulario que ya alimentaba el alta
       rápida de "Nueva gira"/"Nuevo show" desde `/giras/lista`) ahora también
       captura: **complejidad** (show chico/mediano/festival/gira corta/gira
       larga) y **alcance geográfico** (local/nacional/internacional) — dos
       campos nuevos y nullable en `Gira` (`complejidad`,
       `alcanceGeografico`, DDL aditivo vía
       `scripts/_apply-complejidad-alcance-gira.ts`) — y un checklist de
       **servicios que busca el cliente** (PM/TM/SM + add-ons del catálogo
       `ServicioPM` filtrado a `unidad=LIVE`), que alimenta el mismo
       `Gira.rolMainstage` que ya usaba la ficha de la gira. Nada bloquea la
       creación: todo es opcional y ajustable después.
     - La ficha de la gira (`GiraResumenClient`, modo edición) gana los
       mismos dos selects de complejidad/alcance junto al bloque existente
       "Lo que asume Mainstage"; el modo lectura los muestra como dato.
     - De paso se corrigió un bug menor encontrado al tocar este código: la
       consulta de servicios para el selector de `rolMainstage` en
       `/giras/[id]` no filtraba `unidad`, así que en teoría podía ofrecer
       servicios de Creative dentro de una gira — ahora filtra `unidad: "LIVE"`.
   - ~~UI de propuesta de Live con el nuevo bloque PM + add-ons + checkboxes
     de responsabilidad de gastos~~ ✅ hecho 2026-11-06.
3. **Creative:**
   - ~~Definir la tarifa real (capa 1 con tu número de Carlos Luna)~~ ✅ hecho
     2026-11-06 (§3.4) — catálogo reestructurado y sembrado en producción.
   - **Pendiente:** campos de propuesta para fixture count / nivel A-AA-AAA /
     revisiones usadas — hoy el vendedor elige a mano el renglón
     `RENDER_NIVEL_A/AA/AAA` del catálogo (igual que cualquier otro servicio),
     no hay un calculador automático por conteo de fixtures. Es el siguiente
     paso de UI si se quiere automatizar.
   - **Pendiente:** descubrimiento propio de Creative (no se construyó esta
     sesión).
   - ~~Decidir si se necesita más estructura de ejecución~~ ✅ hecho
     2026-11-06 (§4.6) — se quedan los 4 estados, con avance automático al
     aprobar + contador de revisiones ✅ también construidos 2026-11-06.
4. Verificación cruzada: una oportunidad de prueba de cada unidad, de punta a
   punta (descubrimiento → trato → propuesta → PDF → aprobación → ejecución)
   — sigue pendiente.

---

## 6. Todas las preguntas, juntas — ✅ TODAS RESUELTAS (2026-11-06)

**Live** (detalle en §2.5):
1. ✅ PM/TM/SM independientes y combinables.
2. ✅ Multiplicador sobre tarifa única (no tarifas base separadas).
3. ✅ Geografía solo ajusta viáticos; el honorario base no cambia.
4. ✅ Retainer por artista; fórmula de partida $4,000 × shows/mes × 0.80,
   pendiente calibrar con primer caso real.
5. ✅ Ancla: $4,000 MXN por show.
6. ✅ Responsabilidad de gastos: 4 líneas, ya implementado en producción.

**Creative** (detalle en §3.4, implementado en producción):
7. ✅ Tabulador real de Carlos Luna recibido y escalado a precio de venta con
   split 70/30 ($2,000/$4,000/$6,000 por nivel A/AA/AAA).
8. ✅ 3 revisiones incluidas por default; 4ª en adelante con costo escalado
   por nivel.
9. ✅ Documentación técnica siempre obligatoria, empaquetada en el precio.
10. ✅ Diseño conceptual NO se vende aparte — va con la documentación técnica.
11. ✅ Turnaround entra ya: SLA estándar por nivel (A/AA/AAA) + rush opcional
    solo en Nivel A.

**Proceso (ambas, detalle en §4.6):**
12. ✅ Live se queda en Gira/GiraShow, sin tablero nuevo.
13. ✅ Creative se queda con los 4 estados + avance automático al aprobar +
    contador de revisiones (pendiente de construir, no bloqueante).
14. ✅ El campo `briefing` libre actual es suficiente, sin paso formal nuevo.

**Lo único que sigue pendiente de construir** (no de decidir): descubrimiento
propio de Creative, el avance automático de estado + contador de revisiones
de `ProyectoCreativo`, y la verificación cruzada de punta a punta de ambas
unidades (ver §5, puntos 3-4).

---

## Fuentes consultadas (benchmark de mercado)

- [What Should a Concert Tour Manager Charge?](https://livemusicbusiness.com/what-should-a-concert-tour-manager-charge-a-tour-managers-view/)
- [Pricing Tours & Calculating True Profit Margin](https://atlasperk.com/guides/finance-for-travel/tour-pricing-margins/)
- [Day-of-Show Managers: Do You Need One?](https://orphiq.com/resources/day-of-show-manager)
- [Who's on an artist's team? How they are paid.](https://henrychatfield.medium.com/whos-on-an-artist-s-team-how-they-are-paid-17c7874144b1)
- [Production management (performing arts) — Wikipedia](https://en.wikipedia.org/wiki/Production_management_(performing_arts))
- [Per Diem — How Daily Allowances Work on Tour](https://www.daysheets.com/glossary/per-diem)
- [Per Diems: How to Pay Them and Still Save (Some) Money](https://livemusicbusiness.com/per-diems-how-to-pay-them-and-still-save-some-money/)
- [3D Rendering Cost in 2026: $250–$5,000 per Image](https://maverickframe.com/blog/3d-rendering-pricing/)
- [Professional Lighting Design Services — Dominion Lighting](https://dominionlighting.com/professional-lighting-design-services/)
- [Light plot — Wikipedia](https://en.wikipedia.org/wiki/Light_plot)
- [Stage Lighting Design for Touring Music Artists — Duck Lights](https://www.ducklights.com/design)
