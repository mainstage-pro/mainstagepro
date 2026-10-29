// Cómo se cuenta cada escalón de la escalera comercial en la vitrina pública:
// la foto, el texto de venta y la ruta dedicada. Qué escalones hay, cómo se
// llaman y con qué valor se guardan los decide `servicios-trato.ts`, que es la
// fuente — aquí solo se les pone cara.
import { SERVICIO_LABELS, espejoDeServicio, type Servicio } from "@/lib/servicios-trato";

export type ServicioDetalle = {
  /// La ruta pública dedicada (`/presentacion/servicio/[slug]`).
  slug: string;
  servicio: Servicio;
  /// El valor histórico con que el lead de esta página guarda su interés.
  tipoServicio: string;
  n: string;
  title: string;
  tagline: string;
  hero: string;
  resumen: string;
  para: string; // para quién es
  incluye: string[];
  entregables: { title: string; body: string }[];
  detailChips: string;
};

/// El nombre y el valor espejo se derivan del escalón, así que renombrar un
/// servicio no deja la vitrina anunciando el nombre viejo.
type ContenidoServicio = Omit<ServicioDetalle, "title" | "tipoServicio">;

const CONTENIDO: ContenidoServicio[] = [
  {
    slug: "renta",
    servicio: "RENTA",
    n: "01",
    tagline: "Equipo profesional, verificado y respaldado para cada evento.",
    hero: "/images/presentacion/musicales/Musicales-076.jpg",
    resumen:
      "Line arrays, subwoofers, consolas digitales, cabezas móviles y pantallas LED. Equipo profesional verificado antes de salir de bodega, disponible con o sin operador para completar tu producción o montarla desde cero.",
    para: "Ideal si ya tienes operadores o coordinación y solo necesitas el equipo indicado, revisado y a tiempo.",
    incluye: [
      "Audio: line array, subs y monitoreo",
      "Iluminación e intelligent lighting",
      "Video y pantallas LED",
      "DJ gear y backline",
      "Con o sin operador",
      "Cableado y accesorios completos",
    ],
    entregables: [
      { title: "Equipo verificado", body: "Cada pieza se prueba en bodega antes de cargar. Nada sale sin revisar." },
      { title: "Lista clara", body: "Sabes exactamente qué recibes, en qué cantidad y por cuánto tiempo." },
      { title: "Entrega puntual", body: "Coordinamos horarios de carga y entrega para que llegue cuando lo necesitas." },
    ],
    detailChips: "Audio · Iluminación · Video · DJ Gear",
  },
  {
    slug: "produccion-tecnica",
    servicio: "PRODUCCION_TECNICA",
    n: "02",
    tagline: "Montaje, operación y respaldo técnico integral del evento.",
    hero: "/images/presentacion/musicales/Musicales-016.jpg",
    resumen:
      "Llevamos el equipo y a la gente que lo opera. Montaje, prueba de sonido y operación en vivo de audio, iluminación y video durante todo el evento, de principio a fin, con respaldo ante cualquier imprevisto.",
    para: "Ideal si quieres olvidarte de lo técnico: equipo + operadores expertos que ejecutan tu evento completo.",
    incluye: [
      "Descubrimiento de necesidades y scouting técnico del lugar",
      "Propuesta de producción a la medida",
      "Entrega del rider técnico final",
      "Planeación de preproducción",
      "Renders y plots de iluminación y escenario (uso interno que garantiza la ejecución)",
      "Coordinación en sitio el día del evento",
      "Operación técnica en vivo del evento",
      "Desmontaje y logística de salida",
    ],
    entregables: [
      { title: "Preproducción documentada", body: "Rider final, plots y renders que dejan la ejecución amarrada antes de montar." },
      { title: "Operación en vivo", body: "Técnicos dedicados a audio, iluminación y video durante todo el evento." },
      { title: "Cierre completo", body: "Desmontaje y logística de salida sin que tengas que preocuparte por nada." },
    ],
    detailChips: "Scouting · Rider técnico · Operación en vivo",
  },
  {
    slug: "production-management",
    servicio: "DIRECCION_OPERACIONES",
    n: "03",
    tagline: "Una sola dirección de producción que responde por cada show, en cada plaza.",
    hero: "/images/presentacion/musicales/Musicales-055.jpg",
    resumen:
      "Dirigimos el show en gira de punta a punta: el advance técnico plaza por plaza, el rider que cualquier venue sabe leer, los ensayos y el run of show el día del evento, con los ingenieros de audio e iluminación que el show necesita. Una sola cabeza que responde por que todo llegue, cuadre y suene igual en cada fecha.",
    para: "Ideal para artistas y managers que salen de gira y necesitan una sola dirección de producción que diseñe el show, lo coteje contra cada venue y responda por él noche tras noche.",
    incluye: [
      "Advance técnico plaza por plaza, cotejado contra el rider",
      "Diseño y actualización del rider técnico, con input/output list y stage plot",
      "Ensayos, residencias y preproducción del show",
      "Run of show: soundcheck cronometrado y llamado de cues en vivo",
      "Coordinación con la producción local de cada venue",
      "Ingeniero de sala / FOH e ingeniero de monitores",
      "Diseño de iluminación y operador en cada plaza",
      "Renders de producción del escenario y el stage",
      "Documentación y logística de crew para toda la gira",
    ],
    entregables: [
      { title: "El show, documentado una vez", body: "Rider técnico maestro, input/output list y stage plot que viajan contigo y que cualquier venue sabe leer, sin reexplicar nada en cada plaza." },
      { title: "El advance, plaza por plaza", body: "Cotejamos tu rider contra lo que cada venue realmente tiene antes de que el equipo llegue, y dejamos resuelto lo que falta con la producción local." },
      { title: "Los técnicos del show", body: "FOH, monitores e iluminación —diseño y operación— con la misma dirección detrás en cada fecha, para que el show suene y se vea igual de principio a fin." },
      { title: "El show, corrido en tiempo", body: "Run of show que cronometra el soundcheck y llama los cues en vivo, para que cada cambio entre bloques pase exactamente cuando debe." },
    ],
    detailChips: "Advance · Rider · Run of show · Ingenieros",
  },
];

export const SERVICIOS_DETALLE: ServicioDetalle[] = CONTENIDO.map((c) => ({
  ...c,
  title: SERVICIO_LABELS[c.servicio],
  tipoServicio: espejoDeServicio(c.servicio),
}));

export function getServicio(slug: string) {
  return SERVICIOS_DETALLE.find((s) => s.slug === slug);
}
