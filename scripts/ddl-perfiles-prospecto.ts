import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

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
  await sql.query(`
    CREATE TABLE IF NOT EXISTS "perfiles_prospecto" (
      "id" TEXT PRIMARY KEY,
      "label" TEXT NOT NULL,
      "categoria" TEXT NOT NULL,
      "mensajeInicial" TEXT,
      "materiales" TEXT,
      "orden" INTEGER NOT NULL DEFAULT 0,
      "activo" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const t = await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'perfiles_prospecto'`
  );
  console.log("OK tabla perfiles_prospecto columnas:", t.map((r: Record<string, unknown>) => r.column_name).join(", "));
}

main().catch((e) => { console.error(e); process.exit(1); });
