import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);
async function main() {
  await sql.query(`ALTER TABLE "equipos" ADD COLUMN IF NOT EXISTS "tiposEvento" TEXT`);
  await sql.query(`ALTER TABLE "equipos" ADD COLUMN IF NOT EXISTS "nichos" TEXT`);
  await sql.query(`ALTER TABLE "equipos" ADD COLUMN IF NOT EXISTS "rol" TEXT`);
  await sql.query(`ALTER TABLE "equipos" ADD COLUMN IF NOT EXISTS "capacidadPorTipoEvento" TEXT`);
  await sql.query(`ALTER TABLE "equipos" ADD COLUMN IF NOT EXISTS "noCotizable" BOOLEAN NOT NULL DEFAULT false`);
  await sql.query(`ALTER TABLE "equipos" ADD COLUMN IF NOT EXISTS "clasifOrigen" TEXT`);
  const cols = await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='equipos'
       AND column_name IN ('tiposEvento','nichos','rol','capacidadPorTipoEvento','noCotizable','clasifOrigen')
     ORDER BY column_name`
  );
  console.log("columnas de clasificación en equipos:", cols.map((c) => c.column_name).join(", "));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
