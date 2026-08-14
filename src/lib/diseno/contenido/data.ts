// Serie "Contenido informativo". Banco de ideas de valor (la MATRIZ) más el
// calendario semanal. Cada idea es un carrusel de 3 slides: gancho → valor →
// cierre. El planificador asigna una idea por semana ISO; al "regenerar" se toma
// otra idea del MISMO pilar. Contenido curado (determinista, sin IA en render).

import type { EditableField } from "../overrides";
import { ARROBA, TELEFONO } from "../servicios/data";

export type Pilar = "tip" | "error" | "faq" | "equipo" | "tipoevento" | "servicio" | "checklist" | "tendencia";

export const PILAR_LABEL: Record<Pilar, string> = {
  tip: "TIP DE PRODUCCIÓN",
  error: "EVITA ESTE ERROR",
  faq: "PREGUNTA FRECUENTE",
  equipo: "CONOCE EL EQUIPO",
  tipoevento: "SEGÚN TU EVENTO",
  servicio: "NUESTROS SERVICIOS",
  checklist: "CHECKLIST",
  tendencia: "TENDENCIA",
};

export type IdeaContenido = {
  id: string;
  pilar: Pilar;
  tituloGold: string;
  tituloWhite: string;
  gancho: string; // subtítulo del slide 1
  puntos: string[]; // 3-4 bullets de valor (slide 2)
  remate: string; // conclusión / cierre (slide 3)
  bg: string; // ruta en /public
  fuente: string; // de qué módulo se nutre
};

// ── LA MATRIZ ────────────────────────────────────────────────────────────────
export const IDEAS: IdeaContenido[] = [
  // TIP
  {
    id: "tip-espacio-sonido",
    pilar: "tip",
    tituloGold: "EL ESPACIO",
    tituloWhite: "DEFINE TU AUDIO",
    gancho: "El mismo sistema de sonido no funciona igual en todos los lugares.",
    puntos: [
      "Techos altos y muros duros generan eco",
      "Más invitados no siempre es más bocina",
      "La cobertura pareja gana al volumen",
      "Una visita técnica evita sorpresas",
    ],
    remate: "Antes de rentar audio, cuéntanos dónde y para cuántos.",
    bg: "images/presentacion/empresariales/e-auditorio.jpg",
    fuente: "Servicios · Renta",
  },
  {
    id: "tip-luz-ambiente",
    pilar: "tip",
    tituloGold: "LA LUZ",
    tituloWhite: "VENDE TU EVENTO",
    gancho: "La iluminación decide cómo se ve —y se recuerda— tu evento.",
    puntos: [
      "Luz cálida para un ambiente íntimo",
      "Wash de color para la fiesta",
      "Evita la luz plana y blanca",
      "Buena luz = mejores fotos y video",
    ],
    remate: "Diseñamos la luz según el momento de tu evento.",
    bg: "images/presentacion/sociales/s-hacienda-iluminada.jpg",
    fuente: "Servicios · Producción técnica",
  },
  {
    id: "tip-energia",
    pilar: "tip",
    tituloGold: "LA CORRIENTE",
    tituloWhite: "ES EL ERROR INVISIBLE",
    gancho: "El fallo más común de un evento no es el equipo: es la energía.",
    puntos: [
      "Calcula el amperaje total antes",
      "Ten una planta de respaldo",
      "No conectes todo a un solo contacto",
      "Pregunta por el consumo de tu montaje",
    ],
    remate: "Nosotros calculamos la energía de tu evento por ti.",
    bg: "images/presentacion/musicales/Musicales-045.jpg",
    fuente: "Servicios · Dirección técnica",
  },
  // ERROR
  {
    id: "error-ultima-hora",
    pilar: "error",
    tituloGold: "CONTRATAR",
    tituloWhite: "A ÚLTIMA HORA",
    gancho: "Dejar la producción para el final te cuesta más y te da menos.",
    puntos: [
      "Los mejores equipos se apartan primero",
      "Sin visita técnica hay imprevistos",
      "Reserva de 4 a 6 semanas antes",
      "La prisa se paga en el presupuesto",
    ],
    remate: "Aparta tu fecha con tiempo y respira tranquilo.",
    bg: "images/presentacion/musicales/DSC07491.jpg",
    fuente: "Servicios",
  },
  {
    id: "error-solo-precio",
    pilar: "error",
    tituloGold: "ELEGIR SOLO",
    tituloWhite: "POR PRECIO",
    gancho: "El presupuesto más barato casi nunca incluye lo importante.",
    puntos: [
      "Equipo viejo falla en el peor momento",
      "Sin técnico en sitio, nadie resuelve",
      "Sin respaldo, no hay plan B",
      "Compara qué incluye, no solo el total",
    ],
    remate: "Pide siempre el desglose de lo que incluye tu cotización.",
    bg: "images/presentacion/empresariales/e-sala-pantallas.jpg",
    fuente: "Servicios",
  },
  {
    id: "error-sin-rider",
    pilar: "error",
    tituloGold: "IR SIN",
    tituloWhite: "RIDER TÉCNICO",
    gancho: "Sin un rider, nadie sabe realmente qué se necesita el día del evento.",
    puntos: [
      "El rider evita faltantes de último minuto",
      "Alinea a todos con el venue",
      "Define tiempos de montaje",
      "Pídelo siempre por escrito",
    ],
    remate: "Te entregamos el rider técnico de tu evento, claro y por escrito.",
    bg: "images/presentacion/musicales/Musicales-126.jpg",
    fuente: "Servicios · Dirección técnica",
  },
  // FAQ
  {
    id: "faq-renta-o-produccion",
    pilar: "faq",
    tituloGold: "¿RENTO O",
    tituloWhite: "CONTRATO?",
    gancho: "Renta, producción o dirección técnica: ¿cuál necesitas?",
    puntos: [
      "Renta: tú operas el equipo",
      "Producción: nosotros lo operamos",
      "Dirección: un responsable de todo",
      "Elige según tu tiempo y experiencia",
    ],
    remate: "Cuéntanos tu evento y te decimos cuál te conviene.",
    bg: "images/presentacion/empresariales/e-networking.jpg",
    fuente: "Servicios",
  },
  {
    id: "faq-cuanto-audio",
    pilar: "faq",
    tituloGold: "¿CUÁNTA",
    tituloWhite: "BOCINA NECESITO?",
    gancho: "La pregunta correcta no es cuántas, sino para qué espacio.",
    puntos: [
      "Depende de invitados y del lugar",
      "La música en vivo pide más potencia",
      "Cobertura pareja antes que volumen",
      "Nosotros te lo calculamos gratis",
    ],
    remate: "Dinos cuántos invitados y dónde: te decimos el sistema ideal.",
    bg: "images/presentacion/equip-speaker.jpg",
    fuente: "Inventario · Audio",
  },
  {
    id: "faq-cuando-reservar",
    pilar: "faq",
    tituloGold: "¿CON CUÁNTO",
    tituloWhite: "TIEMPO RESERVO?",
    gancho: "En temporada alta las buenas fechas se llenan rápido.",
    puntos: [
      "Temporada alta se satura pronto",
      "De 4 a 6 semanas es lo ideal",
      "Apartas tu fecha con un anticipo",
      "Fechas clave: reserva aún antes",
    ],
    remate: "Escríbenos hoy y aparta tu fecha sin compromiso.",
    bg: "images/presentacion/sociales/s-boda-elegante.jpg",
    fuente: "Servicios",
  },
  // EQUIPO
  {
    id: "equipo-line-array",
    pilar: "equipo",
    tituloGold: "LINE",
    tituloWhite: "ARRAY",
    gancho: "El sistema que hace que todos escuchen igual, sin gritar el volumen.",
    puntos: [
      "Sonido parejo a larga distancia",
      "Ideal para recintos grandes",
      "No siempre es para salones chicos",
      "Potencia real, no solo tamaño",
    ],
    remate: "¿Tu evento es grande? Pregúntanos si un line array es para ti.",
    bg: "images/presentacion/musicales/Musicales-108.jpg",
    fuente: "Inventario · Audio",
  },
  {
    id: "equipo-cabezas-moviles",
    pilar: "equipo",
    tituloGold: "CABEZAS",
    tituloWhite: "MÓVILES",
    gancho: "El alma visual de un show en vivo: movimiento, color y energía.",
    puntos: [
      "Beam, spot y wash en un solo equipo",
      "Movimiento y color programables",
      "Se sincronizan con la música",
      "Transforman por completo el escenario",
    ],
    remate: "Le damos vida a tu escenario con iluminación robótica.",
    bg: "images/presentacion/musicales/Musicales-154.jpg",
    fuente: "Inventario · Iluminación",
  },
  {
    id: "equipo-pantalla-led",
    pilar: "equipo",
    tituloGold: "PANTALLA LED",
    tituloWhite: "VS PROYECTOR",
    gancho: "Dos formas de mostrar tu contenido —y cuándo usar cada una.",
    puntos: [
      "La LED brilla con luz ambiente",
      "El proyector necesita oscuridad",
      "La resolución depende del pitch",
      "Elige según el lugar y la hora",
    ],
    remate: "Te decimos si tu evento pide LED o proyección.",
    bg: "images/presentacion/empresariales/e-carpa-led.jpg",
    fuente: "Inventario · Video",
  },
  // TIPO DE EVENTO
  {
    id: "tipo-boda",
    pilar: "tipoevento",
    tituloGold: "PRODUCCIÓN",
    tituloWhite: "PARA TU BODA",
    gancho: "Cada momento de tu boda pide un sonido y una luz distintos.",
    puntos: [
      "Audio claro para ceremonia y votos",
      "Luz cálida para la recepción",
      "Micrófonos para brindis y música",
      "DJ, banda y ambiente cubiertos",
    ],
    remate: "Hacemos que tu boda se escuche y se vea inolvidable.",
    bg: "images/presentacion/sociales/s-boda-colonial.jpg",
    fuente: "Tipos de evento · Social",
  },
  {
    id: "tipo-corporativo",
    pilar: "tipoevento",
    tituloGold: "EVENTO",
    tituloWhite: "CORPORATIVO",
    gancho: "En un evento de empresa, lo técnico no se puede notar… ni fallar.",
    puntos: [
      "Audio claro para cada ponencia",
      "Pantallas para tus presentaciones",
      "Micrófonos inalámbricos confiables",
      "Respaldo técnico en todo momento",
    ],
    remate: "Tu marca se ve profesional cuando la producción es impecable.",
    bg: "images/presentacion/empresariales/e-auditorio.jpg",
    fuente: "Tipos de evento · Empresarial",
  },
  {
    id: "tipo-concierto",
    pilar: "tipoevento",
    tituloGold: "MONTAR UN",
    tituloWhite: "CONCIERTO",
    gancho: "Que suene profesional no es suerte: es diseño y equipo correcto.",
    puntos: [
      "Line array y monitores de escenario",
      "Consola digital de mezcla",
      "Ingeniero de audio en vivo",
      "Iluminación pensada para show",
    ],
    remate: "Producimos conciertos que suenan como deben sonar.",
    bg: "images/presentacion/ev-m-hero.jpg",
    fuente: "Tipos de evento · Musical",
  },
  // SERVICIO
  {
    id: "serv-renta",
    pilar: "servicio",
    tituloGold: "RENTA",
    tituloWhite: "DE EQUIPO",
    gancho: "Cuando ya tienes quién opere y solo necesitas el equipo correcto.",
    puntos: [
      "Ideal si ya cuentas con operador",
      "Presupuesto más ajustado",
      "Perfecto para eventos sencillos",
      "Equipo profesional, listo para usar",
    ],
    remate: "Renta con nosotros equipo profesional que no te va a fallar.",
    bg: "images/presentacion/equip-speaker.jpg",
    fuente: "Servicios · Renta",
  },
  {
    id: "serv-produccion",
    pilar: "servicio",
    tituloGold: "PRODUCCIÓN",
    tituloWhite: "TÉCNICA",
    gancho: "Tú te encargas de tu evento; nosotros, de que todo funcione.",
    puntos: [
      "Diseño técnico a la medida",
      "Montaje y operación completos",
      "Técnicos especializados en sitio",
      "Tú solo disfrutas el resultado",
    ],
    remate: "Déjanos la parte técnica y concéntrate en tus invitados.",
    bg: "images/presentacion/empresariales/e-proyeccion-mural.jpg",
    fuente: "Servicios · Producción técnica",
  },
  {
    id: "serv-direccion",
    pilar: "servicio",
    tituloGold: "DIRECCIÓN",
    tituloWhite: "TÉCNICA",
    gancho: "Un solo responsable que garantiza que todo salga perfecto.",
    puntos: [
      "Planeación previa a detalle",
      "Coordinación con todos los proveedores",
      "Supervisión en vivo el día del evento",
      "Cero sorpresas para ti",
    ],
    remate: "Un director técnico para que tú no cargues con nada.",
    bg: "images/presentacion/musicales/Musicales-194.jpg",
    fuente: "Servicios · Dirección técnica",
  },
  // CHECKLIST
  {
    id: "check-proveedor-audio",
    pilar: "checklist",
    tituloGold: "5 PREGUNTAS",
    tituloWhite: "ANTES DE CONTRATAR",
    gancho: "Haz estas preguntas antes de firmar con un proveedor de audio.",
    puntos: [
      "¿Incluye técnico en sitio?",
      "¿Tienen equipo de respaldo?",
      "¿Visitan el lugar antes?",
      "¿Qué marcas manejan y qué pasa si falla?",
    ],
    remate: "En Mainstage, la respuesta a las cinco es sí.",
    bg: "images/presentacion/empresariales/e-networking.jpg",
    fuente: "Servicios · Renta",
  },
  {
    id: "check-sonido-boda",
    pilar: "checklist",
    tituloGold: "SONIDO",
    tituloWhite: "PARA TU BODA",
    gancho: "Cada momento de la boda necesita su propio audio.",
    puntos: [
      "Ceremonia: voces y música suave",
      "Coctel: ambiente sin saturar",
      "Cena: fondo agradable para platicar",
      "Fiesta: potencia para la pista",
    ],
    remate: "Cubrimos los cuatro momentos con un solo montaje.",
    bg: "images/presentacion/sociales/s-piano-pista.jpg",
    fuente: "Tipos de evento · Social",
  },
  {
    id: "check-dia-evento",
    pilar: "checklist",
    tituloGold: "EL DÍA",
    tituloWhite: "DEL EVENTO",
    gancho: "Lo que sí o sí hay que revisar antes de abrir puertas.",
    puntos: [
      "Prueba de sonido completa",
      "Niveles y escenas de luz",
      "Energía y planta de respaldo",
      "Contacto directo del técnico",
    ],
    remate: "Con dirección técnica, esta lista la revisamos nosotros.",
    bg: "images/presentacion/musicales/Musicales-083.jpg",
    fuente: "Servicios · Dirección técnica",
  },
  // TENDENCIA
  {
    id: "tend-inmersivo",
    pilar: "tendencia",
    tituloGold: "AUDIO",
    tituloWhite: "INMERSIVO",
    gancho: "El sonido que envuelve al público ya llegó a los eventos.",
    puntos: [
      "Sonido envolvente, no solo frontal",
      "Experiencia de 360 grados",
      "Ideal para activaciones de marca",
      "Ya es posible en tu evento",
    ],
    remate: "Pregúntanos por una experiencia de audio inmersivo.",
    bg: "images/presentacion/musicales/Musicales-220.jpg",
    fuente: "Tendencias · Audio",
  },
  {
    id: "tend-led-creativo",
    pilar: "tendencia",
    tituloGold: "LED QUE ROMPE",
    tituloWhite: "EL FORMATO",
    gancho: "Las pantallas ya no son solo un rectángulo al fondo.",
    puntos: [
      "Formas y volúmenes no rectangulares",
      "Piso y techo de LED",
      "Contenido en vivo y reactivo",
      "Efecto 'wow' garantizado",
    ],
    remate: "Diseñemos juntos una pantalla que nadie olvide.",
    bg: "images/presentacion/empresariales/e-carpa-led.jpg",
    fuente: "Tendencias · Video",
  },
  {
    id: "tend-hibrido",
    pilar: "tendencia",
    tituloGold: "EVENTOS",
    tituloWhite: "HÍBRIDOS",
    gancho: "Presencial y en línea, al mismo tiempo, con la misma calidad.",
    puntos: [
      "Cámara y transmisión en vivo",
      "Audio pensado para ambos públicos",
      "Mucho mayor alcance",
      "El nuevo estándar de los eventos",
    ],
    remate: "Llevamos tu evento a quienes no pueden estar presentes.",
    bg: "images/presentacion/empresariales/e-sala-pantallas.jpg",
    fuente: "Tendencias · Producción",
  },
];

// ── Datos de UNA pieza (lo que consume el render) ────────────────────────────
export type ContenidoData = {
  ideaId: string;
  pilar: Pilar;
  eyebrow: string;
  tituloGold: string;
  tituloWhite: string;
  gancho: string;
  puntos: string[];
  remate: string;
  telefono: string;
  arroba: string;
  bg: string;
};

export function ideaToData(idea: IdeaContenido): ContenidoData {
  return {
    ideaId: idea.id,
    pilar: idea.pilar,
    eyebrow: PILAR_LABEL[idea.pilar],
    tituloGold: idea.tituloGold,
    tituloWhite: idea.tituloWhite,
    gancho: idea.gancho,
    puntos: idea.puntos,
    remate: idea.remate,
    telefono: TELEFONO,
    arroba: ARROBA,
    bg: idea.bg,
  };
}

export function getIdea(id: string | null | undefined, ideas: IdeaContenido[] = IDEAS): IdeaContenido | null {
  if (!id) return null;
  return ideas.find((i) => i.id === id) ?? null;
}

// ── Ideas dinámicas del inventario (pilar "equipo") ──────────────────────────
// Insumo mínimo desde el modelo Equipo para armar una pieza "CONOCE EL EQUIPO".
// El mapeo es PURO (sin prisma); la carga vive en contenido/inventario.ts.
export type EquipoInsumo = {
  id: string;
  marca: string | null;
  modelo: string | null;
  descripcion: string;
  categoria: string;
  voltaje: string | null; // "110" | "220" | "AMBOS" | null
  amperaje: number | null;
  imagenUrl: string | null;
};

export const ID_EQUIPO_PREFIX = "equipo-inv-";
export const ID_SERVICIO_PREFIX = "servicio-inv-";
export const ID_TIPOEVENTO_PREFIX = "tipoevento-inv-";

function partirTitulo(marca: string | null, modelo: string | null, descripcion: string): { gold: string; white: string } {
  if (marca && modelo) return { gold: marca.trim().toUpperCase(), white: modelo.trim().toUpperCase() };
  const fuente = (marca || modelo || descripcion).trim().toUpperCase();
  const partes = fuente.split(/\s+/).filter(Boolean);
  if (partes.length <= 1) return { gold: partes[0] ?? "EQUIPO", white: "" };
  return { gold: partes[0], white: partes.slice(1).join(" ") };
}

// Parte un nombre en "primera palabra" (oro) + resto (blanco), en mayúsculas.
function partirNombre(nombre: string): { gold: string; white: string } {
  const partes = nombre.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (partes.length <= 1) return { gold: partes[0] ?? "", white: "" };
  return { gold: partes[0], white: partes.slice(1).join(" ") };
}

// Convierte una descripción real de la plataforma en frases cortas de APOYO
// (no specs). Toma sólo las que caben como bullet; el dato sirve de contexto,
// nunca de titular literal.
function frasesDe(texto: string | null | undefined, max: number): string[] {
  if (!texto) return [];
  return texto
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/\s+/g, " ").trim().replace(/[.·]+$/, "").trim())
    .filter((s) => s.length >= 10 && s.length <= 88)
    .slice(0, max);
}

// Une una lista con comas y "y" final ("A, B y C").
function listaNatural(items: string[]): string {
  const xs = items.filter(Boolean);
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`;
}

// ── Beneficios "de apoyo" (no literales) por disciplina del equipo ────────────
// El dato del inventario (categoría + descripción) es contexto; el mensaje que
// se ve es un beneficio para el cliente, nunca una ficha técnica.
type Disciplina = "audio" | "luz" | "video" | "estructura" | "generico";

function disciplinaDe(categoria: string): Disciplina {
  const c = categoria.toLowerCase();
  if (/(audio|sonido|bocina|micro|consola|bafle|amplific|subwoofer|monitor)/.test(c)) return "audio";
  if (/(ilum|luz|light|par\b|beam|wash|spot|cabeza|dimmer|robotic)/.test(c)) return "luz";
  if (/(video|pantalla|led|proyec|cámara|camara|visual|switcher)/.test(c)) return "video";
  if (/(estruct|truss|tarima|escenario|rigging|templete|backline|tablado)/.test(c)) return "estructura";
  return "generico";
}

const GANCHO_EQUIPO: Record<Disciplina, string> = {
  audio: "El sonido correcto hace que todo tu evento se sienta profesional.",
  luz: "La luz adecuada transforma por completo cómo se ve tu evento.",
  video: "La imagen correcta mantiene a todos conectados con tu mensaje.",
  estructura: "Una buena base sostiene —literalmente— todo tu montaje.",
  generico: "El equipo correcto es la diferencia entre un evento bien hecho y uno memorable.",
};

const BENEFICIOS_EQUIPO: Record<Disciplina, string[]> = {
  audio: ["Sonido nítido y parejo en todo el lugar", "Potencia real para tu tipo de evento", "Lo instalamos y operamos por ti"],
  luz: ["Ambiente y color a la medida del momento", "Mejores fotos y video para el recuerdo", "Diseño de luz pensado para tu evento"],
  video: ["Imagen brillante que se ve desde cualquier punto", "Tu contenido con calidad profesional", "Lo montamos y operamos por ti"],
  estructura: ["Montaje seguro y a la medida del espacio", "Base sólida para todo tu escenario", "Instalación y respaldo técnico incluidos"],
  generico: ["Equipo profesional listo para tu evento", "Respaldo y operación técnica incluidos", "Disponible en renta y producción"],
};

const BENEFICIOS_SERVICIO = [
  "Equipo profesional y técnicos especializados",
  "Nos encargamos de que todo funcione",
  "Respaldo técnico en todo momento",
];

const BENEFICIOS_EVENTO = [
  "Audio, luz y video en un solo montaje",
  "Técnicos especializados en sitio",
  "Respaldo técnico de principio a fin",
];

// Convierte un equipo real del inventario en una idea del pilar "equipo".
// La categoría y la descripción NO se muestran literales: sólo alimentan un
// mensaje de beneficio; a lo sumo una frase de la descripción entra de apoyo.
export function equipoToIdea(e: EquipoInsumo): IdeaContenido {
  const { gold, white } = partirTitulo(e.marca, e.modelo, e.descripcion);
  const disc = disciplinaDe(e.categoria);
  const apoyo = frasesDe(e.descripcion, 1); // una frase de la ficha, de apoyo
  const puntos = [...BENEFICIOS_EQUIPO[disc], ...apoyo].slice(0, 4);
  return {
    id: `${ID_EQUIPO_PREFIX}${e.id}`,
    pilar: "equipo",
    tituloGold: gold || "EQUIPO",
    tituloWhite: white,
    gancho: GANCHO_EQUIPO[disc],
    puntos,
    remate: "¿Lo quieres en tu evento? Escríbenos y lo apartamos.",
    bg: e.imagenUrl || "images/presentacion/equip-speaker.jpg",
    fuente: `Inventario · ${e.categoria}`,
  };
}

// ── Ideas dinámicas del catálogo (pilares "servicio" y "tipoevento") ──────────
// Mismo criterio: la info real de la plataforma alimenta el contenido, pero
// como APOYO (frases de la descripción / subtítulo), no como volcado literal.
export type ServicioInsumo = {
  slug: string;
  nombre: string;
  subtitulo: string | null;
  descripcion: string | null;
  bg: string | null;
};

export function servicioToIdea(s: ServicioInsumo): IdeaContenido {
  const { gold, white } = partirNombre(s.nombre);
  const frases = frasesDe(s.descripcion, 5);
  const sub = s.subtitulo?.trim();
  let gancho: string;
  let restantes: string[];
  if (sub) {
    gancho = sub;
    restantes = frases;
  } else if (frases.length) {
    gancho = frases[0];
    restantes = frases.slice(1);
  } else {
    gancho = `${s.nombre}: lo resolvemos por ti, de principio a fin.`;
    restantes = [];
  }
  const puntos = [...restantes, ...BENEFICIOS_SERVICIO].slice(0, 4);
  return {
    id: `${ID_SERVICIO_PREFIX}${s.slug}`,
    pilar: "servicio",
    tituloGold: gold || "SERVICIO",
    tituloWhite: white,
    gancho,
    puntos,
    remate: "¿Te interesa este servicio? Cuéntanos de tu evento.",
    bg: s.bg || "images/presentacion/empresariales/e-proyeccion-mural.jpg",
    fuente: `Servicios · ${s.nombre}`,
  };
}

export type TipoEventoInsumo = {
  slug: string;
  nombre: string;
  subtitulo: string | null;
  descripcion: string | null;
  nichos: string[];
  bg: string | null;
};

export function tipoEventoToIdea(t: TipoEventoInsumo): IdeaContenido {
  const nombreLimpio = t.nombre.toUpperCase().replace(/^EVENTOS?\s+/, "").trim();
  const frases = frasesDe(t.descripcion, 5);
  const sub = t.subtitulo?.trim();
  let gancho: string;
  let restantes: string[];
  if (sub) {
    gancho = sub;
    restantes = frases;
  } else if (frases.length) {
    gancho = frases[0];
    restantes = frases.slice(1);
  } else {
    gancho = `Cada evento ${nombreLimpio.toLowerCase()} pide una producción a su medida.`;
    restantes = [];
  }
  const nichoLine = t.nichos.length ? `Ideal para ${listaNatural(t.nichos.slice(0, 3).map((n) => n.toLowerCase()))}` : null;
  const puntos = [...(nichoLine ? [nichoLine] : []), ...restantes, ...BENEFICIOS_EVENTO].slice(0, 4);
  return {
    id: `${ID_TIPOEVENTO_PREFIX}${t.slug}`,
    pilar: "tipoevento",
    tituloGold: "TU EVENTO",
    tituloWhite: nombreLimpio,
    gancho,
    puntos,
    remate: "Cuéntanos de tu evento y armamos la producción ideal.",
    bg: t.bg || "images/presentacion/ev-m-hero.jpg",
    fuente: `Tipos de evento · ${t.nombre}`,
  };
}

// Muestra por defecto = primera idea del calendario.
export const CONTENIDO_MUESTRA: ContenidoData = ideaToData(playlistOrdenada()[0] ?? IDEAS[0]);

// ── Slides (fijos: 3 por pieza) ──────────────────────────────────────────────
export function contenidoSlides(): { id: string; label: string }[] {
  return [
    { id: "gancho", label: "Gancho" },
    { id: "valor", label: "Contenido de valor" },
    { id: "cierre", label: "Cierre / contacto" },
  ];
}

export function contenidoBg(d: ContenidoData): string {
  return d.bg;
}

export function contenidoEditableFields(): EditableField[] {
  const f: EditableField[] = [];
  const add = (path: string, label: string, slideId: string, slideLabel: string, kind: EditableField["kind"] = "text") =>
    f.push({ path, label, slideId, slideLabel, kind });
  add("tituloGold", "Título (dorado)", "gancho", "Gancho");
  add("tituloWhite", "Título (blanco)", "gancho", "Gancho");
  add("gancho", "Gancho", "gancho", "Gancho", "textarea");
  add("puntos", "Puntos (uno por línea)", "valor", "Contenido de valor", "lines");
  add("remate", "Remate", "cierre", "Cierre / contacto", "textarea");
  return f;
}

// ── Planificador semanal (ISO) ───────────────────────────────────────────────
// Ordena las ideas intercalando pilares para que semanas seguidas no se parezcan.
export function playlistOrdenada(ideas: IdeaContenido[] = IDEAS): IdeaContenido[] {
  const porPilar = new Map<Pilar, IdeaContenido[]>();
  for (const idea of ideas) {
    const arr = porPilar.get(idea.pilar) ?? [];
    arr.push(idea);
    porPilar.set(idea.pilar, arr);
  }
  const grupos = [...porPilar.values()];
  const out: IdeaContenido[] = [];
  let ronda = 0;
  let agrego = true;
  while (agrego) {
    agrego = false;
    for (const g of grupos) {
      if (g[ronda]) {
        out.push(g[ronda]);
        agrego = true;
      }
    }
    ronda++;
  }
  return out;
}

// Otras ideas del mismo pilar (para "regenerar otra opción").
export function alternativasEnPilar(pilar: Pilar, exceptoId?: string, ideas: IdeaContenido[] = IDEAS): IdeaContenido[] {
  return ideas.filter((i) => i.pilar === pilar && i.id !== exceptoId);
}

// Siguiente idea del MISMO pilar (cíclica) — motor del botón "regenerar".
export function siguienteEnPilar(pilar: Pilar, actualId: string, ideas: IdeaContenido[] = IDEAS): IdeaContenido {
  const grupo = ideas.filter((i) => i.pilar === pilar);
  if (grupo.length === 0) return getIdea(actualId, ideas) ?? IDEAS[0];
  const idx = grupo.findIndex((i) => i.id === actualId);
  return grupo[(idx + 1) % grupo.length] ?? grupo[0];
}

// Semana ISO de una fecha (año + número 1..53).
export function semanaISO(d: Date): { year: number; week: number } {
  const fecha = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dia = (fecha.getUTCDay() + 6) % 7; // lunes = 0
  fecha.setUTCDate(fecha.getUTCDate() - dia + 3); // jueves de esta semana
  const primerJueves = new Date(Date.UTC(fecha.getUTCFullYear(), 0, 4));
  const diaPrimero = (primerJueves.getUTCDay() + 6) % 7;
  primerJueves.setUTCDate(primerJueves.getUTCDate() - diaPrimero + 3);
  const week = 1 + Math.round((fecha.getTime() - primerJueves.getTime()) / (7 * 864e5));
  return { year: fecha.getUTCFullYear(), week };
}

function lunesDe(d: Date): Date {
  const fecha = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dia = (fecha.getUTCDay() + 6) % 7;
  fecha.setUTCDate(fecha.getUTCDate() - dia);
  return fecha;
}

export type SemanaPlan = {
  key: string; // "2026-W34"
  year: number;
  week: number;
  lunes: Date;
  idea: IdeaContenido; // idea por defecto asignada a la semana
};

// Calendario de una idea por semana entre dos fechas (inclusive).
export function planSemanal(desde: Date, hasta: Date, ideas: IdeaContenido[] = IDEAS): SemanaPlan[] {
  const lista = playlistOrdenada(ideas);
  const out: SemanaPlan[] = [];
  let cur = lunesDe(desde);
  const fin = hasta.getTime();
  let i = 0;
  while (cur.getTime() <= fin) {
    const { year, week } = semanaISO(cur);
    out.push({
      key: `${year}-W${String(week).padStart(2, "0")}`,
      year,
      week,
      lunes: new Date(cur),
      idea: lista[i % lista.length],
    });
    cur = new Date(cur);
    cur.setUTCDate(cur.getUTCDate() + 7);
    i++;
  }
  return out;
}
