/**
 * DDL aditivo para los formularios de reclutamiento (Fase 1).
 *
 * Son tablas 100% nuevas: CREATE TABLE IF NOT EXISTS, sin ALTER a tablas
 * existentes. Columnas en camelCase citado porque los modelos usan @map para
 * las columnas snake_case y la tabla principal va con @@map snake_case; aquí
 * respetamos el mapping tal como Prisma lo emite.
 *
 * Correr con: npx tsx scripts/ddl-formularios-produccion.ts
 */
import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";

function urlDeProd(): string {
  const env = readFileSync(".env.prod.backup", "utf8");
  const linea = env.split("\n").find((l) => l.startsWith("DATABASE_URL="));
  if (!linea) throw new Error("No hay DATABASE_URL en .env.prod.backup");
  return linea.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
}

async function main() {
  const sql = neon(urlDeProd());

  await sql`
    CREATE TABLE IF NOT EXISTS formularios (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      imagen_url TEXT,
      estado TEXT NOT NULL DEFAULT 'BORRADOR',
      acepta_respuestas BOOLEAN NOT NULL DEFAULT true,
      umbral_avanza INTEGER NOT NULL DEFAULT 75,
      umbral_banco INTEGER NOT NULL DEFAULT 50,
      mensaje_confirmacion TEXT,
      creado_por_id TEXT,
      created_at TIMESTAMP(3) NOT NULL DEFAULT now(),
      updated_at TIMESTAMP(3) NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS formulario_puestos (
      id TEXT PRIMARY KEY,
      formulario_id TEXT NOT NULL REFERENCES formularios(id) ON DELETE CASCADE,
      puesto_id TEXT NOT NULL REFERENCES puestos(id) ON DELETE CASCADE
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS formulario_puestos_formulario_puesto_key ON formulario_puestos(formulario_id, puesto_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS formulario_secciones (
      id TEXT PRIMARY KEY,
      formulario_id TEXT NOT NULL REFERENCES formularios(id) ON DELETE CASCADE,
      orden INTEGER NOT NULL DEFAULT 0,
      codigo_bloque TEXT,
      bloque TEXT,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      mostrar_si TEXT,
      archivada BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP(3) NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS formulario_preguntas (
      id TEXT PRIMARY KEY,
      seccion_id TEXT NOT NULL REFERENCES formulario_secciones(id) ON DELETE CASCADE,
      orden INTEGER NOT NULL DEFAULT 0,
      codigo TEXT,
      texto TEXT NOT NULL,
      ayuda TEXT,
      tipo TEXT NOT NULL,
      obligatoria BOOLEAN NOT NULL DEFAULT true,
      opciones TEXT,
      mostrar_si TEXT,
      valoracion TEXT,
      archivada BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP(3) NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS formulario_respuestas (
      id TEXT PRIMARY KEY,
      formulario_id TEXT NOT NULL REFERENCES formularios(id) ON DELETE CASCADE,
      candidato_id TEXT,
      enviado_at TIMESTAMP(3) NOT NULL DEFAULT now(),
      ip_hash TEXT,
      excluido BOOLEAN,
      motivo_exclusion TEXT,
      puntos_obtenidos DOUBLE PRECISION,
      puntos_posibles DOUBLE PRECISION,
      porcentaje_preliminar DOUBLE PRECISION,
      porcentaje_final DOUBLE PRECISION,
      banda TEXT,
      desglose TEXT,
      nivel_sugerido TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS respuestas_preguntas (
      id TEXT PRIMARY KEY,
      respuesta_id TEXT NOT NULL REFERENCES formulario_respuestas(id) ON DELETE CASCADE,
      pregunta_id TEXT NOT NULL REFERENCES formulario_preguntas(id) ON DELETE CASCADE,
      valor TEXT,
      snapshot_pregunta TEXT NOT NULL,
      puntos_auto DOUBLE PRECISION,
      calificacion_manual DOUBLE PRECISION,
      calificado_por_id TEXT,
      calificado_at TIMESTAMP(3)
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS respuestas_preguntas_respuesta_pregunta_key ON respuestas_preguntas(respuesta_id, pregunta_id)`;

  // Verificación
  const tablas = await sql`
    SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN (
         'formularios', 'formulario_puestos', 'formulario_secciones',
         'formulario_preguntas', 'formulario_respuestas', 'respuestas_preguntas'
       )
     ORDER BY table_name`;
  console.log("tablas creadas o ya existentes:");
  for (const t of tablas) console.log("  ·", t.table_name);
}

main().catch((e) => { console.error(e); process.exit(1); });
