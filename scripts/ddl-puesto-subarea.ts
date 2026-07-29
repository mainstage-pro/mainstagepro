import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);
async function main() {
  await sql.query(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS sub_area_id TEXT`);
  const rows = await sql.query(`SELECT column_name FROM information_schema.columns WHERE table_name='puestos' AND column_name='sub_area_id'`);
  console.log("OK puestos.sub_area_id:", rows.map((r: any) => r.column_name).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
