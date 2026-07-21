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
    tagline: "El equipo correcto, listo y respaldado.",
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
    tagline: "Operadores que montan, prueban y operan tu show.",
    hero: "/images/presentacion/musicales/Musicales-016.jpg",
    resumen:
      "Llevamos el equipo y a la gente que lo opera. Montaje, prueba de sonido y operación en vivo de audio, iluminación y video durante todo el evento, de principio a fin, con respaldo ante cualquier imprevisto.",
    para: "Ideal si quieres olvidarte de lo técnico: equipo + operadores expertos que ejecutan tu evento completo.",
    incluye: [
      "Montaje y prueba de sonido",
      "Técnicos de audio, luz y video",
      "Operación en vivo del show",
      "Respaldo ante imprevistos",
      "Desmontaje y logística",
      "Equipo profesional incluido",
    ],
    entregables: [
      { title: "Montaje completo", body: "Llegamos con anticipación, montamos y dejamos todo probado antes del primer invitado." },
      { title: "Operación en vivo", body: "Un técnico dedicado a cada área durante todo el evento, atento a cada momento." },
      { title: "Respaldo real", body: "Equipo de reserva y criterio para resolver cualquier imprevisto sin que se note." },
    ],
    detailChips: "Ingenieros especializados · Operación completa",
  },
  {
    slug: "direccion-tecnica",
    tipoServicio: "DIRECCION_TECNICA",
    n: "03",
    title: "Dirección técnica",
    tagline: "Un solo responsable de que todo llegue junto.",
    hero: "/images/presentacion/musicales/Musicales-055.jpg",
    resumen:
      "Un director de producción coordina cada área: el rider, los cues de luz por escena, la señal de video y la comunicación directa con el artista y su equipo. La cabeza que hace que audio, luz y video lleguen al mismo tiempo.",
    para: "Ideal para eventos con varias áreas o proveedores donde necesitas una sola cabeza que coordine y responda por todo.",
    incluye: [
      "Coordinación integral del rider",
      "Cues de luz por escena",
      "Enlace directo con el artista",
      "Guion técnico del evento",
      "Gestión de proveedores",
      "Un solo punto de contacto",
    ],
    entregables: [
      { title: "Planeación previa", body: "Revisamos rider, programa y espacio para dejar un guion técnico claro." },
      { title: "Coordinación integral", body: "Alineamos audio, luz, video y cada proveedor bajo una sola batuta." },
      { title: "Ejecución impecable", body: "El día del evento, todo llega en el momento correcto, sin improvisar." },
    ],
    detailChips: "Coordinación integral · Rider · Cues por escena",
  },
];

export function getServicio(slug: string) {
  return SERVICIOS_DETALLE.find((s) => s.slug === slug);
}
