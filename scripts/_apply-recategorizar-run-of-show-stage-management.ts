/**
 * Fase 4 (Grupo Mainstage / esquema comercial de Live): al construir el
 * servicio independiente "Stage Management" (PM/TM/SM combinables, ver
 * docs/grupo-mainstage-fase4-esquema-comercial.md §2.3) se descubrió que
 * Mauricio ya había dado de alta ese mismo alcance directo desde
 * /giras/servicios el 2026-10-29, con la clave `RUN_OF_SHOW` ("Run of show:
 * soundcheck y stage"), categoría PRODUCTION_MANAGEMENT. Este script:
 *
 * 1. Borra la fila `STAGE_MANAGEMENT_GIRA` que se creó por error (duplicaba
 *    el alcance de RUN_OF_SHOW; cero usos en propuesta, se verificó antes).
 * 2. Recategoriza RUN_OF_SHOW a la categoría nueva STAGE_MANAGEMENT, le pone
 *    el nombre de venta "Stage Management" (igual que Production Management
 *    y Tour Management) y amplía su alcance con lo que ya traía el borrador
 *    descartado: coordinación de crew local de escenario y resolución de
 *    contingencias en tiempo real. La clave de código NO cambia (RUN_OF_SHOW
 *    sigue siendo el identificador interno, igual que PM_GIRA no se llama
 *    "PRODUCTION_MANAGEMENT").
 *
 *   ENV_FILE=.env.prod.backup npx tsx scripts/_apply-recategorizar-run-of-show-stage-management.ts
 */
import { config } from "dotenv";
import { writeFileSync } from "fs";
import { neon } from "@neondatabase/serverless";

config({ path: process.env.ENV_FILE || ".env.prod.backup" });
const url = process.env
  .DATABASE_URL!.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "")
  .replace(/\?&/, "?")
  .replace(/\?$/, "");
const sql = neon(url);

const NOMBRE = "Stage Management";
const DESCRIPCION =
  "Responsable del escenario el día del show: corre el stage call, llama los cambios y resuelve en tiempo real lo que se tuerza en montaje, soundcheck o show. Trabaja con el crew local que pone el venue o el promotor. Servicio independiente — se vende solo (un día de show) o junto con Production Management y/o Tour Management.";
const INCLUYE = [
  "Armado y conducción del running order de soundcheck",
  "Comunicación de horarios a artista, crew y casa",
  "Llamado de cues durante el show: entradas, cambios entre bloques, salida",
  "Coordinación en tiempo real con los demás técnicos en escena",
  "Coordinación del crew local de escenario que pone el venue o el promotor",
  "Resolución de contingencias de escenario en tiempo real",
].join("\n");
const NO_INCLUYE = [
  "Diseño del show o del setlist",
  "Operación de audio, iluminación o visuales (son servicios aparte)",
  "Advance previo de la plaza y documentación de la gira (es Production Management)",
  "Control de presupuesto y representación frente al promotor (es Tour Management)",
  "Día de viaje y día muerto (renglón aparte)",
].join("\n");

async function main() {
  const antes = await sql`
    SELECT clave, nombre, categoria, descripcion, incluye, "noIncluye"
    FROM servicios_pm WHERE clave IN ('RUN_OF_SHOW', 'STAGE_MANAGEMENT_GIRA')
  `;
  const respaldo = `scripts/_backup-run-of-show-stage-management-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(respaldo, JSON.stringify(antes, null, 2));
  console.log(`Respaldo: ${respaldo}`);

  const usos = await sql`
    SELECT count(*)::int AS n FROM propuesta_servicio_lineas
    WHERE "servicioId" = (SELECT id FROM servicios_pm WHERE clave = 'STAGE_MANAGEMENT_GIRA')
  `;
  if ((usos[0]?.n ?? 0) > 0) {
    throw new Error("STAGE_MANAGEMENT_GIRA ya tiene líneas de propuesta — no se borra, revisar a mano.");
  }
  await sql`DELETE FROM servicios_pm WHERE clave = 'STAGE_MANAGEMENT_GIRA'`;
  console.log("Borrado: STAGE_MANAGEMENT_GIRA (duplicado, sin uso)");

  await sql`
    UPDATE servicios_pm SET
      nombre = ${NOMBRE},
      categoria = 'STAGE_MANAGEMENT',
      descripcion = ${DESCRIPCION},
      incluye = ${INCLUYE},
      "noIncluye" = ${NO_INCLUYE},
      "updatedAt" = NOW()
    WHERE clave = 'RUN_OF_SHOW'
  `;

  const despues = await sql`SELECT clave, nombre, categoria FROM servicios_pm WHERE clave = 'RUN_OF_SHOW'`;
  console.log("RUN_OF_SHOW ahora:", despues[0]);
}

main();
