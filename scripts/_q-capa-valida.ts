import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: process.env.ENVF || ".env.prod.backup" });
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  const s = (await sql.query(`SELECT DISTINCT "categoriaId", "subArea" FROM sesiones_capacitacion`)) as any[];
  const vivas = new Set(s.map((x) => `${x.categoriaId}::${x.subArea}`));
  const cats = new Set(s.map((x) => x.categoriaId));

  const puestos = (await sql.query(
    `SELECT nombre, capacitacion_asignaciones, onboarding_capacitaciones FROM puestos WHERE capacitacion_asignaciones IS NOT NULL`,
  )) as any[];

  let tot = 0, ok = 0;
  const rotas = new Map<string, number>();
  for (const p of puestos) {
    for (const a of JSON.parse(p.capacitacion_asignaciones) as any[]) {
      tot++;
      const k = a.subArea ? `${a.categoriaId}::${a.subArea}` : null;
      if (k ? vivas.has(k) : cats.has(a.categoriaId)) ok++;
      else rotas.set(k ?? a.categoriaId, (rotas.get(k ?? a.categoriaId) ?? 0) + 1);
    }
  }
  console.log(`Asignaciones: ${tot} | resuelven: ${ok} | ROTAS: ${tot - ok}`);
  for (const [k, n] of rotas) console.log(`  ✖ ${k} (${n})`);

  // legacy: ids de sesión sueltos
  const ids = (await sql.query(`SELECT id FROM sesiones_capacitacion`)) as any[];
  const vivosId = new Set(ids.map((x) => x.id));
  let legTot = 0, legRotos = 0;
  for (const p of puestos) {
    const v = p.onboarding_capacitaciones;
    if (!v) continue;
    const arr = typeof v === "string" ? JSON.parse(v) : v;
    if (!Array.isArray(arr)) continue;
    for (const x of arr) {
      legTot++;
      const id = typeof x === "string" ? x : x?.sesionId ?? x?.id;
      if (!vivosId.has(id)) { legRotos++; console.log(`  legacy roto en ${p.nombre}: ${JSON.stringify(x).slice(0, 80)}`); }
    }
  }
  console.log(`Legacy onboarding_capacitaciones: ${legTot} refs | rotas: ${legRotos}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
