/**
 * DDL aditivo para Reclutamiento de Producción Fase 3 (§7 del spec).
 *
 * Solo ALTER TABLE ... ADD COLUMN IF NOT EXISTS sobre tablas existentes
 * (puestos, roles_tecnicos). Columnas en snake_case sin comillas porque
 * ambos modelos usan @map/@@map.
 *
 * Correr con: npx tsx scripts/ddl-reclutamiento-fase3.ts
 */
import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";

function urlDeProd(): string {
  const env = readFileSync(".env.prod.backup", "utf8");
  const linea = env.split("\n").find((l) => l.startsWith("DATABASE_URL="));
  if (!linea) throw new Error("No hay DATABASE_URL en .env.prod.backup");
  return linea.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
}

async function main() {
  const sql = neon(urlDeProd());

  await sql`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS criterios_exclusion TEXT`;
  await sql`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS vacante_abierta BOOLEAN NOT NULL DEFAULT false`;

  await sql`ALTER TABLE roles_tecnicos ADD COLUMN IF NOT EXISTS perfil TEXT`;
  await sql`ALTER TABLE roles_tecnicos ADD COLUMN IF NOT EXISTS tarifa_pendiente BOOLEAN NOT NULL DEFAULT false`;

  const columnas = await sql`
    SELECT table_name, column_name FROM information_schema.columns
     WHERE table_schema = 'public'
       AND (
         (table_name = 'puestos' AND column_name IN ('criterios_exclusion', 'vacante_abierta'))
         OR (table_name = 'roles_tecnicos' AND column_name IN ('perfil', 'tarifa_pendiente'))
       )
     ORDER BY table_name, column_name`;
  console.log("columnas creadas o ya existentes:");
  for (const c of columnas) console.log("  ·", c.table_name, "/", c.column_name);
}

main().catch((e) => { console.error(e); process.exit(1); });
