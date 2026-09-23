/**
 * Retira el área "Operaciones Generales" del plan de trabajo.
 *
 * Su única sub-área ("Ritmo Operativo — Aplica a todos los puestos") no tiene puesto
 * dueño porque aplica a todos, lo que la deja como hueco permanente en la cobertura.
 * Las 8 plantillas que cuelgan de ahí son el ritmo de la empresa, así que se mudan a
 * las sub-áreas de Dirección (dueño: Director general) antes de borrar el área.
 *
 * El borrado es Cascade sobre sub-áreas y plantillas: mover PRIMERO no es opcional.
 *
 *   npx tsx scripts/migrar-operaciones-generales-a-direccion.ts            # ensayo
 *   npx tsx scripts/migrar-operaciones-generales-a-direccion.ts --aplicar  # escribe
 */
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { writeFileSync } from "node:fs";

config({ path: process.env.ENV_FILE || ".env.prod.backup" });
const raw = process.env.DATABASE_URL!;
const sql = neon(raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, ""));

const APLICAR = process.argv.includes("--aplicar");

// Destino de cada plantilla según lo que hace, no según quién la ejecuta:
// el `tipoAsignacion: todos` de cada plantilla sigue repartiendo el trabajo al equipo.
const DESTINO: { subarea: string; plantillas: RegExp }[] = [
  { subarea: "Ritmo de juntas", plantillas: /^Junta/i },
  { subarea: "Control Operativo", plantillas: /^(Reporte General Semanal|Revisión mensual de KPIs)/i },
  { subarea: "Alineación y Desarrollo del Talento", plantillas: /^Sesión de capacitación/i },
];

async function main() {
  const [og] = (await sql.query(
    `SELECT id, nombre FROM pt_areas WHERE codigo = 'GENERAL'`
  )) as { id: string; nombre: string }[];
  if (!og) { console.log("No existe el área GENERAL; nada por hacer."); return; }

  const [dir] = (await sql.query(
    `SELECT id, nombre FROM pt_areas WHERE codigo = 'DIRECCION'`
  )) as { id: string; nombre: string }[];
  if (!dir) throw new Error("No se encontró el área DIRECCION: aborto para no dejar plantillas huérfanas.");

  const subsDir = (await sql.query(
    `SELECT id, nombre FROM pt_subareas WHERE "areaId" = $1`, [dir.id]
  )) as { id: string; nombre: string }[];
  const idPorNombre = new Map(subsDir.map(s => [s.nombre, s.id]));
  for (const d of DESTINO) {
    if (!idPorNombre.has(d.subarea)) throw new Error(`Falta la sub-área destino "${d.subarea}" en ${dir.nombre}.`);
  }

  const subsOg = (await sql.query(
    `SELECT id, nombre FROM pt_subareas WHERE "areaId" = $1`, [og.id]
  )) as { id: string; nombre: string }[];
  const idsOg = subsOg.map(s => s.id);

  const tpls = idsOg.length
    ? (await sql.query(
        `SELECT id, nombre, activa, "areaId", "subAreaId" FROM pt_tarea_templates WHERE "subAreaId" = ANY($1) ORDER BY orden`,
        [idsOg]
      )) as { id: string; nombre: string; activa: boolean; areaId: string; subAreaId: string }[]
    : [];

  // Respaldo del estado previo de todo lo que se toca o se borra.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const archivo = `scripts/_backup-operaciones-generales-${stamp}.json`;
  if (APLICAR) {
    writeFileSync(archivo, JSON.stringify({ area: og, subareas: subsOg, templates: tpls }, null, 2));
    console.log(`Respaldo → ${archivo}\n`);
  }

  console.log(`Área a retirar: ${og.nombre} (${subsOg.length} sub-área(s), ${tpls.length} plantilla(s))\n`);

  const sinDestino: string[] = [];
  let movidas = 0;
  for (const t of tpls) {
    const d = DESTINO.find(x => x.plantillas.test(t.nombre));
    if (!d) { sinDestino.push(t.nombre); continue; }
    const destinoId = idPorNombre.get(d.subarea)!;
    console.log(`  ${t.activa ? "✓" : "✗"} ${t.nombre}\n       → ${dir.nombre} / ${d.subarea}`);
    if (APLICAR) {
      await sql.query(
        `UPDATE pt_tarea_templates SET "areaId" = $1, "subAreaId" = $2 WHERE id = $3`,
        [dir.id, destinoId, t.id]
      );
    }
    movidas++;
  }

  if (sinDestino.length) {
    console.error(`\n⚠ ${sinDestino.length} plantilla(s) sin destino en el mapa:`);
    for (const n of sinDestino) console.error(`    ${n}`);
    console.error("El borrado es Cascade y se las llevaría. Agrega su regla a DESTINO y vuelve a correr.");
    process.exit(1);
  }

  // Ya sin plantillas colgando, el Cascade solo se lleva las sub-áreas vacías.
  const restantes = idsOg.length
    ? (await sql.query(`SELECT COUNT(*)::int AS n FROM pt_tarea_templates WHERE "subAreaId" = ANY($1)`, [idsOg])) as { n: number }[]
    : [{ n: 0 }];
  console.log(`\nPlantillas movidas: ${movidas} · quedan colgando de ${og.nombre}: ${restantes[0].n}`);

  if (!APLICAR) {
    console.log("\nEnsayo: no se escribió nada. Corre con --aplicar.");
    return;
  }
  if (restantes[0].n > 0) {
    console.error("Todavía cuelgan plantillas: no borro el área.");
    process.exit(1);
  }
  await sql.query(`DELETE FROM pt_areas WHERE id = $1`, [og.id]);
  console.log(`Borrado: ${og.nombre} y sus ${subsOg.length} sub-área(s).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
