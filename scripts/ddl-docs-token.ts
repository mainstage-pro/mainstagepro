import { config } from "dotenv";
config({ path: process.env.ENV_FILE || ".env.prod.backup" });
import { neon } from "@neondatabase/serverless";

const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  // Token público de los documentos PDF en línea (columna camelCase — campo Prisma sin @map)
  await sql.query(`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "docsToken" TEXT`);
  await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS "proyectos_docsToken_key" ON proyectos("docsToken")`);

  const cols = await sql.query(`SELECT column_name FROM information_schema.columns
    WHERE table_name='proyectos' AND column_name='docsToken'`);
  console.log("OK columnas:", cols.map((r) => r.column_name).join(", ") || "(ninguna)");
}
main().catch((e) => { console.error(e); process.exit(1); });
