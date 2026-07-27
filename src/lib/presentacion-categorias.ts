// Configuración de las presentaciones por categoría de equipo (audio, iluminación,
// dj, video, escenarios, energía). Cada macro-categoría agrupa una o varias
// CategoriaEquipo del inventario y define el relato comercial: por qué importa
// ese equipo en la producción de un evento, qué servicios ofrecemos y cómo se
// ordena el catálogo.
//
// Entre todas las macro-categorías se cubre el 100% del equipo PROPIO activo:
// ningún equipo queda fuera de una presentación.
//
// El endpoint /api/presentacion/categoria/[slug] usa `grupos[].categorias` para
// leer los equipos reales del inventario (solo tipo PROPIO), su portada
// (imagenUrl) y sus fotos adicionales (uso EXTERNO).

export type CategoriaGrupo = {
  // Título de la sección/grupo dentro de la presentación (ej. "Consolas de audio").
  label: string;
  // Nombres EXACTOS de CategoriaEquipo del inventario que caen en este grupo.
  categorias: string[];
  // "principal" = catálogo central de la categoría; "relacionado" = equipo
  // complementario que se muestra acotado bajo "Equipos relacionados".
  rol: "principal" | "relacionado";
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
    importanciaTitulo: "Sonido que se siente, no que solo se escucha",
    importanciaParrafos: [
      "El audio es lo primero que conecta al público con el momento. Una voz clara, una banda que se siente en el pecho y un discurso nítido hasta la última fila: eso es lo que hace que un evento se recuerde.",
      "En Mainstage Pro tratamos el sonido como ingeniería. Diseñamos cada sistema para tu recinto y tu evento, con equipo de gama profesional y un ingeniero que lo opera en vivo.",
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
      { label: "Sistemas de sonido", rol: "principal", categorias: ["Equipo de Audio"], descripcion: "Line arrays, subwoofers y sistemas de refuerzo para cualquier escala de evento." },
      { label: "Consolas de audio", rol: "relacionado", categorias: ["Consolas de Audio"], descripcion: "Mezcladoras digitales para control preciso de cada canal." },
      { label: "Microfonía e inalámbricos", rol: "relacionado", categorias: ["Sistemas de Microfonía"], descripcion: "Micrófonos de mano, diadema y solapa con sistemas inalámbricos." },
      { label: "Monitoreo in-ear", rol: "relacionado", categorias: ["Monitoreo In-Ear"], descripcion: "Sistemas personales para que músicos y presentadores se escuchen perfecto." },
    ],
    cierre: "Diseñemos el sistema de audio perfecto para tu evento.",
  },
  {
    slug: "iluminacion",
    nombre: "Iluminación",
    eyebrow: "Diseño de iluminación escénica",
    heroTitulo: "La luz que convierte un espacio en un escenario",
    heroSub:
      "Luminarias robóticas, efectos y consolas de iluminación. Diseño de luz que da atmósfera, dirige la mirada y eleva cada momento.",
    importanciaTitulo: "La luz que le da vida a cada momento",
    importanciaParrafos: [
      "La iluminación define la emoción de un evento: marca el ritmo, resalta a los protagonistas y transforma un salón vacío en una experiencia envolvente.",
      "En Mainstage Pro trabajamos la luz como diseño. Color, movimiento y contraste al servicio del programa y la marca, programados con precisión escena por escena.",
    ],
    puntos: [
      { titulo: "Atmósfera a medida", texto: "Color y textura de luz diseñados para el tono de tu evento." },
      { titulo: "Momentos dirigidos", texto: "La luz guía la mirada del público hacia lo que importa en cada instante." },
      { titulo: "Programación precisa", texto: "Escenas y transiciones sincronizadas con el show, controladas desde consola." },
      { titulo: "Impacto visual", texto: "Efectos y movimiento que elevan la energía del evento en el momento justo." },
    ],
    servicios: [
      { titulo: "Renta de equipo", texto: "Luminarias, efectos y consolas de iluminación de gama profesional para tu producción." },
      { titulo: "Producción técnica", texto: "Diseño de iluminación, montaje y programación de escenas a cargo de nuestro equipo." },
      { titulo: "Dirección técnica", texto: "Operación en vivo y coordinación de la iluminación dentro de una producción integral." },
    ],
    grupos: [
      { label: "Luminarias y efectos", rol: "principal", categorias: ["Equipo de Iluminación"], descripcion: "Cabezas robóticas, PARs, wash y efectos para diseñar cualquier escena." },
      { label: "Consolas de iluminación", rol: "relacionado", categorias: ["Consolas de Iluminación"], descripcion: "Control profesional para programar y operar el show de luces." },
    ],
    cierre: "Diseñemos la iluminación que tu evento merece.",
  },
  {
    slug: "dj",
    nombre: "DJ",
    eyebrow: "Cabinas y equipo para DJ",
    heroTitulo: "La cabina donde nace la fiesta",
    heroSub:
      "Controladoras, mezcladoras y booths de DJ profesionales. El equipo que mantiene la pista encendida de principio a fin.",
    importanciaTitulo: "El equipo que mantiene la pista encendida",
    importanciaParrafos: [
      "La cabina es el motor de la fiesta. Un setup confiable, con equipo estándar de la industria, le da al DJ la libertad de leer al público y llevar la energía justo a donde debe estar.",
      "En Mainstage Pro montamos controladoras y mezcladoras profesionales en booths que se ven tan bien como suenan, integrados al audio y la iluminación como una sola experiencia.",
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
      { label: "Equipo para DJ", rol: "principal", categorias: ["Consolas/Equipo para DJ"], descripcion: "Controladoras y mezcladoras profesionales estándar de la industria." },
      { label: "Cabinas DJ", rol: "relacionado", categorias: ["DJ Booths"], descripcion: "Booths con presencia visual para montar la cabina con estilo." },
    ],
    cierre: "Armemos la cabina perfecta para tu fiesta.",
  },
  {
    slug: "video",
    nombre: "Video",
    eyebrow: "Pantallas y sistemas de video",
    heroTitulo: "La imagen que amplifica cada momento",
    heroSub:
      "Pantallas LED y sistemas de video para que todos vean, sin importar dónde estén parados. Contenido, en vivo y marca, en grande.",
    importanciaTitulo: "La imagen que acerca el escenario a todos",
    importanciaParrafos: [
      "El video acerca el escenario a cada persona del recinto: refuerzo en vivo, contenido de marca y ambientación visual que multiplican el impacto de lo que sucede en escena.",
      "En Mainstage Pro manejamos pantallas y sistemas de video nítidos en cualquier condición de luz, integrados con audio e iluminación como una sola puesta en escena.",
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
      { label: "Pantallas y video", rol: "principal", categorias: ["Pantalla / Video"], descripcion: "Pantallas LED y sistemas de video para refuerzo visual y contenido." },
    ],
    cierre: "Llevemos tu contenido a la pantalla que se merece.",
  },
  {
    slug: "escenarios",
    nombre: "Escenarios y Estructuras",
    eyebrow: "Escenarios, rigging y estructuras",
    heroTitulo: "La base que sostiene todo el show",
    heroSub:
      "Rigging, truss, tarimas y toldos. La estructura que da forma, altura y seguridad a cada montaje, para que todo lo demás brille.",
    importanciaTitulo: "Todo gran montaje empieza por una base sólida",
    importanciaParrafos: [
      "El escenario y la estructura son la columna vertebral de la producción: definen alturas, sostienen el audio y la iluminación, y le dan forma al espacio donde ocurre el evento.",
      "En Mainstage Pro montamos rigging y tarimas con estándares profesionales de carga y seguridad, para que el diseño se levante firme y a tiempo, sin comprometer nada.",
    ],
    puntos: [
      { titulo: "Base segura", texto: "Rigging y truss montados con estándares profesionales de carga y seguridad." },
      { titulo: "Altura y presencia", texto: "Estructura que da dimensión al escenario y soporta todo el sistema." },
      { titulo: "Montaje a tiempo", texto: "Armado ágil y ordenado para que todo esté listo antes de la prueba." },
      { titulo: "Todo cabe", texto: "Tarimas y soportes dimensionados para audio, iluminación y video." },
    ],
    servicios: [
      { titulo: "Renta de equipo", texto: "Rigging, truss, tarimas y toldos para armar la estructura de tu evento." },
      { titulo: "Producción técnica", texto: "Cálculo, montaje y desmontaje de la estructura a cargo de nuestro equipo." },
      { titulo: "Dirección técnica", texto: "Coordinación del escenario dentro de una producción integral." },
    ],
    grupos: [
      { label: "Rigging y estructuras", rol: "principal", categorias: ["Rigging y Estructuras"], descripcion: "Truss, torres y soportes para sostener todo el montaje con seguridad." },
      { label: "Tarimas y escenario", rol: "relacionado", categorias: ["Entarimado"], descripcion: "Entarimado modular para armar el escenario a la altura y forma deseada." },
      { label: "Toldos y lonas", rol: "relacionado", categorias: ["Toldos y lonas"], descripcion: "Cobertura y protección para montajes al aire libre." },
    ],
    cierre: "Levantemos la estructura perfecta para tu montaje.",
  },
  {
    slug: "energia",
    nombre: "Energía y Logística",
    eyebrow: "Energía, distribución y logística",
    heroTitulo: "La energía que mantiene todo encendido",
    heroSub:
      "Distribución eléctrica, accesorios de montaje y transporte. Lo que no se ve, pero hace posible cada evento.",
    importanciaTitulo: "La energía confiable que sostiene cada evento",
    importanciaParrafos: [
      "La corriente y la logística son la base invisible de toda producción: alimentan cada equipo, aseguran el montaje y llevan todo a donde tiene que estar, a tiempo.",
      "En Mainstage Pro planeamos la distribución eléctrica y la logística con el mismo cuidado que el audio o la luz, para que el evento fluya sin cortes ni imprevistos.",
    ],
    puntos: [
      { titulo: "Corriente estable", texto: "Distribución eléctrica dimensionada para alimentar todo el sistema sin caídas." },
      { titulo: "Montaje resuelto", texto: "Accesorios y complementos que hacen posible un armado limpio y seguro." },
      { titulo: "Logística a tiempo", texto: "Transporte y coordinación para que todo llegue y quede listo antes de la prueba." },
      { titulo: "Sin imprevistos", texto: "Planeación de los detalles que sostienen el evento de principio a fin." },
    ],
    servicios: [
      { titulo: "Renta de equipo", texto: "Distribución eléctrica y accesorios de montaje para tu producción." },
      { titulo: "Producción técnica", texto: "Planeación eléctrica, montaje y logística a cargo de nuestro equipo." },
      { titulo: "Dirección técnica", texto: "Coordinación de la energía y la logística dentro de una producción integral." },
    ],
    grupos: [
      { label: "Corriente y distribución", rol: "principal", categorias: ["Corriente Eléctrica"], descripcion: "Distribución eléctrica y respaldo de energía para todo el montaje." },
      { label: "Accesorios de montaje", rol: "relacionado", categorias: ["Accesorios Provisionales"], descripcion: "Complementos que resuelven el armado en sitio." },
      { label: "Transporte", rol: "relacionado", categorias: ["Vehículos"], descripcion: "Logística para mover el equipo a donde tiene que estar." },
    ],
    cierre: "Planeemos la energía y logística de tu evento.",
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
