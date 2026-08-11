import { neon } from "@neondatabase/serverless";

const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

// Semilla base de los 4 tipos de servicio. Copy inicial editable; el usuario
// puede regenerar la descripción con IA desde la config.
const SEED = [
  {
    slug: "renta",
    nombre: "Renta de equipo",
    orden: 0,
    subtitulo: "Audio · Iluminación · Video · DJ Gear",
    descripcion:
      "Line arrays, subwoofers, consolas digitales, cabezas móviles y pantallas LED. Equipo profesional verificado antes de salir de bodega, disponible con o sin operador para completar tu producción o montarla desde cero. Ideal si ya tienes operadores y solo necesitas el equipo indicado, revisado y a tiempo.",
  },
  {
    slug: "produccion-tecnica",
    nombre: "Producción técnica",
    orden: 1,
    subtitulo: "Scouting · Rider técnico · Operación en vivo",
    descripcion:
      "Llevamos el equipo y a la gente que lo opera. Montaje, prueba de sonido y operación en vivo de audio, iluminación y video durante todo el evento, con respaldo ante cualquier imprevisto. Incluye scouting técnico del lugar, rider final, plots y renders de uso interno, coordinación en sitio y desmontaje. Ideal si quieres olvidarte de lo técnico.",
  },
  {
    slug: "direccion-tecnica",
    nombre: "Dirección técnica",
    orden: 2,
    subtitulo: "Concepto · Renders · Red de proveedores",
    descripcion:
      "Un director de producción coordina cada área: el rider, los cues de luz por escena, la señal de video y la comunicación directa con el artista y su equipo. Desarrollo conceptual, propuestas visuales con renders entregables y gestión de todos los proveedores aliados bajo una sola cabeza responsable. Ideal para eventos con varias áreas donde necesitas una sola dirección que responda por todo.",
  },
  {
    slug: "operacion-tecnica",
    nombre: "Operación técnica",
    orden: 3,
    subtitulo: "Montaje · Operación en vivo · Desmontaje",
    descripcion:
      "La capa de ejecución en vivo del evento: los técnicos que montan, prueban y operan audio, iluminación y video de principio a fin, resolviendo cualquier imprevisto en el momento. Incluye montaje y prueba de sonido, operación en vivo de cada área, coordinación en sitio el día del evento y desmontaje. Es lo que garantiza que todo lo planeado se ejecute a tiempo y sin fallas.",
  },
];

async function main() {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS tipos_servicio (
      id          TEXT PRIMARY KEY,
      slug        TEXT NOT NULL UNIQUE,
      nombre      TEXT NOT NULL,
      emoji       TEXT,
      subtitulo   TEXT,
      descripcion TEXT,
      orden       INTEGER NOT NULL DEFAULT 0,
      activo      BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS fotos_tipo_servicio (
      id               TEXT PRIMARY KEY,
      "tipoServicioId" TEXT NOT NULL REFERENCES tipos_servicio(id) ON DELETE CASCADE,
      url              TEXT NOT NULL,
      caption          TEXT,
      orden            INTEGER NOT NULL DEFAULT 0,
      destacada        BOOLEAN NOT NULL DEFAULT false,
      "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sql.query(`
    CREATE INDEX IF NOT EXISTS "fotos_tipo_servicio_tipoServicioId_idx"
    ON fotos_tipo_servicio("tipoServicioId")
  `);

  for (const t of SEED) {
    await sql.query(
      `INSERT INTO tipos_servicio (id, slug, nombre, subtitulo, descripcion, orden, "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (slug) DO NOTHING`,
      [t.slug, t.nombre, t.subtitulo, t.descripcion, t.orden]
    );
  }

  const rows = await sql.query(`SELECT slug, nombre, orden FROM tipos_servicio ORDER BY orden`);
  console.log("OK tipos_servicio:");
  for (const r of rows as any[]) console.log(`  ${r.orden}. ${r.slug} — ${r.nombre}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
