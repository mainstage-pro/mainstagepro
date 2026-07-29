import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);
async function main() {
  // Columnas camelCase citadas (el modelo Prisma no usa @map para estos campos).
  await sql.query(`ALTER TABLE evaluaciones_empleado ADD COLUMN IF NOT EXISTS "acuerdos" TEXT`);
  await sql.query(`ALTER TABLE evaluaciones_empleado ADD COLUMN IF NOT EXISTS "puntajeGeneral" DOUBLE PRECISION`);
  await sql.query(`ALTER TABLE evaluaciones_empleado ADD COLUMN IF NOT EXISTS "puntajePuesto" DOUBLE PRECISION`);
  const rows = await sql.query(`SELECT column_name FROM information_schema.columns WHERE table_name='evaluaciones_empleado' AND column_name IN ('acuerdos','puntajeGeneral','puntajePuesto') ORDER BY column_name`);
  console.log("OK evaluaciones_empleado cols:", rows.map((r: any) => r.column_name).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
