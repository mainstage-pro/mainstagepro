import { neon } from "@neondatabase/serverless";

// DDL aditivo idempotente: añade la columna enBandeja a "tareas" en prod ANTES
// del deploy (regla de migraciones lazy). Neon pooler HTTP.
const DATABASE_URL = "postgresql://neondb_owner:npg_0qjmIyDp6kHc@ep-noisy-firefly-an5vzlqv-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=30&pool_timeout=30&connection_limit=1";

const sql = neon(DATABASE_URL);

async function main() {
  console.log("🔧 Añadiendo columna tareas.enBandeja…");
  await sql`ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "enBandeja" BOOLEAN NOT NULL DEFAULT false`;
  await sql`CREATE INDEX IF NOT EXISTS "tareas_enBandeja_idx" ON "tareas"("enBandeja")`;

  const check = await sql`
    SELECT column_name, data_type, column_default FROM information_schema.columns
    WHERE table_name = 'tareas' AND column_name = 'enBandeja'
  `;
  console.log("✅ Columna:", JSON.stringify(check));
  console.log("✅ DDL aplicado en prod.");
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
