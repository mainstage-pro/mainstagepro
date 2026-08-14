import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);
async function main() {
  // Tratamiento visual del equipo para el módulo de diseño:
  //   "png-transparente" → recorte sin fondo, se estampa sobre la composición.
  //   "foto-marco"       → foto rectangular, va dentro de un marco/tarjeta.
  // null = sin clasificar (el sistema lo propone por canal alfa, el usuario corrige).
  await sql.query(`ALTER TABLE equipos ADD COLUMN IF NOT EXISTS "tratamiento" TEXT`);
  const rows = await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='equipos' AND column_name='tratamiento'`
  );
  console.log("OK equipos tratamiento col:", rows.map((r: any) => r.column_name).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
