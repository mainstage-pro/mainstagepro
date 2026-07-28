import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);
async function main() {
  await sql.query(`ALTER TABLE evaluaciones_empleado ADD COLUMN IF NOT EXISTS criterios TEXT`);
  const c = await sql.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'evaluaciones_empleado' AND column_name = 'criterios'`);
  console.log("OK evaluaciones_empleado.criterios:", c.map((r: any) => r.column_name).join(", ") || "FALTA");
}
main().catch((e) => { console.error(e); process.exit(1); });
