import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const ENV_FILE = process.env.ENV_FILE || ".env.prod.backup";
const sql = neon(readFileSync(ENV_FILE, "utf-8").match(/^DATABASE_URL="?([^"\n]+)"?/m)[1]);

// Alcance: por defecto solo el proyecto Expo Supraterra. Pasa --all para todos los proyectos.
const PROYECTO_ID = "cmr3za8lr0002uzncpsfcrqtu";
const ALL = process.argv.includes("--all");
const APPLY = process.argv.includes("--apply");

function parse(desc) {
  const d = desc ?? "";
  const mFecha = d.match(/·\s*(\d{4}-\d{2}-\d{2})/);
  const mFase = d.match(/\(\s*(Montaje|Desmontaje|Operaci[óo]n)\b/i);
  let participacion = "OPERACION";
  if (mFase) {
    const f = mFase[1].toLowerCase();
    participacion = f.startsWith("montaje") ? "MONTAJE" : f.startsWith("desmontaje") ? "DESMONTAJE" : "OPERACION";
  }
  return { fechaJornada: mFecha ? mFecha[1] : null, participacion };
}

console.log(`BD: ${ENV_FILE} | alcance: ${ALL ? "TODOS los proyectos" : "solo Expo Supraterra"} | modo: ${APPLY ? "APLICAR" : "DRY-RUN"}\n`);

// Solo tocamos slots con fechaJornada NULL (los que dejó el bug) y con fecha embebida en responsabilidad.
const rows = ALL
  ? await sql`SELECT id, "proyectoId", responsabilidad, participacion, "fechaJornada" FROM proyecto_personal WHERE "fechaJornada" IS NULL AND responsabilidad ~ '·\\s*\\d{4}-\\d{2}-\\d{2}'`
  : await sql`SELECT id, "proyectoId", responsabilidad, participacion, "fechaJornada" FROM proyecto_personal WHERE "proyectoId" = ${PROYECTO_ID} AND "fechaJornada" IS NULL AND responsabilidad ~ '·\\s*\\d{4}-\\d{2}-\\d{2}'`;

console.log(`Slots candidatos: ${rows.length}\n`);
let cambios = 0;
for (const r of rows) {
  const { fechaJornada, participacion } = parse(r.responsabilidad);
  if (!fechaJornada) continue;
  console.log(`  ${r.id}  "${r.responsabilidad}"  ->  fechaJornada=${fechaJornada} participacion=${participacion}`);
  if (APPLY) {
    await sql`UPDATE proyecto_personal SET "fechaJornada" = ${fechaJornada}, participacion = ${participacion} WHERE id = ${r.id}`;
  }
  cambios++;
}
console.log(`\n${APPLY ? "Actualizados" : "Se actualizarían"}: ${cambios} slots.`);
if (!APPLY) console.log("(Ejecuta con --apply para escribir.)");
