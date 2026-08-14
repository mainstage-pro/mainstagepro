import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);
async function main() {
  const total = await sql.query(`SELECT COUNT(*)::int n FROM equipos WHERE activo = true`);
  const conImg = await sql.query(`SELECT COUNT(*)::int n FROM equipos WHERE activo = true AND "imagenUrl" IS NOT NULL AND "imagenUrl" <> ''`);
  const sample = await sql.query(
    `SELECT id, LEFT("imagenUrl", 60) img FROM equipos WHERE activo = true AND "imagenUrl" IS NOT NULL AND "imagenUrl" <> '' LIMIT 8`
  );
  console.log("activos:", total[0].n, "con imagen:", conImg[0].n);
  for (const r of sample as any[]) console.log("-", r.img);
}
main().catch((e) => { console.error(e); process.exit(1); });
