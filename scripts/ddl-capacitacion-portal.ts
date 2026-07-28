// DDL aditivo e idempotente para el Portal de Aprendizaje de capacitaciones.
// Se corre contra PROD ANTES del push (patrón Neon lazy migration).
//   ENV_FILE=.env.prod.backup npx tsx scripts/ddl-capacitacion-portal.ts
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

// ── Cargar env file (por defecto el de prod) sin dependencias externas ───────
const envFile = process.env.ENV_FILE || ".env.prod.backup";
try {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
  console.log(`env cargado de ${envFile}`);
} catch {
  console.log(`(no se pudo leer ${envFile}, uso process.env actual)`);
}

const raw = process.env.DATABASE_URL!;
const url = raw
  .replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "")
  .replace(/\?&/, "?")
  .replace(/\?$/, "");
const sql = neon(url);

// Áreas base. id determinístico (cat-<slug>) → insert idempotente.
const CATEGORIAS: { slug: string; nombre: string; color: string; icono: string; orden: number }[] = [
  { slug: "general",            nombre: "General",             color: "#c9a96a", icono: "GraduationCap", orden: 0 },
  { slug: "administracion",     nombre: "Administración",      color: "#3B82F6", icono: "Landmark",       orden: 1 },
  { slug: "marketing",          nombre: "Marketing",           color: "#EC4899", icono: "Megaphone",      orden: 2 },
  { slug: "ventas",             nombre: "Ventas",              color: "#10B981", icono: "BadgeDollarSign", orden: 3 },
  { slug: "produccion",         nombre: "Producción",          color: "#F59E0B", icono: "Package",        orden: 4 },
  { slug: "audio-electro-voice", nombre: "Audio · Electro-Voice", color: "#8B5CF6", icono: "Speaker",     orden: 5 },
  { slug: "audio-rcf",          nombre: "Audio · RCF",         color: "#6366F1", icono: "Speaker",        orden: 6 },
  { slug: "cabinas-pioneer",    nombre: "Cabinas Pioneer",     color: "#14B8A6", icono: "Disc3",          orden: 7 },
  { slug: "entarimado",         nombre: "Entarimado",          color: "#EF4444", icono: "LayoutGrid",     orden: 8 },
  { slug: "pantalla-led",       nombre: "Pantalla LED",        color: "#22c55e", icono: "MonitorPlay",    orden: 9 },
];

async function main() {
  // 1) Columna categoria_id en sesiones existentes
  await sql.query(`ALTER TABLE sesiones_capacitacion ADD COLUMN IF NOT EXISTS categoria_id TEXT`);

  // 2) Tabla de categorías
  await sql.query(`CREATE TABLE IF NOT EXISTS categorias_capacitacion (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#c9a96a',
    icono TEXT NOT NULL DEFAULT 'GraduationCap',
    orden INTEGER NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(3) NOT NULL DEFAULT now(),
    updated_at TIMESTAMP(3) NOT NULL DEFAULT now())`);

  // 3) Progreso por usuario+sesión
  await sql.query(`CREATE TABLE IF NOT EXISTS progreso_capacitacion (
    id TEXT PRIMARY KEY,
    usuario_id TEXT NOT NULL,
    sesion_id TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'en-progreso',
    segundos INTEGER NOT NULL DEFAULT 0,
    iniciado_en TIMESTAMP(3) NOT NULL DEFAULT now(),
    completado_en TIMESTAMP(3),
    updated_at TIMESTAMP(3) NOT NULL DEFAULT now())`);
  await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS progreso_capacitacion_usuario_sesion_key ON progreso_capacitacion(usuario_id, sesion_id)`);

  // 4) Evaluaciones (una por sesión)
  await sql.query(`CREATE TABLE IF NOT EXISTS evaluaciones_capacitacion (
    id TEXT PRIMARY KEY,
    sesion_id TEXT NOT NULL UNIQUE,
    preguntas JSONB NOT NULL DEFAULT '[]',
    min_aprobar INTEGER NOT NULL DEFAULT 80,
    generada_en TIMESTAMP(3) NOT NULL DEFAULT now())`);

  // 5) Intentos de evaluación
  await sql.query(`CREATE TABLE IF NOT EXISTS intentos_evaluacion (
    id TEXT PRIMARY KEY,
    evaluacion_id TEXT NOT NULL,
    usuario_id TEXT NOT NULL,
    respuestas JSONB NOT NULL DEFAULT '[]',
    calificacion INTEGER NOT NULL DEFAULT 0,
    aprobado BOOLEAN NOT NULL DEFAULT false,
    creado_en TIMESTAMP(3) NOT NULL DEFAULT now())`);
  await sql.query(`CREATE INDEX IF NOT EXISTS intentos_evaluacion_usuario_idx ON intentos_evaluacion(usuario_id)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS intentos_evaluacion_evaluacion_idx ON intentos_evaluacion(evaluacion_id)`);

  // 6) Sembrar áreas (idempotente por slug)
  for (const c of CATEGORIAS) {
    await sql.query(
      `INSERT INTO categorias_capacitacion (id, nombre, slug, color, icono, orden)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (slug) DO NOTHING`,
      [`cat-${c.slug}`, c.nombre, c.slug, c.color, c.icono, c.orden]
    );
  }

  // 7) Backfill: sesiones sin categoría → General
  await sql.query(`UPDATE sesiones_capacitacion SET categoria_id = 'cat-general' WHERE categoria_id IS NULL`);

  const cats = await sql.query(`SELECT slug FROM categorias_capacitacion ORDER BY orden`);
  const sesiones = await sql.query(`SELECT count(*)::int AS n FROM sesiones_capacitacion WHERE categoria_id = 'cat-general'`);
  console.log("OK áreas:", cats.map((r: any) => r.slug).join(", "));
  console.log("Sesiones en General:", sesiones[0].n);
}

main().catch((e) => { console.error(e); process.exit(1); });
