/**
 * Desactiva artistas sueltos de cotización de producción que quedaron
 * huérfanos en el catálogo de Giras (0 giras, 0 tratos, 0 proyectos, 0
 * personas, 0 riders). Soft-delete estándar del proyecto: activo=false.
 */
import { config } from "dotenv";
config({ path: process.env.ENV_FILE || ".env.prod.backup" });
import { neon } from "@neondatabase/serverless";

const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const NOMBRES = ["Mandragora", "Diego Siqueiros"];

async function main() {
  for (const nombre of NOMBRES) {
    const filas = await sql`SELECT id, nombre FROM artistas WHERE lower(nombre) = ${nombre.toLowerCase()} AND activo = true`;
    if (!filas.length) {
      console.log(`No encontrado (ya inactivo o no existe): ${nombre}`);
      continue;
    }
    for (const f of filas) {
      await sql`UPDATE artistas SET activo = false, "updatedAt" = now() WHERE id = ${f.id}`;
      console.log(`Desactivado: ${f.nombre} (${f.id})`);
    }
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
