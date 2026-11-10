import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: process.env.ENVF || ".env.prod.backup" });
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  await sql.query(`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "fechasItinerario" TEXT`);
  const rows = await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='proyectos' AND column_name = $1`,
    ["fechasItinerario"],
  );
  console.log("OK proyectos.fechasItinerario:", rows.map((r: Record<string, string>) => r.column_name).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
