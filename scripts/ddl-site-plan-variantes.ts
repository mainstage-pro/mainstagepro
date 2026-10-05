/**
 * DDL aditivo del cuadro de datos del plano y de las variantes emitidas.
 *
 * Se corre ANTES del push: la app desplegada lee estas columnas desde el primer
 * request, y una migración lazy detrás de un endpoint dejaría las páginas de
 * lectura tronando hasta que alguien llame a ese endpoint.
 *
 * Columnas en camelCase citado porque los modelos no usan @map.
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const archivo = process.env.ENV_FILE ?? ".env.prod.backup";
const envRaw = readFileSync(archivo, "utf8");
const m = envRaw.match(/^DATABASE_URL=["']?([^"'\n]+)["']?/m)!;
const url = m[1].replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const stmts = [
  `ALTER TABLE "site_planes"
     ADD COLUMN IF NOT EXISTS "direccionSitio" TEXT,
     ADD COLUMN IF NOT EXISTS "norteGrados" DOUBLE PRECISION,
     ADD COLUMN IF NOT EXISTS "dibujadoPor" TEXT,
     ADD COLUMN IF NOT EXISTS "responsableSitio" TEXT,
     ADD COLUMN IF NOT EXISTS "clienteOPromotor" TEXT,
     ADD COLUMN IF NOT EXISTS "capacidadSitio" INTEGER,
     ADD COLUMN IF NOT EXISTS "capacidadEvacuacion" INTEGER`,

  `CREATE TABLE IF NOT EXISTS "site_plan_variantes" (
     "id" TEXT NOT NULL,
     "planId" TEXT NOT NULL,
     "nombre" TEXT NOT NULL,
     "clave" TEXT NOT NULL DEFAULT 'GENERAL',
     "capasIds" TEXT,
     "soloElectrico" BOOLEAN NOT NULL DEFAULT false,
     "soloEmergencia" BOOLEAN NOT NULL DEFAULT false,
     "revision" INTEGER NOT NULL DEFAULT 0,
     "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
     "notas" TEXT,
     "orden" INTEGER NOT NULL DEFAULT 0,
     "activo" BOOLEAN NOT NULL DEFAULT true,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "site_plan_variantes_pkey" PRIMARY KEY ("id")
   )`,
  `CREATE INDEX IF NOT EXISTS "site_plan_variantes_planId_idx" ON "site_plan_variantes"("planId")`,
  `DO $$ BEGIN
     ALTER TABLE "site_plan_variantes" ADD CONSTRAINT "site_plan_variantes_planId_fkey"
       FOREIGN KEY ("planId") REFERENCES "site_planes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `CREATE TABLE IF NOT EXISTS "site_plan_revisiones" (
     "id" TEXT NOT NULL,
     "varianteId" TEXT NOT NULL,
     "numero" INTEGER NOT NULL,
     "descripcion" TEXT NOT NULL,
     "autor" TEXT,
     "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "site_plan_revisiones_pkey" PRIMARY KEY ("id")
   )`,
  `CREATE INDEX IF NOT EXISTS "site_plan_revisiones_varianteId_idx" ON "site_plan_revisiones"("varianteId")`,
  `DO $$ BEGIN
     ALTER TABLE "site_plan_revisiones" ADD CONSTRAINT "site_plan_revisiones_varianteId_fkey"
       FOREIGN KEY ("varianteId") REFERENCES "site_plan_variantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `CREATE TABLE IF NOT EXISTS "site_plan_emisiones" (
     "id" TEXT NOT NULL,
     "varianteId" TEXT NOT NULL,
     "revision" INTEGER NOT NULL,
     "destinatario" TEXT NOT NULL,
     "organizacion" TEXT,
     "medio" TEXT,
     "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "notas" TEXT,
     CONSTRAINT "site_plan_emisiones_pkey" PRIMARY KEY ("id")
   )`,
  `CREATE INDEX IF NOT EXISTS "site_plan_emisiones_varianteId_idx" ON "site_plan_emisiones"("varianteId")`,
  `DO $$ BEGIN
     ALTER TABLE "site_plan_emisiones" ADD CONSTRAINT "site_plan_emisiones_varianteId_fkey"
       FOREIGN KEY ("varianteId") REFERENCES "site_plan_variantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

async function main() {
  for (const s of stmts) {
    await sql.query(s);
    console.log("ok:", s.replace(/\s+/g, " ").slice(0, 90));
  }
  for (const tabla of ["site_planes", "site_plan_variantes", "site_plan_revisiones", "site_plan_emisiones"]) {
    const cols = await sql.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
      [tabla],
    );
    console.log(`\n${tabla}:`, (cols as { column_name: string }[]).map(c => c.column_name).join(", "));
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
