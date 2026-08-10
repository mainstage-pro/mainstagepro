// ─────────────────────────────────────────────────────────────────────────────
// Presentaciones de prospección por PERFIL de cliente.
//
// Cada perfil base (perfiles.ts) tiene su propia presentación pública y enfocada:
// mismo esqueleto (qué es Mainstage, servicios, beneficios, trabajo, contacto),
// pero con encabezado, sub y "problemas que resolvemos" en el lenguaje propio de
// ese perfil. Las imágenes base salen del tipo de evento (categoría del perfil) y
// se pueden sobrescribir por admin con EditableImage.
// ─────────────────────────────────────────────────────────────────────────────
import { getPerfil, type PerfilCategoria } from "@/lib/proceso/perfiles";

// Perfil → slug de URL (PROMOTOR → promotor, WEDDING_PLANNER → wedding-planner).
export function perfilToSlug(id: string): string {
  return id.toLowerCase().replace(/_/g, "-");
}
export function slugToPerfilId(slug: string): string {
  return slug.toUpperCase().replace(/-/g, "_");
}

// ── Config por categoría (= tipoEvento): imágenes y galería base ───────────────
type EventoSlug = "musical" | "social" | "empresarial";

type CategoriaConfig = {
  eventoSlug: EventoSlug;
  eventoLabel: string;
  heroFallback: string;
  gallery: { src: string; caption: string }[];
};

export const CATEGORIA_CONFIG: Record<PerfilCategoria, CategoriaConfig> = {
  MUSICAL: {
    eventoSlug: "musical",
    eventoLabel: "Eventos musicales",
    heroFallback: "/images/presentacion/musicales/Musicales-016.jpg",
    gallery: [
      { src: "/images/presentacion/musicales/Musicales-016.jpg", caption: "Producción completa en vivo" },
      { src: "/images/presentacion/musicales/Musicales-037.jpg", caption: "Iluminación · Show en escenario" },
      { src: "/images/presentacion/musicales/Musicales-076.jpg", caption: "DJ Set · Equipo profesional" },
      { src: "/images/presentacion/musicales/MAGIC_ROOM_260307_GUANAJUATO_078.jpg", caption: "Festival" },
      { src: "/images/presentacion/musicales/Musicales-055.jpg", caption: "Producción de luz · Efectos" },
      { src: "/images/presentacion/musicales/Afrodise-59.jpg", caption: "Stage completo · Noche" },
    ],
  },
  SOCIAL: {
    eventoSlug: "social",
    eventoLabel: "Eventos sociales",
    heroFallback: "/images/presentacion/sociales/s-boda-elegante.jpg",
    gallery: [
      { src: "/images/presentacion/sociales/s-dj-salon.png", caption: "El ambiente que recordarán" },
      { src: "/images/presentacion/sociales/s-hacienda-iluminada.jpg", caption: "Hacienda · Iluminación" },
      { src: "/images/presentacion/sociales/s-boda-colonial.jpg", caption: "Boda · Venue colonial" },
      { src: "/images/presentacion/sociales/s-piano-pista.jpg", caption: "Piano · Pista espejada" },
      { src: "/images/presentacion/sociales/s-boda-elegante.jpg", caption: "Boda elegante · Exterior" },
      { src: "/images/presentacion/sociales/s-hacienda-aerea.jpg", caption: "Vista aérea · Iluminación" },
    ],
  },
  EMPRESARIAL: {
    eventoSlug: "empresarial",
    eventoLabel: "Eventos empresariales",
    heroFallback: "/images/presentacion/empresariales/e-auditorio.jpg",
    gallery: [
      { src: "/images/presentacion/empresariales/e-sala-pantallas.jpg", caption: "Experiencias con impacto" },
      { src: "/images/presentacion/empresariales/e-auditorio.jpg", caption: "Auditorio · Producción completa" },
      { src: "/images/presentacion/empresariales/e-carpa-led.jpg", caption: "Exterior · Pantalla LED" },
      { src: "/images/presentacion/empresariales/e-networking.jpg", caption: "Networking · Corporativo" },
      { src: "/images/presentacion/empresariales/e-edificio-azul.jpg", caption: "Iluminación arquitectónica" },
      { src: "/images/presentacion/empresariales/e-proyeccion-mural.jpg", caption: "Proyección artística" },
    ],
  },
};

// ── Beneficios de contratarnos (iguales para todos: es sobre nosotros) ─────────
export const BENEFICIOS: { t: string; b: string }[] = [
  { t: "Un solo responsable", b: "Audio, iluminación y video bajo una sola coordinación. Una sola persona responde por todo." },
  { t: "Equipo verificado", b: "Cada pieza se prueba en bodega antes de salir. Nada llega a tu evento sin revisar." },
  { t: "Puntualidad real", b: "Coordinamos montaje y pruebas para que todo esté listo antes de que llegue tu gente." },
  { t: "Respaldo en vivo", b: "Operamos durante todo el evento. Si algo surge, lo resolvemos en el momento." },
];

// ── Los 3 servicios, en versión corta ─────────────────────────────────────────
export const SERVICIOS_COMPACT: { n: string; title: string; linea: string; slug: string }[] = [
  { n: "01", title: "Renta de equipo", linea: "El equipo correcto, listo y respaldado. Con o sin operador.", slug: "renta" },
  { n: "02", title: "Producción técnica", linea: "Operadores que montan, prueban y operan tu evento completo.", slug: "produccion-tecnica" },
  { n: "03", title: "Dirección técnica", linea: "Un solo responsable de que audio, luz y video lleguen juntos.", slug: "direccion-tecnica" },
];

// ── Preguntas frecuentes (aclaran las dudas más comunes de un prospecto) ───────
export const FAQ: { q: string; a: string }[] = [
  { q: "¿En qué zonas trabajan?", a: "Trabajamos en tu ciudad y en distintas regiones del país. Dinos la sede de tu evento y confirmamos disponibilidad de inmediato." },
  { q: "¿Puedo rentar solo el equipo, sin operador?", a: "Sí. Puedes rentar el equipo con o sin operador, o contratar la producción completa con nuestros técnicos. Tú decides hasta dónde nos necesitas." },
  { q: "¿Con cuánta anticipación debo apartar?", a: "Entre más pronto, mejor, sobre todo en temporada alta. Con tu fecha en mano te confirmamos disponibilidad enseguida." },
  { q: "¿Cuánto cuesta?", a: "Depende del tamaño y las necesidades de tu evento. Cuéntanos los detalles y te enviamos una propuesta clara, sin costos escondidos." },
  { q: "¿Y si algo falla durante el evento?", a: "Operamos en vivo y llevamos respaldo. Si algo surge, lo resolvemos en el momento, sin que tu evento se detenga." },
];

// ── Contacto directo (dueño) ──────────────────────────────────────────────────
export const CONTACTO = {
  nombre: "Mauricio Hernández",
  rol: "Dirección · Mainstage Pro",
};

// ── Copy por perfil ───────────────────────────────────────────────────────────
export type PerfilCopy = {
  kicker: string;
  headline: string; // puede llevar \n para el salto de línea del hero
  sub: string;
  problemas: { t: string; b: string }[];
  // Mensaje de WhatsApp que el prospecto envía (inbound), para arrancar conversación.
  contacto: string;
};

export const PERFIL_COPY: Record<string, PerfilCopy> = {
  // ── Musicales ───────────────────────────────────────────────────────────────
  PROMOTOR: {
    kicker: "Para promotores y productores de eventos",
    headline: "Tu evento suena y se ve\ncomo lo imaginaste.",
    sub: "Producción de audio, iluminación y video lista a tiempo, para que tú te concentres en llenar el lugar.",
    problemas: [
      { t: "El equipo llega tarde o incompleto", b: "Verificamos cada pieza en bodega y coordinamos la carga para que todo esté montado antes de abrir puertas." },
      { t: "El sonido no aguanta el lleno", b: "Dimensionamos el audio al aforo y al lugar, para que llegue parejo desde la primera fila hasta el fondo." },
      { t: "Demasiados proveedores que coordinar", b: "Audio, luz y video con un solo responsable. Una sola llamada para todo lo técnico." },
    ],
    contacto: "Hola, soy promotor y quiero información de producción para un evento que estoy organizando.",
  },
  DJ_MUSICAL: {
    kicker: "Para DJs",
    headline: "El equipo que está\na la altura de tu set.",
    sub: "Sonido potente y limpio, luces que siguen tu música y un montaje listo antes de que llegues a cabina.",
    problemas: [
      { t: "Sonido que se satura o no pega", b: "Sistemas profesionales calibrados para tu estilo, con la presión que tu set necesita sin distorsión." },
      { t: "Luces que no acompañan la música", b: "Iluminación programada para seguir tu energía, no para perseguirla." },
      { t: "Montar tu propio equipo cada vez", b: "Llegamos, montamos y probamos. Tú solo te preocupas por tocar." },
    ],
    contacto: "Hola, soy DJ y me interesa producción de audio e iluminación para mis presentaciones.",
  },
  MUSICO: {
    kicker: "Para músicos y bandas",
    headline: "Que el público sienta\ncada nota.",
    sub: "Audio, monitoreo e iluminación pensados para tu presentación en vivo, montados y probados antes del show.",
    problemas: [
      { t: "El monitoreo en tarima no ayuda", b: "Calibramos tus monitores para que te escuches bien y toques tranquilo toda la noche." },
      { t: "El sonido de la sala no te hace justicia", b: "Cobertura pareja en todo el lugar, mezclada por un técnico que conoce el sistema." },
      { t: "Cada venue es una sorpresa distinta", b: "Revisamos el lugar y el rider con anticipación para que el soundcheck empiece sin sorpresas." },
    ],
    contacto: "Hola, soy músico y quiero información de audio e iluminación para mis presentaciones.",
  },
  FORO_EVENTOS: {
    kicker: "Para foros y venues",
    headline: "El aliado técnico\nque tu foro necesita.",
    sub: "Producción de audio, iluminación y video confiable para cada evento que recibes, sin que tengas que resolverlo tú.",
    problemas: [
      { t: "Cada evento llega con requerimientos distintos", b: "Nos adaptamos a lo que pide cada cliente y montamos la producción a la medida del evento." },
      { t: "No quieres invertir en equipo propio", b: "Ponemos el equipo y los operadores solo cuando los necesitas, sin costos fijos." },
      { t: "Tu reputación depende de que todo salga bien", b: "Un solo responsable técnico que responde por el resultado, evento tras evento." },
    ],
    contacto: "Hola, tengo un foro de eventos y busco un aliado técnico de producción.",
  },
  EMPRESA_RENTA: {
    kicker: "Para empresas de renta y colegas",
    headline: "Cuando el evento crece,\ncrecemos contigo.",
    sub: "Complementamos tu equipo y tu producción para eventos grandes, con inventario profesional y respaldo real.",
    problemas: [
      { t: "Un evento grande supera tu inventario", b: "Te complementamos con el equipo que falte, verificado y listo, para que tomes el proyecto con confianza." },
      { t: "Necesitas operadores extra de confianza", b: "Sumamos técnicos que operan a tu nivel y se integran a tu equipo sin fricción." },
      { t: "Buscas un aliado, no un competidor", b: "Colaboramos con claridad y respeto por tu cliente. Tu proyecto sigue siendo tuyo." },
    ],
    contacto: "Hola, tengo una empresa de renta / producción y me interesa colaborar en proyectos.",
  },

  // ── Sociales ────────────────────────────────────────────────────────────────
  WEDDING_PLANNER: {
    kicker: "Para wedding planners",
    headline: "El aliado técnico\nque cuida cada detalle.",
    sub: "Audio, iluminación y video que hacen que la ceremonia, el brindis y la pista salgan justo como los planeaste.",
    problemas: [
      { t: "El brindis no se escucha en todas las mesas", b: "Micrófonos manejados por un técnico dedicado: cada palabra llega clara, sin acoples ni volumen disparejo." },
      { t: "Un fallo técnico arruina el momento", b: "Llegamos antes, probamos todo y operamos en vivo para que nada te sorprenda el día del evento." },
      { t: "Un proveedor más que coordinar", b: "Nos alineamos contigo, con el venue y con los demás. Un solo punto de contacto para lo técnico." },
    ],
    contacto: "Hola, soy wedding planner y busco un aliado técnico de producción para mis bodas.",
  },
  SALON_EVENTOS: {
    kicker: "Para salones y haciendas",
    headline: "La producción que\ntu salón merece.",
    sub: "Audio e iluminación profesionales para cada evento en tu espacio, con un montaje ordenado y sin complicaciones.",
    problemas: [
      { t: "Cada cliente pide algo diferente", b: "Armamos la producción a la medida de cada evento, desde una boda íntima hasta una fiesta completa." },
      { t: "No quieres equipo parado ni mantenimiento", b: "Ponemos equipo y operadores solo cuando hay evento, sin inversión fija de tu lado." },
      { t: "Tu espacio se vende también por cómo se ve", b: "Iluminación que resalta tu salón y lo hace lucir en cada foto y cada evento." },
    ],
    contacto: "Hola, tengo un salón de eventos y busco producción de audio e iluminación.",
  },
  DJ_SOCIAL: {
    kicker: "Para DJs de eventos sociales",
    headline: "El equipo que hace\nque la pista explote.",
    sub: "Sonido limpio y potente e iluminación de ambiente para bodas y fiestas, montado y listo antes de que empieces.",
    problemas: [
      { t: "El equipo del salón no da el nivel", b: "Llevamos audio profesional con la potencia justa para llenar la pista sin saturar." },
      { t: "La pista se siente apagada", b: "Iluminación de ambiente y efectos que suben la energía en el momento correcto." },
      { t: "Cargar y montar tu propio equipo", b: "Nos encargamos del montaje y la prueba. Tú solo llegas a poner a bailar a todos." },
    ],
    contacto: "Hola, soy DJ de eventos sociales y me interesa equipo de audio e iluminación.",
  },
  GRADUACIONES: {
    kicker: "Para organizadores de graduaciones",
    headline: "La ceremonia que\nrecordarán siempre.",
    sub: "Audio claro para los discursos e iluminación que da altura al momento, para cada generación.",
    problemas: [
      { t: "Los discursos no se entienden", b: "Microfonía clara para que cada palabra del presídium y los alumnos se escuche en todo el lugar." },
      { t: "Un evento con muchas partes que coordinar", b: "Coordinamos entradas, discursos, música y baile contigo, para que cada momento fluya sin pausas incómodas." },
      { t: "Es un evento único, no hay segunda toma", b: "Llegamos antes, probamos todo y operamos en vivo para que salga perfecto a la primera." },
    ],
    contacto: "Hola, organizo graduaciones y busco producción de audio, iluminación y video.",
  },

  // ── Empresariales ───────────────────────────────────────────────────────────
  EMPRESA: {
    kicker: "Para empresas y agencias",
    headline: "Tu mensaje,\nclaro y con presencia.",
    sub: "Audio nítido, pantallas que responden y una producción que refuerza la imagen de tu marca.",
    problemas: [
      { t: "Un fallo técnico daña la imagen de la marca", b: "Llegamos antes y verificamos todo: micrófonos, pantallas y señal. La atención se queda en tu mensaje." },
      { t: "La laptop del presentador nunca conecta", b: "Probamos con el equipo real de quien presenta, no con el nuestro. Sin sorpresas frente a los invitados." },
      { t: "Coordinar lo técnico distrae de lo importante", b: "Un solo punto de contacto para toda la producción, alineado con tu equipo o agencia." },
    ],
    contacto: "Hola, represento a una empresa y busco producción para un evento corporativo.",
  },
  DESARROLLADOR_INMOBILIARIO: {
    kicker: "Para desarrolladores inmobiliarios",
    headline: "Lanzamientos que\nvenden el proyecto.",
    sub: "Producción audiovisual que convierte la presentación de tu desarrollo en una experiencia de marca.",
    problemas: [
      { t: "El lanzamiento debe verse a la altura del proyecto", b: "Iluminación arquitectónica, pantallas y audio que hacen que tu desarrollo luzca desde el primer minuto." },
      { t: "Presentar planos y renders con impacto", b: "Video y proyección de alta definición para que cada render se vea impecable ante tus prospectos." },
      { t: "El evento es tu carta de presentación", b: "Producción cuidada de principio a fin, con un solo responsable que responde por el resultado." },
    ],
    contacto: "Hola, soy desarrollador inmobiliario y busco producción para un evento de lanzamiento.",
  },
  ESCUELA: {
    kicker: "Para escuelas e instituciones",
    headline: "Cada ceremonia y festival,\na la altura.",
    sub: "Audio, iluminación y video para graduaciones, festivales y ceremonias, con un trato cercano y confiable.",
    problemas: [
      { t: "Los discursos y honores no se escuchan bien", b: "Microfonía clara para presídium, alumnos y participaciones, sin acoples ni cortes." },
      { t: "Eventos con muchos participantes y momentos", b: "Coordinamos el programa completo contigo para que cada parte del evento fluya en orden." },
      { t: "Un presupuesto que hay que cuidar", b: "Te proponemos la producción justa para tu evento, sin cobrarte de más por lo que no necesitas." },
    ],
    contacto: "Hola, represento a una escuela y busco producción para nuestros eventos.",
  },
  CONFERENCISTA: {
    kicker: "Para conferencistas",
    headline: "El escenario que\ntu mensaje merece.",
    sub: "Audio, iluminación y video para que tu presentación se viva al máximo y tú solo pienses en el público.",
    problemas: [
      { t: "Un micrófono que falla te saca del momento", b: "Microfonía confiable y probada antes de subir, para que hables tranquilo de principio a fin." },
      { t: "Tus slides o video no se ven bien", b: "Pantallas y proyección calibradas con tu presentación real, sin cortes ni mala resolución." },
      { t: "Cada foro es distinto", b: "Revisamos el lugar antes y llevamos lo necesario para que tu presentación luzca igual de bien en cualquier sede." },
    ],
    contacto: "Hola, soy conferencista y busco producción de audio, video e iluminación para mis presentaciones.",
  },
};

// ── Resolver: junta perfil base + copy + config de categoría ───────────────────
export type PerfilPresentacion = {
  id: string;
  label: string;
  categoria: PerfilCategoria;
  slug: string;
  copy: PerfilCopy;
  cat: CategoriaConfig;
};

export function getPerfilPresentacion(perfilId: string): PerfilPresentacion | null {
  const base = getPerfil(perfilId);
  const copy = PERFIL_COPY[perfilId];
  if (!base || !copy) return null;
  return {
    id: base.id,
    label: base.label,
    categoria: base.categoria,
    slug: perfilToSlug(base.id),
    copy,
    cat: CATEGORIA_CONFIG[base.categoria],
  };
}

// Slugs de todas las presentaciones por perfil (para generateStaticParams).
export const PERFIL_PRESENTACION_SLUGS: string[] = Object.keys(PERFIL_COPY).map(perfilToSlug);
