import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  // Bandeja de entrada de prospectos: capturas crudas pegadas desde notas del iPhone,
  // que luego se categorizan y se trasladan a la lista de prospectos (Cliente).
  await sql.query(`
    CREATE TABLE IF NOT EXISTS "entradas_prospecto" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "textoOriginal" TEXT NOT NULL,
      "nombre" TEXT,
      "empresa" TEXT,
      "telefono" TEXT,
      "correo" TEXT,
      "perfilesProspecto" TEXT,
      "origenLead" TEXT,
      "notas" TEXT,
      "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
      "clienteId" TEXT,
      "capturadoPor" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Marca "por contactar" en la lista de prospectos (Cliente sin @map → camelCase citado).
  await sql.query(`ALTER TABLE clientes ADD COLUMN IF NOT EXISTS "porContactar" BOOLEAN NOT NULL DEFAULT false`);
  await sql.query(`ALTER TABLE clientes ADD COLUMN IF NOT EXISTS "contactarDesde" TIMESTAMP(3)`);

  const cols = await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='clientes' AND column_name IN ('porContactar','contactarDesde') ORDER BY column_name`
  );
  const tabla = await sql.query(`SELECT to_regclass('public.entradas_prospecto') AS t`);
  console.log("OK clientes cols:", cols.map((r: any) => r.column_name).join(", "));
  console.log("OK tabla entradas_prospecto:", tabla[0]?.t);
}
main().catch((e) => { console.error(e); process.exit(1); });
