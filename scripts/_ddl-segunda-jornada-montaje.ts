/**
 * DDL aditivo: segundo bloque de horario de montaje en Proyecto.
 *
 * Mismo día u otro día, sin llamado ni lugar propios — solo horario.
 */
import { config } from "dotenv";
config({ path: process.env.ENV_FILE || ".env.prod.backup" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  await sql`
    ALTER TABLE proyectos
      ADD COLUMN IF NOT EXISTS "segundaJornadaMontaje" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "fechaMontaje2" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "horaInicioMontaje2" TEXT,
      ADD COLUMN IF NOT EXISTS "duracionMontajeHrs2" DOUBLE PRECISION
  `;

  const [{ count }] = await sql<{ count: string }[]>`SELECT COUNT(*) FROM proyectos`;
  console.log(`OK — columnas agregadas. proyectos tiene ${count} filas.`);
}

main().catch(e => { console.error(e); process.exit(1); });
