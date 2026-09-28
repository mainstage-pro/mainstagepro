import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  await sql.query(
    `ALTER TABLE proveedores_evento ADD COLUMN IF NOT EXISTS "tipoAcreedor" TEXT NOT NULL DEFAULT 'PROVEEDOR'`
  );
  await sql.query(`ALTER TABLE proveedores_evento ADD COLUMN IF NOT EXISTS "tecnicoId" TEXT`);
  await sql.query(`ALTER TABLE proveedores_evento ADD COLUMN IF NOT EXISTS "personalId" TEXT`);
  await sql.query(`
    DO $$ BEGIN
      ALTER TABLE proveedores_evento ADD CONSTRAINT "proveedores_evento_tecnicoId_fkey"
        FOREIGN KEY ("tecnicoId") REFERENCES tecnicos(id) ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await sql.query(`
    DO $$ BEGIN
      ALTER TABLE proveedores_evento ADD CONSTRAINT "proveedores_evento_personalId_fkey"
        FOREIGN KEY ("personalId") REFERENCES personal_interno(id) ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  const rows = await sql.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_name='proveedores_evento'
       AND column_name IN ('tipoAcreedor','tecnicoId','personalId')
     ORDER BY column_name`
  );
  console.log("OK proveedores_evento:", rows.map((r: any) => `${r.column_name}:${r.data_type}`).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
