import { neon } from "@neondatabase/serverless";

// Mueve las tareas de secciones "Tareas en espera" a la bandeja (enBandeja=true,
// sin sección, área según el proyecto) y suelta las de "Tareas de la semana"
// (seccionId=null). Dry-run por defecto; pasa --apply para ejecutar.
const DATABASE_URL = "postgresql://neondb_owner:npg_0qjmIyDp6kHc@ep-noisy-firefly-an5vzlqv-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=30&pool_timeout=30&connection_limit=1";
const APPLY = process.argv.includes("--apply");
const sql = neon(DATABASE_URL);

function norm(s) { return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase(); }
function areaDeProyecto(nombre) {
  const n = norm(nombre);
  if (n.includes("DIRECCION")) return "DIRECCION";
  if (n.includes("ADMINISTRA")) return "ADMINISTRACION";
  if (n.includes("MARKETING")) return "MARKETING";
  if (n.includes("COMERCIAL") || n.includes("VENTAS")) return "VENTAS";
  if (n.includes("PRODUCCION")) return "PRODUCCION";
  return null;
}

async function main() {
  console.log(APPLY ? "🚀 APLICANDO migración…\n" : "🔍 DRY-RUN (nada se muta). Usa --apply para ejecutar.\n");

  const espera = await sql`
    SELECT s.id, s.nombre, p.nombre AS proyecto
    FROM tarea_secciones s JOIN tarea_proyectos p ON p.id = s."proyectoId"
    WHERE s."tipoModulo" = 'TAREA' AND s.nombre ILIKE '%espera%'
    ORDER BY p.nombre`;
  const semana = await sql`
    SELECT s.id, s.nombre, p.nombre AS proyecto
    FROM tarea_secciones s JOIN tarea_proyectos p ON p.id = s."proyectoId"
    WHERE s."tipoModulo" = 'TAREA' AND s.nombre ILIKE '%semana%'
    ORDER BY p.nombre`;

  console.log(`── "Tareas en espera" → bandeja (${espera.length} secciones) ──`);
  let totalMov = 0;
  for (const s of espera) {
    const area = areaDeProyecto(s.proyecto);
    const [{ n }] = await sql`
      SELECT COUNT(*)::int AS n FROM tareas
      WHERE "seccionId" = ${s.id} AND "parentId" IS NULL AND estado NOT IN ('COMPLETADA','CANCELADA')`;
    console.log(`  • ${s.proyecto} / "${s.nombre}": ${n} tareas → ${area ?? "(conserva área actual)"}`);
    totalMov += n;
    if (APPLY && n > 0) {
      if (area) {
        await sql`UPDATE tareas SET "enBandeja" = true, "seccionId" = NULL, area = ${area}
          WHERE "seccionId" = ${s.id} AND "parentId" IS NULL AND estado NOT IN ('COMPLETADA','CANCELADA')`;
      } else {
        await sql`UPDATE tareas SET "enBandeja" = true, "seccionId" = NULL
          WHERE "seccionId" = ${s.id} AND "parentId" IS NULL AND estado NOT IN ('COMPLETADA','CANCELADA')`;
      }
    }
  }

  console.log(`\n── "Tareas de la semana" → sueltas bajo "1. Tareas" (${semana.length} secciones) ──`);
  let totalSem = 0;
  for (const s of semana) {
    const [{ n }] = await sql`
      SELECT COUNT(*)::int AS n FROM tareas WHERE "seccionId" = ${s.id} AND "parentId" IS NULL`;
    console.log(`  • ${s.proyecto} / "${s.nombre}": ${n} tareas`);
    totalSem += n;
    if (APPLY && n > 0) {
      await sql`UPDATE tareas SET "seccionId" = NULL WHERE "seccionId" = ${s.id} AND "parentId" IS NULL`;
    }
  }

  console.log(`\n${APPLY ? "✅ Aplicado" : "📊 Previsto"}: ${totalMov} tareas a bandeja, ${totalSem} sueltas de la semana.`);
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
