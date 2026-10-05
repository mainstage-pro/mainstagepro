import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: process.env.ENVF || ".env.prod.backup" });
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const ICONOS: Record<string, string> = {
  PM_GIRA: "Route",
  AUDIO_BANDA: "Speaker",
  ADVANCE_PLAZA: "ClipboardCheck",
  ILUMINACION_SHOW: "Lightbulb",
  VISUALES_SHOW: "MonitorPlay",
  COORD_PROVEEDORES: "Handshake",
  LOGISTICA_TOUR: "Truck",
  DOCUMENTACION_TOUR: "FileText",
  PREPRODUCCION: "CalendarClock",
  DIA_VIAJE: "Plane",
  ADVANCE_HORA: "Clock",
  BACKLINE_COMPLEMENTARIO: "Guitar",
  PM_EVENTO: "Briefcase",
  OPERACIONES_SITIO: "HardHat",
  STAGE_MANAGER: "Theater",
  COORD_FRENTES: "Network",
  RENDER_PRODUCCION: "Box",
  DISENO_CONCEPTO: "Palette",
  PLANO_MONTAJE: "Ruler",
};

async function main() {
  await sql.query(`ALTER TABLE servicios_pm ADD COLUMN IF NOT EXISTS "subcategoria" TEXT`);
  await sql.query(`ALTER TABLE servicios_pm ADD COLUMN IF NOT EXISTS "icono" TEXT NOT NULL DEFAULT 'Briefcase'`);
  await sql.query(`ALTER TABLE servicios_pm ADD COLUMN IF NOT EXISTS "nivelServicio" TEXT NOT NULL DEFAULT 'AMBOS'`);

  for (const [clave, icono] of Object.entries(ICONOS)) {
    await sql.query(`UPDATE servicios_pm SET "icono" = $1 WHERE clave = $2 AND "icono" = 'Briefcase'`, [icono, clave]);
  }
  await sql.query(`UPDATE servicios_pm SET "nivelServicio" = 'GIRA' WHERE orden < 200 AND "nivelServicio" = 'AMBOS'`);
  await sql.query(`UPDATE servicios_pm SET "nivelServicio" = 'EVENTO' WHERE orden >= 200 AND "nivelServicio" = 'AMBOS'`);

  const rows = await sql.query(
    `SELECT clave, icono, "nivelServicio", orden FROM servicios_pm ORDER BY orden`,
  );
  for (const r of rows as Record<string, unknown>[]) {
    console.log(`${String(r.orden).padStart(3)}  ${String(r.clave).padEnd(24)} ${String(r.icono).padEnd(16)} ${r.nivelServicio}`);
  }
  console.log(`OK ${rows.length} servicios`);
}
main().catch((e) => { console.error(e); process.exit(1); });
