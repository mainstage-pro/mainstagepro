// scripts/migrate-captura.mjs — aplica el schema vía Neon HTTP (sin TCP)
import { neon } from "@neondatabase/serverless";

const DB = "postgresql://neondb_owner:npg_0qjmIyDp6kHc@ep-noisy-firefly-an5vzlqv.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DB);

async function main() {
  console.log("🔧 Creando tablas: captura_rapida, ideas, iniciativas, subtareas_iniciativa...");

  // ── captura_rapida ────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS captura_rapida (
      id           TEXT         NOT NULL PRIMARY KEY,
      contenido    TEXT         NOT NULL,
      area         TEXT,
      tipo         TEXT,
      clasificado  BOOLEAN      NOT NULL DEFAULT FALSE,
      "creadoEn"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "creadoPor"  TEXT,
      CONSTRAINT "captura_rapida_creadoPor_fkey"
        FOREIGN KEY ("creadoPor") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS "captura_rapida_clasificado_creadoEn_idx" ON captura_rapida(clasificado, "creadoEn")`;
  console.log("  ✅ captura_rapida");

  // ── ideas ─────────────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS ideas (
      id           TEXT         NOT NULL PRIMARY KEY,
      titulo       TEXT         NOT NULL,
      nota         TEXT,
      area         TEXT,
      tipo         TEXT,
      estado       TEXT         NOT NULL DEFAULT 'activa',
      "convertidaA" TEXT,
      "creadoEn"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "creadoPor"  TEXT,
      CONSTRAINT "ideas_creadoPor_fkey"
        FOREIGN KEY ("creadoPor") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS "ideas_estado_creadoEn_idx" ON ideas(estado, "creadoEn")`;
  console.log("  ✅ ideas");

  // ── iniciativas ───────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS iniciativas (
      id           TEXT         NOT NULL PRIMARY KEY,
      titulo       TEXT         NOT NULL,
      descripcion  TEXT,
      area         TEXT,
      responsable  TEXT,
      estado       TEXT         NOT NULL DEFAULT 'planeando',
      "fechaLimite" TIMESTAMP(3),
      notas        TEXT,
      "creadoEn"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "creadoPor"  TEXT,
      CONSTRAINT "iniciativas_creadoPor_fkey"
        FOREIGN KEY ("creadoPor") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS "iniciativas_estado_creadoEn_idx" ON iniciativas(estado, "creadoEn")`;
  console.log("  ✅ iniciativas");

  // ── subtareas_iniciativa ──────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS subtareas_iniciativa (
      id             TEXT    NOT NULL PRIMARY KEY,
      "iniciativaId" TEXT    NOT NULL,
      titulo         TEXT    NOT NULL,
      completada     BOOLEAN NOT NULL DEFAULT FALSE,
      orden          INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "subtareas_iniciativa_iniciativaId_fkey"
        FOREIGN KEY ("iniciativaId") REFERENCES iniciativas(id) ON DELETE CASCADE ON UPDATE CASCADE
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS "subtareas_iniciativa_iniciativaId_orden_idx" ON subtareas_iniciativa("iniciativaId", orden)`;
  console.log("  ✅ subtareas_iniciativa");

  // ── registrar en _prisma_migrations para que prisma no re-aplique ─────────
  const migName = "20260531000000_add_captura_ideas_iniciativas";
  const exists = await sql`SELECT id FROM _prisma_migrations WHERE migration_name = ${migName} LIMIT 1`;
  if (exists.length === 0) {
    await sql`
      INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES (
        gen_random_uuid()::text,
        'manual_http_migration',
        NOW(), ${migName}, NULL, NULL, NOW(), 1
      )
    `;
    console.log("  ✅ Registrada en _prisma_migrations");
  } else {
    console.log("  ℹ️  Ya estaba en _prisma_migrations");
  }

  console.log("\n🎉 Migración completada — 4 tablas listas");
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
