/**
 * Da de alta a Yoshi como segundo cliente del roster de giras (production
 * management / dirección técnica), junto a AQUIHAYAQUIHAY. Idempotente: si ya
 * existe un artista llamado Yoshi, solo lo marca; si no, lo crea.
 */
import { config } from "dotenv";
config({ path: process.env.ENV_FILE || ".env.prod.backup" });
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";

const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  const existentes = await sql`SELECT id, nombre FROM artistas WHERE lower(nombre) = 'yoshi' AND activo = true`;

  let artistaId: string;
  if (existentes.length) {
    artistaId = existentes[0].id as string;
    console.log(`Ya existía: ${existentes[0].nombre} (${artistaId})`);
  } else {
    artistaId = randomUUID();
    await sql`
      INSERT INTO artistas (id, nombre, activo, "createdAt", "updatedAt")
      VALUES (${artistaId}, 'Yoshi', true, now(), now())
    `;
    console.log(`Creado artista Yoshi (${artistaId})`);
  }

  await sql`
    UPDATE artistas
    SET "enRosterGiras" = true,
        "rosterEstado" = 'ACTIVO',
        "rosterFechaAlta" = COALESCE("rosterFechaAlta", now())
    WHERE id = ${artistaId}
  `;

  const check = await sql`SELECT nombre, "enRosterGiras", "rosterEstado", "rosterFechaAlta" FROM artistas WHERE id = ${artistaId}`;
  console.log("Resultado:", check[0]);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
