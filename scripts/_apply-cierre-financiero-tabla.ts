// Crea la tabla del cierre financiero diario (modelo CierreFinancieroDiario)
// en prod. DDL aditivo vía driver neon() HTTP — el pooler TCP de Prisma no
// conecta desde local.
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
    CREATE TABLE IF NOT EXISTS "cierres_financieros_diarios" (
      "id" TEXT PRIMARY KEY,
      "fecha" DATE NOT NULL,
      "diaSemana" TEXT NOT NULL,
      "totalBancos" DOUBLE PRECISION NOT NULL,
      "porCobrar" DOUBLE PRECISION NOT NULL,
      "porPagar" DOUBLE PRECISION NOT NULL,
      "posicion" DOUBLE PRECISION NOT NULL,
      "cobradoHoy" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "pagadoHoy" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "cxcVencidaTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "cxcVencidaN" INTEGER NOT NULL DEFAULT 0,
      "cxpVencidaTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "cxpVencidaN" INTEGER NOT NULL DEFAULT 0,
      "pasivosExternosTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "gastosRecurrentesPendientesTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "nominaPendienteTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "detalle" TEXT NOT NULL,
      "generadoPor" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS "cierres_financieros_diarios_fecha_key" ON "cierres_financieros_diarios" ("fecha");`);

  console.log("Tabla cierres_financieros_diarios lista en prod.");
}
main().catch((e) => { console.error(e); process.exit(1); });
