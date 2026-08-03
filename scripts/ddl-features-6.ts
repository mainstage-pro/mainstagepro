import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);
async function main() {
  await sql.query(`ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "noRealizada" BOOLEAN NOT NULL DEFAULT false`);
  await sql.query(`ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "motivoNoRealizada" TEXT`);
  await sql.query(`ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "justificacionNoRealizada" TEXT`);
  await sql.query(`ALTER TABLE "proyectos_internos" ADD COLUMN IF NOT EXISTS "esPrivado" BOOLEAN NOT NULL DEFAULT false`);
  await sql.query(`CREATE TABLE IF NOT EXISTS "proyecto_interno_acceso" (
    "id" TEXT PRIMARY KEY,
    "proyectoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS "proyecto_interno_acceso_proyectoId_userId_key" ON "proyecto_interno_acceso"("proyectoId","userId")`);
  const cols = await sql.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'tareas' AND column_name IN ('noRealizada','motivoNoRealizada','justificacionNoRealizada') ORDER BY column_name`);
  const pcol = await sql.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'proyectos_internos' AND column_name = 'esPrivado'`);
  const tbl = await sql.query(`SELECT table_name FROM information_schema.tables WHERE table_name = 'proyecto_interno_acceso'`);
  console.log("OK tareas cols:", cols.map((r: any) => r.column_name).join(", "));
  console.log("OK proyectos_internos esPrivado:", pcol.length ? "sí" : "NO");
  console.log("OK tabla acceso:", tbl.length ? "sí" : "NO");
}
main().catch((e) => { console.error(e); process.exit(1); });
