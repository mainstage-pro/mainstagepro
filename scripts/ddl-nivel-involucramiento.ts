import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: process.env.ENVF || ".env.prod.backup" });
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

// El nivel de involucramiento viajaba dentro de serviciosInteres como DT_ASESOR /
// DT_PARCIAL / DT_INTEGRAL. Es un nivel, no un servicio: sale a su propia columna.
const BACKFILL: Array<[string, string]> = [
  ["DT_ASESOR", "ASESORIA"],
  ["DT_PARCIAL", "COORDINACION_PARCIAL"],
  ["DT_INTEGRAL", "DIRECCION_INTEGRAL"],
];

async function main() {
  await sql.query(`ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "nivelInvolucramiento" TEXT`);

  for (const [codigo, nivel] of BACKFILL) {
    const r = await sql.query(
      `UPDATE tratos SET "nivelInvolucramiento" = $1
       WHERE "nivelInvolucramiento" IS NULL AND "serviciosInteres" LIKE $2`,
      [nivel, `%${codigo}%`],
    );
    console.log(`  ${codigo} → ${nivel}:`, (r as unknown[]).length === 0 ? "aplicado" : r);
  }

  const rows = await sql.query(
    `SELECT "nivelInvolucramiento" AS nivel, count(*)::int AS n FROM tratos
     WHERE "nivelInvolucramiento" IS NOT NULL GROUP BY 1`,
  );
  console.log("OK tratos.nivelInvolucramiento:", rows);
}
main().catch((e) => { console.error(e); process.exit(1); });
