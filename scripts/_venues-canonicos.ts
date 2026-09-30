// Catálogo canónico de venues, derivado de los ~130 valores de texto libre que
// había en Trato.lugarEstimado / Cotizacion.lugarEvento / Proyecto.lugarEvento.
// `alias` son las variantes exactas que aparecían capturadas y que deben apuntar
// a este venue en el backfill. Ciudades sueltas ("Querétaro", "SMA", "Zibatá"),
// comercios y domicilios particulares quedaron FUERA por decisión de Mauricio.

export type VenueCanonico = {
  nombre: string;
  tipo: string;
  ciudad?: string;
  estado?: string;
  direccion?: string;
  contacto?: string;
  notas?: string;
  alias: string[];
};

const QRO = { ciudad: "Santiago de Querétaro", estado: "Querétaro" };

export const VENUES_CANONICOS: VenueCanonico[] = [
  // ── Foros, clubes y bares ──────────────────────────────────────────────────
  {
    nombre: "Sirilo Music Venue", tipo: "FORO", ...QRO,
    direccion: "Parcela Ejido El Salitre 202, Ejido El Salitre, Juriquilla, 76127 Santiago de Querétaro, Qro.",
    contacto: "Ángel Aguilar",
    alias: ["Sirilo House", "Sirilo house", "Sirilo Music Venue", "Sirilo music venue", "Sirilo house venue"],
  },
  { nombre: "Tempo Club", tipo: "CLUB", ...QRO, alias: ["Tempo club", "Tempo", "Tempo Club"] },
  { nombre: "Amelia Day Club", tipo: "CLUB", ...QRO, alias: ["Amelia Day Club", "Amelia Club"] },
  { nombre: "Qiu Club", tipo: "CLUB", ...QRO, alias: ["Qiu", "Qiu Club"] },
  { nombre: "Cao Cao", tipo: "BAR", ...QRO, contacto: "Fernando", alias: ["Cao cao"] },
  { nombre: "El Astillero", tipo: "BAR", ...QRO, alias: ["El astillero"] },
  { nombre: "Foro 26", tipo: "FORO", ...QRO, direccion: "Corregidora 26, Centro Histórico, Santiago de Querétaro, Qro.", contacto: "Artemio", alias: ["Foro 26", "Foro 26 "] },
  { nombre: "Foro Arpa", tipo: "FORO", ...QRO, alias: ["Foro Arpa"] },
  { nombre: "Foro Multicultural Candiles", tipo: "FORO", ciudad: "Corregidora", estado: "Querétaro", alias: ["Foro Multicultural Candiles"] },
  { nombre: "Discovery Center Zibatá", tipo: "FORO", ciudad: "El Marqués", estado: "Querétaro", contacto: "Kathya Medina", alias: ["Discovery Center", "Discovery Center ", "Discovery center zibata"] },
  { nombre: "Anfiteatro Zaru", tipo: "FORO", ciudad: "El Marqués", estado: "Querétaro", contacto: "Pangea Desarrolladora Inmobiliaria", notas: "Anfiteatro dentro de Zakia.", alias: ["Anfiteatro Zaru", "Anfiteatro de Zaru"] },
  { nombre: "Zaru Zakia", tipo: "FORO", ciudad: "El Marqués", estado: "Querétaro", notas: "Registrado aparte del Anfiteatro Zaru por indicación de Mauricio.", alias: ["Zaru Zakia"] },
  { nombre: "Sala Vive Freixenet", tipo: "FORO", ciudad: "Ezequiel Montes", estado: "Querétaro", alias: ["Sala Vive Freixenet"] },
  { nombre: "M108 Curaduría", tipo: "GALERIA", ...QRO, alias: ["M108 Curaduría", "M108 Curaduría "] },

  // ── Recintos públicos y culturales ─────────────────────────────────────────
  { nombre: "Teatro de la Ciudad", tipo: "TEATRO", ...QRO, contacto: "Fabián", alias: ["Teatro de la Ciudad", "Teatro de la ciudad"] },
  { nombre: "Auditorio Josefa Ortiz de Domínguez", tipo: "AUDITORIO", ...QRO, alias: ["Auditorio Josefa Ortiz De Dominguez"] },
  { nombre: "Estadio Corregidora", tipo: "ESTADIO", ...QRO, alias: ["Estadio Corregidora"] },
  { nombre: "Museo de la Ciudad", tipo: "MUSEO", ...QRO, alias: ["Museo de la Ciudad"] },
  { nombre: "Ex Convento de Santo Domingo", tipo: "HISTORICO", ...QRO, contacto: "Esteban Rosas", alias: ["Ex Convento de Santo Domingo"] },
  { nombre: "Plaza de Toros Juriquilla", tipo: "PLAZA_TOROS", ...QRO, contacto: "Ángel Aguilar", alias: ["Plaza de toros juriquilla"] },
  { nombre: "Jardín Zenea", tipo: "ESPACIO_PUBLICO", ...QRO, direccion: "Centro Histórico, Santiago de Querétaro, Qro.", contacto: "Kriegs", alias: ["Centro, Jardín Zenea"] },
  { nombre: "Parque Montea", tipo: "PARQUE", ...QRO, alias: ["Parque Montea"] },
  { nombre: "El Batán", tipo: "PARQUE", ...QRO, alias: ["El Batán"] },
  { nombre: "Los Arcos", tipo: "ESPACIO_PUBLICO", ...QRO, alias: ["Los Arcos"] },
  { nombre: "Plaza Kiva", tipo: "PLAZA", ...QRO, direccion: "Plaza Kiva, Álamos, Santiago de Querétaro, Qro.", contacto: "Ángel Aguilar", alias: ["Plaza Kiva", "Plaza Kiva Alamos"] },
  { nombre: "Centro El Mirador", tipo: "PLAZA", ...QRO, contacto: "Ana Paula de los Cobos", notas: "Se capturaba también como «Plaza centro Mirador». Otro contacto registrado: Alejandro Chávez.", alias: ["Centro El Mirador", "Plaza centro Mirador"] },

  // ── Haciendas, fincas y jardines ───────────────────────────────────────────
  { nombre: "Hacienda El Salitre", tipo: "HACIENDA", ...QRO, notas: "Tiene Salón Cortijo.", contacto: "Eduardo Flores (DJ Ed Blak)", alias: ["Hacienda el salitre", "Hacienda en salitre", "Hacienda el salitre Salon cortijo"] },
  { nombre: "Hacienda La Solariega", tipo: "HACIENDA", ...QRO, alias: ["Hacienda la solariega", "La Solariega"] },
  { nombre: "Hacienda Viborillas", tipo: "HACIENDA", ...QRO, alias: ["Hacienda Viborillas", "Hacienda viborillas"] },
  { nombre: "Hacienda Galindo", tipo: "HACIENDA", ciudad: "San Juan del Río", estado: "Querétaro", alias: ["Hacienda Galindo"] },
  { nombre: "Hacienda El Aguacate", tipo: "HACIENDA", ciudad: "Tequisquiapan", estado: "Querétaro", alias: ["Hacienda El Aguacate, Tequisquiapan"] },
  { nombre: "Hacienda El Molino", tipo: "HACIENDA", ...QRO, alias: ["Hacienda El Molino", "Hacienda casa el molino"] },
  { nombre: "La Santísima Trinidad", tipo: "HACIENDA", ...QRO, alias: ["La Santísima Trinidad"] },
  { nombre: "Hacienda de San Miguel", tipo: "HACIENDA", ciudad: "San Miguel de Allende", estado: "Guanajuato", contacto: "Chris Makris", alias: ["Hacienda de San Miguel"] },
  { nombre: "Hacienda Obrajuelo", tipo: "HACIENDA", ciudad: "Apaseo el Grande", estado: "Guanajuato", alias: ["RancherÍa Hda Obrajuelo"] },
  { nombre: "La Cañada de Negros", tipo: "HACIENDA", ciudad: "Purísima del Rincón", estado: "Guanajuato", alias: ["La Cañada de Negros Guanajuato (25 de leon)"] },
  { nombre: "Villa La Laborcilla", tipo: "HACIENDA", ciudad: "El Marqués", estado: "Querétaro", alias: ["Villa La Laborcilla"] },
  { nombre: "Rancho La Hondonada", tipo: "RANCHO", ...QRO, alias: ["Rancho La Hondonada"] },
  { nombre: "Finca Olivo", tipo: "JARDIN", ...QRO, alias: ["Finca Olivo"] },
  { nombre: "Finca La Galvia", tipo: "JARDIN", ...QRO, alias: ["Finca la Galvia"] },
  { nombre: "Jardín Casa Victoria", tipo: "JARDIN", ...QRO, alias: ["Jardin Casa Victoria", "Jardin Casa  Victoria"] },

  // ── Viñedos ────────────────────────────────────────────────────────────────
  { nombre: "Puerta del Lobo", tipo: "VINEDO", ciudad: "Tequisquiapan", estado: "Querétaro", contacto: "Fer Martín", alias: ["Puerta del lobo", "Puerta del Lobo"] },
  { nombre: "Bodegas De Cote", tipo: "VINEDO", ciudad: "Ezequiel Montes", estado: "Querétaro", contacto: "Blanca", alias: ["Bodegas De Cote"] },
  { nombre: "Viñedos Azteca", tipo: "VINEDO", ciudad: "Ezequiel Montes", estado: "Querétaro", alias: ["Viñedos Azteca, Ezequiel Montes"] },
  { nombre: "Viñedos El Sueño", tipo: "VINEDO", estado: "Querétaro", alias: ["Viñedos el sueño"] },

  // ── Salones y casas de eventos ─────────────────────────────────────────────
  { nombre: "Casa Mila", tipo: "SALON", ...QRO, direccion: "Casa Mila — Salón de Eventos", contacto: "Alejandro Chávez", alias: ["Casa Mila", "Casa mila Qro", "Casa Mila - Salón de Eventos"] },
  { nombre: "Casona de los 5 Patios", tipo: "SALON", ...QRO, alias: ["Casona de Los 5 Patios"] },
  { nombre: "Casa Antonieta", tipo: "SALON", alias: ["Casa Antonieta"] },
  { nombre: "Salón Ébano", tipo: "SALON", ...QRO, direccion: "Paseo Querétaro", alias: ["Salon Ebano Paseo Querétaro", "Salón Ébano"] },
  { nombre: "Salón Frida", tipo: "SALON", ...QRO, contacto: "Rodrigo Díaz", alias: ["Salon frida"] },
  { nombre: "Salón de Eventos El Refugio", tipo: "SALON", ...QRO, alias: ["Salon de eventos el refugio"] },
  { nombre: "Alux Eventos Corregidora", tipo: "SALON", ciudad: "Corregidora", estado: "Querétaro", direccion: "Blvrd. Mediterráneo 202, Residencial Las Trojes, Corregidora, 76908 Qro.", contacto: "Luis Vega", alias: ["Alux Eventos Corregidora"] },
  { nombre: "Casa Cien", tipo: "SALON", ciudad: "San Miguel de Allende", estado: "Guanajuato", alias: ["Casa cien san miguel de allende"] },
  { nombre: "Puerto Carroza", tipo: "SALON", ciudad: "San José Iturbide", estado: "Guanajuato", alias: ["Puerto Carroza, San Jose Iturbide Gto."] },
  { nombre: "Fonda del Refugio", tipo: "RESTAURANTE", ...QRO, direccion: "Centro Histórico, Santiago de Querétaro, Qro.", alias: ["Fonda de Del Refugio", "Fonda del refugio", "Arriba de la fonda del refugio centro historico"] },

  // ── Hoteles ────────────────────────────────────────────────────────────────
  { nombre: "Hotel Real de Minas", tipo: "HOTEL", ...QRO, alias: ["Hotel Real De Minas"] },
  { nombre: "Rosewood San Miguel de Allende", tipo: "HOTEL", ciudad: "San Miguel de Allende", estado: "Guanajuato", notas: "Se capturaba como «Rosewood explanada».", alias: ["Rosewood explanada"] },
  { nombre: "Mondrian Condesa", tipo: "HOTEL", ciudad: "Ciudad de México", estado: "Ciudad de México", alias: ["Mondrian condes"] },

  // ── Clubes deportivos y de golf ────────────────────────────────────────────
  { nombre: "Club de Golf San Gil", tipo: "CLUB_GOLF", ciudad: "San Juan del Río", estado: "Querétaro", alias: ["Club de Golf San Gil"] },
  { nombre: "Club de Golf Tequisquiapan", tipo: "CLUB_GOLF", ciudad: "Tequisquiapan", estado: "Querétaro", contacto: "Eduardo Flores (DJ Ed Black)", alias: ["Club de Golf Tequisquiapan"] },
  { nombre: "Zibatá Golf", tipo: "CLUB_GOLF", ciudad: "El Marqués", estado: "Querétaro", contacto: "Kathya Medina", alias: ["Zibata Golf"] },
  { nombre: "El Campanario", tipo: "CLUB_GOLF", ...QRO, alias: ["El campanario, Qro."] },
  { nombre: "Club de Villas Palmira", tipo: "CLUB", ...QRO, alias: ["Club de villas Palmira Querétaro"] },
  { nombre: "Hípico Juriquilla", tipo: "CLUB", ...QRO, alias: ["Hípico juriquilla"] },

  // ── Colegios ───────────────────────────────────────────────────────────────
  { nombre: "Colegio Álamos", tipo: "COLEGIO", ...QRO, contacto: "Luca Mersini", alias: ["Colegio Álamos", "Colegio Alamos"] },
  { nombre: "Colegio New Land Zibatá", tipo: "COLEGIO", ciudad: "El Marqués", estado: "Querétaro", alias: ["Colegio New Land Zibata"] },
  { nombre: "Colegio Fontanar Vista Real", tipo: "COLEGIO", ...QRO, contacto: "Gabriela Zárate", notas: "Capturado originalmente como «Colegio fontanera sede vista real»; confirmar nombre oficial.", alias: ["Colegio fontanera sede vista real"] },

  // ── Guanajuato ─────────────────────────────────────────────────────────────
  { nombre: "Alhóndiga de Granaditas", tipo: "HISTORICO", ciudad: "Guanajuato", estado: "Guanajuato", contacto: "Ross", alias: ["Alhondiga de Granaditas"] },
  { nombre: "Túneles de Guanajuato", tipo: "ESPACIO_PUBLICO", ciudad: "Guanajuato", estado: "Guanajuato", direccion: "Túnel Diego Rivera, Blvd. Diego Rivera", contacto: "Jorge Ávila", alias: ["Tuneles Guanajuato", "Tuneles de Guanajuato", "Tunel Diego rivera en blvd diego rivera"] },
  { nombre: "Museo Ex Hacienda San Gabriel de Barrera", tipo: "MUSEO", ciudad: "Guanajuato", estado: "Guanajuato", alias: ["Museo ex Hacienda san Gabriel de barrera"] },
  { nombre: "Plaza del Expiatorio", tipo: "ESPACIO_PUBLICO", ciudad: "León", estado: "Guanajuato", alias: ["León Gto, Plaza Expiatorio"] },

  // ── Otros ──────────────────────────────────────────────────────────────────
  { nombre: "Eden Ice", tipo: "OTRO", ...QRO, alias: ["Eden ice"] },
  { nombre: "Nido", tipo: "OTRO", ...QRO, alias: ["Nido"] },
  { nombre: "Milenio", tipo: "OTRO", ...QRO, alias: ["Milenio"] },
  { nombre: "Xentric Lomas Norte", tipo: "OTRO", ...QRO, alias: ["Xentric Lomas Norte"] },
  { nombre: "The Gree — La Ceiba", tipo: "OTRO", alias: ["The Gree - La Ceiba"] },
  { nombre: "Canto de Mar", tipo: "OTRO", ciudad: "Barra de Potosí", estado: "Guerrero", alias: ["Canto de Mar, Barra de Potosí, Guerrero"] },
];

// Valores que NO son venues: ciudades, zonas, comercios y basura de captura.
// El backfill los deja con venueId nulo (decisión de Mauricio 2026-09-29).
export const NO_ES_VENUE = new Set([
  "Por definir", "por definir", "Por definir 2", "no aplica", "Ejemplo", "Desconocido", "..", "Centro",
  "Querétaro", "Queretaro", "Querétaro, juriquilla", "queretaro juriquilla", "Juriquilla, Queretaro",
  "Centro, corregidora", "El Pueblito", "Santa Rosa Jáuregui", "Pedro Escobedo", "Ezequiel Montes",
  "Zibata", "Zibatá", "Zibata Qro.", "Zakia", "Hercules", "Hércules",
  "SMA", "San Miguel de Allende", "San miguel de allende", "San Miguel De Allende",
  "San Miguel de Allende (el cliente lo lleva)", "San Miguel de Allende - Libertad 33",
  "Celaya", "celaya gto", "Guanajuato", "Morelia", "Morelia Michoacan", "Monterrey", "Saltillo",
  "Torreon", "Torreón", "Toreeón", "Minatitlán", "Tamazunchale", "san Luis Potosí", "Aguascalientes",
  "CDMX", "Mexico City", "México", "Edo de Mex", "Estado de México", "Estado de México.",
  "Puerto Vallarta, Jalisco",
  // Comercios y agencias: se descartaron como venues
  "BMW Constituyentes", "Porsche Querétaro", "HEB Quintana", "Galerias libertad Qro",
  "HDS Tattoo", "Taqueria Chilango", "Cerveceria San Sebastián",
  // Domicilios particulares
  "Cerro de La Estrella 133, Colinas del Cimatario, 76090 Santiago de Querétaro, Qro.",
]);

export function normalizar(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** alias normalizado → nombre canónico */
export const MAPA_ALIAS = new Map<string, string>(
  VENUES_CANONICOS.flatMap(v => [...v.alias, v.nombre].map(a => [normalizar(a), v.nombre] as const))
);
