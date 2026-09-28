import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);
async function main() {
  await sql.query(`ALTER TABLE proveedores_evento ADD COLUMN IF NOT EXISTS "imprevisto" BOOLEAN NOT NULL DEFAULT false`);
  await sql.query(`ALTER TABLE proveedores_evento ADD COLUMN IF NOT EXISTS "fechaSolicitud" TIMESTAMP(3)`);
  await sql.query(`ALTER TABLE proveedores_evento ADD COLUMN IF NOT EXISTS "solicitadoPor" TEXT`);
  await sql.query(`ALTER TABLE proveedores_evento ADD COLUMN IF NOT EXISTS "unidades" INTEGER`);
  const rows = await sql.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_name='proveedores_evento'
       AND column_name IN ('imprevisto','fechaSolicitud','solicitadoPor','unidades')
     ORDER BY column_name`
  );
  console.log("OK proveedores_evento:", rows.map((r: any) => `${r.column_name}:${r.data_type}`).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
