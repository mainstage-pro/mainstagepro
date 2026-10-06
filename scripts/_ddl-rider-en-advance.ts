/**
 * DDL aditivo: el interruptor de curaduría del advance.
 *
 * `enAdvance` dice si el concepto del rider se coteja con la casa. El rider sigue
 * siendo la transcripción literal del documento (ahí vive el entarimado con faldón
 * y las toallas); este campo es la única decisión que lo convierte en advance.
 */
import { config } from "dotenv";
config({ path: process.env.ENV_FILE || ".env.prod.backup" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  await sql`
    ALTER TABLE artista_rider_lineas
    ADD COLUMN IF NOT EXISTS "enAdvance" BOOLEAN NOT NULL DEFAULT true
  `;
  const r = (await sql`
    SELECT "enAdvance", COUNT(*) n FROM artista_rider_lineas GROUP BY 1
  `) as { enAdvance: boolean; n: string }[];
  console.log("columna enAdvance lista:");
  for (const x of r) console.log(`  ${x.enAdvance ? "en el advance" : "fuera"}: ${x.n}`);
}

main();
