import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);
async function main() {
  await sql.query(`ALTER TABLE "paquetes" ADD COLUMN IF NOT EXISTS "adicionalesSugeridos" TEXT`);
  const c = await sql.query(`SELECT column_name FROM information_schema.columns WHERE table_name='paquetes' AND column_name='adicionalesSugeridos'`);
  console.log("OK columna paquetes.adicionalesSugeridos:", c.length === 1 ? "presente" : "FALTA");
}
main().catch((e) => { console.error(e); process.exit(1); });
