// Fuente única de los 3 servicios. La `tipoServicio` liga con el formulario de
// descubrimiento y el enum Prisma; el `slug` es la ruta pública dedicada.
export type ServicioDetalle = {
  slug: string;
  tipoServicio: "RENTA" | "PRODUCCION_TECNICA" | "DIRECCION_TECNICA";
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

export const SERVICIOS_DETALLE: ServicioDetalle[] = [
  {
    slug: "renta",
    tipoServicio: "RENTA",
    n: "01",
    title: "Renta de equipo",
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
    tipoServicio: "PRODUCCION_TECNICA",
    n: "02",
    title: "Producción técnica",
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
    slug: "direccion-y-operaciones",
    tipoServicio: "DIRECCION_TECNICA",
    n: "03",
    title: "Dirección y operaciones",
    tagline: "Una sola dirección que responde por todo el evento.",
    hero: "/images/presentacion/musicales/Musicales-055.jpg",
    resumen:
      "Dirigimos el evento completo, no solo lo técnico: el concepto y los renders con los que se aprueba, la coordinación de todos los frentes —energía, entarimado, estructura, vallas, sanitarios, seguridad— y el manejo de stage el día del evento. Una sola cabeza que responde por que todo llegue, cuadre y suceda a tiempo.",
    para: "Ideal para eventos con varios frentes y proveedores donde necesitas una sola cabeza que diseñe, coordine y responda por todo.",
    incluye: [
      "Scoutings técnicos y levantamiento del lugar",
      "Desarrollo conceptual del proyecto",
      "Propuestas visuales con renders entregables al cliente",
      "Renders de entarimado, estructura y escenario",
      "Acceso a nuestra cartera de proveedores aliados, local y nacional",
      "Gestión y coordinación de los frentes de producción: energía, entarimado, estructura, vallas, sanitarios y seguridad",
      "Manejo de operaciones: cronograma de montaje, accesos, maniobras y logística del sitio",
      "Manejo de stage: corridas, cambios entre actos y comunicación con artistas",
      "Ejecución y responsabilidad total del proyecto",
      "Replicabilidad del proyecto en otras regiones",
    ],
    entregables: [
      { title: "Concepto y propuesta visual", body: "Desarrollo conceptual con renders de producción y entarimado para que apruebes el resultado antes de montar." },
      { title: "Coordinación de todos los frentes", body: "Energía, entarimado, estructura, vallas, sanitarios y seguridad bajo una sola dirección responsable, apoyada en nuestra red de aliados." },
      { title: "Operaciones y stage en sitio", body: "Cronograma de montaje, maniobras, accesos y manejo de escenario el día del evento, con una cabeza que decide en el momento." },
      { title: "Ejecución replicable", body: "Responsabilidad total del proyecto, listo para repetirse con el mismo nivel en otras regiones." },
    ],
    detailChips: "Concepto · Renders · Frentes · Stage",
  },
];

export function getServicio(slug: string) {
  return SERVICIOS_DETALLE.find((s) => s.slug === slug);
}
