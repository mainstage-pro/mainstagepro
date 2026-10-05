import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
const envRaw = readFileSync(".env.prod.backup", "utf8");
const m = envRaw.match(/^DATABASE_URL=["']?([^"'\n]+)["']?/m)!;
const url = m[1].replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const stmts = [
  `CREATE TABLE IF NOT EXISTS "site_planes" (
     "id" TEXT NOT NULL,
     "nombre" TEXT NOT NULL,
     "showId" TEXT,
     "venueId" TEXT,
     "fondoUrl" TEXT,
     "fondoAncho" INTEGER,
     "fondoAlto" INTEGER,
     "escalaMPorPx" DOUBLE PRECISION,
     "contenido" TEXT,
     "notas" TEXT,
     "activo" BOOLEAN NOT NULL DEFAULT true,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "site_planes_pkey" PRIMARY KEY ("id")
   )`,
  `CREATE INDEX IF NOT EXISTS "site_planes_showId_idx" ON "site_planes"("showId")`,
  `CREATE INDEX IF NOT EXISTS "site_planes_venueId_idx" ON "site_planes"("venueId")`,
  `DO $$ BEGIN
     ALTER TABLE "site_planes" ADD CONSTRAINT "site_planes_showId_fkey"
       FOREIGN KEY ("showId") REFERENCES "gira_shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
     ALTER TABLE "site_planes" ADD CONSTRAINT "site_planes_venueId_fkey"
       FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

async function main() {
  for (const s of stmts) {
    await sql.query(s);
    console.log("ok:", s.replace(/\s+/g, " ").slice(0, 90));
  }
  const cols = await sql.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_name = 'site_planes' ORDER BY ordinal_position`,
  );
  console.log("\nverificación:", cols);
}

main().catch(e => { console.error(e); process.exit(1); });
