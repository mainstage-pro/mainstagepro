/**
 * DDL aditivo: los rigs de línea del rider.
 *
 * Un rig es un equipo del artista por el que pasa la señal antes de llegar a la
 * consola: la interfaz del playback, la de voces, el mixer del DJ. Se declara una
 * vez y cada canal dice de qué rig y de qué puerto sale, para no repetir la
 * cadena ("MacBook + Ableton » Apollo x8p") renglón por renglón.
 *
 * No es el pre-patch de interfaz (pre_patch_canales): ese es de la casa y vive en
 * la gira. Este viaja con el rider del artista.
 *
 * Nada se borra: la tabla nace vacía y los canales existentes quedan con rigId
 * null, que es exactamente "cable directo a la consola".
 */
import { config } from "dotenv";
config({ path: process.env.ENV_FILE || ".env.prod.backup" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // Columnas en camelCase citado: el modelo no lleva @map en sus campos, así que
  // Prisma las va a buscar tal cual. En snake_case tronaría con 500.
  await sql`
    CREATE TABLE IF NOT EXISTS artista_rider_rigs (
      id          TEXT PRIMARY KEY,
      "riderId"   TEXT NOT NULL REFERENCES artista_riders(id) ON DELETE CASCADE,
      nombre      TEXT NOT NULL,
      equipo      TEXT,
      cadena      TEXT,
      conexion    TEXT,
      notas       TEXT,
      orden       INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS artista_rider_rigs_rider_idx
    ON artista_rider_rigs ("riderId")
  `;

  // Borrar un rig no debe borrar el canal: el canal se queda y pasa a directo.
  await sql`
    ALTER TABLE artista_rider_canales
    ADD COLUMN IF NOT EXISTS "rigId" TEXT REFERENCES artista_rider_rigs(id) ON DELETE SET NULL
  `;
  await sql`ALTER TABLE artista_rider_canales ADD COLUMN IF NOT EXISTS "rigPuerto" TEXT`;

  const rigs = (await sql`SELECT COUNT(*)::int n FROM artista_rider_rigs`) as { n: number }[];
  const conRig = (await sql`SELECT COUNT(*)::int n FROM artista_rider_canales WHERE "rigId" IS NOT NULL`) as {
    n: number;
  }[];

  console.log("artista_rider_rigs lista.");
  console.log(`  rigs capturados:   ${rigs[0].n}`);
  console.log(`  canales con rig:   ${conRig[0].n}`);
}

main();
