import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: process.env.ENV_FILE || ".env.prod.backup" });

// Entidad raíz de Mainstage Creative. Sin FK a proyectos (Pro): solo cuelga de
// las entidades de origen compartidas (cliente/artista/trato/gira), igual que
// gira_shows es el único puente angosto entre Gira y Proyecto.
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS proyectos_creativos (
      "id" TEXT NOT NULL,
      "numero" TEXT NOT NULL,
      "nombre" TEXT NOT NULL,
      "clienteId" TEXT REFERENCES clientes(id) ON DELETE SET NULL,
      "artistaId" TEXT REFERENCES artistas(id) ON DELETE SET NULL,
      "tratoId" TEXT REFERENCES tratos(id) ON DELETE SET NULL,
      "giraId" TEXT REFERENCES giras(id) ON DELETE SET NULL,
      "estado" TEXT NOT NULL DEFAULT 'BRIEF',
      "briefing" TEXT,
      "notas" TEXT,
      "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "fechaEntrega" TIMESTAMP(3),
      "activo" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "proyectos_creativos_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "proyectos_creativos_numero_key" UNIQUE ("numero")
    )
  `);

  await sql.query(
    `ALTER TABLE servicios_pm ADD COLUMN IF NOT EXISTS "unidad" TEXT NOT NULL DEFAULT 'LIVE'`,
  );
  await sql.query(
    `ALTER TABLE propuestas_servicio ADD COLUMN IF NOT EXISTS "subtotalDiseno" DOUBLE PRECISION NOT NULL DEFAULT 0`,
  );
  await sql.query(
    `ALTER TABLE propuestas_servicio ADD COLUMN IF NOT EXISTS "proyectoCreativoId" TEXT REFERENCES proyectos_creativos(id) ON DELETE SET NULL`,
  );

  const tabla = await sql.query(
    `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_name = 'proyectos_creativos'`,
  );
  const cols = await sql.query(
    `SELECT table_name, column_name FROM information_schema.columns
      WHERE (table_name='servicios_pm' AND column_name = 'unidad')
         OR (table_name='propuestas_servicio' AND column_name IN ('subtotalDiseno','proyectoCreativoId'))
      ORDER BY table_name, column_name`,
  );
  console.log(`Tabla proyectos_creativos: ${tabla[0].n ? "OK" : "FALTA"}`);
  console.log(`Columnas nuevas: ${cols.map((r: Record<string, unknown>) => `${r.table_name}.${r.column_name}`).join(", ")}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
