/**
 * DDL aditivo: el pre-patch de la interfaz.
 *
 * Es otra lista, no una columna más del input list: dice qué entra y qué sale por
 * cada puerto físico de la interfaz que va antes de la consola. Vive en la gira
 * porque la interfaz es la misma todo el tour, y una fecha se mete con ella igual
 * que con el rider: puertos propios de la plaza, o un ajuste (`baseId`) de un
 * puerto de la gira que vale solo ahí.
 *
 * Nada se borra ni se convierte: la tabla nace vacía y `giras."conPrePatch"`
 * arranca en false, así que las giras que no parchan interfaz no cambian.
 */
import { config } from "dotenv";
config({ path: process.env.ENV_FILE || ".env.prod.backup" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // Columnas en camelCase citado: el modelo no lleva @map en sus campos, así que
  // Prisma las va a buscar tal cual. En snake_case tronaría con 500.
  await sql`
    CREATE TABLE IF NOT EXISTS pre_patch_canales (
      id          TEXT PRIMARY KEY,
      "giraId"    TEXT NOT NULL REFERENCES giras(id) ON DELETE CASCADE,
      "showId"    TEXT REFERENCES gira_shows(id) ON DELETE CASCADE,
      "baseId"    TEXT REFERENCES pre_patch_canales(id) ON DELETE CASCADE,
      oculto      BOOLEAN NOT NULL DEFAULT false,
      tipo        TEXT NOT NULL,
      nombre      TEXT NOT NULL,
      notas       TEXT,
      orden       INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Una fecha ajusta un puerto de la gira una sola vez. Postgres cuenta los NULL
  // como distintos, así que esto no estorba a los puertos propios de la plaza
  // (baseId null) ni a los de la gira (showId null).
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS pre_patch_canales_show_base_key
    ON pre_patch_canales ("showId", "baseId")
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS pre_patch_canales_gira_tipo_idx
    ON pre_patch_canales ("giraId", tipo)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS pre_patch_canales_show_idx
    ON pre_patch_canales ("showId")
  `;

  await sql`ALTER TABLE giras ADD COLUMN IF NOT EXISTS "conPrePatch" BOOLEAN NOT NULL DEFAULT false`;

  const puertos = (await sql`SELECT COUNT(*)::int n FROM pre_patch_canales`) as { n: number }[];
  const prendidas = (await sql`SELECT COUNT(*)::int n FROM giras WHERE "conPrePatch"`) as { n: number }[];

  console.log("pre_patch_canales lista.");
  console.log(`  puertos capturados:      ${puertos[0].n}`);
  console.log(`  giras con pre-patch:     ${prendidas[0].n}`);
}

main();
