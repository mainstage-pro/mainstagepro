import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const envFile = process.env.ENV_FILE || ".env.prod.backup";
const envRaw = readFileSync(envFile, "utf8");
const match = envRaw.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error(`No DATABASE_URL en ${envFile}`);
const raw = match[1].trim().replace(/^["']|["']$/g, "");
const url = raw
  .replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "")
  .replace(/\?&/, "?")
  .replace(/\?$/, "");

const sql = neon(url);

async function main() {
  await sql.query(`ALTER TABLE clientes ADD COLUMN IF NOT EXISTS "perfilesProspecto" TEXT`);
  await sql.query(`ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "perfilProspecto" TEXT`);

  // Backfill: clientes con perfil single -> array de 1
  const upd = await sql.query(
    `UPDATE clientes
       SET "perfilesProspecto" = json_build_array("perfilProspecto")::text
     WHERE "perfilProspecto" IS NOT NULL
       AND "perfilProspecto" <> ''
       AND "perfilesProspecto" IS NULL`
  );
  console.log("Backfill clientes filas:", (upd as unknown as { rowCount?: number }).rowCount ?? "n/a");

  const c = await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'perfilesProspecto'`
  );
  const t = await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'tratos' AND column_name = 'perfilProspecto'`
  );
  console.log("OK clientes.perfilesProspecto:", c.length > 0);
  console.log("OK tratos.perfilProspecto:", t.length > 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
