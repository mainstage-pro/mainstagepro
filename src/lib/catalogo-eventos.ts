import { prisma } from "./prisma";

// Catálogo de eventos: fuente única de tipos, nichos, adicionales y preguntas de
// descubrimiento. Tablas creadas lazy (patrón Neon sin migración formal).
// ensureCatalogoTables() se llama al inicio de cada endpoint del catálogo.

let tablesEnsured = false;

export async function ensureCatalogoTables() {
  if (tablesEnsured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "nichos" (
      "id" TEXT NOT NULL,
      "tipoEventoSlug" TEXT NOT NULL,
      "nombre" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "descripcion" TEXT,
      "notasComerciales" TEXT,
      "orden" INTEGER NOT NULL DEFAULT 0,
      "activo" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "nichos_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "nichos_tipoEventoSlug_slug_key" ON "nichos"("tipoEventoSlug", "slug");`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "nichos_tipoEventoSlug_idx" ON "nichos"("tipoEventoSlug");`
  );
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "adicionales" (
      "id" TEXT NOT NULL,
      "nombre" TEXT NOT NULL,
      "descripcion" TEXT,
      "tiposEvento" TEXT NOT NULL,
      "nichos" TEXT,
      "frecuencia" TEXT NOT NULL DEFAULT 'frecuente',
      "productoId" TEXT,
      "imagenUrl" TEXT,
      "orden" INTEGER NOT NULL DEFAULT 0,
      "activo" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "adicionales_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "adicionales_productoId_fkey"
        FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE SET NULL
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "adicionales_productoId_idx" ON "adicionales"("productoId");`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "adicionales" ADD COLUMN IF NOT EXISTS "composicion" TEXT;`
  );
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "preguntas_descubrimiento" (
      "id" TEXT NOT NULL,
      "texto" TEXT NOT NULL,
      "tipoRespuesta" TEXT NOT NULL DEFAULT 'SI_NO',
      "opciones" TEXT,
      "nichos" TEXT,
      "orden" INTEGER NOT NULL DEFAULT 0,
      "activa" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "preguntas_descubrimiento_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "reglas_pregunta" (
      "id" TEXT NOT NULL,
      "preguntaId" TEXT NOT NULL,
      "condicion" TEXT NOT NULL,
      "categoriasEquipo" TEXT,
      "adicionalIds" TEXT,
      CONSTRAINT "reglas_pregunta_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "reglas_pregunta_preguntaId_fkey"
        FOREIGN KEY ("preguntaId") REFERENCES "preguntas_descubrimiento"("id") ON DELETE CASCADE
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "reglas_pregunta_preguntaId_idx" ON "reglas_pregunta"("preguntaId");`
  );
  // Jerarquía de descubrimiento (aditivo e idempotente).
  await prisma.$executeRawUnsafe(`ALTER TABLE "preguntas_descubrimiento" ADD COLUMN IF NOT EXISTS "alcance" TEXT NOT NULL DEFAULT 'nicho';`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "preguntas_descubrimiento" ADD COLUMN IF NOT EXISTS "tipoEventoSlug" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "preguntas_descubrimiento" ADD COLUMN IF NOT EXISTS "bloque" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "preguntas_descubrimiento" ADD COLUMN IF NOT EXISTS "obligatoria" BOOLEAN NOT NULL DEFAULT false;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "preguntas_descubrimiento" ADD COLUMN IF NOT EXISTS "preguntaPadreId" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "preguntas_descubrimiento" ADD COLUMN IF NOT EXISTS "condicionValor" TEXT;`);
  // tipos_evento ya existe como modelo Prisma (migración formal); no se crea aquí.
  tablesEnsured = true;
}

// ── Linkage con el sistema legacy ─────────────────────────────────────────────
// Trato.tipoEvento / Paquete.tipoEvento / Producto.tiposEvento usan estos tokens.
export const TIPOS_EVENTO_LEGACY = ["MUSICAL", "SOCIAL", "EMPRESARIAL", "OTRO"] as const;
export type TipoEventoLegacy = (typeof TIPOS_EVENTO_LEGACY)[number];

/** slug lowercase del catálogo → token legacy en mayúscula. */
export function legacyFromSlug(slug: string): string {
  return (slug || "").trim().toUpperCase();
}
/** token legacy → slug del catálogo (tipos_evento.slug). */
export function slugFromLegacy(legacy: string): string {
  return (legacy || "").trim().toLowerCase();
}

// ── Semillas (solo si el catálogo está vacío) ─────────────────────────────────
export const TIPOS_EVENTO_SEED: { slug: string; nombre: string; emoji: string; subtitulo: string; orden: number }[] = [
  { slug: "musical", nombre: "Musical", emoji: "🎵", subtitulo: "Conciertos · Festivales · DJ", orden: 0 },
  { slug: "social", nombre: "Social", emoji: "🥂", subtitulo: "Bodas · XV · Fiestas privadas", orden: 1 },
  { slug: "empresarial", nombre: "Empresarial", emoji: "🏢", subtitulo: "Congresos · Lanzamientos · Expos", orden: 2 },
  { slug: "otro", nombre: "Otro", emoji: "✨", subtitulo: "Cualquier otro tipo de evento", orden: 3 },
];

const NICHOS_SEED: Record<string, string[]> = {
  SOCIAL: ["Boda", "XV Años", "Bautizo", "Cumpleaños", "Fiesta Privada", "Graduación"],
  MUSICAL: ["Concierto", "Festival", "Música Electrónica", "Presentación Musical", "Tocada / Bar"],
  EMPRESARIAL: ["Congreso / Convención", "Lanzamiento de producto", "Junta anual", "Expo / Stand", "Capacitación"],
};

// ── Metadatos de adicionales (descripción + frecuencia) ───────────────────────
// La frecuencia por defecto es "frecuente"; se listan aquí los "ocasionales" y las
// descripciones cortas orientadas al cliente (se usan en la galería pública).
const ADICIONALES_META: Record<string, { descripcion?: string; frecuencia?: "frecuente" | "ocasional" }> = {
  "Audio de ceremonia": { descripcion: "Sonido y micrófonos independientes para la ceremonia o misa." },
  "Micrófono de brindis": { descripcion: "Micrófono inalámbrico para palabras y brindis." },
  "Pista de baile": { descripcion: "Pista modular para el área de baile." },
  "Pista personalizada": { descripcion: "Pista con nombre, iniciales o diseño impreso.", frecuencia: "ocasional" },
  "Washes arquitectónicos": { descripcion: "Iluminación de color para realzar muros y salón." },
  "Pinspot": { descripcion: "Haces puntuales que iluminan centros de mesa.", frecuencia: "ocasional" },
  "Chisperos": { descripcion: "Fuentes de chispa fría para entradas y momentos clave." },
  "Bazuca de papel metálico": { descripcion: "Cañón de confeti metálico para el momento cumbre.", frecuencia: "ocasional" },
  "Bruma / hazer": { descripcion: "Neblina ligera que da cuerpo a las luces." },
  "DJ Booth": { descripcion: "Cabina de DJ montada e iluminada." },
  "Pantalla LED": { descripcion: "Pantalla de video de alto brillo para visuales y proyección." },
  "Backline": { descripcion: "Amplificadores, batería y respaldo para músicos en vivo." },
  "Microfonía": { descripcion: "Micrófonos alámbricos e inalámbricos para voces e instrumentos." },
  "Planta de luz": { descripcion: "Generador eléctrico para eventos al aire libre.", frecuencia: "ocasional" },
  "Monitoreo in-ear": { descripcion: "Monitoreo personal in-ear para los músicos.", frecuencia: "ocasional" },
  "Riser de batería": { descripcion: "Tarima rodante para la batería.", frecuencia: "ocasional" },
  "Intercom FOH-monitores": { descripcion: "Comunicación entre consola de sala y monitores.", frecuencia: "ocasional" },
  "Ground support": { descripcion: "Estructura autoportante para colgar audio, luz y pantallas.", frecuencia: "ocasional" },
  "Layher": { descripcion: "Andamio de escenario y estructura de gran formato.", frecuencia: "ocasional" },
  "Torres de delay": { descripcion: "Torres de sonido para llevar audio al público lejano.", frecuencia: "ocasional" },
  "Reproductores y mixer DJ": { descripcion: "Reproductores y mixer profesionales para DJ." },
  "Iluminación funcional": { descripcion: "Luces móviles y efectos para pista y escenario." },
  "Switcher de video + operador": { descripcion: "Mezcla de cámaras y fuentes con operador.", frecuencia: "ocasional" },
  "Streaming y grabación": { descripcion: "Transmisión en vivo y grabación del evento." },
  "Templete / tarima": { descripcion: "Escenario o templete para presentaciones." },
  "Intercom de coordinación": { descripcion: "Comunicación por radio entre el equipo de producción.", frecuencia: "ocasional" },
  "Monitor de retorno para presentador": { descripcion: "Pantalla de confianza para el presentador.", frecuencia: "ocasional" },
  "Traducción simultánea": { descripcion: "Cabina y receptores para traducción en vivo.", frecuencia: "ocasional" },
  "Iluminación de marca (gobos)": { descripcion: "Proyección del logo o colores de la marca." },
  "CCTV": { descripcion: "Cámaras de circuito cerrado para monitoreo.", frecuencia: "ocasional" },
  "Energía redundante / UPS": { descripcion: "Respaldo de energía para equipos críticos.", frecuencia: "ocasional" },
  "Teleprompter": { descripcion: "Apuntador electrónico para el presentador.", frecuencia: "ocasional" },
};

// ── Pregunta de descubrimiento ────────────────────────────────────────────────
// Cada respuesta afirmativa enciende adicionales (por nombre) y resalta categorías
// de inventario (por nombre real). Redactadas por resultado, específicas del nicho.
type PreguntaDef = {
  texto: string;
  tipoRespuesta?: string;   // default "SI_NO"
  categorias?: string[];    // nombres reales de categoria_equipos a resaltar
  enciende?: string[];      // nombres de adicionales a encender
};

type NichoContenido = { adicionales: string[]; preguntas: PreguntaDef[] };

// Fuente única del descubrimiento por nicho. Cada nicho define SUS adicionales y SUS
// preguntas: una boda no comparte preguntas con música electrónica, ni un concierto
// con un festival aunque ambos sean MUSICAL. Los nombres de adicionales existen en el
// catálogo; las categorías corresponden a categoria_equipos del inventario real.
export const NICHO_CONTENIDO: Record<string, NichoContenido> = {
  // ── SOCIAL ──────────────────────────────────────────────────────────────────
  boda: {
    adicionales: ["Audio de ceremonia", "Micrófono de brindis", "Pista de baile", "Pista personalizada", "Washes arquitectónicos", "Pinspot", "Chisperos", "Bruma / hazer", "DJ Booth", "Pantalla LED"],
    preguntas: [
      { texto: "¿La ceremonia necesita audio y micrófonos propios, aparte del salón?", categorias: ["Sistemas de Microfonía", "Equipo de Audio"], enciende: ["Audio de ceremonia"] },
      { texto: "¿Quieren un momento de impacto en la entrada o el primer baile?", enciende: ["Chisperos", "Bruma / hazer"] },
      { texto: "¿Buscan realzar el salón con iluminación decorativa de color?", categorias: ["Equipo de Iluminación"], enciende: ["Washes arquitectónicos", "Pinspot"] },
      { texto: "¿Habrá banda o grupo en vivo además del DJ?", categorias: ["Equipo de Audio", "Sistemas de Microfonía"], enciende: ["Backline", "Microfonía"] },
      { texto: "¿La recepción es al aire libre o en jardín sin instalación eléctrica?", categorias: ["Corriente Eléctrica"], enciende: ["Planta de luz"] },
    ],
  },
  "xv-anos": {
    adicionales: ["Chisperos", "Bazuca de papel metálico", "Pista personalizada", "Pantalla LED", "DJ Booth", "Washes arquitectónicos", "Pinspot", "Bruma / hazer"],
    preguntas: [
      { texto: "¿Habrá baile sorpresa o coreografía que necesite audio y proyección?", categorias: ["Equipo de Audio", "Pantalla / Video"], enciende: ["Pantalla LED"] },
      { texto: "¿Quieren impacto en la entrada o el vals (chispas, confeti, humo)?", enciende: ["Chisperos", "Bazuca de papel metálico", "Bruma / hazer"] },
      { texto: "¿Van a proyectar un video o sesión de fotos de la festejada?", categorias: ["Pantalla / Video"], enciende: ["Pantalla LED"] },
      { texto: "¿Quieren realzar el salón con iluminación de colores?", categorias: ["Equipo de Iluminación"], enciende: ["Washes arquitectónicos", "Pinspot"] },
    ],
  },
  bautizo: {
    adicionales: ["Audio de ceremonia", "Micrófono de brindis", "DJ Booth", "Pinspot", "Pista de baile"],
    preguntas: [
      { texto: "¿La misa o ceremonia necesita audio propio?", categorias: ["Sistemas de Microfonía"], enciende: ["Audio de ceremonia"] },
      { texto: "¿Habrá música para el convivio (DJ o audio ambiental)?", categorias: ["Equipo de Audio", "Consolas/Equipo para DJ"], enciende: ["DJ Booth"] },
      { texto: "¿Quieren unas palabras o brindis con micrófono?", enciende: ["Micrófono de brindis"] },
    ],
  },
  cumpleanos: {
    adicionales: ["DJ Booth", "Pista de baile", "Washes arquitectónicos", "Pantalla LED", "Chisperos", "Bruma / hazer"],
    preguntas: [
      { texto: "¿Habrá DJ o prefieren música en vivo?", categorias: ["Consolas/Equipo para DJ", "Equipo de Audio"], enciende: ["DJ Booth"] },
      { texto: "¿Quieren un momento especial en el pastel (chispas, humo)?", enciende: ["Chisperos", "Bruma / hazer"] },
      { texto: "¿Van a proyectar fotos o video?", categorias: ["Pantalla / Video"], enciende: ["Pantalla LED"] },
    ],
  },
  "fiesta-privada": {
    adicionales: ["DJ Booth", "Reproductores y mixer DJ", "Washes arquitectónicos", "Pista de baile", "Pantalla LED", "Bruma / hazer", "Planta de luz"],
    preguntas: [
      { texto: "¿La fiesta es al aire libre o en un lugar sin luz suficiente?", categorias: ["Corriente Eléctrica"], enciende: ["Planta de luz"] },
      { texto: "¿Habrá DJ o banda en vivo?", categorias: ["Consolas/Equipo para DJ", "Equipo de Audio"], enciende: ["DJ Booth", "Reproductores y mixer DJ"] },
      { texto: "¿Quieren ambiente con iluminación y humo en la pista?", categorias: ["Equipo de Iluminación"], enciende: ["Washes arquitectónicos", "Bruma / hazer"] },
    ],
  },
  graduacion: {
    adicionales: ["Pantalla LED", "Microfonía", "Audio de ceremonia", "Templete / tarima", "DJ Booth"],
    preguntas: [
      { texto: "¿Habrá ceremonia con discursos y entrega de diplomas desde escenario?", categorias: ["Sistemas de Microfonía", "Entarimado", "Pantalla / Video"], enciende: ["Microfonía", "Templete / tarima", "Pantalla LED"] },
      { texto: "¿Habrá fiesta posterior con DJ?", categorias: ["Consolas/Equipo para DJ"], enciende: ["DJ Booth"] },
      { texto: "¿Van a proyectar nombres o video de los graduados?", categorias: ["Pantalla / Video"], enciende: ["Pantalla LED"] },
    ],
  },
  // ── MUSICAL ─────────────────────────────────────────────────────────────────
  concierto: {
    adicionales: ["Microfonía", "Monitoreo in-ear", "Backline", "Riser de batería", "Intercom FOH-monitores", "Ground support", "Torres de delay", "Pantalla LED", "Planta de luz"],
    preguntas: [
      { texto: "¿Habrá banda en vivo con varios músicos que necesiten monitoreo?", categorias: ["Sistemas de Microfonía", "Monitoreo In-Ear", "Equipo de Audio"], enciende: ["Microfonía", "Monitoreo in-ear", "Backline"] },
      { texto: "¿Habrá batería acústica en vivo?", enciende: ["Riser de batería"] },
      { texto: "¿El escenario es grande o el público queda lejos del sonido?", categorias: ["Rigging y Estructuras", "Equipo de Audio"], enciende: ["Torres de delay", "Ground support"] },
      { texto: "¿El evento es al aire libre sin instalación eléctrica?", categorias: ["Corriente Eléctrica"], enciende: ["Planta de luz"] },
    ],
  },
  festival: {
    adicionales: ["Microfonía", "Monitoreo in-ear", "Backline", "Riser de batería", "Intercom FOH-monitores", "Ground support", "Layher", "Torres de delay", "Pantalla LED", "Planta de luz"],
    preguntas: [
      { texto: "¿Se presentarán varios artistas con cambios rápidos de escenario?", categorias: ["Equipo de Audio", "Sistemas de Microfonía"], enciende: ["Backline", "Riser de batería", "Intercom FOH-monitores"] },
      { texto: "¿El escenario necesita estructura techada o de gran formato?", categorias: ["Rigging y Estructuras"], enciende: ["Ground support", "Layher"] },
      { texto: "¿El público queda lejos y hace falta refuerzo de sonido a distancia?", categorias: ["Equipo de Audio"], enciende: ["Torres de delay"] },
      { texto: "¿Es al aire libre sin instalación eléctrica?", categorias: ["Corriente Eléctrica"], enciende: ["Planta de luz"] },
    ],
  },
  "musica-electronica": {
    adicionales: ["Reproductores y mixer DJ", "DJ Booth", "Monitoreo in-ear", "Pantalla LED", "Ground support", "Layher", "Iluminación funcional", "Bruma / hazer", "Planta de luz", "Torres de delay"],
    preguntas: [
      { texto: "¿El DJ trae su equipo o necesita reproductores y mixer?", categorias: ["Consolas/Equipo para DJ", "DJ Booths"], enciende: ["Reproductores y mixer DJ", "DJ Booth"] },
      { texto: "¿Quieren visuales o pantallas detrás de la cabina?", categorias: ["Pantalla / Video"], enciende: ["Pantalla LED"] },
      { texto: "¿Quieren humo y luces para ambientar la pista?", categorias: ["Equipo de Iluminación"], enciende: ["Bruma / hazer", "Iluminación funcional"] },
      { texto: "¿Es al aire libre sin instalación eléctrica?", categorias: ["Corriente Eléctrica"], enciende: ["Planta de luz"] },
    ],
  },
  "presentacion-musical": {
    adicionales: ["Microfonía", "Monitoreo in-ear", "Backline", "Pantalla LED"],
    preguntas: [
      { texto: "¿Habrá banda con varios músicos en vivo?", categorias: ["Sistemas de Microfonía", "Monitoreo In-Ear"], enciende: ["Microfonía", "Monitoreo in-ear", "Backline"] },
      { texto: "¿Se va a grabar o transmitir la presentación?", categorias: ["Pantalla / Video"], enciende: ["Pantalla LED"] },
    ],
  },
  "tocada-bar": {
    adicionales: ["Backline", "Microfonía", "Iluminación funcional", "Monitoreo in-ear"],
    preguntas: [
      { texto: "¿Habrá banda en vivo?", categorias: ["Equipo de Audio", "Sistemas de Microfonía"], enciende: ["Backline", "Microfonía"] },
      { texto: "¿El bar ya tiene audio o montamos todo nosotros?", categorias: ["Equipo de Audio"], enciende: ["Monitoreo in-ear"] },
    ],
  },
  // ── EMPRESARIAL ───────────────────────────────────────────────────────────────
  "congreso-convencion": {
    adicionales: ["Microfonía", "Pantalla LED", "Switcher de video + operador", "Streaming y grabación", "Templete / tarima", "Intercom de coordinación", "Monitor de retorno para presentador", "Traducción simultánea"],
    preguntas: [
      { texto: "¿Habrá ponentes o presentaciones desde un escenario?", categorias: ["Sistemas de Microfonía", "Pantalla / Video", "Entarimado"], enciende: ["Microfonía", "Pantalla LED", "Monitor de retorno para presentador", "Templete / tarima"] },
      { texto: "¿Se va a transmitir o grabar en vivo?", categorias: ["Pantalla / Video"], enciende: ["Streaming y grabación", "Switcher de video + operador"] },
      { texto: "¿Habrá asistentes que necesiten traducción a otro idioma?", enciende: ["Traducción simultánea"] },
    ],
  },
  "lanzamiento-de-producto": {
    adicionales: ["Pantalla LED", "Switcher de video + operador", "Iluminación de marca (gobos)", "Chisperos", "Bruma / hazer", "Templete / tarima", "Streaming y grabación", "Microfonía"],
    preguntas: [
      { texto: "¿Quieren un momento de revelación con impacto?", enciende: ["Chisperos", "Bruma / hazer"] },
      { texto: "¿Van a proyectar video de marca o una presentación?", categorias: ["Pantalla / Video"], enciende: ["Pantalla LED", "Switcher de video + operador"] },
      { texto: "¿Quieren iluminación con el logo o colores de la marca?", categorias: ["Equipo de Iluminación"], enciende: ["Iluminación de marca (gobos)"] },
      { texto: "¿Se transmitirá en vivo?", enciende: ["Streaming y grabación"] },
    ],
  },
  "junta-anual": {
    adicionales: ["Microfonía", "Pantalla LED", "Templete / tarima", "Streaming y grabación", "Traducción simultánea"],
    preguntas: [
      { texto: "¿Habrá presentaciones desde el escenario?", categorias: ["Sistemas de Microfonía", "Pantalla / Video", "Entarimado"], enciende: ["Microfonía", "Pantalla LED", "Templete / tarima"] },
      { texto: "¿Se transmitirá a otras sedes o participantes remotos?", enciende: ["Streaming y grabación"] },
      { texto: "¿Se necesita traducción simultánea?", enciende: ["Traducción simultánea"] },
    ],
  },
  "expo-stand": {
    adicionales: ["Pantalla LED", "CCTV", "Iluminación de marca (gobos)", "Energía redundante / UPS", "Microfonía"],
    preguntas: [
      { texto: "¿El stand tendrá pantallas o video?", categorias: ["Pantalla / Video"], enciende: ["Pantalla LED"] },
      { texto: "¿Necesitan corriente para varios equipos en el stand?", categorias: ["Corriente Eléctrica"], enciende: ["Energía redundante / UPS"] },
      { texto: "¿Quieren iluminación de marca en el stand?", categorias: ["Equipo de Iluminación"], enciende: ["Iluminación de marca (gobos)"] },
    ],
  },
  capacitacion: {
    adicionales: ["Microfonía", "Pantalla LED", "Streaming y grabación", "Monitor de retorno para presentador"],
    preguntas: [
      { texto: "¿Las sesiones se van a grabar o transmitir?", categorias: ["Pantalla / Video"], enciende: ["Streaming y grabación"] },
      { texto: "¿El instructor y los participantes necesitan micrófonos?", categorias: ["Sistemas de Microfonía"], enciende: ["Microfonía", "Monitor de retorno para presentador"] },
      { texto: "¿Van a proyectar presentaciones o video?", categorias: ["Pantalla / Video"], enciende: ["Pantalla LED"] },
    ],
  },
};

// Slug de nicho → token legacy de su tipo de evento (derivado de NICHOS_SEED).
const TIPO_POR_NICHO: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [tipo, lista] of Object.entries(NICHOS_SEED)) {
    for (const nombre of lista) out[slugify(nombre)] = tipo;
  }
  return out;
})();

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Siembra el catálogo solo si está vacío. Idempotente. */
export async function seedCatalogo(): Promise<{ tipos: number; nichos: number; adicionales: number; preguntas: number }> {
  await ensureCatalogoTables();

  // Tipos de evento
  const tiposExistentes = await prisma.tipoEvento.count();
  if (tiposExistentes === 0) {
    for (const t of TIPOS_EVENTO_SEED) {
      await prisma.tipoEvento.create({
        data: { slug: t.slug, nombre: t.nombre, emoji: t.emoji, subtitulo: t.subtitulo, orden: t.orden },
      });
    }
  }

  // Nichos
  const nichosExistentes = await prisma.nicho.count();
  if (nichosExistentes === 0) {
    for (const [tipo, lista] of Object.entries(NICHOS_SEED)) {
      let orden = 0;
      for (const nombre of lista) {
        await prisma.nicho.create({
          data: { tipoEventoSlug: tipo, nombre, slug: slugify(nombre), orden: orden++ },
        });
      }
    }
  }

  // Adicionales y preguntas se derivan de NICHO_CONTENIDO. Solo se siembran si el
  // catálogo está vacío; la reconstrucción/afinado se hace con reseedContenidoNichos().
  const adicionalesExistentes = await prisma.adicional.count();
  const preguntasExistentes = await prisma.preguntaDescubrimiento.count();
  if (adicionalesExistentes === 0 || preguntasExistentes === 0) {
    await reseedContenidoNichos();
  }

  const [tipos, nichos, adicionales, preguntas] = await Promise.all([
    prisma.tipoEvento.count(),
    prisma.nicho.count(),
    prisma.adicional.count(),
    prisma.preguntaDescubrimiento.count(),
  ]);
  return { tipos, nichos, adicionales, preguntas };
}

// ── Índice derivado de NICHO_CONTENIDO ────────────────────────────────────────
// Para cada adicional: qué nichos lo usan y (derivado) qué tipos de evento.
function indiceAdicionales(): Map<string, { nichos: string[]; tipos: Set<string> }> {
  const idx = new Map<string, { nichos: string[]; tipos: Set<string> }>();
  for (const [slug, cont] of Object.entries(NICHO_CONTENIDO)) {
    const tipo = TIPO_POR_NICHO[slug] || "OTRO";
    // Adicionales listados en el nicho + los que encienden sus preguntas.
    const nombres = new Set<string>(cont.adicionales);
    for (const q of cont.preguntas) for (const n of q.enciende || []) nombres.add(n);
    for (const nombre of nombres) {
      const e = idx.get(nombre) || { nichos: [], tipos: new Set<string>() };
      if (!e.nichos.includes(slug)) e.nichos.push(slug);
      e.tipos.add(tipo);
      idx.set(nombre, e);
    }
  }
  return idx;
}

/**
 * Reconstruye adicionales (tags de nicho/tipo, frecuencia, descripción) y preguntas
 * por nicho a partir de NICHO_CONTENIDO. Idempotente: upsert por nombre de adicional,
 * reemplazo total de preguntas+reglas (las reglas caen por CASCADE). No toca tipos ni
 * nichos ni la composición/producto de los adicionales existentes.
 */
export async function reseedContenidoNichos(): Promise<{ adicionales: number; preguntas: number }> {
  await ensureCatalogoTables();
  const idx = indiceAdicionales();

  // 1) Upsert de adicionales por nombre con sus tags de nicho/tipo.
  const idPorNombre = new Map<string, string>();
  const existentes = await prisma.adicional.findMany({ select: { id: true, nombre: true } });
  const idExistentePorNombre = new Map(existentes.map(a => [a.nombre, a.id]));
  let orden = 0;
  for (const [nombre, info] of idx) {
    const meta = ADICIONALES_META[nombre] || {};
    const data = {
      tiposEvento: JSON.stringify([...info.tipos]),
      nichos: JSON.stringify(info.nichos),
      frecuencia: meta.frecuencia || "frecuente",
      descripcion: meta.descripcion ?? null,
    };
    const existenteId = idExistentePorNombre.get(nombre);
    if (existenteId) {
      await prisma.adicional.update({ where: { id: existenteId }, data });
      idPorNombre.set(nombre, existenteId);
    } else {
      const creado = await prisma.adicional.create({ data: { nombre, orden: orden++, ...data } });
      idPorNombre.set(nombre, creado.id);
    }
  }

  // 2) Reemplazo total de preguntas por nicho (reglas caen por CASCADE).
  await prisma.preguntaDescubrimiento.deleteMany({});
  let ordenP = 0;
  for (const [slug, cont] of Object.entries(NICHO_CONTENIDO)) {
    for (const q of cont.preguntas) {
      const adicionalIds = (q.enciende || []).map(n => idPorNombre.get(n)).filter((x): x is string => !!x);
      await prisma.preguntaDescubrimiento.create({
        data: {
          texto: q.texto,
          tipoRespuesta: q.tipoRespuesta || "SI_NO",
          nichos: JSON.stringify([slug]),
          orden: ordenP++,
          reglas: {
            create: [{
              condicion: JSON.stringify({ op: "truthy" }),
              categoriasEquipo: q.categorias ? JSON.stringify(q.categorias) : null,
              adicionalIds: JSON.stringify(adicionalIds),
            }],
          },
        },
      });
    }
  }

  const [adicionales, preguntas] = await Promise.all([
    prisma.adicional.count(),
    prisma.preguntaDescubrimiento.count(),
  ]);
  return { adicionales, preguntas };
}
