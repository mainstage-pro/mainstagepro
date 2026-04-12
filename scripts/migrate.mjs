import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf-8");
const match = env.match(/DATABASE_URL="([^"]+)"/);
if (!match) throw new Error("DATABASE_URL not found");
const url = match[1].replace(/&channel_binding=require/, "");

const sql = neon(url);

async function run(query, desc) {
  try {
    await sql.query(query);
    console.log(`✓ ${desc}`);
  } catch (e) {
    const msg = e.message ?? String(e);
    if (msg.includes("already exists") || msg.includes("duplicate column")) {
      console.log(`⚠ Ya existe: ${desc}`);
    } else {
      console.log(`✗ Error en ${desc}: ${msg}`);
    }
  }
}

await run(
  `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "tipoProspecto" TEXT NOT NULL DEFAULT 'ACTIVO'`,
  "tratos.tipoProspecto"
);

await run(
  `UPDATE tratos SET "tipoProspecto" = 'NURTURING', "canalAtencion" = NULL WHERE "canalAtencion" = 'PROSPECTO_FRIO'`,
  "migrar PROSPECTO_FRIO → tipoProspecto NURTURING"
);

await run(
  `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "marketingData" TEXT`,
  "proyectos.marketingData"
);

// ─── MÓDULO OPERACIONES ───────────────────────────────────────────────────────

await run(`
  CREATE TABLE IF NOT EXISTS "iniciativas_externas" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "nombre"      TEXT NOT NULL,
    "descripcion" TEXT,
    "area"        TEXT NOT NULL DEFAULT 'GENERAL',
    "estado"      TEXT NOT NULL DEFAULT 'ACTIVA',
    "color"       TEXT,
    "creadoPorId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin"    TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`, "CREATE TABLE iniciativas_externas");

await run(`
  CREATE TABLE IF NOT EXISTS "tareas" (
    "id"               TEXT NOT NULL PRIMARY KEY,
    "titulo"           TEXT NOT NULL,
    "descripcion"      TEXT,
    "prioridad"        TEXT NOT NULL DEFAULT 'MEDIA',
    "area"             TEXT NOT NULL DEFAULT 'GENERAL',
    "estado"           TEXT NOT NULL DEFAULT 'PENDIENTE',
    "asignadoAId"      TEXT REFERENCES "users"("id") ON DELETE SET NULL,
    "creadoPorId"      TEXT REFERENCES "users"("id") ON DELETE SET NULL,
    "iniciativaId"     TEXT REFERENCES "iniciativas_externas"("id") ON DELETE SET NULL,
    "fechaVencimiento" TIMESTAMP(3),
    "fechaCompletada"  TIMESTAMP(3),
    "notas"            TEXT,
    "etiquetas"        TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`, "CREATE TABLE tareas");

console.log("Migración completada.");
