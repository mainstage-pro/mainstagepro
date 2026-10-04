// Fase 1 de la división Dirección y operaciones: el trato declara qué servicios
// vende y dónde se opera, antes de cotizar.
//
//   ENV_FILE=.env.prod.backup npx tsx scripts/ddl-servicios-trato.ts
//
// Aditivo e idempotente. Se corre ANTES del push: una columna nueva que llega al
// deploy sin existir en la BD tumba las rutas de lectura (pasó dos veces).
import { config } from "dotenv";
config({ path: process.env.ENV_FILE || ".env.prod.backup" });
import { neon } from "@neondatabase/serverless";

const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

// Columnas en camelCase citado: el modelo Trato no usa @map, así que Prisma las
// busca tal cual. En snake_case tronaría con 500 en cada lectura.
const DDL = [
  `ALTER TABLE "tratos" ADD COLUMN IF NOT EXISTS "servicios" TEXT`,
  `ALTER TABLE "tratos" ADD COLUMN IF NOT EXISTS "canalOperativo" TEXT`,
];

// El backfill es 1:1 con lo que ya estaba declarado. No se infiere que una
// producción técnica además rentó: eso lo decide Mauricio trato por trato.
const BACKFILL = [
  {
    nombre: "servicios ← tipoServicio",
    sql: `UPDATE "tratos" SET "servicios" = CASE "tipoServicio"
            WHEN 'RENTA'              THEN '["RENTA"]'
            WHEN 'PRODUCCION_TECNICA' THEN '["PRODUCCION_TECNICA"]'
            WHEN 'DIRECCION_TECNICA'  THEN '["DIRECCION_OPERACIONES"]'
          END
          WHERE "servicios" IS NULL
            AND "tipoServicio" IN ('RENTA','PRODUCCION_TECNICA','DIRECCION_TECNICA')`,
  },
  {
    nombre: "canalOperativo = SHOW (tratos de gira)",
    sql: `UPDATE "tratos" SET "canalOperativo" = 'SHOW' WHERE "canalOperativo" IS NULL AND "esGira" = true`,
  },
  {
    nombre: "canalOperativo = EVENTO (el resto)",
    sql: `UPDATE "tratos" SET "canalOperativo" = 'EVENTO' WHERE "canalOperativo" IS NULL`,
  },
];

async function main() {
  console.log("\nAplicando DDL en", url.replace(/:[^:@]+@/, ":***@").slice(0, 60), "…\n");

  for (const sentencia of DDL) {
    await sql.query(sentencia);
    console.log("  ✓", sentencia.slice(0, 80));
  }

  console.log("");
  for (const paso of BACKFILL) {
    const res = await sql.query(paso.sql);
    const n = (res as { rowCount?: number }).rowCount ?? 0;
    console.log(`  ✓ ${paso.nombre.padEnd(42)} ${n} filas`);
  }

  const [resumen] = (await sql.query(
    `SELECT count(*)::int AS total,
            count("servicios")::int AS con_servicios,
            count("canalOperativo")::int AS con_canal,
            count(*) FILTER (WHERE "canalOperativo" = 'SHOW')::int AS shows
     FROM "tratos"`,
  )) as { total: number; con_servicios: number; con_canal: number; shows: number }[];

  console.log(
    `\n${resumen.total} tratos · ${resumen.con_servicios} con servicios · ${resumen.con_canal} con canal · ${resumen.shows} en canal SHOW\n`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
