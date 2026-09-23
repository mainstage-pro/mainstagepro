import { neon } from "@neondatabase/serverless";

const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  await sql.query(
    `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "fechaApartada" BOOLEAN NOT NULL DEFAULT false`
  );
  const rows = await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='tratos' AND column_name='fechaApartada'`
  );
  console.log("OK tratos.fechaApartada:", rows.length ? "existe" : "FALTA");
}
main().catch((e) => { console.error(e); process.exit(1); });
