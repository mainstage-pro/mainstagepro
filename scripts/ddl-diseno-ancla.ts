import { neon } from "@neondatabase/serverless";

// DDL aditivo: ranura estable por semana para la elección de contenido.
// Correr contra prod ANTES del push (gotcha migraciones lazy).
//   npx --no-install tsx -r dotenv/config scripts/ddl-diseno-ancla.ts dotenv_config_path=.env.prod.backup
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL");
  const sql = neon(url);
  await sql`ALTER TABLE "disenos_guardados" ADD COLUMN IF NOT EXISTS "ancla" TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS "disenos_guardados_ancla_idx" ON "disenos_guardados" ("ancla")`;
  const rows = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'disenos_guardados' AND column_name = 'ancla'
  `;
  console.log("Columna ancla presente:", rows.length === 1);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
