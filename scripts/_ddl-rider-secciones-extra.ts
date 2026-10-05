// DDL aditivo: ArtistaRider.seccionesExtra (secciones libres del rider del artista).
// El pooler TCP de Prisma no conecta desde local; se usa el driver HTTP de Neon.
//
// Correr ANTES del push: la columna entra al modelo Prisma, así que cualquier
// lectura sin `select` explícito la pide y truena con 500 si no existe todavía.
//
// Columna en camelCase citado, no snake_case: el modelo no lleva @map.
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.prod.backup" });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  await sql`
    ALTER TABLE artista_riders
    ADD COLUMN IF NOT EXISTS "seccionesExtra" jsonb NOT NULL DEFAULT '[]'::jsonb
  `;

  const col = await sql`
    select column_name, data_type, column_default
    from information_schema.columns
    where table_name = 'artista_riders' and column_name = 'seccionesExtra'
  `;
  console.log(col.length === 1 ? "OK" : "FALTA", col);
}

main();
