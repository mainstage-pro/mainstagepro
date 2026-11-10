import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: process.env.ENVF || ".env.prod.backup" });
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  await sql.query(`ALTER TABLE proyectos_creativos ADD COLUMN IF NOT EXISTS "briefDetalle" TEXT`);
  await sql.query(`ALTER TABLE proyectos_creativos ADD COLUMN IF NOT EXISTS "formToken" TEXT`);
  await sql.query(`ALTER TABLE proyectos_creativos ADD COLUMN IF NOT EXISTS "formEstado" TEXT DEFAULT 'PENDIENTE'`);
  await sql.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS "proyectos_creativos_formToken_key" ON proyectos_creativos ("formToken")`,
  );

  await sql.query(`
    CREATE TABLE IF NOT EXISTS proyecto_creativo_archivos (
      id TEXT PRIMARY KEY,
      "proyectoCreativoId" TEXT NOT NULL REFERENCES proyectos_creativos(id) ON DELETE CASCADE,
      nombre TEXT NOT NULL,
      url TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'REFERENCIA',
      "subidoPor" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
    )
  `);

  const cols = await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='proyectos_creativos' AND column_name IN ('briefDetalle','formToken','formEstado')`,
  );
  console.log("OK proyectos_creativos:", cols.map((r: Record<string, string>) => r.column_name).join(", "));

  const tabla = await sql.query(
    `SELECT table_name FROM information_schema.tables WHERE table_name = 'proyecto_creativo_archivos'`,
  );
  console.log("OK tabla:", tabla.map((r: Record<string, string>) => r.table_name).join(", "));
}

main().catch((e) => { console.error(e); process.exit(1); });
