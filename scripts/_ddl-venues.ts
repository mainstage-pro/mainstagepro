import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
const envRaw = readFileSync(".env.prod.backup", "utf8");
const m = envRaw.match(/^DATABASE_URL=["']?([^"'\n]+)["']?/m)!;
const url = m[1].replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const stmts = [
  `ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "tipo" TEXT`,
  `ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "estado" TEXT`,
  `ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "linkMaps" TEXT`,
  `CREATE INDEX IF NOT EXISTS "venues_nombre_idx" ON "venues"("nombre")`,
  `CREATE INDEX IF NOT EXISTS "venues_ciudad_idx" ON "venues"("ciudad")`,
  `ALTER TABLE "tratos" ADD COLUMN IF NOT EXISTS "venueId" TEXT`,
  `ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "venueId" TEXT`,
  `ALTER TABLE "proyectos" ADD COLUMN IF NOT EXISTS "venueId" TEXT`,
  `DO $$ BEGIN
     ALTER TABLE "tratos" ADD CONSTRAINT "tratos_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
     ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
     ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

(async () => {
  for (const s of stmts) {
    await sql.query(s);
    console.log("OK", s.split("\n")[0].slice(0, 90));
  }
  const cols = await sql.query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema='public' AND (column_name='venueId' OR (table_name='venues' AND column_name IN ('tipo','estado','linkMaps')))
    ORDER BY table_name, column_name`);
  console.log("\nVerificación:", JSON.stringify(cols));
})();
