// DDL aditivo: orden propio del patch por fecha (show_canal_ordenes).
//   ENV_FILE=.env.prod.backup npx tsx scripts/ddl-orden-canales-show.ts
// Idempotente: solo crea una tabla nueva, nunca toca datos. Correr ANTES del push.
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
config({ path: process.env.ENV_FILE || process.env.ENVF || ".env.prod.backup" });
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "show_canal_ordenes" (
    "showId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "claves" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "show_canal_ordenes_pkey" PRIMARY KEY ("showId", "tipo"),
    CONSTRAINT "show_canal_ordenes_showId_fkey" FOREIGN KEY ("showId")
      REFERENCES "gira_shows"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
];

async function main() {
  for (const stmt of STATEMENTS) await sql.query(stmt);
  const cols = await sql.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'show_canal_ordenes' ORDER BY ordinal_position`);
  console.log("show_canal_ordenes:", cols.map((r: Record<string, string>) => r.column_name).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
