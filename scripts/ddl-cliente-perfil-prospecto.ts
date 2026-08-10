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
  await sql.query(`ALTER TABLE clientes ADD COLUMN IF NOT EXISTS "perfilProspecto" TEXT`);
  const t = await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'perfilProspecto'`
  );
  console.log("OK columna perfilProspecto presente:", t.length > 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
