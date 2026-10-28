import { config } from "dotenv";
config({ path: process.env.ENV_FILE || ".env.prod.backup" });
import { neon } from "@neondatabase/serverless";

const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  const artistas = await sql`
    SELECT a.id, a.nombre, a."enRosterGiras", a."tipoFormacion", a."clienteId",
      (SELECT count(*) FROM giras g WHERE g."artistaId" = a.id) AS giras,
      (SELECT count(*) FROM artista_personas ap WHERE ap."artistaId" = a.id) AS personas,
      (SELECT count(*) FROM tratos t WHERE t."artistaId" = a.id) AS tratos,
      (SELECT count(*) FROM proyectos p WHERE p."artistaId" = a.id) AS proyectos,
      (SELECT count(*) FROM artista_riders r WHERE r."artistaId" = a.id) AS riders
    FROM artistas a
    WHERE a.activo = true
    ORDER BY a.nombre ASC
  `;
  console.log(`Total artistas activos: ${artistas.length}\n`);
  for (const a of artistas) {
    console.log(
      `${a.enRosterGiras ? "★ROSTER " : "        "}${a.nombre.padEnd(30)} giras=${a.giras} tratos=${a.tratos} proyectos=${a.proyectos} personas=${a.personas} riders=${a.riders} formacion=${a.tipoFormacion ?? "-"}`
    );
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
