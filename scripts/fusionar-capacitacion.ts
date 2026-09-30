/**
 * Fusiona el currículo de capacitación de 148 temas a 66 según FUSIONES.
 *
 *   npx tsx scripts/fusionar-capacitacion.ts             # simulacro (no escribe)
 *   npx tsx scripts/fusionar-capacitacion.ts --commit    # aplica a producción
 *
 * El survivor conserva su id, por lo que progreso, versiones y evaluaciones
 * sobreviven. Las filas absorbidas se eliminan (cascade borra su progreso).
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { writeFileSync } from "fs";
import { FUSIONES } from "./data/fusion-capacitacion";

config({ path: process.env.ENVF || ".env.prod.backup" });
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);
const COMMIT = process.argv.includes("--commit");

const ORDEN_CAT = ["general", "direccion", "administracion", "marketing", "ventas", "produccion"];
const BASE_NUM: Record<string, number> = {
  general: 1, direccion: 11, administracion: 21, marketing: 41, ventas: 51, produccion: 71,
};

type Sesion = {
  id: string; numero: number; titulo: string; descripcion: string; bloque: string; bloqueLetra: string;
  objetivos: string[]; puntosBase: string[]; puntosEditados: string[]; notas: string | null;
  prerrequisitos: string[]; procedimiento: string[]; erroresComunes: string[];
  checklistAplicacion: string[]; recursos: string[]; publicoObjetivo: string | null;
  subArea: string | null; categoriaId: string | null; duracion: number;
};

const uniq = (xs: string[]) => [...new Set(xs.map((s) => s.trim()).filter(Boolean))];

async function main() {
  const sesiones = (await sql.query(
    `SELECT id, numero, titulo, descripcion, bloque, "bloqueLetra", objetivos, "puntosBase",
            "puntosEditados", notas, prerrequisitos, procedimiento, "erroresComunes",
            "checklistAplicacion", recursos, "publicoObjetivo", "subArea", "categoriaId", duracion
     FROM sesiones_capacitacion ORDER BY numero`,
  )) as unknown as Sesion[];
  const byNum = new Map(sesiones.map((s) => [s.numero, s]));
  const cats = (await sql.query(`SELECT id, slug FROM categorias_capacitacion`)) as any[];
  const catId = new Map(cats.map((c: any) => [c.slug, c.id]));

  // ── 1. Validación de cobertura ──────────────────────────────────────────
  const errores: string[] = [];
  const visto = new Map<number, string>();
  for (const f of FUSIONES) {
    if (!catId.has(f.cat)) errores.push(`categoría inexistente: ${f.cat}`);
    for (const n of [f.survivor, ...f.absorbe]) {
      if (!byNum.has(n)) errores.push(`#${n} no existe en la BD (grupo "${f.titulo}")`);
      if (visto.has(n)) errores.push(`#${n} asignado dos veces: "${visto.get(n)}" y "${f.titulo}"`);
      visto.set(n, f.titulo);
    }
    for (const n of f.copiaDe ?? []) if (!byNum.has(n)) errores.push(`copiaDe #${n} no existe`);
  }
  const huerfanas = sesiones.filter((s) => !visto.has(s.numero));
  for (const h of huerfanas) errores.push(`#${h.numero} "${h.titulo}" no está en ningún grupo`);

  console.log(`Sesiones en BD: ${sesiones.length} · grupos destino: ${FUSIONES.length} · cubiertas: ${visto.size}`);
  if (errores.length) {
    console.error(`\n✖ ${errores.length} errores de cobertura:`);
    for (const e of errores) console.error("  - " + e);
    process.exit(1);
  }
  console.log("✔ Cobertura completa: los 148 temas están asignados, sin duplicados ni huérfanos.\n");

  // ── 2. Aviso de contenido que se perdería ───────────────────────────────
  const perdidas: string[] = [];
  for (const f of FUSIONES) {
    for (const n of f.absorbe) {
      const s = byNum.get(n)!;
      if (s.puntosEditados?.length) perdidas.push(`#${n} tiene puntosEditados (${s.puntosEditados.length})`);
      if (s.publicoObjetivo) perdidas.push(`#${n} tiene publicoObjetivo`);
    }
  }
  if (perdidas.length) { console.log("⚠ Campos a revisar antes de borrar:"); for (const p of perdidas) console.log("  - " + p); console.log(); }

  // ── 3. Respaldo ─────────────────────────────────────────────────────────
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = `scripts/_backup-fusion-capacitacion-${stamp}.json`;
  const progreso = await sql.query(`SELECT * FROM progreso_capacitacion`);
  const versiones = await sql.query(`SELECT id, "sesionId", version, "generadaEn" FROM versiones_presentacion`);
  const evals = await sql.query(`SELECT * FROM evaluaciones_capacitacion`);
  const puestos = await sql.query(`SELECT id, nombre, capacitacion_asignaciones FROM puestos`);
  writeFileSync(file, JSON.stringify({ sesiones, progreso, versiones, evals, puestos }, null, 2));
  console.log(`✔ Respaldo: ${file}\n`);

  // ── 4. Construir y aplicar ──────────────────────────────────────────────
  const contador: Record<string, number> = {};
  let upd = 0, del = 0;

  for (const f of FUSIONES) {
    const surv = byNum.get(f.survivor)!;
    const fuentes = [surv, ...f.absorbe.map((n) => byNum.get(n)!), ...(f.copiaDe ?? []).map((n) => byNum.get(n)!)];

    // La app resuelve puntosEditados ?? puntosBase, así que la versión editada
    // a mano es la buena; el resultado fusionado se escribe en puntosBase y se
    // limpia puntosEditados para que no tape la fusión.
    const efectivos = (s: Sesion) => uniq(s.puntosEditados?.length ? s.puntosEditados : s.puntosBase);

    const puntos: string[] = [];
    if (fuentes.length === 1) {
      puntos.push(...efectivos(surv));
    } else {
      for (const s of fuentes) {
        const bullets = efectivos(s);
        if (!bullets.length) continue;
        puntos.push(`§ ${s.titulo}`);
        puntos.push(...bullets);
      }
    }

    const objetivos = uniq(fuentes.flatMap((s) => s.objetivos));
    const notas = uniq(fuentes.map((s) => s.notas ?? "")).join("\n\n") || null;
    const merge = (k: keyof Sesion) => uniq(fuentes.flatMap((s) => (s[k] as string[]) ?? []));

    contador[f.cat] = (contador[f.cat] ?? 0) + 1;
    const numero = BASE_NUM[f.cat] + contador[f.cat] - 1;
    const letra = String.fromCharCode(65 + ORDEN_CAT.indexOf(f.cat));

    console.log(
      `#${String(numero).padStart(2)} [${f.cat}/${f.subArea}] ${f.titulo}` +
        `\n     ← #${f.survivor}${f.absorbe.length ? " + #" + f.absorbe.join(" + #") : ""}` +
        `${f.copiaDe?.length ? " (copia de #" + f.copiaDe.join(", #") + ")" : ""}` +
        ` · ${objetivos.length} objetivos, ${puntos.length} puntos`,
    );

    if (COMMIT) {
      await sql.query(
        `UPDATE sesiones_capacitacion SET numero=$1, titulo=$2, descripcion=$3, bloque=$4, "bloqueLetra"=$5,
           objetivos=$6, "puntosBase"=$7, notas=$8, "subArea"=$9, "categoriaId"=$10, duracion=$11,
           prerrequisitos=$12, procedimiento=$13, "erroresComunes"=$14, "checklistAplicacion"=$15,
           recursos=$16, "updatedAt"=now(), "puntosEditados"='{}'
         WHERE id=$17`,
        [numero, f.titulo, f.descripcion, f.subArea, letra, objetivos, puntos, notas, f.subArea,
         catId.get(f.cat), f.duracion, merge("prerrequisitos"), merge("procedimiento"),
         merge("erroresComunes"), merge("checklistAplicacion"), merge("recursos"), surv.id],
      );
      upd++;
      for (const n of f.absorbe) {
        await sql.query(`DELETE FROM sesiones_capacitacion WHERE id=$1`, [byNum.get(n)!.id]);
        del++;
      }
    }
  }

  console.log(`\n${COMMIT ? "APLICADO" : "SIMULACRO"} · ${COMMIT ? upd : FUSIONES.length} actualizadas, ` +
    `${COMMIT ? del : sesiones.length - FUSIONES.length} eliminadas → ${FUSIONES.length} temas finales`);
  if (!COMMIT) console.log("\nNada se escribió. Corre con --commit para aplicar.");
}

main().catch((e) => { console.error(e); process.exit(1); });
