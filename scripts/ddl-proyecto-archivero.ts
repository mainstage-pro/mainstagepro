import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: process.env.ENV_FILE || ".env.prod.backup" });

// Archivero del proyecto: escenarioId (de qué escenario es el archivo) y tamanoBytes.
// Ambas quedan declaradas en schema.prisma → Prisma las pide en cualquier lectura de
// proyecto_archivos sin select, así que el DDL aditivo va a prod ANTES del deploy.
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  await sql.query(
    `ALTER TABLE proyecto_archivos ADD COLUMN IF NOT EXISTS "escenarioId" TEXT REFERENCES proyecto_escenarios(id) ON DELETE SET NULL`
  );
  await sql.query(`ALTER TABLE proyecto_archivos ADD COLUMN IF NOT EXISTS "tamanoBytes" INTEGER`);
  await sql.query(
    `CREATE INDEX IF NOT EXISTS "proyecto_archivos_proyectoId_idx" ON proyecto_archivos ("proyectoId")`
  );
  const rows = await sql.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_name='proyecto_archivos' AND column_name IN ('escenarioId','tamanoBytes')`
  );
  console.log("OK proyecto_archivos:", rows.map((r: { column_name: string }) => r.column_name).join(", ") || "FALTAN");
}
main().catch((e) => { console.error(e); process.exit(1); });
