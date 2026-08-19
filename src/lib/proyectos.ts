import { prisma } from "./prisma";

// Los proyectos de presentación se guardan en tablas creadas lazy (patrón Neon
// sin migración formal). NO tocamos schema.prisma para no arriesgar las rutas de
// lectura al desplegar (ver incidentes de migración lazy en memoria del proyecto).
// ensureProyectosTables() se llama al inicio de cada endpoint de proyectos y va
// envuelto en try/catch por quien lo consume.

let tablesEnsured = false;

export const TIPOS_EVENTO_PROYECTO = ["MUSICAL", "SOCIAL", "EMPRESARIAL", "OTRO"] as const;
export type TipoEventoProyecto = (typeof TIPOS_EVENTO_PROYECTO)[number];

export type ProyectoImagen = { id: string; url: string; caption: string | null; orden: number };

export type Proyecto = {
  id: string;
  slug: string;
  tipoEvento: string;
  titulo: string;
  cliente: string | null;
  ubicacion: string | null;
  fecha: string | null;
  resumen: string | null;
  reto: string | null;
  solucion: string | null;
  resultado: string | null;
  asistentes: number | null;
  servicios: string[];
  portada: string | null;
  esBorrador: boolean;
  destacado: boolean;
  activo: boolean;
  orden: number;
  imagenes: ProyectoImagen[];
};

// Migración lazy YA APLICADA en prod (verificado 2026-08-19: las tablas
// proyectos_presentacion y proyecto_imagenes, con sus índices, ya existen).
// El bloque de CREATE TABLE/INDEX se quitó: esta función se llama en cada
// carga de las páginas públicas de portafolio (sin auth, alto tráfico
// potencial). Se conserva el seed de borradores, que es lógica de datos.
export async function ensureProyectosTables() {
  if (tablesEnsured) return;
  tablesEnsured = true;

  await seedBorradores();
}

// ─── Seed de borradores (contenido base realista, marcado esBorrador) ──────────
// Solo inserta si la tabla está vacía. Idempotente por slug.

type SeedProyecto = Omit<Proyecto, "id" | "imagenes"> & { imagenes: { url: string; caption: string }[] };

const SEED: SeedProyecto[] = [
  {
    slug: "festival-magic-room-guanajuato",
    tipoEvento: "MUSICAL",
    titulo: "Magic Room · Festival en Guanajuato",
    cliente: "Productora independiente",
    ubicacion: "Guanajuato, Gto.",
    fecha: "Marzo 2024",
    resumen: "Producción técnica completa para un festival de música electrónica al aire libre.",
    reto: "Un venue exterior sin infraestructura, lineup de seis actos con riders distintos y una ventana de montaje de una sola noche.",
    solucion: "Line array de cobertura frontal, backline y monitoreo por acto, sistema de iluminación con cues programadas por set y un operador dedicado a cada área. Montaje coordinado en turnos para entregar tarima lista al soundcheck.",
    resultado: "Seis actos entraron y salieron sin retrasos; audio parejo del frente al fondo y cero incidentes técnicos durante las ocho horas de show.",
    asistentes: 1200,
    servicios: ["Producción técnica", "Audio", "Iluminación", "Dirección técnica"],
    portada: "/images/presentacion/musicales/MAGIC_ROOM_260307_GUANAJUATO_078.jpg",
    esBorrador: true,
    destacado: true,
    activo: true,
    orden: 0,
    imagenes: [
      { url: "/images/presentacion/musicales/MAGIC_ROOM_260307_GUANAJUATO_078.jpg", caption: "Festival · Guanajuato" },
      { url: "/images/presentacion/musicales/Musicales-055.jpg", caption: "Producción de luz · Efectos especiales" },
      { url: "/images/presentacion/musicales/Musicales-076.jpg", caption: "DJ Set · Equipo profesional" },
    ],
  },
  {
    slug: "showcase-en-vivo-afrodise",
    tipoEvento: "MUSICAL",
    titulo: "Afrodise · Showcase en vivo",
    cliente: "Artista en gira",
    ubicacion: "León, Gto.",
    fecha: "Noviembre 2023",
    resumen: "Renta de equipo con operadores para un showcase íntimo de presentación de disco.",
    reto: "Recinto cerrado con acústica difícil y un rider de banda completa que debía sonar impecable frente a prensa e invitados.",
    solucion: "Sistema afinado al recinto, monitoreo in-ear para la banda, iluminación de escena con ambientación por canción y FOH operado por técnico que conoció el material antes de la prueba.",
    resultado: "Mezcla limpia en un espacio complicado y una puesta que acompañó cada tema sin robar protagonismo al artista.",
    asistentes: 300,
    servicios: ["Renta de equipo", "Audio", "Iluminación"],
    portada: "/images/presentacion/musicales/Afrodise-59.jpg",
    esBorrador: true,
    destacado: false,
    activo: true,
    orden: 1,
    imagenes: [
      { url: "/images/presentacion/musicales/Afrodise-59.jpg", caption: "Stage completo · Noche" },
      { url: "/images/presentacion/musicales/DSC07491.jpg", caption: "En vivo · Operación técnica" },
    ],
  },
  {
    slug: "boda-jardin-produccion-integral",
    tipoEvento: "SOCIAL",
    titulo: "Boda en jardín · Producción integral",
    cliente: "Evento privado",
    ubicacion: "Bajío",
    fecha: "Febrero 2024",
    resumen: "Audio, iluminación y coordinación de programa para una boda al aire libre.",
    reto: "Ceremonia, cena y pista en tres espacios distintos del mismo jardín, cada uno con su ambiente y sus tiempos.",
    solucion: "Refuerzo discreto para la ceremonia, micrófonos inalámbricos para brindis, iluminación ambiental que transiciona de cena a fiesta y un programa coordinado con el venue y el planner desde semanas antes.",
    resultado: "Cada momento — primer baile, brindis, apertura de pista — sonó y se vio en su punto, sin que la producción se notara.",
    asistentes: 220,
    servicios: ["Producción técnica", "Audio", "Iluminación"],
    portada: "/images/presentacion/sociales/s-boda-elegante.jpg",
    esBorrador: true,
    destacado: true,
    activo: true,
    orden: 0,
    imagenes: [
      { url: "/images/presentacion/sociales/s-boda-elegante.jpg", caption: "Boda · Producción integral" },
    ],
  },
  {
    slug: "xv-anos-pista-e-iluminacion",
    tipoEvento: "SOCIAL",
    titulo: "XV Años · Pista e iluminación",
    cliente: "Evento privado",
    ubicacion: "Salón de eventos",
    fecha: "Enero 2024",
    resumen: "Renta de audio e iluminación con operador para una fiesta de XV años.",
    reto: "Un vals con cambios de canción encadenados y una pista que debía encender justo después, sin tiempos muertos.",
    solucion: "Playback y micrófono coordinados para el vals, luz robótica programada por bloque y un operador atento al programa para disparar cada cambio en el momento exacto.",
    resultado: "Transiciones limpias entre vals, sorpresa y pista; la fiesta arrancó sin pausas y el ambiente se mantuvo toda la noche.",
    asistentes: 180,
    servicios: ["Renta de equipo", "Audio", "Iluminación"],
    portada: "/images/presentacion/sociales/s-boda-elegante.jpg",
    esBorrador: true,
    destacado: false,
    activo: true,
    orden: 1,
    imagenes: [],
  },
  {
    slug: "congreso-auditorio-produccion-completa",
    tipoEvento: "EMPRESARIAL",
    titulo: "Congreso · Auditorio con producción completa",
    cliente: "Empresa corporativa",
    ubicacion: "Auditorio",
    fecha: "Abril 2024",
    resumen: "Producción técnica para un congreso de dos días con múltiples presentadores.",
    reto: "Agenda apretada con más de una docena de ponentes, presentaciones desde laptops distintas y cero margen para fallos frente a clientes e inversionistas.",
    solucion: "Audio con micrófonos por presentador, switching de video verificado con cada laptop antes de abrir puertas, pantallas calibradas y un solo punto de contacto técnico alineado con el coordinador del evento.",
    resultado: "Dos jornadas sin un solo corte de señal ni micrófono caído; los ponentes solo se preocuparon por su contenido.",
    asistentes: 400,
    servicios: ["Producción técnica", "Audio", "Video", "Dirección técnica"],
    portada: "/images/presentacion/empresariales/e-auditorio.jpg",
    esBorrador: true,
    destacado: true,
    activo: true,
    orden: 0,
    imagenes: [
      { url: "/images/presentacion/empresariales/e-auditorio.jpg", caption: "Auditorio · Producción completa" },
      { url: "/images/presentacion/empresariales/e-sala-pantallas.jpg", caption: "Sala · Pantallas" },
    ],
  },
  {
    slug: "lanzamiento-marca-pantalla-led",
    tipoEvento: "EMPRESARIAL",
    titulo: "Lanzamiento de marca · Pantalla LED",
    cliente: "Empresa corporativa",
    ubicacion: "Evento exterior",
    fecha: "Marzo 2024",
    resumen: "Renta de pantalla LED y audio con operación para el lanzamiento de un producto.",
    reto: "Un momento de revelación al aire libre que dependía de que video y audio dispararan sincronizados frente a prensa.",
    solucion: "Pantalla LED de alto brillo para exterior, contenido precargado y probado, refuerzo de audio para el presentador y una señal de video estabilizada con respaldo listo.",
    resultado: "La revelación salió al segundo previsto, con imagen nítida a plena luz y sonido claro para toda la audiencia.",
    asistentes: 250,
    servicios: ["Renta de equipo", "Video", "Audio"],
    portada: "/images/presentacion/empresariales/e-carpa-led.jpg",
    esBorrador: true,
    destacado: false,
    activo: true,
    orden: 1,
    imagenes: [
      { url: "/images/presentacion/empresariales/e-carpa-led.jpg", caption: "Evento exterior · Pantalla LED" },
      { url: "/images/presentacion/empresariales/e-proyeccion-mural.jpg", caption: "Proyección · Evento exclusivo" },
    ],
  },
];

async function seedBorradores() {
  const count = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM "proyectos_presentacion";`
  );
  if (Number(count[0]?.count ?? 0) > 0) return;

  for (const p of SEED) {
    const id = cuidish();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "proyectos_presentacion"
        ("id","slug","tipoEvento","titulo","cliente","ubicacion","fecha","resumen","reto","solucion","resultado","asistentes","servicios","portada","esBorrador","destacado","activo","orden","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,CURRENT_TIMESTAMP)
       ON CONFLICT ("slug") DO NOTHING;`,
      id, p.slug, p.tipoEvento, p.titulo, p.cliente, p.ubicacion, p.fecha, p.resumen,
      p.reto, p.solucion, p.resultado, p.asistentes, JSON.stringify(p.servicios),
      p.portada, p.esBorrador, p.destacado, p.activo, p.orden
    );
    for (let i = 0; i < p.imagenes.length; i++) {
      const img = p.imagenes[i];
      await prisma.$executeRawUnsafe(
        `INSERT INTO "proyecto_imagenes" ("id","proyectoId","url","caption","orden")
         VALUES ($1,$2,$3,$4,$5);`,
        cuidish(), id, img.url, img.caption, i
      );
    }
  }
}

function cuidish() {
  return "prj_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// ─── Lectura ───────────────────────────────────────────────────────────────────

type Row = {
  id: string; slug: string; tipoEvento: string; titulo: string;
  cliente: string | null; ubicacion: string | null; fecha: string | null;
  resumen: string | null; reto: string | null; solucion: string | null;
  resultado: string | null; asistentes: number | null; servicios: string | null;
  portada: string | null; esBorrador: boolean; destacado: boolean;
  activo: boolean; orden: number;
};

function mapRow(r: Row, imagenes: ProyectoImagen[] = []): Proyecto {
  let servicios: string[] = [];
  try { servicios = r.servicios ? JSON.parse(r.servicios) : []; } catch { servicios = []; }
  return { ...r, servicios, imagenes };
}

export async function getProyectosPublicos(tipo?: string): Promise<Proyecto[]> {
  await ensureProyectosTables();
  const rows = tipo
    ? await prisma.$queryRawUnsafe<Row[]>(
        `SELECT * FROM "proyectos_presentacion" WHERE "activo" = true AND "tipoEvento" = $1 ORDER BY "destacado" DESC, "orden" ASC, "createdAt" DESC;`,
        tipo
      )
    : await prisma.$queryRawUnsafe<Row[]>(
        `SELECT * FROM "proyectos_presentacion" WHERE "activo" = true ORDER BY "destacado" DESC, "orden" ASC, "createdAt" DESC;`
      );
  return rows.map((r) => mapRow(r));
}

export async function getProyectoBySlug(slug: string): Promise<Proyecto | null> {
  await ensureProyectosTables();
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT * FROM "proyectos_presentacion" WHERE "slug" = $1 AND "activo" = true LIMIT 1;`,
    slug
  );
  const row = rows[0];
  if (!row) return null;
  const imgs = await imagenesDe(row.id);
  return mapRow(row, imgs);
}

async function imagenesDe(proyectoId: string): Promise<ProyectoImagen[]> {
  return prisma.$queryRawUnsafe<ProyectoImagen[]>(
    `SELECT "id","url","caption","orden" FROM "proyecto_imagenes" WHERE "proyectoId" = $1 ORDER BY "orden" ASC;`,
    proyectoId
  );
}

export async function getProyectoById(id: string): Promise<Proyecto | null> {
  await ensureProyectosTables();
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT * FROM "proyectos_presentacion" WHERE "id" = $1 LIMIT 1;`,
    id
  );
  const row = rows[0];
  if (!row) return null;
  return mapRow(row, await imagenesDe(row.id));
}

// ─── Escritura (solo admin, desde endpoints con requireAdmin) ──────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "proyecto";
}

async function slugUnico(base: string, excluirId?: string): Promise<string> {
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT "id" FROM "proyectos_presentacion" WHERE "slug" = $1 LIMIT 1;`,
      slug
    );
    if (!rows[0] || rows[0].id === excluirId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export type ProyectoInput = Partial<{
  titulo: string; tipoEvento: string; cliente: string | null; ubicacion: string | null;
  fecha: string | null; resumen: string | null; reto: string | null; solucion: string | null;
  resultado: string | null; asistentes: number | null; servicios: string[]; portada: string | null;
  esBorrador: boolean; destacado: boolean; orden: number;
}>;

export async function createProyecto(input: ProyectoInput): Promise<Proyecto> {
  await ensureProyectosTables();
  const id = cuidish();
  const titulo = input.titulo?.trim() || "Nuevo proyecto";
  const tipoEvento = TIPOS_EVENTO_PROYECTO.includes(input.tipoEvento as TipoEventoProyecto)
    ? input.tipoEvento! : "MUSICAL";
  const slug = await slugUnico(slugify(titulo));
  await prisma.$executeRawUnsafe(
    `INSERT INTO "proyectos_presentacion"
      ("id","slug","tipoEvento","titulo","cliente","ubicacion","fecha","resumen","reto","solucion","resultado","asistentes","servicios","portada","esBorrador","destacado","activo","orden","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,true,$17,CURRENT_TIMESTAMP);`,
    id, slug, tipoEvento, titulo, input.cliente ?? null, input.ubicacion ?? null, input.fecha ?? null,
    input.resumen ?? null, input.reto ?? null, input.solucion ?? null, input.resultado ?? null,
    input.asistentes ?? null, JSON.stringify(input.servicios ?? []), input.portada ?? null,
    input.esBorrador ?? true, input.destacado ?? false, input.orden ?? 0
  );
  return (await getProyectoById(id))!;
}

const CAMPOS_TEXTO = ["titulo", "cliente", "ubicacion", "fecha", "resumen", "reto", "solucion", "resultado", "portada", "tipoEvento"] as const;

export async function updateProyecto(id: string, input: ProyectoInput): Promise<Proyecto | null> {
  await ensureProyectosTables();
  const sets: string[] = [];
  const vals: unknown[] = [];
  let n = 1;

  for (const campo of CAMPOS_TEXTO) {
    if (campo in input) {
      sets.push(`"${campo}" = $${n++}`);
      vals.push((input as Record<string, unknown>)[campo] ?? null);
    }
  }
  if ("asistentes" in input) { sets.push(`"asistentes" = $${n++}`); vals.push(input.asistentes ?? null); }
  if ("servicios" in input) { sets.push(`"servicios" = $${n++}`); vals.push(JSON.stringify(input.servicios ?? [])); }
  if ("esBorrador" in input) { sets.push(`"esBorrador" = $${n++}`); vals.push(input.esBorrador); }
  if ("destacado" in input) { sets.push(`"destacado" = $${n++}`); vals.push(input.destacado); }
  if ("orden" in input) { sets.push(`"orden" = $${n++}`); vals.push(input.orden); }

  if (input.titulo) {
    const nuevoSlug = await slugUnico(slugify(input.titulo), id);
    sets.push(`"slug" = $${n++}`); vals.push(nuevoSlug);
  }

  if (sets.length === 0) return getProyectoById(id);
  sets.push(`"updatedAt" = CURRENT_TIMESTAMP`);
  vals.push(id);
  await prisma.$executeRawUnsafe(
    `UPDATE "proyectos_presentacion" SET ${sets.join(", ")} WHERE "id" = $${n};`,
    ...vals
  );
  return getProyectoById(id);
}

export async function deleteProyecto(id: string): Promise<void> {
  await ensureProyectosTables();
  await prisma.$executeRawUnsafe(`DELETE FROM "proyectos_presentacion" WHERE "id" = $1;`, id);
}

export async function addImagen(proyectoId: string, url: string, caption?: string | null): Promise<ProyectoImagen> {
  await ensureProyectosTables();
  const orden = await prisma.$queryRawUnsafe<{ max: number | null }[]>(
    `SELECT MAX("orden") AS max FROM "proyecto_imagenes" WHERE "proyectoId" = $1;`,
    proyectoId
  );
  const nextOrden = (orden[0]?.max ?? -1) + 1;
  const id = cuidish();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "proyecto_imagenes" ("id","proyectoId","url","caption","orden") VALUES ($1,$2,$3,$4,$5);`,
    id, proyectoId, url, caption ?? null, nextOrden
  );
  return { id, url, caption: caption ?? null, orden: nextOrden };
}

export async function deleteImagen(imgId: string): Promise<void> {
  await ensureProyectosTables();
  await prisma.$executeRawUnsafe(`DELETE FROM "proyecto_imagenes" WHERE "id" = $1;`, imgId);
}
