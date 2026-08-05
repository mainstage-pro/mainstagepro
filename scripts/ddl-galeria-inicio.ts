import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);
async function main() {
  await sql.query(`CREATE TABLE IF NOT EXISTS fotos_galeria_inicio (
    "id" TEXT PRIMARY KEY,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now())`);
  const t = await sql.query(`SELECT table_name FROM information_schema.tables WHERE table_name = 'fotos_galeria_inicio'`);
  console.log("OK tabla:", t.map((r: any) => r.table_name).join(", ") || "(no creada)");
}
main().catch((e) => { console.error(e); process.exit(1); });
