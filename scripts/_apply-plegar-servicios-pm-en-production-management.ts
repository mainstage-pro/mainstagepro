/**
 * Fase 4 (Grupo Mainstage / esquema comercial de Live): Production Management
 * deja de ser 6 líneas sueltas del catálogo `ServicioPM` y pasa a ser UN
 * servicio con un checklist de alcance (ver `scripts/seed-servicios-pm.ts`,
 * clave PM_GIRA, ya reescrito). Estas 6 claves no se borran — se archivan con
 * `activo = false` para no perder historial de `PropuestaServicioLinea` que ya
 * las haya usado, y para que una resiembra futura no las resucite (el
 * `ON CONFLICT DO UPDATE` de seed-servicios-pm.ts nunca toca `activo`).
 *
 * `DIA_VIAJE` NO se incluye: sigue siendo un renglón de cobro aparte (día de
 * traslado/día muerto), no una tarea dentro del alcance de PM.
 *
 *   ENV_FILE=.env.prod.backup npx tsx scripts/_apply-plegar-servicios-pm-en-production-management.ts
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

const CLAVES_A_PLEGAR = [
  "ADVANCE_PLAZA",
  "COORD_PROVEEDORES",
  "PREPRODUCCION",
  "LOGISTICA_TOUR",
  "DOCUMENTACION_TOUR",
  "ADVANCE_HORA",
];

async function main() {
  const antes = await sql`
    SELECT clave, nombre, activo FROM servicios_pm WHERE clave = ANY(${CLAVES_A_PLEGAR})
  `;
  if (antes.length !== CLAVES_A_PLEGAR.length) {
    throw new Error(`Esperaba ${CLAVES_A_PLEGAR.length} servicios, encontré ${antes.length}`);
  }

  const respaldo = `scripts/_backup-plegar-servicios-pm-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(respaldo, JSON.stringify(antes, null, 2));
  console.log(`Respaldo: ${respaldo}`);

  await sql`
    UPDATE servicios_pm SET activo = false, "updatedAt" = NOW() WHERE clave = ANY(${CLAVES_A_PLEGAR})
  `;

  const despues = await sql`
    SELECT clave, nombre, activo FROM servicios_pm WHERE clave = ANY(${CLAVES_A_PLEGAR})
  `;
  for (const f of despues) {
    console.log(`${f.activo === false ? "OK " : "MAL"} ${f.clave}: activo=${f.activo} (${f.nombre})`);
  }
}

main();
