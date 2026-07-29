import { neon } from "@neondatabase/serverless";

const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  await sql.query(`ALTER TABLE encuestas_satisfaccion_equipo ADD COLUMN IF NOT EXISTS "respuestas" JSONB`);
  const rows = await sql.query(`SELECT column_name FROM information_schema.columns WHERE table_name='encuestas_satisfaccion_equipo' ORDER BY ordinal_position`);
  console.log("OK encuestas_satisfaccion_equipo:", rows.map((r: any) => r.column_name).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
