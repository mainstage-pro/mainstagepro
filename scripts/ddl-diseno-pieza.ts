import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);
async function main() {
  // Extiende disenos_guardados a "Pieza": formato objetivo, snapshot congelado al
  // publicar y renders generados. Columnas camelCase citadas (modelo sin @map).
  await sql.query(`ALTER TABLE disenos_guardados ADD COLUMN IF NOT EXISTS "formato" TEXT NOT NULL DEFAULT 'story'`);
  await sql.query(`ALTER TABLE disenos_guardados ADD COLUMN IF NOT EXISTS "snapshot" JSONB`);
  await sql.query(`ALTER TABLE disenos_guardados ADD COLUMN IF NOT EXISTS "renders" JSONB NOT NULL DEFAULT '[]'`);
  const rows = await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='disenos_guardados' AND column_name IN ('formato','snapshot','renders') ORDER BY column_name`
  );
  console.log("OK disenos_guardados Pieza cols:", rows.map((r: any) => r.column_name).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
