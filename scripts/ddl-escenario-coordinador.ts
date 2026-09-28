/**
 * DDL aditivo: escenario del proyecto + coordinador en sitio.
 *
 * Se corre ANTES del push. Prisma no lleva @map en estos modelos, así que las
 * columnas van en camelCase citado: en snake_case el cliente truena con 500.
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

// La BD viva es la de .env.prod.backup; .env local apunta a un branch viejo.
const ENV_FILE = process.env.ENV_FILE ?? ".env.prod.backup";
config({ path: ENV_FILE });

const raw = process.env.DATABASE_URL;
if (!raw) throw new Error(`No hay DATABASE_URL en ${ENV_FILE}`);
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  await sql.query(`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "escenarioMedidas" TEXT`);
  await sql.query(`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "escenarioAlturaM" DOUBLE PRECISION`);
  await sql.query(`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "escenarioAccesos" TEXT`);
  await sql.query(`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "escenarioProveedor" TEXT`);
  await sql.query(`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "escenarioNotas" TEXT`);
  await sql.query(
    `ALTER TABLE proyecto_personal ADD COLUMN IF NOT EXISTS "coordinaEnSitio" BOOLEAN NOT NULL DEFAULT false`
  );
  // Reglas de la cadena de mando reescritas por evento.
  await sql.query(`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "cadenaMandoReglas" JSONB`);

  const a = await sql.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name='proyectos' AND (column_name LIKE 'escenario%' OR column_name='cadenaMandoReglas')
     ORDER BY column_name`
  );
  const b = await sql.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name='proyecto_personal' AND column_name='coordinaEnSitio'`
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.log("proyectos:", a.map((r: any) => r.column_name).join(", "));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.log("proyecto_personal:", b.map((r: any) => r.column_name).join(", ") || "(falta)");
}

main().catch((e) => { console.error(e); process.exit(1); });
