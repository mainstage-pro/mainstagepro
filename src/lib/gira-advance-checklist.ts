// Plantilla del checklist de advance de una gira.
//
// Tres frentes externos (management del artista, venue, promotor) y uno interno.
// Un renglón de alcance GIRA se pide una vez para toda la gira; uno de alcance
// SHOW se pide por fecha, porque cada casa y cada promotor responden distinto.

export const FRENTES = [
  { key: "MANAGEMENT", label: "Management del artista", color: "#60a5fa" },
  { key: "VENUE", label: "Venue (la casa)", color: "#34d399" },
  { key: "PROMOTOR", label: "Promotor / producción local", color: "#B3985B" },
  { key: "INTERNO", label: "Nosotros", color: "#9ca3af" },
] as const;

export type FrenteKey = (typeof FRENTES)[number]["key"];

export const ESTADOS_CHECKLIST = [
  { key: "PENDIENTE", label: "Sin pedir", color: "#555" },
  { key: "PEDIDO", label: "Pedido, sin respuesta", color: "#fb923c" },
  { key: "LISTO", label: "Resuelto", color: "#34d399" },
  { key: "NO_APLICA", label: "No aplica", color: "#333" },
] as const;

export interface ItemPlantilla {
  llave: string;
  frente: FrenteKey;
  item: string;
  detalle: string;
}

/// Alcance gira: se resuelve una vez y sirve para todas las fechas.
export const PLANTILLA_GIRA: ItemPlantilla[] = [
  // ── Management ────────────────────────────────────────────────────────────
  {
    llave: "mgmt-contactos",
    frente: "MANAGEMENT",
    item: "Contactos técnicos del tour, con celular y WhatsApp",
    detalle:
      "Tour manager, production manager, FOH, monitores, LD y backliner. Pide quién decide y quién ejecuta: el que contesta el correo casi nunca es el que aprueba una sustitución.",
  },
  {
    llave: "mgmt-rider-vigente",
    frente: "MANAGEMENT",
    item: "Rider técnico vigente, con fecha o versión",
    detalle:
      "Que confirmen por escrito que es el de esta gira y no el del año pasado. Si el archivo no trae versión, pide que lo reenvíen fechado.",
  },
  {
    llave: "mgmt-input-output",
    frente: "MANAGEMENT",
    item: "Input list, output list y patch",
    detalle:
      "Canales por instrumento, cajas directas, microfonía, y splits si hay grabación, transmisión o un segundo FOH.",
  },
  {
    llave: "mgmt-monitores",
    frente: "MANAGEMENT",
    item: "Monitoreo: IEM o cuñas, cuántos mixes y quién opera",
    detalle:
      "Define si llevan su consola de monitores o la operamos nosotros. Es el renglón que más cambia entre el rider y la realidad.",
  },
  {
    llave: "mgmt-backline",
    frente: "MANAGEMENT",
    item: "Qué backline viaja con ellos y qué hay que conseguir en destino",
    detalle: "Separa lo que traen, lo que rentamos y lo que esperan de la casa. Marcas y modelos aceptables, no solo categorías.",
  },
  {
    llave: "mgmt-luces-video",
    frente: "MANAGEMENT",
    item: "Plot de iluminación y video, y si traen operador",
    detalle:
      "Si traen LD con archivo de show, pregunta consola, protocolo y cuánto tiempo necesita de programación. Para video: contenido, resolución y quién lo dispara.",
  },
  {
    llave: "mgmt-escenario",
    frente: "MANAGEMENT",
    item: "Medidas de escenario, risers y posiciones de montaje",
    detalle: "Dimensión mínima útil, altura de risers, y dónde va cada cosa. Sin esto no se puede validar contra el plano de la casa.",
  },
  {
    llave: "mgmt-travel-party",
    frente: "MANAGEMENT",
    item: "Travel party: cuántos viajan y qué puestos hay que cubrir localmente",
    detalle: "De ahí sale el crew nuestro por fecha, y el hotel y los viajes si nos toca moverlos.",
  },
  {
    llave: "mgmt-tiempos",
    frente: "MANAGEMENT",
    item: "Tiempos que necesitan: soundcheck, duración de show, teloneros y changeover",
    detalle: "Es la restricción que choca con el curfew de la casa. Consíguelo antes de negociar horarios con el venue.",
  },
  {
    llave: "mgmt-efectos",
    frente: "MANAGEMENT",
    item: "Efectos y notas de show: humo, confeti, pirotecnia, playback, time code",
    detalle: "Muchas casas los prohíben. Si viene en el rider, hay que preguntarlo venue por venue antes de prometerlo.",
  },
  {
    llave: "mgmt-aprobador",
    frente: "MANAGEMENT",
    item: "Quién aprueba por escrito una sustitución de equipo",
    detalle:
      "Nombre y medio. Toda sustitución se registra en el advance con su visto bueno; si no está aprobada, sigue siendo un hueco.",
  },

  // ── Nosotros ──────────────────────────────────────────────────────────────
  {
    llave: "int-rider-vs-casa",
    frente: "INTERNO",
    item: "Rider contra lo que ofrece cada casa: matriz de huecos por fecha",
    detalle: "Se arma en la pestaña Advance. Cada renglón acaba en casa, nosotros, proveedor, artista o no cubierto.",
  },
  {
    llave: "int-proveedores",
    frente: "INTERNO",
    item: "Proveedores locales cotizados y confirmados por fecha",
    detalle: "Un proveedor por ciudad para los huecos. Cotizado no es confirmado: hace falta precio cerrado y fecha de entrega.",
  },
  {
    llave: "int-crew",
    frente: "INTERNO",
    item: "Crew nuestro por fecha, confirmado y con viaje y hotel",
    detalle: "Se captura en Crew y en Viajes y hotel.",
  },
  {
    llave: "int-lista-carga",
    frente: "INTERNO",
    item: "Lista de carga y plan de transporte por fecha",
    detalle: "Qué sale de bodega, en qué unidad y a qué hora, contra la hora de load-in de cada casa.",
  },
  {
    llave: "int-propuesta",
    frente: "INTERNO",
    item: "Propuesta de servicio enviada, aprobada y con anticipo",
    detalle: "Se arma en Propuestas. Si el alcance creció con el advance, actualiza la propuesta antes de la fecha.",
  },
  {
    llave: "int-pre-call",
    frente: "INTERNO",
    item: "Pre-call de 15 minutos con management, casa y promotor, 24 h antes",
    detalle: "Una llamada con los tres repasando horarios y huecos. Es lo que evita las sorpresas del día del show.",
  },
];

/// Alcance show: se pregunta a cada venue y a cada promotor por separado.
export const PLANTILLA_SHOW: ItemPlantilla[] = [
  // ── Venue ─────────────────────────────────────────────────────────────────
  {
    llave: "venue-contacto",
    frente: "VENUE",
    item: "Contacto técnico de la casa y a qué hora llega el día del show",
    detalle: "Nombre, celular y correo. Si el contacto es solo administrativo, pide el del jefe técnico.",
  },
  {
    llave: "venue-tech-pack",
    frente: "VENUE",
    item: "House rider o tech pack: inventario instalado de audio, luz y video",
    detalle: "Pídelo como documento, no por teléfono. Lo que digan de palabra no sirve para cuadrar el advance.",
  },
  {
    llave: "venue-planos",
    frente: "VENUE",
    item: "Planos: planta, alzado, altura de grid y trim, posición de FOH",
    detalle: "Con distancias y obstrucciones. Sirve para validar el plot del artista y para saber si el PA alcanza.",
  },
  {
    llave: "venue-rigging",
    frente: "VENUE",
    item: "Puntos de rigging, capacidad por punto y si exigen rigger o certificados",
    detalle: "Pregunta también si cobran el uso de puntos y si hay que presentar memoria de cálculo.",
  },
  {
    llave: "venue-energia",
    frente: "VENUE",
    item: "Energía: servicios disponibles, amperaje y ubicación de tomas",
    detalle: "Si no alcanza, define desde hoy quién paga la planta y dónde se coloca.",
  },
  {
    llave: "venue-accesos",
    frente: "VENUE",
    item: "Accesos y maniobra: andén, medidas de puerta, distancia al escenario, elevador",
    detalle: "Incluye estacionamiento de unidades. Una escalera o una puerta chica cambia el crew y las horas de montaje.",
  },
  {
    llave: "venue-horarios",
    frente: "VENUE",
    item: "Load-in más temprano posible, load-out límite y curfew",
    detalle: "Confírmalo por escrito. Es el dato que hay que cruzar con el promotor en el mismo hilo.",
  },
  {
    llave: "venue-restricciones",
    frente: "VENUE",
    item: "Restricciones: límite de dB, reglas de volado y sujeción, prohibiciones",
    detalle: "Humo, hazer, fuego, confeti, anclaje a piso o muros. Si el rider trae algo de esto, pregúntalo explícitamente.",
  },
  {
    llave: "venue-personal",
    frente: "VENUE",
    item: "Personal de casa: stagehands incluidos, sindicato y operadores obligatorios",
    detalle: "Qué está incluido en la renta y qué se cobra aparte. Algunas casas obligan a usar su operador de audio o su electricista.",
  },
  {
    llave: "venue-ofrece",
    frente: "VENUE",
    item: "Qué presta o renta la casa, y a qué precio",
    detalle: "Esto se captura en el advance como lo ofrecido por la casa. Es la vía más barata de cerrar huecos.",
  },
  {
    llave: "venue-docs",
    frente: "VENUE",
    item: "Documentos que piden para entrar",
    detalle: "Póliza de responsabilidad civil, lista de personal con identificaciones, certificados de rigging, constancias fiscales.",
  },
  {
    llave: "venue-camerinos",
    frente: "VENUE",
    item: "Camerinos, baños, internet, hielo y agua",
    detalle: "No es nuestro alcance, pero mueve horarios y el humor del tour. Vale preguntarlo de una vez.",
  },

  // ── Promotor ──────────────────────────────────────────────────────────────
  {
    llave: "promo-contacto",
    frente: "PROMOTOR",
    item: "Contacto de producción local y quién manda en sitio ese día",
    detalle: "Una sola persona que decida. Si son dos, acláralo antes del load-in.",
  },
  {
    llave: "promo-quien-cubre",
    frente: "PROMOTOR",
    item: "Quién cubre cada renglón del rider: casa, nosotros, proveedor o artista",
    detalle: "Es la conversación central del advance. Lo que nadie reclama es lo que falta el día del show.",
  },
  {
    llave: "promo-horarios-publicos",
    frente: "PROMOTOR",
    item: "Horarios públicos: doors, teloneros, hora de show y hora de fin",
    detalle: "Ciérralos contra el curfew de la casa y el soundcheck del artista, en un solo correo con los tres.",
  },
  {
    llave: "promo-aforo",
    frente: "PROMOTOR",
    item: "Aforo, configuración de sala y si FOH o delays quitan lugares vendidos",
    detalle: "Define si la posición de FOH se negocia antes de que se vendan los boletos o después.",
  },
  {
    llave: "promo-proveedores-locales",
    frente: "PROMOTOR",
    item: "Qué proveedores locales ya contrató",
    detalle: "Escenario, planta de luz, rigging, backline, vallas. Evita pagar dos veces lo mismo y detecta lo que nadie contrató.",
  },
  {
    llave: "promo-presupuesto",
    frente: "PROMOTOR",
    item: "Presupuesto aprobado, orden de compra, anticipo y a quién se factura",
    detalle: "Sin esto confirmado, no se confirma proveedor local.",
  },
  {
    llave: "promo-permisos",
    frente: "PROMOTOR",
    item: "Permisos, protección civil y reglamento de ruido del municipio",
    detalle: "Pregunta si el límite de ruido es municipal o de la casa: cambian el curfew y el diseño de PA.",
  },
  {
    llave: "promo-credenciales",
    frente: "PROMOTOR",
    item: "Credenciales y lista de accesos para crew y proveedores",
    detalle: "Manda la lista con nombre completo; los cambios de último minuto rara vez entran.",
  },
  {
    llave: "promo-alimentos",
    frente: "PROMOTOR",
    item: "Alimentos y bebidas de crew: cuántos, a qué hora y quién paga",
    detalle: "Con la hora de load-in ya definida, para que la comida no caiga en soundcheck.",
  },

  // ── Nosotros ──────────────────────────────────────────────────────────────
  {
    llave: "int-horarios-escritos",
    frente: "INTERNO",
    item: "Horarios de la fecha cerrados por escrito, en un solo hilo",
    detalle: "Load-in, montaje, soundcheck, doors, show, fin, load-out y curfew. Se capturan en el show.",
  },
  {
    llave: "int-minuto-a-minuto",
    frente: "INTERNO",
    item: "Minuto a minuto del día del show capturado y repartido",
    detalle: "Se arma en el show. Es lo que se manda al crew y a la casa el día anterior.",
  },
  {
    llave: "int-advance-cerrado",
    frente: "INTERNO",
    item: "Advance de la fecha cerrado: ningún renglón indispensable sin cubrir",
    detalle: "Cerrar el advance del show es la señal de que esa fecha ya no tiene huecos.",
  },
];

export const TOTAL_PLANTILLA = PLANTILLA_GIRA.length + PLANTILLA_SHOW.length;
