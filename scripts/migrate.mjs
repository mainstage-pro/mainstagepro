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

console.log("Migración completada.");
