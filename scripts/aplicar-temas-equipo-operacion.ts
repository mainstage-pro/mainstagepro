/**
 * Aplica el contenido de scripts/data/temas-equipo-operacion.ts:
 * enriquece temas existentes, reescribe los vacíos, inserta los nuevos y
 * renumera Producción según ORDEN_PRODUCCION.
 *
 *   npx tsx scripts/aplicar-temas-equipo-operacion.ts             # simulacro
 *   npx tsx scripts/aplicar-temas-equipo-operacion.ts --commit
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { writeFileSync } from "fs";
import { randomUUID } from "crypto";
import { NUEVOS, REESCRIBE, ENRIQUECE, ORDEN_PRODUCCION } from "./data/temas-equipo-operacion";

config({ path: process.env.ENVF || ".env.prod.backup" });
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);
const COMMIT = process.argv.includes("--commit");

const LETRA: Record<string, string> = { general: "A", direccion: "B", administracion: "C", marketing: "D", ventas: "E", produccion: "F" };
const uniq = (xs: string[]) => [...new Set(xs.map((s) => s.trim()).filter(Boolean))];

async function main() {
  const cats = (await sql.query(`SELECT id, slug FROM categorias_capacitacion`)) as any[];
  const catId = new Map(cats.map((c: any) => [c.slug, c.id]));

  const sesiones = (await sql.query(
    `SELECT s.id, s.numero, s.titulo, s.objetivos, s."puntosBase", s."puntosEditados",
            s."erroresComunes", s."checklistAplicacion", c.slug cat
     FROM sesiones_capacitacion s JOIN categorias_capacitacion c ON c.id=s."categoriaId" ORDER BY s.numero`,
  )) as any[];
  const byNum = new Map(sesiones.map((s) => [s.numero, s]));

  // ── Validación ──────────────────────────────────────────────────────────
  const errores: string[] = [];
  for (const e of ENRIQUECE) if (!byNum.has(e.numeroActual)) errores.push(`ENRIQUECE #${e.numeroActual} no existe`);
  for (const r of REESCRIBE) if (!byNum.has(r.numeroActual)) errores.push(`REESCRIBE #${r.numeroActual} no existe`);
  const claves = new Set(NUEVOS.map((n) => n.clave));
  const prodActuales = sesiones.filter((s) => s.cat === "produccion").map((s) => s.numero);
  const enOrden = new Set<number>();
  for (const o of ORDEN_PRODUCCION) {
    if (typeof o === "number") {
      if (!byNum.has(o)) errores.push(`ORDEN #${o} no existe`);
      if (enOrden.has(o)) errores.push(`ORDEN #${o} repetido`);
      enOrden.add(o);
    } else if (!claves.has(o.replace("nuevo:", ""))) errores.push(`ORDEN ${o} sin tema nuevo`);
  }
  for (const n of prodActuales) if (!enOrden.has(n)) errores.push(`#${n} de producción quedó fuera de ORDEN`);
  if (errores.length) {
    console.error(`✖ ${errores.length} errores:`);
    for (const e of errores) console.error("  - " + e);
    process.exit(1);
  }
  console.log(`✔ Cobertura: ${prodActuales.length} temas de producción, ${ORDEN_PRODUCCION.length} posiciones finales\n`);

  // ── Respaldo ────────────────────────────────────────────────────────────
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = `scripts/_backup-temas-equipo-${stamp}.json`;
  writeFileSync(file, JSON.stringify(await sql.query(`SELECT * FROM sesiones_capacitacion`), null, 2));
  console.log(`✔ Respaldo: ${file}\n`);

  // ── 1. Enriquecer ───────────────────────────────────────────────────────
  console.log("── Enriquecer");
  for (const e of ENRIQUECE) {
    const s = byNum.get(e.numeroActual)!;
    const obj = uniq([...(s.objetivos ?? []), ...(e.objetivos ?? [])]);
    const pts = uniq([...(s.puntosEditados?.length ? s.puntosEditados : s.puntosBase ?? []), ...(e.puntos ?? [])]);
    console.log(`  #${e.numeroActual} ${e.titulo ?? s.titulo} → +${(e.puntos ?? []).length} puntos, +${(e.objetivos ?? []).length} objetivos`);
    if (COMMIT) {
      await sql.query(
        `UPDATE sesiones_capacitacion SET titulo=$1, objetivos=$2, "puntosBase"=$3, "puntosEditados"='{}',
           "erroresComunes"=$4, "checklistAplicacion"=$5, "updatedAt"=now() WHERE id=$6`,
        [
          e.titulo ?? s.titulo, obj, pts,
          uniq([...(s.erroresComunes ?? []), ...(e.erroresComunes ?? [])]),
          uniq([...(s.checklistAplicacion ?? []), ...(e.checklist ?? [])]),
          s.id,
        ],
      );
    }
  }

  // ── 2. Reescribir ───────────────────────────────────────────────────────
  console.log("\n── Reescribir");
  for (const r of REESCRIBE) {
    const s = byNum.get(r.numeroActual)!;
    console.log(`  #${r.numeroActual} ${s.titulo}\n      → ${r.titulo} (${r.puntos.length} puntos)`);
    if (COMMIT) {
      await sql.query(
        `UPDATE sesiones_capacitacion SET titulo=$1, descripcion=$2, duracion=$3, objetivos=$4,
           "puntosBase"=$5, "puntosEditados"='{}', "erroresComunes"=$6, "checklistAplicacion"=$7,
           "publicoObjetivo"=$8, prerrequisitos=$9, "subArea"=$10, bloque=$10, "updatedAt"=now() WHERE id=$11`,
        [r.titulo, r.descripcion, r.duracion, r.objetivos, r.puntos, r.erroresComunes ?? [],
         r.checklist ?? [], r.publico ?? null, r.prerrequisitos ?? [], r.subArea, s.id],
      );
    }
  }

  // ── 3. Renumerar producción ─────────────────────────────────────────────
  console.log("\n── Renumerar producción");
  const finalDe = new Map<number, number>();
  ORDEN_PRODUCCION.forEach((o, i) => { if (typeof o === "number") finalDe.set(o, 71 + i); });
  for (const [de, a] of finalDe) if (de !== a) console.log(`  #${de} → #${a}  ${byNum.get(de)!.titulo}`);
  if (COMMIT) {
    await sql.query(
      `UPDATE sesiones_capacitacion SET numero=numero+1000
       WHERE "categoriaId"=$1`, [catId.get("produccion")],
    );
    for (const [de, a] of finalDe) {
      await sql.query(`UPDATE sesiones_capacitacion SET numero=$1 WHERE numero=$2 AND "categoriaId"=$3`,
        [a, de + 1000, catId.get("produccion")]);
    }
  }

  // ── 4. Insertar nuevos ──────────────────────────────────────────────────
  console.log("\n── Insertar nuevos");
  const numeroNuevo = new Map<string, number>();
  ORDEN_PRODUCCION.forEach((o, i) => { if (typeof o === "string") numeroNuevo.set(o.replace("nuevo:", ""), 71 + i); });

  for (const n of NUEVOS) {
    const numero = n.cat === "general" ? 6 : numeroNuevo.get(n.clave)!;
    if (!numero) { console.error(`  ✖ ${n.clave} sin número asignado`); process.exit(1); }
    console.log(`  #${numero} [${n.cat}/${n.subArea}] ${n.titulo} — ${n.objetivos.length} obj, ${n.puntos.length} pts`);
    if (COMMIT) {
      await sql.query(
        `INSERT INTO sesiones_capacitacion
           (id, numero, titulo, descripcion, bloque, "bloqueLetra", objetivos, "puntosBase", "puntosEditados",
            prerrequisitos, procedimiento, "erroresComunes", "checklistAplicacion", recursos,
            "publicoObjetivo", "subArea", "categoriaId", duracion, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'{}',$9,'{}',$10,$11,'{}',$12,$13,$14,$15,now(),now())`,
        [randomUUID(), numero, n.titulo, n.descripcion, n.subArea, LETRA[n.cat], n.objetivos, n.puntos,
         n.prerrequisitos ?? [], n.erroresComunes ?? [], n.checklist ?? [], n.publico ?? null,
         n.subArea, catId.get(n.cat), n.duracion],
      );
    }
  }

  const total = sesiones.length + NUEVOS.length;
  console.log(`\n${COMMIT ? "APLICADO" : "SIMULACRO"} · ${ENRIQUECE.length} enriquecidos, ${REESCRIBE.length} reescritos, ${NUEVOS.length} nuevos → ${total} temas`);
  if (!COMMIT) console.log("Corre con --commit para aplicar.");
}

main().catch((e) => { console.error(e); process.exit(1); });
