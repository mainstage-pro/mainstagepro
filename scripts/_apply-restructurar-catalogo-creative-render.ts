/**
 * Fase 4 (Grupo Mainstage / esquema comercial de Creative): el render de
 * producción deja de venderse como 2 líneas sueltas ("Render de producción" +
 * "Diseño y concepto del evento") y pasa a ser 3 niveles por cantidad de
 * fixtures (RENDER_NIVEL_A/AA/AAA, ya reescritos en
 * scripts/seed-servicios-pm.ts) con documentación técnica y diseño conceptual
 * empaquetados en el precio — ver docs/grupo-mainstage-fase4-esquema-comercial.md §3.
 *
 * `RENDER_PRODUCCION` y `DISENO_CONCEPTO` no se borran — se archivan con
 * `activo = false` para no perder historial de `PropuestaServicioLinea` que ya
 * las haya usado, y para que una resiembra futura no las resucite (el
 * `ON CONFLICT DO UPDATE` de seed-servicios-pm.ts nunca toca `activo`).
 *
 * `PLANO_MONTAJE` NO se incluye: sigue siendo un entregable aparte (layout de
 * sitio/logística de montaje, no documentación de iluminación).
 *
 *   ENV_FILE=.env.prod.backup npx tsx scripts/_apply-restructurar-catalogo-creative-render.ts
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

const CLAVES_A_PLEGAR = ["RENDER_PRODUCCION", "DISENO_CONCEPTO"];

async function main() {
  const antes = await sql`
    SELECT clave, nombre, activo FROM servicios_pm WHERE clave = ANY(${CLAVES_A_PLEGAR})
  `;
  if (antes.length !== CLAVES_A_PLEGAR.length) {
    throw new Error(`Esperaba ${CLAVES_A_PLEGAR.length} servicios, encontré ${antes.length}`);
  }

  const respaldo = `scripts/_backup-restructurar-catalogo-creative-render-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
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
