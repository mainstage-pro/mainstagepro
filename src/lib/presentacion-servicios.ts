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
];

export const SERVICIOS_DETALLE: ServicioDetalle[] = CONTENIDO.map((c) => ({
  ...c,
  title: SERVICIO_LABELS[c.servicio],
  tipoServicio: espejoDeServicio(c.servicio),
}));

export function getServicio(slug: string) {
  return SERVICIOS_DETALLE.find((s) => s.slug === slug);
}
