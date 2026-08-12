import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

// Lee DATABASE_URL del archivo de env indicado (default: prod).
const envFile = process.env.ENV_FILE || ".env.prod.backup";
const envRaw = readFileSync(envFile, "utf8");
const match = envRaw.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error(`No DATABASE_URL en ${envFile}`);
const raw = match[1].trim().replace(/^["']|["']$/g, "");
const url = raw
  .replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "")
  .replace(/\?&/, "?")
  .replace(/\?$/, "");
const sql = neon(url);

async function main() {
  // Columnas camelCase citadas: el modelo RenderComercial no usa @map en sus
  // campos, así que Prisma las espera literales.
  await sql.query(`
    CREATE TABLE IF NOT EXISTS renders_comerciales (
      "id"        TEXT PRIMARY KEY,
      "url"       TEXT NOT NULL,
      "caption"   TEXT,
      "etiqueta"  TEXT,
      "orden"     INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const rows = await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='renders_comerciales' ORDER BY column_name`
  );
  console.log("OK renders_comerciales cols:", rows.map((r: any) => r.column_name).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
