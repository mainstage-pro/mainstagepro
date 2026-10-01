/**
 * Bonos del tabulador de freelancers: catálogo de montos + bonos por puesto.
 * Aditivo: las columnas nacen en NULL, así que ningún pago existente cambia.
 *
 *   npx tsx scripts/ddl-bonos-personal.ts
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: process.env.ENVF || ".env.prod.backup" });
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

// proyecto_personal no usa @map en sus campos: las columnas van en camelCase citado.
const COLS = ["bonoMontaje", "bonoDesmontaje", "bonoEncargado", "bonoChofer", "bonoForaneo"];

async function main() {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS config_pago_personal (
      id TEXT PRIMARY KEY DEFAULT 'singleton',
      bono_montaje DOUBLE PRECISION NOT NULL DEFAULT 800,
      bono_desmontaje DOUBLE PRECISION NOT NULL DEFAULT 800,
      bono_encargado DOUBLE PRECISION NOT NULL DEFAULT 500,
      bono_chofer DOUBLE PRECISION NOT NULL DEFAULT 500,
      bono_foraneo DOUBLE PRECISION NOT NULL DEFAULT 400,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await sql.query(`INSERT INTO config_pago_personal (id) VALUES ('singleton') ON CONFLICT (id) DO NOTHING`);

  for (const col of COLS) {
    await sql.query(`ALTER TABLE proyecto_personal ADD COLUMN IF NOT EXISTS "${col}" DOUBLE PRECISION`);
  }

  const cols = await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='proyecto_personal' AND column_name = ANY($1) ORDER BY column_name`,
    [COLS],
  );
  const cfg = await sql.query(`SELECT * FROM config_pago_personal WHERE id='singleton'`);
  const conBono = await sql.query(
    `SELECT count(*)::int n FROM proyecto_personal WHERE "bonoMontaje" IS NOT NULL OR "bonoDesmontaje" IS NOT NULL
     OR "bonoEncargado" IS NOT NULL OR "bonoChofer" IS NOT NULL OR "bonoForaneo" IS NOT NULL`,
  );

  console.log("OK columnas:", cols.map((r: Record<string, string>) => r.column_name).join(", "));
  console.log("OK catálogo:", JSON.stringify(cfg[0]));
  console.log(`puestos con algún bono: ${conBono[0].n} (debe ser 0 recién aplicado)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
