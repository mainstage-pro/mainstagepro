/**
 * Fase 4 (Grupo Mainstage): checklist operativo de Creative. Clona el patrón
 * real de Gira (Tarea.giraId, tipoOrigen GIRA, sin tablero/modelo nuevo) para
 * ligar tareas internas a un ProyectoCreativo. Columna aditiva, nullable:
 *
 *   - proyectoCreativoId: liga la Tarea al proyecto creativo (checklist
 *     operativo real que el usuario opera, no el modelo fantasma
 *     GiraChecklistItem). Ver NuevaTareaModal.tsx (tipo PROYECTO_CREATIVO) y
 *     src/app/api/proyectos-creativos/[id]/tareas/route.ts.
 *
 * Ver prisma/schema.prisma (modelo Tarea) y
 * docs/grupo-mainstage-fase4-esquema-comercial.md.
 *
 *   ENV_FILE=.env.prod.backup npx tsx scripts/_apply-tarea-proyecto-creativo.ts
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: process.env.ENV_FILE || ".env.prod.backup" });
const url = process.env
  .DATABASE_URL!.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "")
  .replace(/\?&/, "?")
  .replace(/\?$/, "");
const sql = neon(url);

async function main() {
  await sql`ALTER TABLE tareas ADD COLUMN IF NOT EXISTS "proyectoCreativoId" TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS tareas_proyectoCreativoId_idx ON tareas("proyectoCreativoId")`;
  console.log("OK: columna proyectoCreativoId + índice listos en tareas");

  const check = await sql`
    SELECT column_name, column_default FROM information_schema.columns
    WHERE table_name = 'tareas' AND column_name = 'proyectoCreativoId'
  `;
  console.log(check);
}

main();
