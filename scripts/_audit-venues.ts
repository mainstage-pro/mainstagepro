import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
const envRaw = readFileSync(".env.prod.backup", "utf8");
const m = envRaw.match(/^DATABASE_URL=["']?([^"'\n]+)["']?/m)!;
const url = m[1].replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

(async () => {
  console.log("=== VENUES YA EN CATÁLOGO ===");
  const venues = await sql.query(`SELECT id, nombre, ciudad, direccion, activo FROM venues ORDER BY nombre`);
  console.log(JSON.stringify(venues, null, 1));

  console.log("\n=== Trato.lugarEstimado ===");
  const t = await sql.query(`
    SELECT "lugarEstimado" AS v, count(*) AS n
    FROM tratos WHERE "lugarEstimado" IS NOT NULL AND trim("lugarEstimado") <> ''
    GROUP BY 1 ORDER BY n DESC, 1`);
  console.log(JSON.stringify(t));

  console.log("\n=== Cotizacion.lugarEvento ===");
  const c = await sql.query(`
    SELECT "lugarEvento" AS v, count(*) AS n
    FROM cotizaciones WHERE "lugarEvento" IS NOT NULL AND trim("lugarEvento") <> ''
    GROUP BY 1 ORDER BY n DESC, 1`);
  console.log(JSON.stringify(c));

  console.log("\n=== Proyecto.lugarEvento + direccionVenue ===");
  const p = await sql.query(`
    SELECT "lugarEvento" AS v, count(*) AS n,
           string_agg(DISTINCT NULLIF(trim("direccionVenue"),''), ' | ') AS dirs,
           string_agg(DISTINCT NULLIF(trim("encargadoLugar"),''), ' | ') AS encargados
    FROM proyectos WHERE "lugarEvento" IS NOT NULL AND trim("lugarEvento") <> ''
    GROUP BY 1 ORDER BY n DESC, 1`);
  console.log(JSON.stringify(p, null, 1));

  console.log("\n=== Otras tablas con lugar (5136/5289/5442) ===");
  const tablas = await sql.query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema='public' AND column_name IN ('lugarEstimado','lugarEvento','ubicacion','lugar')
    ORDER BY table_name`);
  console.log(JSON.stringify(tablas));
})();
