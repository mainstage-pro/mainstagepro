import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  // Catálogo de accesorios de primera clase (columnas camelCase — modelo Prisma sin @map)
  await sql.query(`CREATE TABLE IF NOT EXISTS accesorios (
    "id" TEXT PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "descripcion" TEXT,
    "fotoUrl" TEXT,
    "categoriaId" TEXT,
    "proveedorId" TEXT,
    "tipoConteo" TEXT NOT NULL DEFAULT 'default',
    "cantidad" INTEGER,
    "valorAdquisicion" DOUBLE PRECISION,
    "precioRenta" DOUBLE PRECISION,
    "tiposEvento" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "equipoOrigenId" TEXT,
    "migradoEn" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
  )`);
  await sql.query(`CREATE INDEX IF NOT EXISTS accesorios_categoriaId_idx ON accesorios("categoriaId")`);
  await sql.query(`CREATE INDEX IF NOT EXISTS accesorios_proveedorId_idx ON accesorios("proveedorId")`);
  await sql.query(`CREATE INDEX IF NOT EXISTS accesorios_equipoOrigenId_idx ON accesorios("equipoOrigenId")`);

  // Puente accesorio↔equipo: nueva columna de enlace
  await sql.query(`ALTER TABLE equipo_accesorios ADD COLUMN IF NOT EXISTS "accesorioId" TEXT`);
  await sql.query(`CREATE INDEX IF NOT EXISTS equipo_accesorios_accesorioId_idx ON equipo_accesorios("accesorioId")`);

  // Estado de migración en equipos (equipo promovido a accesorio)
  await sql.query(`ALTER TABLE equipos ADD COLUMN IF NOT EXISTS "estadoMigracion" TEXT`);

  const cols = await sql.query(`SELECT table_name, column_name FROM information_schema.columns
    WHERE (table_name='accesorios')
       OR (table_name='equipo_accesorios' AND column_name='accesorioId')
       OR (table_name='equipos' AND column_name='estadoMigracion')
    ORDER BY table_name, column_name`);
  console.log("OK columnas:", cols.map((r: any) => `${r.table_name}.${r.column_name}`).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
