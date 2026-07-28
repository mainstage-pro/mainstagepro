import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

// DDL aditivo e idempotente para el sistema de faltas y actas administrativas.
// Correr contra producción ANTES del deploy (las columnas nuevas de
// tipos_incidencia se leen desde rutas ya existentes).
async function main() {
  // Metadatos del catálogo en la tabla EXISTENTE.
  await sql.query(`ALTER TABLE tipos_incidencia ADD COLUMN IF NOT EXISTS codigo TEXT`);
  await sql.query(`ALTER TABLE tipos_incidencia ADD COLUMN IF NOT EXISTS gravedad TEXT NOT NULL DEFAULT 'LEVE'`);
  await sql.query(`ALTER TABLE tipos_incidencia ADD COLUMN IF NOT EXISTS deteccion TEXT NOT NULL DEFAULT 'MANUAL'`);
  await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS "tipos_incidencia_codigo_key" ON tipos_incidencia (codigo)`);

  // Tabla nueva y aislada.
  await sql.query(`
    CREATE TABLE IF NOT EXISTS actas_administrativas (
      id TEXT PRIMARY KEY,
      folio TEXT NOT NULL UNIQUE,
      personal_id TEXT NOT NULL REFERENCES personal_interno(id) ON DELETE CASCADE,
      tipo_id TEXT REFERENCES tipos_incidencia(id) ON DELETE SET NULL,
      puesto_id TEXT,
      gravedad TEXT NOT NULL DEFAULT 'LEVE',
      fecha TIMESTAMP(3) NOT NULL,
      hechos TEXT NOT NULL,
      evidencia_url TEXT,
      nivel_escalon INTEGER NOT NULL DEFAULT 1,
      consecuencia TEXT NOT NULL,
      monto_descuento DOUBLE PRECISION,
      incidencia_id TEXT UNIQUE,
      descargo TEXT,
      levantada_por TEXT,
      estado TEXT NOT NULL DEFAULT 'ABIERTA',
      token TEXT NOT NULL UNIQUE,
      aceptada BOOLEAN NOT NULL DEFAULT false,
      aceptada_nombre TEXT,
      aceptada_en TIMESTAMP(3),
      aceptada_ip TEXT,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await sql.query(`CREATE INDEX IF NOT EXISTS "actas_administrativas_personal_id_idx" ON actas_administrativas (personal_id)`);

  const t = await sql.query(`SELECT column_name FROM information_schema.columns WHERE table_name='tipos_incidencia' AND column_name IN ('codigo','gravedad','deteccion')`);
  const a = await sql.query(`SELECT to_regclass('public.actas_administrativas') AS tabla`);
  console.log("OK tipos_incidencia:", t.map((r: any) => r.column_name).join(", "));
  console.log("OK actas_administrativas:", a[0]?.tabla);
}
main().catch((e) => { console.error(e); process.exit(1); });
