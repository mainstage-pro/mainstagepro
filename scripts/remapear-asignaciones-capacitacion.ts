/**
 * Reapunta las asignaciones de capacitación por puesto que quedaron rotas tras
 * la fusión del currículo (148 → 66): dos sub-áreas dejaron de existir porque
 * su contenido se movió a otra.
 *
 *   npx tsx scripts/remapear-asignaciones-capacitacion.ts             # simulacro
 *   npx tsx scripts/remapear-asignaciones-capacitacion.ts --commit
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { writeFileSync } from "fs";

config({ path: process.env.ENVF || ".env.prod.backup" });
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);
const COMMIT = process.argv.includes("--commit");

type Asig = { categoriaId: string; subArea: string | null; nivel: "OBLIGATORIO" | "RECOMENDADO" };

// origen roto → destino donde quedó el contenido
const REMAP: Record<string, { categoriaId: string; subArea: string }> = {
  // #141 (reporte financiero y de asistencia) se fusionó en #119, que vive en Finanzas
  "cat-administracion::Reportes y Métricas": { categoriaId: "cat-administracion", subArea: "Finanzas y Contabilidad" },
  // #183 (desarrollo de alianzas) se fusionó en #110, que vive en Dirección
  "cat-ventas::Relaciones Públicas": { categoriaId: "cat-direccion", subArea: "Relaciones Institucionales y Alianzas" },
};

const rank = (n: string) => (n === "OBLIGATORIO" ? 2 : 1);

async function main() {
  const s = (await sql.query(`SELECT DISTINCT "categoriaId", "subArea" FROM sesiones_capacitacion`)) as any[];
  const vivas = new Set(s.map((x) => `${x.categoriaId}::${x.subArea}`));

  const puestos = (await sql.query(
    `SELECT id, nombre, capacitacion_asignaciones FROM puestos WHERE capacitacion_asignaciones IS NOT NULL`,
  )) as any[];

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(`scripts/_backup-remap-asignaciones-${stamp}.json`, JSON.stringify(puestos, null, 2));

  let cambiados = 0;
  for (const p of puestos) {
    const arr: Asig[] = JSON.parse(p.capacitacion_asignaciones);
    const salida = new Map<string, Asig>();
    const notas: string[] = [];

    for (const a of arr) {
      let destino = a;
      if (a.subArea) {
        const k = `${a.categoriaId}::${a.subArea}`;
        if (!vivas.has(k)) {
          const r = REMAP[k];
          if (!r) { notas.push(`sin destino para ${k} — se descarta`); continue; }
          destino = { categoriaId: r.categoriaId, subArea: r.subArea, nivel: a.nivel };
          notas.push(`${a.subArea} → ${r.subArea}`);
        }
      }
      const key = `${destino.categoriaId}::${destino.subArea ?? ""}`;
      const previo = salida.get(key);
      // si ya existía el destino, se conserva el nivel más fuerte
      if (!previo || rank(destino.nivel) > rank(previo.nivel)) salida.set(key, destino);
      else notas.push(`duplicado fusionado en ${destino.subArea ?? "(área completa)"}`);
    }

    const nuevo = [...salida.values()];
    if (!notas.length) continue;
    cambiados++;
    console.log(`${p.nombre}: ${arr.length} → ${nuevo.length} asignaciones`);
    for (const n of notas) console.log(`    · ${n}`);

    if (COMMIT) {
      await sql.query(`UPDATE puestos SET capacitacion_asignaciones=$1 WHERE id=$2`, [JSON.stringify(nuevo), p.id]);
    }
  }

  console.log(`\n${COMMIT ? "APLICADO" : "SIMULACRO"} · ${cambiados} puestos ajustados`);
  if (!COMMIT) console.log("Corre con --commit para aplicar.");
}

main().catch((e) => { console.error(e); process.exit(1); });
