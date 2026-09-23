/**
 * DDL aditivo para el módulo de Gastos Recurrentes (commit 93aa508b).
 *
 * El código se desplegó sin aplicar el schema en producción: CuentaPagar ganó
 * "gastoRecurrenteId" y "periodoGastoId", así que cualquier lectura de
 * cuentas_pagar truena y tumba finanzas. Todo aquí es idempotente.
 *
 * Los modelos no llevan @map, así que las columnas van en camelCase citado.
 *
 *   npx tsx scripts/ddl-gastos-recurrentes.ts
 */
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: process.env.ENV_FILE || ".env.prod.backup" });
const raw = process.env.DATABASE_URL!;
const sql = neon(raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, ""));

const STATEMENTS: [string, string][] = [
  ["gastos_recurrentes", `
    CREATE TABLE IF NOT EXISTS gastos_recurrentes (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      "proveedorId" TEXT REFERENCES proveedores(id),
      "empresaId" TEXT REFERENCES empresas(id),
      "acreedorLibre" TEXT,
      "tipoMonto" TEXT NOT NULL DEFAULT 'FIJO',
      "montoBase" DOUBLE PRECISION,
      frecuencia TEXT NOT NULL,
      "fechaInicio" TIMESTAMP(3) NOT NULL,
      "fechaFin" TIMESTAMP(3),
      "diaVencimiento" INTEGER,
      "categoriaId" TEXT REFERENCES categorias_financieras(id),
      "proyectoId" TEXT REFERENCES proyectos(id),
      estado TEXT NOT NULL DEFAULT 'ACTIVO',
      "ultimaGeneracion" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`],
  ["periodos_gasto_recurrente", `
    CREATE TABLE IF NOT EXISTS periodos_gasto_recurrente (
      id TEXT PRIMARY KEY,
      "gastoRecurrenteId" TEXT NOT NULL REFERENCES gastos_recurrentes(id) ON DELETE CASCADE,
      periodo TEXT NOT NULL,
      "fechaInicio" TIMESTAMP(3) NOT NULL,
      "fechaVencimiento" TIMESTAMP(3) NOT NULL,
      "montoEstimado" DOUBLE PRECISION,
      "montoConfirmado" DOUBLE PRECISION,
      estado TEXT NOT NULL DEFAULT 'PENDIENTE_IMPORTE',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`],
  ["periodos unique", `CREATE UNIQUE INDEX IF NOT EXISTS periodos_gasto_recurrente_gasto_periodo_key
     ON periodos_gasto_recurrente ("gastoRecurrenteId", periodo)`],
  ["gastos_recurrentes_historial", `
    CREATE TABLE IF NOT EXISTS gastos_recurrentes_historial (
      id TEXT PRIMARY KEY,
      "gastoRecurrenteId" TEXT NOT NULL REFERENCES gastos_recurrentes(id) ON DELETE CASCADE,
      cambio TEXT NOT NULL,
      "creadoPor" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`],
  ["cxp.gastoRecurrenteId", `ALTER TABLE cuentas_pagar ADD COLUMN IF NOT EXISTS "gastoRecurrenteId" TEXT`],
  ["cxp.periodoGastoId", `ALTER TABLE cuentas_pagar ADD COLUMN IF NOT EXISTS "periodoGastoId" TEXT`],
  ["cxp.periodoGastoId unique", `CREATE UNIQUE INDEX IF NOT EXISTS cuentas_pagar_periodoGastoId_key
     ON cuentas_pagar ("periodoGastoId")`],
  ["cxp fk gasto", `DO $$ BEGIN
      ALTER TABLE cuentas_pagar ADD CONSTRAINT cuentas_pagar_gastoRecurrenteId_fkey
        FOREIGN KEY ("gastoRecurrenteId") REFERENCES gastos_recurrentes(id);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`],
  ["cxp fk periodo", `DO $$ BEGIN
      ALTER TABLE cuentas_pagar ADD CONSTRAINT cuentas_pagar_periodoGastoId_fkey
        FOREIGN KEY ("periodoGastoId") REFERENCES periodos_gasto_recurrente(id);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`],
];

async function main() {
  for (const [nombre, stmt] of STATEMENTS) {
    try {
      await sql.query(stmt);
      console.log(`  ✓ ${nombre}`);
    } catch (e) {
      console.error(`  ✗ ${nombre}: ${(e as Error).message}`);
      process.exit(1);
    }
  }
  const r = (await sql.query(`SELECT COUNT(*)::int AS n FROM cuentas_pagar WHERE "periodoGastoId" IS NULL`)) as Record<string, unknown>[];
  console.log(`\ncuentas_pagar legible: ${r[0].n} fila(s).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
