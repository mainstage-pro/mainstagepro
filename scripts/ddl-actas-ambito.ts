import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);
async function main() {
  // Rama del acta: INTERNA (empleado) | EVENTO (técnico/staff de un proyecto de evento).
  await sql.query(`ALTER TABLE actas_administrativas ADD COLUMN IF NOT EXISTS ambito TEXT NOT NULL DEFAULT 'INTERNA'`);
  // Proyecto de evento del que deriva el acta de evento.
  await sql.query(`ALTER TABLE actas_administrativas ADD COLUMN IF NOT EXISTS proyecto_id TEXT`);
  // Snapshot del nombre de la persona (permite levantar acta a freelance no registrado).
  await sql.query(`ALTER TABLE actas_administrativas ADD COLUMN IF NOT EXISTS persona_nombre TEXT`);
  // Relajar NOT NULL: un acta de evento puede apuntar a alguien sin ficha en personal_interno.
  await sql.query(`ALTER TABLE actas_administrativas ALTER COLUMN personal_id DROP NOT NULL`);
  await sql.query(`CREATE INDEX IF NOT EXISTS "actas_administrativas_proyecto_id_idx" ON actas_administrativas (proyecto_id)`);
  const rows = await sql.query(`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='actas_administrativas' AND column_name IN ('ambito','proyecto_id','persona_nombre','personal_id') ORDER BY column_name`);
  console.log("OK actas cols:", rows.map((r: any) => `${r.column_name}(${r.is_nullable})`).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
