import { neon } from "@neondatabase/serverless";

const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  await sql.query(
    `ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS "eventoConfirmado" BOOLEAN NOT NULL DEFAULT false`
  );
  const rows = await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='cotizaciones' AND column_name='eventoConfirmado'`
  );
  console.log("OK cotizaciones.eventoConfirmado:", rows.length ? "existe" : "FALTA");
}
main().catch((e) => { console.error(e); process.exit(1); });
