// DDL aditivo e idempotente para el expediente 360 del empleado (campos fiscales,
// baja, jefe directo y solicitudes de vacaciones). Se corre contra PROD ANTES del push.
//   ENV_FILE=.env.prod.backup npx tsx scripts/ddl-expediente-empleado.ts
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const envFile = process.env.ENV_FILE || ".env.prod.backup";
try {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
  console.log(`env cargado de ${envFile}`);
} catch {
  console.log(`(no se pudo leer ${envFile}, uso process.env actual)`);
}

const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  // Fase 1: columnas nuevas en personal_interno (aditivo, idempotente)
  const cols: [string, string][] = [
    ["rfc", "TEXT"],
    ["curp", "TEXT"],
    ["nss", "TEXT"],
    ["fecha_nacimiento", "TIMESTAMP(3)"],
    ["estado_civil", "TEXT"],
    ["foto_url", "TEXT"],
    ["fecha_baja", "TIMESTAMP(3)"],
    ["motivo_baja", "TEXT"],
    ["jefe_id", "TEXT"],
  ];
  for (const [col, tipo] of cols) {
    await sql.query(`ALTER TABLE personal_interno ADD COLUMN IF NOT EXISTS ${col} ${tipo}`);
  }

  // Fase 3: tabla de solicitudes de vacaciones
  await sql.query(`CREATE TABLE IF NOT EXISTS solicitudes_vacaciones (
    id TEXT PRIMARY KEY,
    personal_id TEXT NOT NULL,
    fecha_inicio TIMESTAMP(3) NOT NULL,
    fecha_fin TIMESTAMP(3) NOT NULL,
    dias DOUBLE PRECISION NOT NULL,
    estado TEXT NOT NULL DEFAULT 'PENDIENTE',
    motivo TEXT,
    aprobada_por TEXT,
    aprobada_en TIMESTAMP(3),
    created_at TIMESTAMP(3) NOT NULL DEFAULT now()
  )`);
  await sql.query(`CREATE INDEX IF NOT EXISTS solicitudes_vacaciones_personal_id_idx ON solicitudes_vacaciones(personal_id)`);

  const pi = await sql.query(`SELECT column_name FROM information_schema.columns WHERE table_name='personal_interno' ORDER BY ordinal_position`);
  console.log("OK personal_interno:", pi.map((r: any) => r.column_name).join(", "));
  const sv = await sql.query(`SELECT column_name FROM information_schema.columns WHERE table_name='solicitudes_vacaciones' ORDER BY ordinal_position`);
  console.log("OK solicitudes_vacaciones:", sv.map((r: any) => r.column_name).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
