import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";

// Lee DATABASE_URL de prod (.env.prod.backup), NO del .env local (branch viejo).
const envRaw = readFileSync(".env.prod.backup", "utf8");
const m = envRaw.match(/^DATABASE_URL=(.+)$/m);
if (!m) throw new Error("No DATABASE_URL en .env.prod.backup");
const raw = m[1].trim().replace(/^["']|["']$/g, "");
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  const stmt = `ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "capacidadUniversal" BOOLEAN NOT NULL DEFAULT false`;
  await sql.query(stmt);
  console.log("OK:", stmt);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
