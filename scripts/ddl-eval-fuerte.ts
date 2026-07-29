import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

// Columnas nuevas de la evaluación "fuerte" (objetivos, notas, calificación final,
// autoevaluación 180° por token, firma del colaborador). Aditivas e idempotentes.
// Modelo Prisma sin @map => columnas en camelCase citado (NO snake_case).
const T = `"evaluaciones_empleado"`;

async function main() {
  await sql.query(`ALTER TABLE ${T} ADD COLUMN IF NOT EXISTS "objetivos" TEXT`);
  await sql.query(`ALTER TABLE ${T} ADD COLUMN IF NOT EXISTS "competenciaNotas" TEXT`);
  await sql.query(`ALTER TABLE ${T} ADD COLUMN IF NOT EXISTS "calificacionFinal" TEXT`);
  await sql.query(`ALTER TABLE ${T} ADD COLUMN IF NOT EXISTS "autoToken" TEXT`);
  await sql.query(`ALTER TABLE ${T} ADD COLUMN IF NOT EXISTS "autoEstado" TEXT NOT NULL DEFAULT 'PENDIENTE'`);
  await sql.query(`ALTER TABLE ${T} ADD COLUMN IF NOT EXISTS "autoData" TEXT`);
  await sql.query(`ALTER TABLE ${T} ADD COLUMN IF NOT EXISTS "autoEnviadaEn" TIMESTAMP(3)`);
  await sql.query(`ALTER TABLE ${T} ADD COLUMN IF NOT EXISTS "firmada" BOOLEAN NOT NULL DEFAULT false`);
  await sql.query(`ALTER TABLE ${T} ADD COLUMN IF NOT EXISTS "firmadaEn" TIMESTAMP(3)`);
  await sql.query(`ALTER TABLE ${T} ADD COLUMN IF NOT EXISTS "firmadaNombre" TEXT`);
  await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS "evaluaciones_empleado_autoToken_key" ON ${T} ("autoToken")`);

  const rows = await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='evaluaciones_empleado' AND column_name IN ('objetivos','competenciaNotas','calificacionFinal','autoToken','autoEstado','autoData','autoEnviadaEn','firmada','firmadaEn','firmadaNombre') ORDER BY column_name`,
  );
  console.log("OK evaluaciones_empleado cols:", rows.map((r: any) => r.column_name).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
