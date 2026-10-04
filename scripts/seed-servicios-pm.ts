// Catálogo de servicios de Dirección y operaciones: los de gira (orden 10-120)
// y los de evento de un solo sitio (orden 200+).
// Idempotente por `clave`: se puede correr cuantas veces se quiera.
//
//   ENV_FILE=.env.prod.backup npx tsx scripts/seed-servicios-pm.ts
//
// Los precios que van en 0 (día de viaje, hora de advance) son decisión
// comercial de hoy: el renglón existe para que exista el concepto y se le pueda
// poner precio desde /giras/servicios sin tocar código.
import { config } from "dotenv";
config({ path: process.env.ENV_FILE || ".env.prod.backup" });
import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";

interface ServicioSemilla {
  clave: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  entregables: string;
  incluye: string;
  noIncluye: string;
  unidadDefault: string;
  tipoLinea: string;
  precioSugerido: number | null;
  costoSugerido: number | null;
  orden: number;
}

const SERVICIOS: ServicioSemilla[] = [
  {
    clave: "PM_GIRA",
    nombre: "Production management de gira",
    categoria: "PRODUCTION_MANAGEMENT",
    descripcion:
      "Dirección de producción de la gira completa: un solo responsable para que el artista no tenga que hablar con diez personas distintas. Se centraliza el advance de todas las plazas, el itinerario, el crew, la logística y la supervisión en sitio.",
    entregables: [
      "Itinerario maestro de la gira con fechas, plazas y horarios",
      "Day sheet por fecha, distribuido al artista y al crew",
      "Directorio de contactos de casa, promotores y proveedores",
      "Reporte de cierre por plaza con pendientes y aprendizajes",
    ].join("\n"),
    incluye: [
      "Interlocución única con promotores, venues y proveedores",
      "Advance técnico y logístico de cada plaza",
      "Armado y coordinación del crew asignado a la gira",
      "Supervisión en sitio del montaje, soundcheck y show",
      "Control de avance y alertas de riesgo antes de cada fecha",
    ].join("\n"),
    noIncluye: [
      "Renta de equipo técnico (se cotiza aparte o se contrata con la casa)",
      "Vuelos, hotel, traslados y per diem del crew de Mainstage",
      "Honorarios del crew de giras que no sea de Mainstage",
      "Permisos, derechos de autor y seguros del evento",
    ].join("\n"),
    unidadDefault: "GIRA",
    tipoLinea: "HONORARIO",
    precioSugerido: null,
    costoSugerido: null,
    orden: 10,
  },
  {
    clave: "AUDIO_BANDA",
    nombre: "Responsable de audio del artista",
    categoria: "AUDIO",
    descripcion:
      "Ingeniero de audio del artista en la plaza: FOH y/o monitores según el show. Cubre el día completo —load-in, advance con la casa, patch, soundcheck y operación— y empuja al técnico de la casa para que el sistema entregue lo que el rider pide.",
    entregables: [
      "Patch list y line check documentados por fecha",
      "Escena de consola guardada y respaldada para la siguiente plaza",
      "Nota de cierre con lo que cumplió y lo que falló del sistema de la casa",
    ].join("\n"),
    incluye: [
      "Día completo de show: load-in, advance con la casa, soundcheck y show",
      "Patch de entradas y salidas, line check y afinación de monitores",
      "Operación de FOH y/o monitores durante el show",
      "Coordinación directa con el técnico de sistema de la casa",
    ].join("\n"),
    noIncluye: [
      "Consola, PA, microfonía y cableado (los pone la casa o se rentan aparte)",
      "Día de viaje y día muerto (renglón aparte)",
      "Vuelos, hotel, traslados y alimentos",
      "Segundo ingeniero cuando el show requiere FOH y monitores por separado",
    ].join("\n"),
    unidadDefault: "SHOW",
    tipoLinea: "HONORARIO",
    precioSugerido: 3000,
    costoSugerido: null,
    orden: 20,
  },
  {
    clave: "ADVANCE_PLAZA",
    nombre: "Advance técnico por plaza",
    categoria: "PRODUCTION_MANAGEMENT",
    descripcion:
      "El trabajo que evita sorpresas el día del show: cotejar el rider del artista contra la ficha técnica real del venue, negociar con la casa lo que falta y dejar por escrito qué va a haber en el escenario. Se cobra por plaza, no por fecha: tres fechas en el mismo venue son un solo advance.",
    entregables: [
      "Rider ajustado a la plaza, con lo indispensable marcado",
      "Contra-rider de la casa recibido y conciliado renglón por renglón",
      "Lista de faltantes con la vía de solución de cada uno",
      "Horarios de load-in, soundcheck, doors, show y curfew confirmados",
    ].join("\n"),
    incluye: [
      "Revisión del rider contra el inventario y la ficha técnica del venue",
      "Interlocución con el contacto técnico de la casa y el promotor",
      "Negociación de sustituciones aceptables y de lo que no se negocia",
      "Emisión del rider ajustado y del contra-rider conciliado",
      "Confirmación de accesos, carga y descarga, energía y curfew",
    ].join("\n"),
    noIncluye: [
      "Renta del equipo faltante (se cotiza por separado)",
      "Visita física previa al venue",
      "Trámites de permisos municipales o de protección civil",
    ].join("\n"),
    unidadDefault: "PLAZA",
    tipoLinea: "ADVANCE",
    precioSugerido: null,
    costoSugerido: null,
    orden: 30,
  },
  {
    clave: "ILUMINACION_SHOW",
    nombre: "Diseño y operación de iluminación",
    categoria: "ILUMINACION",
    descripcion:
      "Diseño de iluminación del show y operación en vivo. El diseño se arma una vez y se adapta a cada plaza según el inventario real de la casa, para que el look del artista se sostenga aunque cambie el rig.",
    entregables: [
      "Plot de iluminación y lista de canales",
      "Show file de consola con escenas por canción",
      "Cue list y notas de operación",
    ].join("\n"),
    incluye: [
      "Diseño de iluminación acorde al setlist y al look del artista",
      "Programación de la consola y adaptación al rig de cada plaza",
      "Operación en vivo durante soundcheck y show",
      "Coordinación con el jefe de iluminación de la casa",
    ].join("\n"),
    noIncluye: [
      "Renta de luminarias, consola, estructura y dimmers",
      "Rigging, montaje y energía",
      "Follow spots y operadores adicionales",
    ].join("\n"),
    unidadDefault: "SHOW",
    tipoLinea: "HONORARIO",
    precioSugerido: null,
    costoSugerido: null,
    orden: 40,
  },
  {
    clave: "VISUALES_SHOW",
    nombre: "Operación de visuales y contenido",
    categoria: "VIDEO",
    descripcion:
      "Operación de visuales sincronizados con el setlist: preparación del contenido del artista, mapeo a la pantalla de cada plaza y disparo en vivo.",
    entregables: [
      "Proyecto de visuales listo y respaldado",
      "Contenido mapeado al formato de pantalla de la plaza",
      "Lista de disparos por canción",
    ].join("\n"),
    incluye: [
      "Preparación y conversión del contenido entregado por el artista",
      "Mapeo al formato y resolución de la pantalla de cada plaza",
      "Operación y disparo en vivo durante el show",
      "Coordinación con el switcher y el técnico de video de la casa",
    ].join("\n"),
    noIncluye: [
      "Producción o creación del contenido audiovisual",
      "Renta de pantalla, procesador, servidor de medios y cableado",
      "Cámaras, switcher y dirección de IMAG",
    ].join("\n"),
    unidadDefault: "SHOW",
    tipoLinea: "HONORARIO",
    precioSugerido: null,
    costoSugerido: null,
    orden: 50,
  },
  {
    clave: "COORD_PROVEEDORES",
    nombre: "Coordinación de proveedores locales",
    categoria: "PRODUCTION_MANAGEMENT",
    descripcion:
      "Conseguir en cada ciudad lo que la casa no pone: cotizar con proveedores locales, comparar, negociar y dejar confirmado el equipo faltante con horarios de entrega. Se cobra por plaza.",
    entregables: [
      "Comparativo de cotizaciones por plaza",
      "Orden de servicio o confirmación por escrito con cada proveedor",
      "Horarios de entrega, montaje y retiro acordados",
    ].join("\n"),
    incluye: [
      "Búsqueda y calificación de proveedores en la ciudad de la plaza",
      "Solicitud y comparación de cotizaciones del faltante del rider",
      "Negociación de precio, alcance y horarios",
      "Seguimiento de entrega y verificación en sitio",
    ].join("\n"),
    noIncluye: [
      "El costo de la renta en sí (se factura aparte o directo con el proveedor)",
      "Anticipos y garantías que exija el proveedor",
      "Daños o faltantes imputables al uso del equipo rentado",
    ].join("\n"),
    unidadDefault: "PLAZA",
    tipoLinea: "COORDINACION",
    precioSugerido: null,
    costoSugerido: null,
    orden: 60,
  },
  {
    clave: "LOGISTICA_TOUR",
    nombre: "Logística de crew y artistas",
    categoria: "LOGISTICA",
    descripcion:
      "Mover a la gente: vuelos, hotel, rooming list y traslados tierra de artista y crew. El honorario es por coordinar; el gasto de viaje va por cuenta del cliente o reembolsable a costo.",
    entregables: [
      "Itinerario de vuelos y traslados por persona",
      "Rooming list por hotel y por noche",
      "Travel day sheet con horarios de pickup y contactos",
    ].join("\n"),
    incluye: [
      "Cotización y reserva de vuelos, hotel y traslados",
      "Armado de la rooming list y gestión de check-in y check-out",
      "Coordinación de pickups de aeropuerto, hotel y venue",
      "Atención de cambios e imprevistos durante la gira",
    ].join("\n"),
    noIncluye: [
      "El costo de los vuelos, hotel, traslados y per diem (reembolsable o por cuenta del cliente)",
      "Penalizaciones por cambio o cancelación de boletos",
      "Visas, trámites migratorios y seguros de viaje",
    ].join("\n"),
    unidadDefault: "GIRA",
    tipoLinea: "COORDINACION",
    precioSugerido: null,
    costoSugerido: null,
    orden: 70,
  },
  {
    clave: "DOCUMENTACION_TOUR",
    nombre: "Documentación técnica de gira",
    categoria: "DOCUMENTACION",
    descripcion:
      "El paquete de documentos que hace que cualquier venue del mundo sepa qué necesita el artista. Pago único: se arma una vez, se versiona y sirve para toda la gira.",
    entregables: [
      "Rider técnico maestro en PDF, listo para enviar a promotores",
      "Input list y output list numeradas",
      "Stage plot a escala con medidas y posiciones",
      "Patch list y plano de monitoreo por mix",
      "Plantilla de day sheet de la gira",
    ].join("\n"),
    incluye: [
      "Levantamiento técnico con el artista y su crew",
      "Redacción y diagramación del rider maestro",
      "Input/output list, stage plot y patch list",
      "Una ronda de ajustes y el versionado del documento",
    ].join("\n"),
    noIncluye: [
      "Traducción a otros idiomas",
      "Rediseño por cambio de formación o de setlist después de la entrega",
      "Renders 3D o planos de arquitectura del escenario",
    ].join("\n"),
    unidadDefault: "GLOBAL",
    tipoLinea: "DOCUMENTACION",
    precioSugerido: null,
    costoSugerido: null,
    orden: 80,
  },
  {
    clave: "PREPRODUCCION",
    nombre: "Preproducción, ensayo o residencia",
    categoria: "PRODUCTION_MANAGEMENT",
    descripcion:
      "Día de trabajo fuera del show: ensayo con producción, residencia de montaje, prueba de setlist o armado del show en sala. Se cobra por día.",
    entregables: [
      "Minuta del día con decisiones y pendientes",
      "Escenas, cues y escaleta actualizadas",
    ].join("\n"),
    incluye: [
      "Jornada de trabajo técnico con el artista",
      "Montaje y prueba del flujo de show",
      "Ajuste de escenas, cues y tiempos de cambio",
    ].join("\n"),
    noIncluye: [
      "Renta de la sala de ensayo y del equipo de ensayo",
      "Backline y transporte",
      "Alimentos y traslados del día",
    ].join("\n"),
    unidadDefault: "DIA",
    tipoLinea: "HONORARIO",
    precioSugerido: null,
    costoSugerido: null,
    orden: 90,
  },
  {
    clave: "DIA_VIAJE",
    nombre: "Día de viaje o día muerto",
    categoria: "PRODUCTION_MANAGEMENT",
    descripcion:
      "Día de la gira que no es show pero bloquea la agenda: traslado entre plazas o día muerto en ruta. Hoy no se cobra; el renglón existe para que quede documentado y se le pueda poner precio después.",
    entregables: ["Confirmación de traslado y de llegada a la siguiente plaza"].join("\n"),
    incluye: [
      "Disponibilidad exclusiva del día",
      "Traslado entre plazas con el artista o el crew",
      "Custodia y verificación del equipo en tránsito",
    ].join("\n"),
    noIncluye: [
      "Vuelos, hotel, traslados y alimentos del día (reembolsables o por cuenta del cliente)",
      "Trabajo técnico de montaje o soundcheck",
    ].join("\n"),
    unidadDefault: "DIA",
    tipoLinea: "HONORARIO",
    precioSugerido: 0,
    costoSugerido: null,
    orden: 100,
  },
  {
    clave: "ADVANCE_HORA",
    nombre: "Hora de advance en oficina",
    categoria: "PRODUCTION_MANAGEMENT",
    descripcion:
      "Trabajo de escritorio fuera del alcance contratado: llamadas, correos, cotizaciones y papeleo medidos por hora. Hoy no se cobra; queda en el catálogo para facturar excedentes cuando haga falta.",
    entregables: ["Bitácora de horas con el detalle de lo atendido"].join("\n"),
    incluye: [
      "Llamadas y correos con casas, promotores y proveedores",
      "Cotizaciones, comparativos y seguimiento documental",
      "Actualización del advance y de los documentos de gira",
    ].join("\n"),
    noIncluye: [
      "Presencia en sitio el día del show",
      "Diseño de documentos nuevos de gira",
    ].join("\n"),
    unidadDefault: "HORA",
    tipoLinea: "COORDINACION",
    precioSugerido: 0,
    costoSugerido: null,
    orden: 110,
  },
  {
    clave: "BACKLINE_COMPLEMENTARIO",
    nombre: "Renta de equipo complementario",
    categoria: "EQUIPO",
    descripcion:
      "Equipo de Mainstage que se suma a lo que pone la casa: backline, microfonía específica, IEM, radios o lo que el advance detecte como faltante. Se cotiza por pieza y por fecha.",
    entregables: ["Lista de carga del equipo entregado y recibido en cada plaza"].join("\n"),
    incluye: [
      "Equipo verificado y probado antes de salir de bodega",
      "Cableado y accesorios propios de cada pieza",
      "Entrega y retiro en la plaza según los horarios acordados",
    ].join("\n"),
    noIncluye: [
      "Transporte de larga distancia y maniobras especiales",
      "Técnico operador (se cotiza como honorario aparte)",
      "Reposición por daño, pérdida o robo en sitio",
    ].join("\n"),
    unidadDefault: "PIEZA",
    tipoLinea: "EQUIPO",
    precioSugerido: null,
    costoSugerido: null,
    orden: 120,
  },

  // ── Lado evento: Dirección y operaciones ───────────────────────────────────
  // Los de arriba cobran una gira; estos cobran un evento de un solo sitio. Son
  // lo que ya se venía regalando dentro de la cotización de equipo: el criterio,
  // el tiempo en piso y los renders.
  {
    clave: "PM_EVENTO",
    nombre: "Dirección de producción del evento",
    categoria: "PRODUCTION_MANAGEMENT",
    descripcion:
      "Dirección de producción del evento completo: un solo responsable que arma el plan, cuadra a todos los proveedores y responde por que el montaje salga como se diseñó. El cliente habla con una persona, no con cada frente por separado.",
    entregables: [
      "Plan de producción con cronograma de montaje, evento y desmontaje",
      "Directorio de contactos de venue, proveedores y responsables por frente",
      "Ficha operativa del evento distribuida a todos los involucrados",
      "Reporte de cierre con lo que funcionó y los pendientes de cobro o daño",
    ].join("\n"),
    incluye: [
      "Interlocución única con el cliente, el venue y los proveedores",
      "Visita y advance del sitio: accesos, cargas, energía y tiempos",
      "Cronograma de montaje y desmontaje negociado con el venue",
      "Supervisión del arranque del montaje y del cierre del evento",
      "Control de avance y alertas de riesgo antes de la fecha",
    ].join("\n"),
    noIncluye: [
      "Renta de equipo técnico (se cotiza aparte)",
      "Costo de los proveedores de otros frentes (se factura a costo o aparte)",
      "Permisos, derechos de autor, seguros y protección civil",
      "Operación técnica durante el evento (es otro renglón)",
    ].join("\n"),
    unidadDefault: "GLOBAL",
    tipoLinea: "HONORARIO",
    precioSugerido: null,
    costoSugerido: null,
    orden: 200,
  },
  {
    clave: "OPERACIONES_SITIO",
    nombre: "Operaciones de sitio",
    categoria: "PRODUCTION_MANAGEMENT",
    descripcion:
      "Gente de Mainstage en piso durante el montaje y el evento, resolviendo lo que no estaba en el plan: accesos, maniobras, tiempos que se corren y proveedores que llegan tarde. Se cobra por día en sitio, no por evento.",
    entregables: [
      "Bitácora del día: horarios reales de cada hito y desviaciones",
      "Lista de pendientes e incidencias con responsable",
    ].join("\n"),
    incluye: [
      "Responsable de operaciones presente el día completo",
      "Control de accesos, maniobras y orden de llegada de proveedores",
      "Seguimiento del cronograma y renegociación de tiempos en vivo",
      "Cierre de sitio: desmontaje, entrega del espacio y conteo",
    ].join("\n"),
    noIncluye: [
      "Personal de carga, montaje o limpieza (es cuadrilla, se cotiza aparte)",
      "Operación técnica de audio, luz o video",
      "Traslados, hospedaje y alimentos fuera de la ciudad",
    ].join("\n"),
    unidadDefault: "DIA",
    tipoLinea: "HONORARIO",
    precioSugerido: null,
    costoSugerido: null,
    orden: 210,
  },
  {
    clave: "STAGE_MANAGER",
    nombre: "Stage management",
    categoria: "PRODUCTION_MANAGEMENT",
    descripcion:
      "Responsable del escenario durante el show: corre el programa, llama los cambios, mueve los actos y mantiene el backstage limpio. Es quien hace que un evento con varios participantes no se desfase.",
    entregables: [
      "Running order del escenario con horarios y responsables de cada cambio",
      "Plano de backstage y posiciones de cambio",
      "Reporte de cierre con los tiempos reales contra el programa",
    ].join("\n"),
    incluye: [
      "Stage manager en piso durante pruebas y show",
      "Running order acordado con el cliente y los participantes",
      "Llamados, cambios de acto y control de tiempos en escenario",
      "Coordinación con audio, iluminación y video durante el programa",
    ].join("\n"),
    noIncluye: [
      "Guion, conducción y contenido del programa",
      "Cuadrilla de cambios de escenario (se cotiza aparte)",
      "Operación técnica de cualquier disciplina",
    ].join("\n"),
    unidadDefault: "DIA",
    tipoLinea: "HONORARIO",
    precioSugerido: null,
    costoSugerido: null,
    orden: 220,
  },
  {
    clave: "COORD_FRENTES",
    nombre: "Coordinación de frentes de producción",
    categoria: "PRODUCTION_MANAGEMENT",
    descripcion:
      "Gestión de los frentes que no son nuestros: planta de luz, entarimado, estructura, vallas, sanitarios, carpas o seguridad. Cotizamos, comparamos, contratamos y respondemos por que lleguen y cumplan. Se cobra por frente coordinado, no por evento.",
    entregables: [
      "Comparativo de cotizaciones del frente con recomendación",
      "Especificación de lo contratado: medidas, capacidades y horarios",
      "Confirmación de llegada y conformidad de entrega en sitio",
    ].join("\n"),
    incluye: [
      "Búsqueda y comparación de proveedores del frente",
      "Negociación de precio, alcance y horarios de montaje",
      "Supervisión de la llegada, el montaje y el retiro",
      "Responsabilidad de interlocución: el cliente no persigue al proveedor",
    ].join("\n"),
    noIncluye: [
      "El costo del proveedor (se factura a costo comprobable o lo paga el cliente directo)",
      "Permisos, dictámenes estructurales y seguros del frente",
      "Reposición por incumplimiento del proveedor",
    ].join("\n"),
    unidadDefault: "PIEZA",
    tipoLinea: "COORDINACION",
    precioSugerido: null,
    costoSugerido: null,
    orden: 230,
  },
  {
    clave: "RENDER_PRODUCCION",
    nombre: "Render de producción",
    categoria: "DISENO",
    descripcion:
      "Render 3D de cómo se va a ver el montaje: escenario, entarimado, estructura, pantallas y posiciones de equipo en el sitio real. Sirve para vender la idea al cliente final y para que el montaje no se improvise. Se cobra por vista entregada.",
    entregables: [
      "Render en alta resolución de la vista acordada",
      "Versión con medidas para el equipo de montaje",
    ].join("\n"),
    incluye: [
      "Modelado del escenario y la producción sobre el sitio del evento",
      "Una ronda de ajustes sobre la vista entregada",
      "Entrega en formato para presentación y para montaje",
    ].join("\n"),
    noIncluye: [
      "Vistas adicionales y recorridos en video (son renglones aparte)",
      "Diseño conceptual del evento si no está contratado",
      "Planos estructurales firmados por perito",
    ].join("\n"),
    unidadDefault: "PIEZA",
    tipoLinea: "HONORARIO",
    precioSugerido: null,
    costoSugerido: null,
    orden: 240,
  },
  {
    clave: "DISENO_CONCEPTO",
    nombre: "Diseño y concepto del evento",
    categoria: "DISENO",
    descripcion:
      "El paso anterior al render: definir qué se quiere lograr y cómo se ve. Concepto, referencias, paleta, tratamiento del escenario y criterio de iluminación, antes de que exista una lista de equipo.",
    entregables: [
      "Documento de concepto con referencias y criterio visual",
      "Propuesta de tratamiento de escenario e iluminación",
      "Lista de equipo que el concepto implica, para cotizar",
    ].join("\n"),
    incluye: [
      "Sesión de arranque con el cliente para fijar el objetivo del evento",
      "Investigación de referencias y propuesta de concepto",
      "Dos rondas de ajuste sobre el concepto presentado",
    ].join("\n"),
    noIncluye: [
      "Renders (se cotizan por vista)",
      "Diseño gráfico, branding e impresos del evento",
      "Producción de contenido para pantallas",
    ].join("\n"),
    unidadDefault: "GLOBAL",
    tipoLinea: "HONORARIO",
    precioSugerido: null,
    costoSugerido: null,
    orden: 250,
  },
  {
    clave: "PLANO_MONTAJE",
    nombre: "Plano de montaje y layout de sitio",
    categoria: "DOCUMENTACION",
    descripcion:
      "Plano a escala de cómo se acomoda todo en el sitio: escenario, equipo, mobiliario, accesos, rutas de carga y posiciones de proveedores. Es el documento con el que el venue autoriza y con el que el crew monta sin preguntar.",
    entregables: [
      "Plano en planta a escala, con medidas y cotas de accesos",
      "Versión para el venue y versión para el crew de montaje",
    ].join("\n"),
    incluye: [
      "Levantamiento o lectura del plano del venue",
      "Acomodo de producción, mobiliario y rutas de carga",
      "Una ronda de ajustes tras la revisión del venue",
    ].join("\n"),
    noIncluye: [
      "Planos estructurales o eléctricos firmados por perito",
      "Trámite de autorización ante el venue o protección civil",
      "Renders 3D del montaje",
    ].join("\n"),
    unidadDefault: "PIEZA",
    tipoLinea: "DOCUMENTACION",
    precioSugerido: null,
    costoSugerido: null,
    orden: 260,
  },
];

// Driver HTTP y no Prisma: el puerto 5432 de Neon no se alcanza desde local.
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  console.log(`\nSembrando ${SERVICIOS.length} servicios de dirección y operaciones…\n`);

  const previos = (await sql.query(`SELECT clave FROM servicios_pm`)) as { clave: string }[];
  const yaEstaban = new Set(previos.map((r) => r.clave));

  let creados = 0;
  let actualizados = 0;

  for (const s of SERVICIOS) {
    // El precio no se pisa si ya estaba capturado: Mauricio lo ajusta desde
    // /giras/servicios y una resiembra no debe borrarle la decisión. Por eso el
    // DO UPDATE no menciona precioSugerido ni costoSugerido.
    await sql.query(
      `INSERT INTO servicios_pm
         (id, clave, nombre, categoria, descripcion, entregables, incluye, "noIncluye",
          "unidadDefault", "tipoLinea", "precioSugerido", "costoSugerido", activo, orden,
          "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,$13,now(),now())
       ON CONFLICT (clave) DO UPDATE SET
         nombre          = EXCLUDED.nombre,
         categoria       = EXCLUDED.categoria,
         descripcion     = EXCLUDED.descripcion,
         entregables     = EXCLUDED.entregables,
         incluye         = EXCLUDED.incluye,
         "noIncluye"     = EXCLUDED."noIncluye",
         "unidadDefault" = EXCLUDED."unidadDefault",
         "tipoLinea"     = EXCLUDED."tipoLinea",
         orden           = EXCLUDED.orden,
         "updatedAt"     = now()`,
      [
        randomUUID(), s.clave, s.nombre, s.categoria, s.descripcion, s.entregables, s.incluye,
        s.noIncluye, s.unidadDefault, s.tipoLinea, s.precioSugerido, s.costoSugerido, s.orden,
      ],
    );

    if (yaEstaban.has(s.clave)) {
      actualizados++;
      console.log(`  ↻ ${s.clave.padEnd(26)} ${s.nombre}`);
    } else {
      creados++;
      console.log(`  ✓ ${s.clave.padEnd(26)} ${s.nombre}`);
    }
  }

  console.log(`\n✅ ${creados} creados, ${actualizados} actualizados (textos; los precios capturados no se pisan).\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
