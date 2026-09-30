/**
 * Dos correcciones de catálogo:
 *  1. Unifica la marca "MA" → "MA Lighting" (mismo fabricante, dos escrituras).
 *  2. Rellena imagenUrl en equipos que ya existían en el catálogo con otro
 *     proveedor/línea y nacieron sin foto, heredándola de su gemelo marca+modelo.
 *
 * Uso: ENV_FILE=.env.prod.backup npx tsx scripts/fix-marca-ma-e-imagenes-gemelas.ts [--apply]
 */
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { writeFileSync } from "fs";

config({ path: process.env.ENV_FILE ?? ".env" });

const APPLY = process.argv.includes("--apply");
const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const marcaRows = (await sql`
    SELECT id, descripcion, marca, modelo, tipo FROM equipos WHERE marca = 'MA'
  `) as { id: string; descripcion: string; marca: string; modelo: string | null; tipo: string }[];

  const huerfanos = (await sql`
    SELECT e.id, e.descripcion, e.marca, e.modelo, e.tipo,
           (SELECT g."imagenUrl" FROM equipos g
              WHERE lower(trim(g.marca)) = lower(trim(e.marca))
                AND lower(trim(g.modelo)) = lower(trim(e.modelo))
                AND g."imagenUrl" IS NOT NULL
              ORDER BY g."createdAt" ASC LIMIT 1) AS imagen_gemela
      FROM equipos e
     WHERE e."imagenUrl" IS NULL
       AND e.marca IS NOT NULL AND trim(e.marca) <> ''
       AND e.modelo IS NOT NULL AND trim(e.modelo) <> ''
  `) as { id: string; descripcion: string; marca: string; modelo: string; tipo: string; imagen_gemela: string | null }[];

  const conGemelo = huerfanos.filter((e) => e.imagen_gemela);

  console.log(`Marca "MA" → "MA Lighting": ${marcaRows.length} equipo(s)`);
  for (const r of marcaRows) console.log(`  · ${r.descripcion} [${r.tipo}] ${r.modelo ?? "—"}`);

  console.log(`\nImágenes a heredar: ${conGemelo.length} equipo(s)`);
  for (const r of conGemelo) console.log(`  · ${r.descripcion} [${r.tipo}] ${r.marca} ${r.modelo}`);

  if (!APPLY) {
    console.log("\nDry run. Corre con --apply para escribir.");
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(
    `scripts/_backup-marca-ma-imagenes-${stamp}.json`,
    JSON.stringify({ marcaRows, conGemelo: conGemelo.map(({ imagen_gemela, ...r }) => ({ ...r, heredaDe: imagen_gemela?.slice(0, 60) })) }, null, 2)
  );

  if (marcaRows.length) {
    await sql`UPDATE equipos SET marca = 'MA Lighting', "updatedAt" = now() WHERE marca = 'MA'`;
  }
  for (const r of conGemelo) {
    await sql`UPDATE equipos SET "imagenUrl" = ${r.imagen_gemela}, "updatedAt" = now() WHERE id = ${r.id}`;
  }

  console.log(`\nListo: ${marcaRows.length} marca(s) unificada(s), ${conGemelo.length} imagen(es) heredada(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
