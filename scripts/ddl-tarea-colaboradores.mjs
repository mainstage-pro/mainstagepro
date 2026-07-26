import { neon } from "@neondatabase/serverless";

// DDL aditivo idempotente: crea la tabla de co-responsables de tareas en prod
// ANTES del deploy (regla de migraciones lazy). Neon pooler HTTP.
const DATABASE_URL = "postgresql://neondb_owner:npg_0qjmIyDp6kHc@ep-noisy-firefly-an5vzlqv-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=30&pool_timeout=30&connection_limit=1";

const sql = neon(DATABASE_URL);

async function main() {
  console.log("🔧 Creando tabla tarea_colaboradores…");

  await sql`
    CREATE TABLE IF NOT EXISTS "tarea_colaboradores" (
      "tareaId"   TEXT NOT NULL,
      "usuarioId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "tarea_colaboradores_pkey" PRIMARY KEY ("tareaId", "usuarioId")
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS "tarea_colaboradores_usuarioId_idx" ON "tarea_colaboradores"("usuarioId")`;

  // FKs con ON DELETE CASCADE (igual que Prisma). Se envuelven por si ya existen.
  await sql`
    DO $$ BEGIN
      ALTER TABLE "tarea_colaboradores"
        ADD CONSTRAINT "tarea_colaboradores_tareaId_fkey"
        FOREIGN KEY ("tareaId") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `;

  await sql`
    DO $$ BEGIN
      ALTER TABLE "tarea_colaboradores"
        ADD CONSTRAINT "tarea_colaboradores_usuarioId_fkey"
        FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `;

  const check = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'tarea_colaboradores' ORDER BY ordinal_position
  `;
  console.log("✅ Columnas:", check.map(c => c.column_name).join(", "));
  console.log("✅ DDL aplicado en prod.");
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
