import { config } from "dotenv";
config({ path: process.env.ENV_FILE || ".env.prod.backup" });
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join } from "path";

const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const TABLAS = [
  "artista_personas", "artista_riders", "artista_rider_canales", "artista_rider_lineas",
  "giras", "gira_shows", "show_rider_lineas", "gira_show_bloques", "gira_crew",
  "gira_hospedajes", "gira_roomings", "gira_viajes", "gira_setlists",
  "gira_setlist_canciones", "gira_archivos", "servicios_pm", "propuestas_servicio",
  "propuesta_servicio_lineas", "venue_inventario",
];

async function main() {
  const script = readFileSync(join(__dirname, "ddl-giras.sql"), "utf8");
  const sentencias = script
    .split(";")
    .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
    .filter(Boolean);

  let aplicadas = 0;
  let yaExistian = 0;

  for (const sentencia of sentencias) {
    try {
      await sql.query(sentencia);
      aplicadas++;
    } catch (e) {
      // Las FK no soportan IF NOT EXISTS: re-correr el script debe ser inofensivo
      const msg = e instanceof Error ? e.message : String(e);
      if (/already exists|ya existe/i.test(msg)) {
        yaExistian++;
        continue;
      }
      console.error("\nFALLÓ:", sentencia.slice(0, 160));
      throw e;
    }
  }

  console.log(`Sentencias aplicadas: ${aplicadas} · ya existían: ${yaExistian}`);

  const presentes = await sql.query(
    `SELECT table_name FROM information_schema.tables WHERE table_name = ANY($1)`,
    [TABLAS],
  );
  const faltan = TABLAS.filter((t) => !presentes.some((r: Record<string, unknown>) => r.table_name === t));
  console.log(`Tablas verificadas: ${presentes.length}/${TABLAS.length}`);
  if (faltan.length) {
    console.error("FALTAN:", faltan.join(", "));
    process.exit(1);
  }

  const cols = await sql.query(
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE (table_name='artistas' AND column_name IN ('clienteId','logoUrl','tipoFormacion','integrantesNum'))
        OR (table_name='venues' AND column_name IN ('contactoTecnicoNombre','medidasEscenario','alturaRejaM','riderCasaUrl'))
        OR (table_name='proveedores' AND column_name IN ('ciudades','disciplinas'))
     ORDER BY table_name, column_name`,
  );
  console.log(`Columnas nuevas en tablas vivas: ${cols.length}/10`);
  console.log(cols.map((r: Record<string, unknown>) => `${r.table_name}.${r.column_name}`).join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
