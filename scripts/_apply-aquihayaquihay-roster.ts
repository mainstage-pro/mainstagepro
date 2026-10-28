/**
 * Marca al artista AQUIHAYAQUIHAY como cliente del roster de giras (production
 * management / dirección técnica): primer artista estandarizado bajo este
 * servicio, con Yoshi por entrar después. Idempotente.
 */
import { config } from "dotenv";
config({ path: process.env.ENV_FILE || ".env.prod.backup" });
import { neon } from "@neondatabase/serverless";

const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const SLUG_GIRA = "aquihayaquihay-around-the-world";

async function main() {
  const giras = await sql`SELECT "artistaId" FROM giras WHERE slug = ${SLUG_GIRA} LIMIT 1`;
  if (!giras.length) {
    console.error(`No se encontró la gira con slug ${SLUG_GIRA}`);
    process.exit(1);
  }
  const artistaId = giras[0].artistaId as string;

  await sql`
    UPDATE artistas
    SET "enRosterGiras" = true,
        "rosterEstado" = 'ACTIVO',
        "rosterNivelServicio" = COALESCE("rosterNivelServicio", 'DIRECCION_INTEGRAL'),
        "rosterFechaAlta" = COALESCE("rosterFechaAlta", now())
    WHERE id = ${artistaId}
  `;

  const check = await sql`SELECT nombre, "enRosterGiras", "rosterEstado", "rosterNivelServicio", "rosterFechaAlta" FROM artistas WHERE id = ${artistaId}`;
  console.log("Artista actualizado:", check[0]);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
