import { neon } from "@neondatabase/serverless";

// Las tareas movidas a la Bandeja de entrada (enBandeja=true) deben quedar SUELTAS
// para aparecer en la vista "bandeja" de Operaciones (que filtra proyectoTareaId
// e iniciativaId NULL). Conserva el campo `area` para agruparlas en sus secciones.
// Dry-run por defecto; pasa --apply para ejecutar.
const DATABASE_URL = "postgresql://neondb_owner:npg_0qjmIyDp6kHc@ep-noisy-firefly-an5vzlqv-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=30&pool_timeout=30&connection_limit=1";
const APPLY = process.argv.includes("--apply");
const sql = neon(DATABASE_URL);

async function main() {
  console.log(APPLY ? "🚀 APLICANDO…\n" : "🔍 DRY-RUN (nada se muta). Usa --apply.\n");

  const antes = await sql`
    SELECT area, COUNT(*)::int AS n,
           SUM(CASE WHEN "proyectoTareaId" IS NOT NULL THEN 1 ELSE 0 END)::int AS con_proyecto
    FROM tareas WHERE "enBandeja" = true
    GROUP BY area ORDER BY area`;
  console.log("── Tareas enBandeja=true por área ──");
  let total = 0;
  for (const r of antes) { console.log(`  • ${r.area ?? "(null)"}: ${r.n} (con proyecto: ${r.con_proyecto})`); total += r.n; }
  console.log(`  Total: ${total}\n`);

  if (APPLY) {
    const r = await sql`
      UPDATE tareas SET "proyectoTareaId" = NULL, "iniciativaId" = NULL, "seccionId" = NULL
      WHERE "enBandeja" = true`;
    console.log("✅ Tareas soltadas (proyectoTareaId/iniciativaId/seccionId = NULL).");
    const check = await sql`
      SELECT COUNT(*)::int AS n FROM tareas
      WHERE "enBandeja" = true AND ("proyectoTareaId" IS NOT NULL OR "iniciativaId" IS NOT NULL)`;
    console.log(`   Restantes con vínculo (debe ser 0): ${check[0].n}`);
  }
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
