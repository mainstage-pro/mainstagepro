// Crea la tabla "comentarios" en prod (modelo Comentario del schema).
// DDL aditivo vía driver neon() HTTP — el pooler TCP de Prisma no conecta desde local.
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const envFile = process.env.ENV_FILE || ".env.prod.backup";
const envRaw = readFileSync(envFile, "utf8");
const match = envRaw.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error(`No DATABASE_URL en ${envFile}`);
const raw = match[1].trim().replace(/^["']|["']$/g, "");
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS "comentarios" (
      "id" TEXT PRIMARY KEY,
      "entidad" TEXT NOT NULL,
      "entidadId" TEXT NOT NULL,
      "contenido" TEXT NOT NULL,
      "autorId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "comentarios_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
  await sql.query(`CREATE INDEX IF NOT EXISTS "comentarios_entidad_entidadId_idx" ON "comentarios" ("entidad", "entidadId");`);
  console.log("Tabla comentarios lista en prod.");
}
main().catch((e) => { console.error(e); process.exit(1); });
