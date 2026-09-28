// DDL aditivo: Orden de Producción + Control de Carga (patrón Neon HTTP).
//   ENV_FILE=.env.prod.backup npx tsx scripts/ddl-orden-produccion.ts
// Idempotente: crea columna, tablas, índices y FKs; nunca borra datos.
// Correr ANTES del push — el proyecto GET ya selecciona proyectos."ordenToken".
// Columnas en camelCase citado porque los modelos Prisma no usan @map en los campos.
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
config({ path: process.env.ENV_FILE || process.env.ENVF || ".env.prod.backup" });
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  // 1. Token público de la orden, en el proyecto.
  await sql.query(`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "ordenToken" TEXT`);
  await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS "proyectos_ordenToken_key" ON proyectos("ordenToken")`);

  // 2. Verificadores: primero, porque las otras dos tablas lo referencian.
  await sql.query(`
    CREATE TABLE IF NOT EXISTS proyecto_carga_verificadores (
      id TEXT PRIMARY KEY,
      "proyectoId" TEXT NOT NULL,
      tipo TEXT NOT NULL,
      nombre TEXT NOT NULL,
      "tecnicoId" TEXT,
      empresa TEXT,
      telefono TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await sql.query(`CREATE INDEX IF NOT EXISTS "proyecto_carga_verificadores_proyectoId_idx" ON proyecto_carga_verificadores("proyectoId")`);

  // 3. Pases de carga.
  await sql.query(`
    CREATE TABLE IF NOT EXISTS proyecto_cargas (
      id TEXT PRIMARY KEY,
      "proyectoId" TEXT NOT NULL,
      tipo TEXT NOT NULL,
      etiqueta TEXT,
      estado TEXT NOT NULL DEFAULT 'EN_CURSO',
      "notaCierre" TEXT,
      "cerradaEn" TIMESTAMP(3),
      "abiertoPorId" TEXT,
      "cerradaPorId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await sql.query(`CREATE INDEX IF NOT EXISTS "proyecto_cargas_proyectoId_tipo_idx" ON proyecto_cargas("proyectoId", tipo)`);

  // 4. Renglones del pase.
  await sql.query(`
    CREATE TABLE IF NOT EXISTS proyecto_carga_items (
      id TEXT PRIMARY KEY,
      "cargaId" TEXT NOT NULL,
      "proyectoEquipoId" TEXT,
      "riderAccesorioId" TEXT,
      "equipoId" TEXT,
      "esAccesorio" BOOLEAN NOT NULL DEFAULT false,
      descripcion TEXT NOT NULL,
      categoria TEXT,
      "cantidadEsperada" INTEGER NOT NULL DEFAULT 1,
      "cantidadVerificada" INTEGER NOT NULL DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'PENDIENTE',
      nota TEXT,
      "fotoUrl" TEXT,
      "marcadoEn" TIMESTAMP(3),
      "fallaId" TEXT,
      orden INTEGER NOT NULL DEFAULT 0,
      "marcadoPorId" TEXT
    )`);
  await sql.query(`CREATE INDEX IF NOT EXISTS "proyecto_carga_items_cargaId_idx" ON proyecto_carga_items("cargaId")`);

  const fks: [string, string, string][] = [
    ["proyecto_carga_verificadores", "proyecto_carga_verificadores_proyectoId_fkey", `FOREIGN KEY ("proyectoId") REFERENCES proyectos(id) ON DELETE CASCADE ON UPDATE CASCADE`],
    ["proyecto_carga_verificadores", "proyecto_carga_verificadores_tecnicoId_fkey", `FOREIGN KEY ("tecnicoId") REFERENCES tecnicos(id) ON DELETE SET NULL ON UPDATE CASCADE`],
    ["proyecto_cargas", "proyecto_cargas_proyectoId_fkey", `FOREIGN KEY ("proyectoId") REFERENCES proyectos(id) ON DELETE CASCADE ON UPDATE CASCADE`],
    ["proyecto_cargas", "proyecto_cargas_abiertoPorId_fkey", `FOREIGN KEY ("abiertoPorId") REFERENCES proyecto_carga_verificadores(id) ON DELETE SET NULL ON UPDATE CASCADE`],
    ["proyecto_cargas", "proyecto_cargas_cerradaPorId_fkey", `FOREIGN KEY ("cerradaPorId") REFERENCES proyecto_carga_verificadores(id) ON DELETE SET NULL ON UPDATE CASCADE`],
    ["proyecto_carga_items", "proyecto_carga_items_cargaId_fkey", `FOREIGN KEY ("cargaId") REFERENCES proyecto_cargas(id) ON DELETE CASCADE ON UPDATE CASCADE`],
    ["proyecto_carga_items", "proyecto_carga_items_marcadoPorId_fkey", `FOREIGN KEY ("marcadoPorId") REFERENCES proyecto_carga_verificadores(id) ON DELETE SET NULL ON UPDATE CASCADE`],
  ];
  for (const [tabla, nombre, def] of fks) {
    await sql.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${nombre}') THEN
          ALTER TABLE ${tabla} ADD CONSTRAINT "${nombre}" ${def};
        END IF;
      END $$;`);
  }

  for (const t of ["proyecto_carga_verificadores", "proyecto_cargas", "proyecto_carga_items"]) {
    const cols = await sql.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
      [t]
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log(`OK ${t}:`, cols.map((r: any) => r.column_name).join(", ") || "(vacía — revisar)");
  }
  const tok = await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'proyectos' AND column_name = 'ordenToken'`
  );
  console.log("OK proyectos.ordenToken:", tok.length ? "presente" : "FALTA — revisar");
}
main().catch((e) => { console.error(e); process.exit(1); });
