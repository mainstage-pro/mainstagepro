// Crea las tablas de mensajería interna en prod (modelos Canal/CanalMiembro/
// CanalLectura/Mensaje del schema). DDL aditivo vía driver neon() HTTP — el
// pooler TCP de Prisma no conecta desde local.
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
    CREATE TABLE IF NOT EXISTS "canales" (
      "id" TEXT PRIMARY KEY,
      "tipo" TEXT NOT NULL,
      "nombre" TEXT,
      "area" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS "canal_miembros" (
      "id" TEXT PRIMARY KEY,
      "canalId" TEXT NOT NULL,
      "usuarioId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "canal_miembros_canalId_fkey" FOREIGN KEY ("canalId") REFERENCES "canales"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "canal_miembros_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS "canal_miembros_canalId_usuarioId_key" ON "canal_miembros" ("canalId", "usuarioId");`);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS "canal_lecturas" (
      "id" TEXT PRIMARY KEY,
      "canalId" TEXT NOT NULL,
      "usuarioId" TEXT NOT NULL,
      "leidoHasta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "canal_lecturas_canalId_fkey" FOREIGN KEY ("canalId") REFERENCES "canales"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "canal_lecturas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS "canal_lecturas_canalId_usuarioId_key" ON "canal_lecturas" ("canalId", "usuarioId");`);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS "mensajes" (
      "id" TEXT PRIMARY KEY,
      "canalId" TEXT NOT NULL,
      "autorId" TEXT NOT NULL,
      "contenido" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "mensajes_canalId_fkey" FOREIGN KEY ("canalId") REFERENCES "canales"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "mensajes_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
  await sql.query(`CREATE INDEX IF NOT EXISTS "mensajes_canalId_createdAt_idx" ON "mensajes" ("canalId", "createdAt");`);

  console.log("Tablas de mensajería interna (canales/canal_miembros/canal_lecturas/mensajes) listas en prod.");
}
main().catch((e) => { console.error(e); process.exit(1); });
