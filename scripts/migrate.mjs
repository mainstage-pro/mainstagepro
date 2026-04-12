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

// ─── MÓDULO OPERACIONES v2: jerarquía, recurrencia, comentarios, archivos ────

await run(`CREATE TABLE IF NOT EXISTS "tarea_carpetas" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "nombre"      TEXT NOT NULL,
  "color"       TEXT,
  "icono"       TEXT,
  "orden"       INTEGER NOT NULL DEFAULT 0,
  "creadoPorId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`, "CREATE TABLE tarea_carpetas");

await run(`CREATE TABLE IF NOT EXISTS "tarea_proyectos" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "nombre"      TEXT NOT NULL,
  "descripcion" TEXT,
  "color"       TEXT,
  "icono"       TEXT,
  "orden"       INTEGER NOT NULL DEFAULT 0,
  "archivado"   BOOLEAN NOT NULL DEFAULT FALSE,
  "carpetaId"   TEXT REFERENCES "tarea_carpetas"("id") ON DELETE SET NULL,
  "creadoPorId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`, "CREATE TABLE tarea_proyectos");

await run(`CREATE TABLE IF NOT EXISTS "tarea_secciones" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "nombre"     TEXT NOT NULL,
  "orden"      INTEGER NOT NULL DEFAULT 0,
  "colapsada"  BOOLEAN NOT NULL DEFAULT FALSE,
  "proyectoId" TEXT NOT NULL REFERENCES "tarea_proyectos"("id") ON DELETE CASCADE,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`, "CREATE TABLE tarea_secciones");

await run(`CREATE TABLE IF NOT EXISTS "tarea_comentarios" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "contenido" TEXT NOT NULL,
  "tareaId"   TEXT NOT NULL REFERENCES "tareas"("id") ON DELETE CASCADE,
  "autorId"   TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`, "CREATE TABLE tarea_comentarios");

await run(`CREATE TABLE IF NOT EXISTS "tarea_archivos" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "nombre"      TEXT NOT NULL,
  "url"         TEXT NOT NULL,
  "tipo"        TEXT,
  "tamano"      INTEGER,
  "tareaId"     TEXT NOT NULL REFERENCES "tareas"("id") ON DELETE CASCADE,
  "subidoPorId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`, "CREATE TABLE tarea_archivos");

// Extend tareas table
await run(`ALTER TABLE tareas ADD COLUMN IF NOT EXISTS "carpetaId"       TEXT REFERENCES "tarea_carpetas"("id")  ON DELETE SET NULL`, "tareas.carpetaId");
await run(`ALTER TABLE tareas ADD COLUMN IF NOT EXISTS "proyectoTareaId" TEXT REFERENCES "tarea_proyectos"("id") ON DELETE SET NULL`, "tareas.proyectoTareaId");
await run(`ALTER TABLE tareas ADD COLUMN IF NOT EXISTS "seccionId"       TEXT REFERENCES "tarea_secciones"("id") ON DELETE SET NULL`, "tareas.seccionId");
await run(`ALTER TABLE tareas ADD COLUMN IF NOT EXISTS "parentId"        TEXT REFERENCES "tareas"("id")          ON DELETE CASCADE`,   "tareas.parentId");
await run(`ALTER TABLE tareas ADD COLUMN IF NOT EXISTS "fecha"           TIMESTAMP(3)`,                                                "tareas.fecha");
await run(`ALTER TABLE tareas ADD COLUMN IF NOT EXISTS "recurrencia"     TEXT`,                                                        "tareas.recurrencia");
await run(`ALTER TABLE tareas ADD COLUMN IF NOT EXISTS "orden"           INTEGER NOT NULL DEFAULT 0`,                                  "tareas.orden");

console.log("Migración completada.");
