/**
 * Fase 4 (Grupo Mainstage / esquema comercial de Live): bloque de
 * "responsabilidad de gastos" en la propuesta de servicios (sección 2.6 de
 * docs/grupo-mainstage-fase4-esquema-comercial.md). Agrega a
 * `propuestas_servicio` una columna nueva, nullable, aditiva — sin tocar
 * datos existentes — para guardar, por línea de gasto (transporte, hospedaje,
 * viáticos comida, viáticos generales), quién lo corre: incluido en el
 * precio de Mainstage, por cuenta del promotor, o por cuenta del management
 * del artista. Se guarda como JSON stringificado (mismo patrón que
 * Gira.rolMainstage) porque el concepto nace como texto libre por línea, no
 * como enum cerrado (ver sección 2.6 del documento).
 *
 * Ver prisma/schema.prisma (modelo PropuestaServicio) y src/lib/giras.ts
 * (RESPONSABLES_GASTO / GASTOS_RESPONSABILIDAD_DEFAULT) para los valores.
 *
 *   ENV_FILE=.env.prod.backup npx tsx scripts/_apply-responsabilidad-gastos-propuesta.ts
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
  await sql`ALTER TABLE propuestas_servicio ADD COLUMN IF NOT EXISTS "responsabilidadGastos" TEXT`;
  console.log("OK: columna responsabilidadGastos lista en propuestas_servicio");

  const check = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'propuestas_servicio' AND column_name = 'responsabilidadGastos'
  `;
  console.log(check);
}

main();
