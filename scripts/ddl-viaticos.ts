/**
 * DDL aditivo del cuadro de comidas y viáticos.
 *
 * Todo es ADD COLUMN IF NOT EXISTS: no borra ni reescribe nada. Las columnas van en
 * camelCase citado porque estos modelos no usan @map (si se crean en snake_case,
 * Prisma truena con 500 al leerlas).
 *
 * Los renglones que ya existían se dan por autorizados con su fecha de creación: eran
 * gastos reales ya incurridos y los reportes financieros ya los contaban. Sin esto
 * quedarían como PROPUESTO y desaparecerían del estado de resultados devengado.
 *
 * Correr con: npx tsx scripts/ddl-viaticos.ts
 */
import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";

function urlDeProd(): string {
  const env = readFileSync(".env.prod.backup", "utf8");
  const linea = env.split("\n").find((l) => l.startsWith("DATABASE_URL="));
  if (!linea) throw new Error("No hay DATABASE_URL en .env.prod.backup");
  return linea.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
}

async function main() {
  const sql = neon(urlDeProd());

  await sql`ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS "personasViaticos" INTEGER`;
  await sql`ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS "comidasPorDia" INTEGER NOT NULL DEFAULT 1`;

  await sql`ALTER TABLE gastos_operativos ADD COLUMN IF NOT EXISTS "personas" INTEGER`;
  await sql`ALTER TABLE gastos_operativos ADD COLUMN IF NOT EXISTS "porDia" INTEGER`;
  await sql`ALTER TABLE gastos_operativos ADD COLUMN IF NOT EXISTS "dias" INTEGER`;
  await sql`ALTER TABLE gastos_operativos ADD COLUMN IF NOT EXISTS "costoUnitario" DOUBLE PRECISION`;
  await sql`ALTER TABLE gastos_operativos ADD COLUMN IF NOT EXISTS "modalidad" TEXT NOT NULL DEFAULT 'EFECTIVO'`;
  await sql`ALTER TABLE gastos_operativos ADD COLUMN IF NOT EXISTS "responsable" TEXT`;
  await sql`ALTER TABLE gastos_operativos ADD COLUMN IF NOT EXISTS "autorizadoPor" TEXT`;
  await sql`ALTER TABLE gastos_operativos ADD COLUMN IF NOT EXISTS "autorizadoEn" TIMESTAMP(3)`;
  await sql`ALTER TABLE gastos_operativos ADD COLUMN IF NOT EXISTS "cotizacionId" TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS "gastos_operativos_proyectoId_idx" ON gastos_operativos("proyectoId")`;

  const backfill = await sql`
    UPDATE gastos_operativos
       SET "autorizadoEn" = "createdAt"
     WHERE "autorizadoEn" IS NULL
    RETURNING id`;
  console.log(`renglones previos marcados como autorizados: ${backfill.length}`);

  const cols = await sql`
    SELECT column_name FROM information_schema.columns
     WHERE table_name = 'gastos_operativos' ORDER BY ordinal_position`;
  console.log("gastos_operativos:", cols.map((c) => c.column_name).join(", "));

  const colsCot = await sql`
    SELECT column_name FROM information_schema.columns
     WHERE table_name = 'cotizaciones'
       AND column_name IN ('personasViaticos', 'comidasPorDia')`;
  console.log("cotizaciones:", colsCot.map((c) => c.column_name).join(", "));
}

main();
