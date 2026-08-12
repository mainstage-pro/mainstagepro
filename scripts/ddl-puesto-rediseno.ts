import { neon } from "@neondatabase/serverless";
// DDL aditivo del rediseño del registro de Puesto y la Evaluación (§1–§10).
// Correr contra prod ANTES del deploy:  ENV_FILE=.env.prod.backup npx tsx scripts/ddl-puesto-rediseno.ts
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const STMTS = [
  // Rediseño del registro de puesto (§1–§9)
  `ALTER TABLE puestos ADD COLUMN IF NOT EXISTS descripcion_puesto TEXT`,
  `ALTER TABLE puestos ADD COLUMN IF NOT EXISTS objetivo_puesto TEXT`,
  `ALTER TABLE puestos ADD COLUMN IF NOT EXISTS coordina_con_data TEXT`,
  `ALTER TABLE puestos ADD COLUMN IF NOT EXISTS estandares_minimos TEXT`,
  `ALTER TABLE puestos ADD COLUMN IF NOT EXISTS valores TEXT`,
  `ALTER TABLE puestos ADD COLUMN IF NOT EXISTS aptitudes TEXT`,
  `ALTER TABLE puestos ADD COLUMN IF NOT EXISTS conocimientos TEXT`,
  `ALTER TABLE puestos ADD COLUMN IF NOT EXISTS prestaciones_otro TEXT`,
  `ALTER TABLE puestos ADD COLUMN IF NOT EXISTS jornada TEXT`,
  `ALTER TABLE puestos ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE puestos ADD COLUMN IF NOT EXISTS legacy_data TEXT`,
  // KPIs del puesto (§4)
  `ALTER TABLE pt_kpis ADD COLUMN IF NOT EXISTS puesto_id TEXT`,
  `ALTER TABLE pt_kpis ADD COLUMN IF NOT EXISTS resultado_esperado TEXT`,
  `ALTER TABLE pt_kpis ADD COLUMN IF NOT EXISTS unidad TEXT`,
  `ALTER TABLE pt_kpis ADD COLUMN IF NOT EXISTS frecuencia TEXT`,
  `ALTER TABLE pt_kpis ADD COLUMN IF NOT EXISTS es_fijo_plan BOOLEAN NOT NULL DEFAULT false`,
  `CREATE INDEX IF NOT EXISTS pt_kpis_puesto_id_idx ON pt_kpis(puesto_id)`,
  // Evaluación reestructurada (§7/§8/§9)
  `ALTER TABLE evaluaciones_empleado ADD COLUMN IF NOT EXISTS puesto_id TEXT`,
  `ALTER TABLE evaluaciones_empleado ADD COLUMN IF NOT EXISTS puesto_snapshot TEXT`,
  `ALTER TABLE evaluaciones_empleado ADD COLUMN IF NOT EXISTS puesto_version INTEGER`,
  `ALTER TABLE evaluaciones_empleado ADD COLUMN IF NOT EXISTS mes_generado TEXT`,
  `ALTER TABLE evaluaciones_empleado ADD COLUMN IF NOT EXISTS resultados_data TEXT`,
  `ALTER TABLE evaluaciones_empleado ADD COLUMN IF NOT EXISTS estandares_min_data TEXT`,
  `ALTER TABLE evaluaciones_empleado ADD COLUMN IF NOT EXISTS perfil_competencias TEXT`,
  `ALTER TABLE evaluaciones_empleado ADD COLUMN IF NOT EXISTS calificacion_calculada TEXT`,
  `ALTER TABLE evaluaciones_empleado ADD COLUMN IF NOT EXISTS ajuste_justificacion TEXT`,
  // Vínculo a la subárea del maestro (por si faltara)
  `ALTER TABLE puestos ADD COLUMN IF NOT EXISTS sub_area_id TEXT`,
  // Catálogos de configuración del registro de puesto
  `CREATE TABLE IF NOT EXISTS catalogo_prestaciones (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, orden INTEGER NOT NULL DEFAULT 0, activo BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS valores_empresa (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, descripcion TEXT, orden INTEGER NOT NULL DEFAULT 0, activo BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS catalogo_aptitudes (id TEXT PRIMARY KEY, nombre TEXT NOT NULL UNIQUE, "createdAt" TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS catalogo_conocimientos (id TEXT PRIMARY KEY, nombre TEXT NOT NULL UNIQUE, "createdAt" TIMESTAMP NOT NULL DEFAULT now())`,
];

async function main() {
  for (const stmt of STMTS) {
    await sql.query(stmt);
    console.log("OK", stmt.slice(0, 72));
  }
  const cols = await sql.query(`SELECT column_name FROM information_schema.columns WHERE table_name='puestos' AND column_name IN ('descripcion_puesto','objetivo_puesto','valores','aptitudes','conocimientos','jornada','version','estandares_minimos') ORDER BY column_name`);
  console.log("puestos nuevas:", cols.map((r: any) => r.column_name).join(", "));
  const ev = await sql.query(`SELECT column_name FROM information_schema.columns WHERE table_name='evaluaciones_empleado' AND column_name LIKE '%data' ORDER BY column_name`);
  console.log("evaluaciones nuevas:", ev.map((r: any) => r.column_name).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
