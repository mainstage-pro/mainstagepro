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

const ADICIONALES_SEED: Record<string, string[]> = {
  SOCIAL: [
    "Pantalla LED", "Chisperos", "Bazuca de papel metálico", "Pinspot", "Pista de baile",
    "Pista personalizada", "Planta de luz", "DJ Booth", "Audio de ceremonia", "Micrófono de brindis",
    "Washes arquitectónicos", "Bruma / hazer",
  ],
  MUSICAL: [
    "Microfonía", "Monitoreo in-ear", "Backline", "Reproductores y mixer DJ", "Layher", "Ground support",
    "Iluminación funcional", "Pantalla LED", "Intercom FOH-monitores", "Torres de delay", "Riser de batería",
    "Planta de luz",
  ],
  EMPRESARIAL: [
    "CCTV", "Teleprompter", "Microfonía", "Pantalla LED", "Switcher de video + operador",
    "Streaming y grabación", "Intercom de coordinación", "Energía redundante / UPS", "Iluminación de marca (gobos)",
    "Templete / tarima", "Monitor de retorno para presentador", "Traducción simultánea",
  ],
};

// Preguntas redactadas por resultado, con los adicionales (por nombre) que encienden.
const PREGUNTAS_SEED: {
  texto: string;
  tipoRespuesta: string;
  tipos: string[];
  enciende: string[]; // nombres de adicionales
  categorias?: string[];
}[] = [
  {
    texto: "¿Habrá banda o grupo en vivo? ¿Cuántos músicos?",
    tipoRespuesta: "SI_NO",
    tipos: ["MUSICAL", "SOCIAL"],
    enciende: ["Backline", "Microfonía", "Monitoreo in-ear"],
    categorias: ["AUDIO"],
  },
  {
    texto: "¿Habrá discursos o presentaciones desde un escenario?",
    tipoRespuesta: "SI_NO",
    tipos: ["EMPRESARIAL", "SOCIAL"],
    enciende: ["Microfonía", "Teleprompter", "Monitor de retorno para presentador"],
  },
  {
    texto: "¿El evento es al aire libre o en un lugar sin instalación eléctrica suficiente?",
    tipoRespuesta: "SI_NO",
    tipos: ["MUSICAL", "SOCIAL", "EMPRESARIAL"],
    enciende: ["Planta de luz"],
  },
  {
    texto: "¿Se va a proyectar video o presentaciones?",
    tipoRespuesta: "SI_NO",
    tipos: ["EMPRESARIAL", "SOCIAL", "MUSICAL"],
    enciende: ["Pantalla LED", "Switcher de video + operador"],
    categorias: ["VIDEO"],
  },
  {
    texto: "¿Quieren algún momento de impacto (entrada, primer baile, revelación)?",
    tipoRespuesta: "SI_NO",
    tipos: ["SOCIAL"],
    enciende: ["Chisperos", "Bazuca de papel metálico", "Bruma / hazer"],
  },
  {
    texto: "¿Se va a transmitir o grabar el evento?",
    tipoRespuesta: "SI_NO",
    tipos: ["EMPRESARIAL", "MUSICAL"],
    enciende: ["Streaming y grabación", "CCTV"],
  },
];

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

  // Adicionales (guardamos ids por nombre para enlazar reglas)
  const adicionalesExistentes = await prisma.adicional.count();
  const idPorNombre = new Map<string, string>();
  if (adicionalesExistentes === 0) {
    for (const [tipo, lista] of Object.entries(ADICIONALES_SEED)) {
      let orden = 0;
      for (const nombre of lista) {
        // Un mismo nombre (ej. "Pantalla LED") puede aplicar a varios tipos: reusar.
        const existente = idPorNombre.get(nombre);
        if (existente) {
          const row = await prisma.adicional.findUnique({ where: { id: existente } });
          const tipos = new Set<string>(JSON.parse(row?.tiposEvento || "[]"));
          tipos.add(tipo);
          await prisma.adicional.update({ where: { id: existente }, data: { tiposEvento: JSON.stringify([...tipos]) } });
        } else {
          const creado = await prisma.adicional.create({
            data: { nombre, tiposEvento: JSON.stringify([tipo]), frecuencia: "frecuente", orden: orden++ },
          });
          idPorNombre.set(nombre, creado.id);
        }
      }
    }
  }

  // Preguntas + reglas
  const preguntasExistentes = await prisma.preguntaDescubrimiento.count();
  if (preguntasExistentes === 0) {
    // Necesitamos el mapa nombre→id de adicionales (recién creados o preexistentes)
    if (idPorNombre.size === 0) {
      const todos = await prisma.adicional.findMany({ select: { id: true, nombre: true } });
      for (const a of todos) idPorNombre.set(a.nombre, a.id);
    }
    let orden = 0;
    for (const q of PREGUNTAS_SEED) {
      const adicionalIds = q.enciende.map((n) => idPorNombre.get(n)).filter((x): x is string => !!x);
      await prisma.preguntaDescubrimiento.create({
        data: {
          texto: q.texto,
          tipoRespuesta: q.tipoRespuesta,
          nichos: null, // aplica por tipo vía sus adicionales; nichos específicos se afinan en UI
          orden: orden++,
          reglas: {
            create: [
              {
                condicion: JSON.stringify({ op: "truthy" }),
                categoriasEquipo: q.categorias ? JSON.stringify(q.categorias) : null,
                adicionalIds: JSON.stringify(adicionalIds),
              },
            ],
          },
        },
      });
    }
  }

  const [tipos, nichos, adicionales, preguntas] = await Promise.all([
    prisma.tipoEvento.count(),
    prisma.nicho.count(),
    prisma.adicional.count(),
    prisma.preguntaDescubrimiento.count(),
  ]);
  return { tipos, nichos, adicionales, preguntas };
}
