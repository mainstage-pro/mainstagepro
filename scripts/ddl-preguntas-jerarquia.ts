import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);
async function main() {
  await sql.query(`ALTER TABLE "preguntas_descubrimiento" ADD COLUMN IF NOT EXISTS "alcance" TEXT NOT NULL DEFAULT 'nicho'`);
  await sql.query(`ALTER TABLE "preguntas_descubrimiento" ADD COLUMN IF NOT EXISTS "tipoEventoSlug" TEXT`);
  await sql.query(`ALTER TABLE "preguntas_descubrimiento" ADD COLUMN IF NOT EXISTS "bloque" TEXT`);
  await sql.query(`ALTER TABLE "preguntas_descubrimiento" ADD COLUMN IF NOT EXISTS "obligatoria" BOOLEAN NOT NULL DEFAULT false`);
  await sql.query(`ALTER TABLE "preguntas_descubrimiento" ADD COLUMN IF NOT EXISTS "preguntaPadreId" TEXT`);
  await sql.query(`ALTER TABLE "preguntas_descubrimiento" ADD COLUMN IF NOT EXISTS "condicionValor" TEXT`);
  // Migración de datos: preguntas sin nichos = generales; con nichos = de nicho.
  const gen = await sql.query(
    `UPDATE "preguntas_descubrimiento" SET "alcance" = 'general'
       WHERE ("nichos" IS NULL OR "nichos" = '' OR "nichos" = '[]') AND "alcance" = 'nicho'`
  );
  const cols = await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='preguntas_descubrimiento'
       AND column_name IN ('alcance','tipoEventoSlug','bloque','obligatoria','preguntaPadreId','condicionValor')
     ORDER BY column_name`
  );
  console.log("columnas jerarquía:", cols.map((c) => c.column_name).join(", "));
  console.log("preguntas marcadas 'general':", (gen as unknown as { rowCount?: number }).rowCount ?? "n/a");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
