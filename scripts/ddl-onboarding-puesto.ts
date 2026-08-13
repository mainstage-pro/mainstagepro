// DDL aditivo para el onboarding por puesto (patrón Neon HTTP, correr ANTES del push).
//   ENV_FILE=.env.prod.backup npx tsx scripts/ddl-onboarding-puesto.ts
// Idempotente: solo agrega columnas/índices, nunca borra datos.
import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  // Config de onboarding en el puesto
  await sql.query(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS onboarding_modulos TEXT`);
  await sql.query(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS onboarding_capacitaciones TEXT`);
  // Onboarding instanciado por persona (reusa onboarding_planes)
  await sql.query(`ALTER TABLE onboarding_planes ADD COLUMN IF NOT EXISTS personal_id TEXT`);
  await sql.query(`ALTER TABLE onboarding_planes ADD COLUMN IF NOT EXISTS puesto_id TEXT`);
  await sql.query(`ALTER TABLE onboarding_planes ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'PUESTO'`);
  await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS onboarding_planes_personal_id_key ON onboarding_planes(personal_id)`);

  const cols = await sql.query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE (table_name = 'puestos' AND column_name IN ('onboarding_modulos','onboarding_capacitaciones'))
       OR (table_name = 'onboarding_planes' AND column_name IN ('personal_id','puesto_id','origen'))
    ORDER BY table_name, column_name`);
  console.log("OK columnas:", cols.map((r: any) => `${r.table_name}.${r.column_name}`).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
