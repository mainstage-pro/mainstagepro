/**
 * DDL aditivo para diferenciar a los artistas que son clientes del servicio de
 * production management / dirección técnica de giras (roster) y enriquecer su
 * ficha (bio, redes). Columnas nuevas en `artistas`, todas opcionales o con
 * default, para no romper filas existentes. Idempotente.
 */
import { config } from "dotenv";
config({ path: process.env.ENV_FILE || ".env.prod.backup" });
import { neon } from "@neondatabase/serverless";

const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  await sql`ALTER TABLE artistas ADD COLUMN IF NOT EXISTS "bio" TEXT`;
  await sql`ALTER TABLE artistas ADD COLUMN IF NOT EXISTS "tiktok" TEXT`;
  await sql`ALTER TABLE artistas ADD COLUMN IF NOT EXISTS "youtube" TEXT`;
  await sql`ALTER TABLE artistas ADD COLUMN IF NOT EXISTS "spotify" TEXT`;
  await sql`ALTER TABLE artistas ADD COLUMN IF NOT EXISTS "enRosterGiras" BOOLEAN NOT NULL DEFAULT false`;
  await sql`ALTER TABLE artistas ADD COLUMN IF NOT EXISTS "rosterNivelServicio" TEXT`;
  await sql`ALTER TABLE artistas ADD COLUMN IF NOT EXISTS "rosterEstado" TEXT`;
  await sql`ALTER TABLE artistas ADD COLUMN IF NOT EXISTS "rosterFechaAlta" TIMESTAMP(3)`;
  await sql`ALTER TABLE artistas ADD COLUMN IF NOT EXISTS "rosterResponsableId" TEXT`;
  await sql`ALTER TABLE artistas ADD COLUMN IF NOT EXISTS "rosterNotas" TEXT`;

  const check = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'artistas' AND column_name LIKE 'roster%' OR column_name IN ('bio','tiktok','youtube','spotify')
    ORDER BY column_name
  `;
  console.log("Columnas presentes ahora:", check.map((r: Record<string, unknown>) => r.column_name).join(", "));
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
