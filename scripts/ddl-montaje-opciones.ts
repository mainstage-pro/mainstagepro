// DDL aditivo: tabla montaje_opciones (patrón Neon HTTP).
//   ENV_FILE=.env.prod.backup npx tsx scripts/ddl-montaje-opciones.ts
// Idempotente: solo crea la tabla y su índice. Correr ANTES del push.
// Columnas en camelCase citado porque el modelo Prisma no usa @map en los campos.
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
config({ path: process.env.ENV_FILE || process.env.ENVF || ".env.prod.backup" });
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS montaje_opciones (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL,
      label TEXT NOT NULL,
      categoria TEXT,
      disciplina TEXT,
      activo BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

  await sql.query(`CREATE INDEX IF NOT EXISTS "montaje_opciones_tipo_idx" ON montaje_opciones(tipo)`);

  const cols = await sql.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'montaje_opciones' ORDER BY ordinal_position`);
  console.log("OK montaje_opciones:", cols.map((r: any) => r.column_name).join(", ") || "(vacía — revisar)");
}
main().catch((e) => { console.error(e); process.exit(1); });
