import { neon } from "@neondatabase/serverless";

const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  // tecnicos: modelo sin @map, columnas en camelCase citado
  await sql.query(`ALTER TABLE tecnicos ADD COLUMN IF NOT EXISTS "banco" TEXT`);
  await sql.query(`ALTER TABLE tecnicos ADD COLUMN IF NOT EXISTS "titularCuenta" TEXT`);
  await sql.query(`ALTER TABLE tecnicos ADD COLUMN IF NOT EXISTS "clabe" TEXT`);
  await sql.query(`ALTER TABLE tecnicos ADD COLUMN IF NOT EXISTS "noTarjeta" TEXT`);

  await sql.query(`ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS "titularCuenta" TEXT`);

  // personal_interno: modelo con @map, columnas en snake_case
  await sql.query(`ALTER TABLE personal_interno ADD COLUMN IF NOT EXISTS titular_cuenta TEXT`);

  const check = await sql.query(
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE (table_name='tecnicos' AND column_name IN ('banco','titularCuenta','clabe','noTarjeta','cuentaBancaria'))
        OR (table_name='proveedores' AND column_name='titularCuenta')
        OR (table_name='personal_interno' AND column_name='titular_cuenta')
     ORDER BY table_name, column_name`,
  );
  console.log(check.map((r: Record<string, string>) => `${r.table_name}.${r.column_name}`).join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
