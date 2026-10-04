// Fases 4 y 5 de la división Dirección y operaciones: la cotización de equipo se
// liga a una fecha de gira, y el proveedor declara qué frente de producción cubre.
//
//   ENV_FILE=.env.prod.backup npx tsx scripts/ddl-cotizacion-show-frentes.ts
//
// Aditivo e idempotente. Se corre ANTES del push: una columna nueva que llega al
// deploy sin existir en la BD tumba las rutas de lectura (pasó dos veces).
import { config } from "dotenv";
config({ path: process.env.ENV_FILE || ".env.prod.backup" });
import { neon } from "@neondatabase/serverless";

const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

// `giraShowId` y `frente` van en camelCase citado: ni Cotizacion ni ProveedorEvento
// usan @map en esos campos, así que Prisma los busca tal cual.
const DDL = [
  `ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "giraShowId" TEXT`,
  `CREATE INDEX IF NOT EXISTS "cotizaciones_giraShowId_idx" ON "cotizaciones" ("giraShowId")`,
  // La FK se declara explícita porque el índice no la implica y Prisma la espera
  // para que el include de giraShow no devuelva basura si el show se borra.
  `ALTER TABLE "cotizaciones" DROP CONSTRAINT IF EXISTS "cotizaciones_giraShowId_fkey"`,
  `ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_giraShowId_fkey"
     FOREIGN KEY ("giraShowId") REFERENCES "gira_shows"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  `ALTER TABLE "proveedores_evento" ADD COLUMN IF NOT EXISTS "frente" TEXT`,
];

async function main() {
  console.log("\nAplicando DDL en", url.replace(/:[^:@]+@/, ":***@").slice(0, 60), "…\n");

  for (const sentencia of DDL) {
    await sql.query(sentencia);
    console.log("  ✓", sentencia.replace(/\s+/g, " ").slice(0, 90));
  }

  const [resumen] = (await sql.query(
    `SELECT (SELECT count(*)::int FROM "cotizaciones") AS cotizaciones,
            (SELECT count("giraShowId")::int FROM "cotizaciones") AS con_show,
            (SELECT count(*)::int FROM "proveedores_evento") AS proveedores,
            (SELECT count("frente")::int FROM "proveedores_evento") AS con_frente`,
  )) as { cotizaciones: number; con_show: number; proveedores: number; con_frente: number }[];

  console.log(
    `\n${resumen.cotizaciones} cotizaciones (${resumen.con_show} ligadas a un show) · ` +
      `${resumen.proveedores} proveedores de evento (${resumen.con_frente} con frente)\n`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
