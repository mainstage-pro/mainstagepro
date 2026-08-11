import { neon } from "@neondatabase/serverless";
import { writeFileSync } from "fs";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);
async function main() {
  const plantillas = await sql.query(`SELECT * FROM "plantillas_cotizacion" ORDER BY "createdAt" DESC`).catch(() => []);
  const lineas = await sql.query(`SELECT * FROM "plantilla_cotizacion_lineas" ORDER BY "orden" ASC`).catch(() => []);
  const fecha = new Date().toISOString().replace(/[:.]/g, "-");
  const path = `scripts/_backup-plantillas-${fecha}.json`;
  writeFileSync(path, JSON.stringify({ exportadoEn: new Date().toISOString(), plantillas, lineas }, null, 2));
  console.log(`OK ${plantillas.length} plantillas, ${lineas.length} líneas → ${path}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
