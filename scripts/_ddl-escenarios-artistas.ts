import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
const envRaw = readFileSync(".env.prod.backup", "utf8");
const m = envRaw.match(/^DATABASE_URL=["']?([^"'\n]+)["']?/m)!;
const url = m[1].replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const stmts = [
  // ── Catálogo de artistas ──
  `CREATE TABLE IF NOT EXISTS "artistas" (
     "id" TEXT NOT NULL,
     "nombre" TEXT NOT NULL,
     "genero" TEXT,
     "origen" TEXT,
     "contactoNombre" TEXT,
     "contactoTelefono" TEXT,
     "contactoEmail" TEXT,
     "instagram" TEXT,
     "sitioWeb" TEXT,
     "notas" TEXT,
     "activo" BOOLEAN NOT NULL DEFAULT true,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "artistas_pkey" PRIMARY KEY ("id")
   )`,
  `CREATE INDEX IF NOT EXISTS "artistas_nombre_idx" ON "artistas"("nombre")`,

  // ── Escenarios del proyecto ──
  `CREATE TABLE IF NOT EXISTS "proyecto_escenarios" (
     "id" TEXT NOT NULL,
     "proyectoId" TEXT NOT NULL,
     "nombre" TEXT NOT NULL,
     "orden" INTEGER NOT NULL DEFAULT 0,
     "anchoM" DOUBLE PRECISION,
     "largoM" DOUBLE PRECISION,
     "alturaM" DOUBLE PRECISION,
     "notas" TEXT,
     "layout" TEXT,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "proyecto_escenarios_pkey" PRIMARY KEY ("id")
   )`,
  `CREATE INDEX IF NOT EXISTS "proyecto_escenarios_proyectoId_idx" ON "proyecto_escenarios"("proyectoId")`,
  `DO $$ BEGIN
     ALTER TABLE "proyecto_escenarios" ADD CONSTRAINT "proyecto_escenarios_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // ── Peso del equipo ──
  `ALTER TABLE "equipos" ADD COLUMN IF NOT EXISTS "pesoKg" DOUBLE PRECISION`,

  // ── Artista y gira en el trato ──
  `ALTER TABLE "tratos" ADD COLUMN IF NOT EXISTS "artistaId" TEXT`,
  `ALTER TABLE "tratos" ADD COLUMN IF NOT EXISTS "esGira" BOOLEAN NOT NULL DEFAULT false`,
  `DO $$ BEGIN
     ALTER TABLE "tratos" ADD CONSTRAINT "tratos_artistaId_fkey" FOREIGN KEY ("artistaId") REFERENCES "artistas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // ── Artista espejo en el proyecto ──
  `ALTER TABLE "proyectos" ADD COLUMN IF NOT EXISTS "artistaId" TEXT`,
  `DO $$ BEGIN
     ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_artistaId_fkey" FOREIGN KEY ("artistaId") REFERENCES "artistas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // ── escenarioId en rider, crew, cronología y proveedores ──
  `ALTER TABLE "proyecto_equipos" ADD COLUMN IF NOT EXISTS "escenarioId" TEXT`,
  `ALTER TABLE "proyecto_personal" ADD COLUMN IF NOT EXISTS "escenarioId" TEXT`,
  `ALTER TABLE "proyecto_bloques_tiempo" ADD COLUMN IF NOT EXISTS "escenarioId" TEXT`,
  `ALTER TABLE "proveedores_evento" ADD COLUMN IF NOT EXISTS "escenarioId" TEXT`,
  `DO $$ BEGIN
     ALTER TABLE "proyecto_equipos" ADD CONSTRAINT "proyecto_equipos_escenarioId_fkey" FOREIGN KEY ("escenarioId") REFERENCES "proyecto_escenarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
     ALTER TABLE "proyecto_personal" ADD CONSTRAINT "proyecto_personal_escenarioId_fkey" FOREIGN KEY ("escenarioId") REFERENCES "proyecto_escenarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
     ALTER TABLE "proyecto_bloques_tiempo" ADD CONSTRAINT "proyecto_bloques_tiempo_escenarioId_fkey" FOREIGN KEY ("escenarioId") REFERENCES "proyecto_escenarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
     ALTER TABLE "proveedores_evento" ADD CONSTRAINT "proveedores_evento_escenarioId_fkey" FOREIGN KEY ("escenarioId") REFERENCES "proyecto_escenarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

(async () => {
  for (const s of stmts) {
    await sql.query(s);
    console.log("OK", s.split("\n")[0].slice(0, 95));
  }

  const cols = await sql.query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema='public' AND (
      column_name = 'escenarioId'
      OR (table_name='equipos' AND column_name='pesoKg')
      OR (table_name='tratos' AND column_name IN ('artistaId','esGira'))
      OR (table_name='proyectos' AND column_name='artistaId')
      OR table_name IN ('artistas','proyecto_escenarios')
    )
    ORDER BY table_name, column_name`);
  console.log("\nVerificación:\n" + JSON.stringify(cols, null, 1));
})();
