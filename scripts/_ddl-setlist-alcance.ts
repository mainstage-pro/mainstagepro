/**
 * DDL aditivo: a qué fechas va cada renglón del setlist.
 *
 * `soloEnShows` lo captura el base de la gira: vacío quiere decir "a todas", que
 * es lo que traen los renglones que ya existen, así que ninguna fecha cambia de
 * repertorio al aplicar esto.
 *
 * `origenId` apunta al renglón del base del que nació la copia de una fecha. Las
 * copias viejas nacen con null —no hay forma de reconstruir de dónde salieron— y
 * eso las deja como renglones de la noche: no se las lleva la siembra ni las
 * toca una exclusión del base. Es el lado seguro del error.
 */
import { config } from "dotenv";
config({ path: process.env.ENV_FILE || ".env.prod.backup" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // Columnas en camelCase citado: el modelo no lleva @map en sus campos, así que
  // Prisma las va a buscar tal cual. En snake_case tronaría con 500.
  await sql`
    ALTER TABLE gira_setlist_canciones
    ADD COLUMN IF NOT EXISTS "soloEnShows" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
  `;
  await sql`
    ALTER TABLE gira_setlist_canciones
    ADD COLUMN IF NOT EXISTS "origenId" TEXT
    REFERENCES gira_setlist_canciones(id) ON DELETE CASCADE
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS gira_setlist_canciones_origen_idx
    ON gira_setlist_canciones ("origenId")
  `;

  const filas = (await sql`SELECT COUNT(*)::int n FROM gira_setlist_canciones`) as { n: number }[];
  const acotadas = (await sql`
    SELECT COUNT(*)::int n FROM gira_setlist_canciones WHERE cardinality("soloEnShows") > 0
  `) as { n: number }[];
  const sembradas = (await sql`
    SELECT COUNT(*)::int n FROM gira_setlist_canciones WHERE "origenId" IS NOT NULL
  `) as { n: number }[];

  console.log("gira_setlist_canciones lista.");
  console.log(`  renglones:               ${filas[0].n}`);
  console.log(`  acotados a ciertas fechas: ${acotadas[0].n}`);
  console.log(`  ligados a un base:       ${sembradas[0].n}`);
}

main();
