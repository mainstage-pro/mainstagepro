import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  // Join Producto↔Accesorio (columnas camelCase — modelo Prisma sin @map)
  await sql.query(`CREATE TABLE IF NOT EXISTS producto_accesorios (
    "id" TEXT PRIMARY KEY,
    "productoId" TEXT NOT NULL,
    "accesorioId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "orden" INTEGER NOT NULL DEFAULT 0
  )`);
  await sql.query(`CREATE INDEX IF NOT EXISTS producto_accesorios_productoId_idx ON producto_accesorios("productoId")`);
  await sql.query(`CREATE INDEX IF NOT EXISTS producto_accesorios_accesorioId_idx ON producto_accesorios("accesorioId")`);

  const cols = await sql.query(`SELECT column_name FROM information_schema.columns
    WHERE table_name='producto_accesorios' ORDER BY column_name`);
  console.log("OK producto_accesorios:", cols.map((r: any) => r.column_name).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
