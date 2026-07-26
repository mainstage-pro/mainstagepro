// Configuración de las presentaciones por categoría de equipo (audio, iluminación,
// dj, video…). Cada macro-categoría agrupa una o varias CategoriaEquipo del
// inventario y define el relato comercial: por qué importa ese equipo en la
// producción de un evento, qué servicios ofrecemos y cómo se ordena el catálogo.
//
// El endpoint /api/presentacion/categoria/[slug] usa `grupos[].categorias` para
// leer los equipos reales del inventario y sus fotos adicionales (uso EXTERNO).

export type CategoriaGrupo = {
  // Título de la sección/grupo dentro de la presentación (ej. "Consolas de audio").
  label: string;
  // Nombres EXACTOS de CategoriaEquipo del inventario que caen en este grupo.
  categorias: string[];
  // Descripción corta del grupo (opcional).
  descripcion?: string;
};

export type PresentacionCategoria = {
  slug: string;
  nombre: string;
  // Etiqueta corta tipo "eyebrow" sobre el título del hero.
  eyebrow: string;
  heroTitulo: string;
  heroSub: string;
  // Relato de la importancia del equipo en la producción de un evento.
  importanciaTitulo: string;
  importanciaParrafos: string[];
  // Puntos clave (por qué importa) con título + texto.
  puntos: { titulo: string; texto: string }[];
  // Servicios que ofrecemos para esta categoría.
  servicios: { titulo: string; texto: string }[];
  // Grupos = secciones de catálogo + equipos relacionados dentro de la categoría.
  grupos: CategoriaGrupo[];
  // Otras categorías relacionadas (cross-links a sus presentaciones).
  relacionadas: string[];
  // Frase de cierre para el CTA.
  cierre: string;
};

export const PRESENTACION_CATEGORIAS: PresentacionCategoria[] = [
  {
    slug: "audio",
    nombre: "Audio",
    eyebrow: "Sistemas de sonido profesional",
    heroTitulo: "El sonido que sostiene el momento",
    heroSub:
      "Line arrays, consolas digitales, microfonía inalámbrica y monitoreo in-ear de alta gama. El corazón acústico de cada evento que producimos.",
    importanciaTitulo: "Nadie recuerda un evento que no se escuchó bien",
    importanciaParrafos: [
      "El audio es lo primero que el público percibe y lo último que perdona. Una voz que se entiende, una banda que se siente en el pecho y un discurso limpio hasta la última fila son la diferencia entre un evento memorable y uno que se olvida.",
      "En Mainstage Pro tratamos el sonido como ingeniería, no como accesorio. Cada sistema se diseña para el recinto, la audiencia y el tipo de programa: cobertura pareja, presión controlada y cero puntos muertos.",
      "Detrás de cada sistema hay equipo de gama profesional, redundancia en los puntos críticos y un ingeniero que lo opera en vivo. Así garantizamos que lo que se planeó en papel suene exactamente igual el día del evento.",
    ],
    puntos: [
      { titulo: "Inteligibilidad total", texto: "Cobertura pareja para que cada palabra y cada nota llegue clara a toda la audiencia." },
      { titulo: "Presión sin fatiga", texto: "Line arrays calibrados que entregan energía sin saturar ni cansar al oído." },
      { titulo: "Sin sorpresas en vivo", texto: "Redundancia en puntos críticos y operación profesional durante todo el evento." },
      { titulo: "Diseño por recinto", texto: "El sistema se dimensiona para tu espacio y tu tipo de evento, no al revés." },
    ],
    servicios: [
      { titulo: "Renta de equipo", texto: "Sistemas de sonido, consolas y microfonía de gama profesional, listos para tu producción con entrega y recolección." },
      { titulo: "Producción técnica", texto: "Diseño del sistema, montaje, calibración e ingeniería de sonido en vivo a cargo de nuestro equipo." },
      { titulo: "Dirección técnica", texto: "Coordinación integral del audio dentro de una producción completa, alineado con iluminación, video y escenario." },
    ],
    grupos: [
      { label: "Sistemas de sonido", categorias: ["Equipo de Audio"], descripcion: "Line arrays, subwoofers y sistemas de refuerzo para cualquier escala de evento." },
      { label: "Consolas de audio", categorias: ["Consolas de Audio"], descripcion: "Mezcladoras digitales para control preciso de cada canal en vivo." },
      { label: "Microfonía e inalámbricos", categorias: ["Sistemas de Microfonía"], descripcion: "Micrófonos de mano, diadema y solapa con sistemas inalámbricos confiables." },
      { label: "Monitoreo in-ear", categorias: ["Monitoreo In-Ear"], descripcion: "Sistemas personales para que músicos y presentadores se escuchen a la perfección." },
    ],
    relacionadas: ["iluminacion", "dj", "video"],
    cierre: "Diseñemos el sistema de audio perfecto para tu evento.",
  },
  {
    slug: "iluminacion",
    nombre: "Iluminación",
    eyebrow: "Diseño de iluminación escénica",
    heroTitulo: "La luz que convierte un espacio en un escenario",
    heroSub:
      "Luminarias robóticas, efectos, consolas y estructuras. Diseño de iluminación que da atmósfera, dirige la mirada y eleva cada momento.",
    importanciaTitulo: "La luz es lo que la gente ve antes de entender qué está pasando",
    importanciaParrafos: [
      "La iluminación define la emoción de un evento antes de que suene la primera nota. Marca el ritmo, resalta a los protagonistas y transforma un salón vacío en una experiencia envolvente.",
      "Trabajamos la luz como diseño, no como relleno: cada luminaria tiene una intención y un lugar. Color, movimiento y contraste al servicio del programa, la marca y la arquitectura del recinto.",
      "Desde luminarias robóticas hasta rigging y estructura, montamos sistemas seguros y programados con precisión para que cada escena ocurra en el momento exacto.",
    ],
    puntos: [
      { titulo: "Atmósfera a medida", texto: "Color y textura de luz diseñados para el tono de tu evento." },
      { titulo: "Momentos dirigidos", texto: "La luz guía la mirada del público hacia lo que importa en cada instante." },
      { titulo: "Programación precisa", texto: "Escenas y transiciones sincronizadas con el show, controladas desde consola." },
      { titulo: "Estructura segura", texto: "Rigging y truss montados con estándares profesionales de carga y seguridad." },
    ],
    servicios: [
      { titulo: "Renta de equipo", texto: "Luminarias, consolas y estructura de iluminación de gama profesional para tu producción." },
      { titulo: "Producción técnica", texto: "Diseño de iluminación, montaje, rigging y programación de escenas a cargo de nuestro equipo." },
      { titulo: "Dirección técnica", texto: "Operación en vivo y coordinación de la iluminación dentro de una producción integral." },
    ],
    grupos: [
      { label: "Luminarias y efectos", categorias: ["Equipo de Iluminación"], descripcion: "Cabezas robóticas, PARs, wash y efectos para diseñar cualquier escena." },
      { label: "Consolas de iluminación", categorias: ["Consolas de Iluminación"], descripcion: "Control profesional para programar y operar el show de luces en vivo." },
      { label: "Rigging y estructuras", categorias: ["Rigging y Estructuras", "Entarimado"], descripcion: "Truss, soportes y tarimas para montar el diseño con seguridad." },
    ],
    relacionadas: ["audio", "video", "dj"],
    cierre: "Diseñemos la iluminación que tu evento merece.",
  },
  {
    slug: "dj",
    nombre: "DJ",
    eyebrow: "Cabinas y equipo para DJ",
    heroTitulo: "La cabina donde nace la fiesta",
    heroSub:
      "Controladoras, mezcladoras y booths de DJ profesionales. El equipo que mantiene la pista encendida de principio a fin.",
    importanciaTitulo: "Un buen DJ necesita un equipo a su altura",
    importanciaParrafos: [
      "La cabina de DJ es el motor de la pista. Un setup confiable, con equipo estándar de la industria, le da al DJ la libertad de leer al público y llevar la energía justo a donde debe estar.",
      "Ofrecemos controladoras y mezcladoras profesionales que cualquier DJ conoce y domina, montadas en booths que se ven tan bien como suenan.",
      "Integramos la cabina con el sistema de audio y la iluminación para que la pista se sienta como una sola experiencia, no como piezas sueltas.",
    ],
    puntos: [
      { titulo: "Equipo estándar", texto: "Controladoras y mezcladoras que todo DJ profesional conoce y prefiere." },
      { titulo: "Pista sin cortes", texto: "Setup confiable pensado para horas continuas de música sin fallas." },
      { titulo: "Booth de impacto", texto: "Cabinas con presencia visual que se integran al diseño del evento." },
      { titulo: "Todo integrado", texto: "La cabina se conecta al audio e iluminación como un solo sistema." },
    ],
    servicios: [
      { titulo: "Renta de equipo", texto: "Controladoras, mezcladoras y booths de DJ listos para tu evento." },
      { titulo: "Producción técnica", texto: "Montaje, conexión al sistema de audio y soporte durante el evento." },
      { titulo: "Dirección técnica", texto: "Coordinación de la cabina dentro de una producción completa." },
    ],
    grupos: [
      { label: "Equipo para DJ", categorias: ["Consolas/Equipo para DJ"], descripcion: "Controladoras y mezcladoras profesionales estándar de la industria." },
      { label: "Cabinas DJ", categorias: ["DJ Booths"], descripcion: "Booths con presencia visual para montar la cabina con estilo." },
    ],
    relacionadas: ["audio", "iluminacion", "video"],
    cierre: "Armemos la cabina perfecta para tu fiesta.",
  },
  {
    slug: "video",
    nombre: "Video",
    eyebrow: "Pantallas y sistemas de video",
    heroTitulo: "La imagen que amplifica cada momento",
    heroSub:
      "Pantallas LED y sistemas de video para que todos vean, sin importar dónde estén parados. Contenido, en vivo y marca, en grande.",
    importanciaTitulo: "Si el fondo está a oscuras, la mitad del público se lo pierde",
    importanciaParrafos: [
      "El video acerca el escenario a cada persona del recinto. Refuerzo en vivo, contenido de marca y ambientación visual que multiplican el impacto de lo que sucede en escena.",
      "Manejamos pantallas y sistemas de video pensados para verse nítidos en cualquier condición de luz, con la resolución y el brillo adecuados para el espacio.",
      "Integramos el video con audio e iluminación para que la imagen no sea un añadido, sino parte de una misma puesta en escena.",
    ],
    puntos: [
      { titulo: "Todos ven", texto: "Refuerzo visual para que ninguna butaca se pierda lo que pasa en el escenario." },
      { titulo: "Imagen nítida", texto: "Brillo y resolución dimensionados para las condiciones de tu recinto." },
      { titulo: "Marca en grande", texto: "Contenido y branding proyectados con calidad de gran formato." },
      { titulo: "Puesta en escena", texto: "El video se integra con audio e iluminación como una sola experiencia." },
    ],
    servicios: [
      { titulo: "Renta de equipo", texto: "Pantallas LED y sistemas de video de gama profesional para tu producción." },
      { titulo: "Producción técnica", texto: "Montaje, configuración y operación del sistema de video a cargo de nuestro equipo." },
      { titulo: "Dirección técnica", texto: "Coordinación del contenido y el video dentro de una producción integral." },
    ],
    grupos: [
      { label: "Pantallas y video", categorias: ["Pantalla / Video"], descripcion: "Pantallas LED y sistemas de video para refuerzo visual y contenido." },
    ],
    relacionadas: ["audio", "iluminacion", "dj"],
    cierre: "Llevemos tu contenido a la pantalla que se merece.",
  },
];

export const PRESENTACION_CATEGORIA_SLUGS = PRESENTACION_CATEGORIAS.map((c) => c.slug);

export function getPresentacionCategoria(slug: string): PresentacionCategoria | undefined {
  return PRESENTACION_CATEGORIAS.find((c) => c.slug === slug);
}

// Todos los nombres de CategoriaEquipo que pertenecen a una macro-categoría.
export function categoriasDeSlug(slug: string): string[] {
  const cfg = getPresentacionCategoria(slug);
  if (!cfg) return [];
  return Array.from(new Set(cfg.grupos.flatMap((g) => g.categorias)));
}
