/**
 * Normaliza la grafía de `marca` en el inventario: una sola forma por marca, más un
 * trim() de marca y modelo. Censo que lo motivó: 80 marcas activas distintas, varias
 * partidas en dos grafías, lo que rompía el catálogo y los filtros por marca.
 *
 * Criterio aprobado por Mauricio (2026-09-29):
 *   1. Trim de marca y modelo (marca/modelo vacíos quedan en NULL).
 *   2. Una grafía gana por marca: mayoría, salvo cuando la forma correcta es obvia.
 *   3. Los artículos genéricos (DJ Booth, Pista de baile, Carpa…) NO son marcas:
 *      quedan con marca = NULL y el nombre vive en `descripcion`, que es la convención
 *      que ya seguían 33 equipos activos.
 *
 * NO fusiona renglones ni reescribe `modelo` salvo por espacios sobrantes: en este
 * inventario es intencional que el mismo modelo exista dos veces con proveedores
 * distintos.
 *
 *   ENV_FILE=.env.prod.backup npx tsx scripts/normalizar-marcas-equipos.ts [--apply]
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync, writeFileSync } from "fs";

const APPLY = process.argv.includes("--apply");
const envRaw = readFileSync(process.env.ENV_FILE || ".env.prod.backup", "utf8");
const raw = envRaw.match(/^DATABASE_URL=(.*)$/m)![1].trim().replace(/^["']|["']$/g, "");
const sql = neon(raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?"));

/** Marca mal escrita → grafía que gana. Las llaves ya vienen sin espacios sobrantes. */
const RENOMBRES: Record<string, string> = {
  "Chauvet DJ": "Chauvet",                  // mayoría (5 vs 2); no distinguimos líneas de producto
  Litetek: "Lite Tek",                      // mayoría (11 vs 1)
  Asteras: "Astera",                        // "Asteras" es plural/typo de la marca real
  "TRS Trussing co": "TRS Trussing",        // el "co" en minúscula no aporta
  "CYM PRO LED": "CYM Pro LED",             // solo diferencia de caja
  "Allen & Heath - Xone 96": "Allen & Heath", // traía el modelo pegado a la marca
};

/** Artículos genéricos sin marca real: pasan a marca = NULL (el nombre ya está en descripcion). */
const A_NULL = new Set([
  "Bazuca", "Booth", "Cable", "Camioneta", "Carpa", "Chisperos", "DJ Booth", "Dj Booth",
  "Estrobo", "Front decorativo", "Ground Support", "Mampara", "Mampara decorativa",
  "Mesa Plegable", "Pantalla LED", "Pantalla led", "Pantalla Smart TV", 'Pantalla Smart TV 70"',
  "Pinspot", "Pirotecnia fría", "Pista de Baile", "Pista de baile", "Podio", "Radio",
  "Valla", "home depot",
]);

type Row = { id: string; activo: boolean; marca: string | null; modelo: string | null; descripcion: string };

function normalizar(marca: string | null, modelo: string | null) {
  let m = marca?.trim() || null;
  const modeloFinal = modelo?.trim() || null;
  if (m && A_NULL.has(m)) return { marca: null, modelo: modeloFinal };
  if (m && RENOMBRES[m]) m = RENOMBRES[m];
  return { marca: m, modelo: modeloFinal };
}

(async () => {
  const rows = (await sql`
    select id, activo, marca, modelo, descripcion from equipos
  `) as Row[];

  const cambios = rows
    .map((r) => ({ row: r, next: normalizar(r.marca, r.modelo) }))
    .filter((c) => c.next.marca !== c.row.marca || c.next.modelo !== c.row.modelo);

  const q = (v: string | null) => (v === null ? "‹null›" : `"${v}"`);

  const trims = cambios.filter((c) => c.row.marca?.trim() !== c.row.marca || c.row.modelo?.trim() !== c.row.modelo);
  const renom = cambios.filter((c) => c.next.marca !== null && !trims.includes(c));
  const nulos = cambios.filter((c) => c.next.marca === null && c.row.marca !== null);

  console.log(`equipos en total: ${rows.length}   filas a tocar: ${cambios.length}\n`);

  console.log("=== 1. ESPACIOS SOBRANTES ===");
  for (const c of trims) console.log(`   ${q(c.row.marca)} / ${q(c.row.modelo)}  →  ${q(c.next.marca)} / ${q(c.next.modelo)}`);

  console.log("\n=== 2. GRAFÍA UNIFICADA ===");
  for (const c of renom) console.log(`   ${q(c.row.marca)} → ${q(c.next.marca)}   (${c.row.modelo ?? "—"})`);

  console.log("\n=== 3. GENÉRICOS → marca = NULL ===");
  for (const c of nulos) console.log(`   ${q(c.row.marca)} / ${q(c.next.modelo)}  →  NULL   desc: ${c.row.descripcion}`);

  // La foto se hereda por marca+modelo (src/lib/equipo-imagen.ts): avisa si la
  // normalización crea gemelos nuevos, porque ahí sí cambiaría el comportamiento.
  const clave = (m: string | null, mo: string | null) => `${(m ?? "").toLowerCase()}|${(mo ?? "").toLowerCase()}`;
  const antes = new Map<string, number>();
  const despues = new Map<string, number>();
  for (const r of rows) {
    if (!r.activo) continue;
    const n = normalizar(r.marca, r.modelo);
    if (r.marca && r.modelo) antes.set(clave(r.marca, r.modelo), (antes.get(clave(r.marca, r.modelo)) ?? 0) + 1);
    if (n.marca && n.modelo) despues.set(clave(n.marca, n.modelo), (despues.get(clave(n.marca, n.modelo)) ?? 0) + 1);
  }
  const nuevosGemelos = [...despues].filter(([k, n]) => n > 1 && (antes.get(k) ?? 0) < n);
  console.log(`\n=== GEMELOS marca+modelo NUEVOS: ${nuevosGemelos.length} ===`);
  for (const [k, n] of nuevosGemelos) console.log(`   ⚠ ${k} ahora aparece ${n} veces`);

  const marcasAntes = new Set(rows.filter((r) => r.activo).map((r) => r.marca));
  const marcasDespues = new Set(rows.filter((r) => r.activo).map((r) => normalizar(r.marca, r.modelo).marca));
  console.log(`\nmarcas activas distintas: ${marcasAntes.size} → ${marcasDespues.size}`);

  if (!cambios.length) { console.log("\nNada por hacer."); return; }
  if (!APPLY) { console.log("\n(simulación — corre con --apply para escribir)"); return; }

  const respaldo = cambios.map((c) => ({ id: c.row.id, marca: c.row.marca, modelo: c.row.modelo, descripcion: c.row.descripcion }));
  const f = `scripts/_backup-normalizar-marcas-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(f, JSON.stringify(respaldo, null, 2));
  console.log(`\nRespaldo: ${f}`);

  for (const c of cambios) {
    await sql`
      update equipos set marca = ${c.next.marca}, modelo = ${c.next.modelo}, "updatedAt" = now()
       where id = ${c.row.id}`;
  }
  console.log(`✓ ${cambios.length} equipos actualizados`);

  const verif = (await sql`
    select count(*)::int as n from equipos
     where marca is distinct from btrim(marca) or modelo is distinct from btrim(modelo)
        or marca = any(${[...Object.keys(RENOMBRES), ...A_NULL]})
  `) as { n: number }[];
  console.log(verif[0].n === 0 ? "✓ verificado: no quedan grafías viejas" : `⚠ quedan ${verif[0].n} filas con grafía vieja`);
})();
