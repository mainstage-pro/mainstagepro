/**
 * Análisis de equipos duplicados creados durante migración de cotizaciones.
 * Modo análisis: solo muestra resultados, NO modifica la base de datos.
 * Para ejecutar la fusión, pasar --ejecutar como argumento.
 */

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const EJECUTAR = process.argv.includes("--ejecutar");
const UMBRAL_SIMILITUD = 0.80; // 80% mínimo para considerar duplicado candidato

const env = readFileSync(".env", "utf-8");
const match = env.match(/DATABASE_URL="([^"]+)"/);
if (!match) throw new Error("DATABASE_URL not found");
const url = match[1].replace(/&channel_binding=require/, "");
const sql = neon(url);

// ── Normalización de texto ─────────────────────────────────────────────────

function normalizar(str) {
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")   // quitar acentos
    .replace(/[^a-z0-9\s]/g, " ")                        // quitar símbolos
    .replace(/\s+/g, " ")
    .trim();
}

// Tokeniza y elimina palabras muy cortas o genéricas
const STOPWORDS = new Set(["de", "la", "el", "en", "con", "para", "par", "y", "a", "un", "una"]);
function tokens(str) {
  return normalizar(str)
    .split(" ")
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

// Similitud Jaccard sobre tokens
function similitudJaccard(a, b) {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  const inter = new Set([...ta].filter(x => tb.has(x)));
  const union = new Set([...ta, ...tb]);
  return inter.size / union.size;
}

// Similitud adicional: si uno contiene al otro como subcadena normalizada
function contieneSubcadena(a, b) {
  const na = normalizar(a);
  const nb = normalizar(b);
  return na.includes(nb) || nb.includes(na);
}

// Extrae todos los números de un string
function numeros(str) {
  return (str.match(/\d+\.?\d*/g) ?? []).map(Number);
}

// Penaliza si los números presentes en ambos strings difieren
function penalizacionNumeros(a, b) {
  const na = numeros(normalizar(a));
  const nb = numeros(normalizar(b));
  if (na.length === 0 && nb.length === 0) return 0;
  // Si hay números distintos en cualquiera de los strings, penalizar
  const setA = new Set(na.map(String));
  const setB = new Set(nb.map(String));
  const soloEnA = [...setA].filter(x => !setB.has(x));
  const soloEnB = [...setB].filter(x => !setA.has(x));
  const diferentes = soloEnA.length + soloEnB.length;
  return diferentes > 0 ? 0.4 * Math.min(1, diferentes / Math.max(setA.size, setB.size, 1)) : 0;
}

function similitud(a, b) {
  const j = similitudJaccard(a, b);
  const sub = contieneSubcadena(a, b) ? 0.3 : 0;
  const base = Math.min(1, j + sub * (1 - j));
  const penalNum = penalizacionNumeros(a, b);
  return Math.max(0, base - penalNum);
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  ANÁLISIS DE EQUIPOS DUPLICADOS");
  console.log(`  Modo: ${EJECUTAR ? "🔴 EJECUCIÓN (modificará la BD)" : "🟡 SOLO ANÁLISIS (no modifica nada)"}`);
  console.log("══════════════════════════════════════════════════════════\n");

  // Traer todos los equipos con sus lineas de cotización y proyectos
  const equipos = await sql`
    SELECT
      e.id,
      e.descripcion,
      e.marca,
      e.modelo,
      e.tipo,
      e."categoriaId",
      c.nombre AS categoria_nombre,
      e."precioRenta",
      e."cantidadTotal",
      e."imagenUrl",
      e."activo",
      e."createdAt",
      COUNT(DISTINCT cl.id)::int AS num_lineas_cot,
      COUNT(DISTINCT pe.id)::int AS num_proyectos
    FROM equipos e
    JOIN categoria_equipos c ON c.id = e."categoriaId"
    LEFT JOIN cotizacion_lineas cl ON cl."equipoId" = e.id
    LEFT JOIN proyecto_equipos pe ON pe."equipoId" = e.id
    GROUP BY e.id, c.nombre
    ORDER BY e."createdAt" ASC
  `;

  console.log(`Total equipos en BD: ${equipos.length}\n`);

  // ── Encontrar pares candidatos ─────────────────────────────────────────

  const grupos = []; // { original, duplicado, score }
  const yaAsignados = new Set();

  for (let i = 0; i < equipos.length; i++) {
    for (let j = i + 1; j < equipos.length; j++) {
      const a = equipos[i];
      const b = equipos[j];

      const score = similitud(
        a.descripcion + (a.marca ? " " + a.marca : "") + (a.modelo ? " " + a.modelo : ""),
        b.descripcion + (b.marca ? " " + b.marca : "") + (b.modelo ? " " + b.modelo : "")
      );

      if (score >= UMBRAL_SIMILITUD) {
        // El "original" es el que tiene imagen, o más historia, o es más antiguo
        const puntuacionA =
          (a.imagenUrl ? 10 : 0) +
          (a.num_lineas_cot * 0.5) +
          (a.num_proyectos * 1) +
          (a.activo ? 2 : 0);
        const puntuacionB =
          (b.imagenUrl ? 10 : 0) +
          (b.num_lineas_cot * 0.5) +
          (b.num_proyectos * 1) +
          (b.activo ? 2 : 0);

        const [original, duplicado] = puntuacionA >= puntuacionB ? [a, b] : [b, a];

        if (!yaAsignados.has(duplicado.id)) {
          yaAsignados.add(duplicado.id);
          grupos.push({ original, duplicado, score });
        }
      }
    }
  }

  // Ordenar por score descendente
  grupos.sort((a, b) => b.score - a.score);

  if (grupos.length === 0) {
    console.log("✅ No se encontraron pares con similitud suficiente (>= 72%).\n");
    return;
  }

  // ── Mostrar análisis ───────────────────────────────────────────────────

  console.log(`Pares candidatos a fusión: ${grupos.length}\n`);
  console.log("┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│  ORIGINAL (conservar)  →  DUPLICADO (reasignar y eliminar)          │");
  console.log("└─────────────────────────────────────────────────────────────────────┘\n");

  for (const { original, duplicado, score } of grupos) {
    const pct = Math.round(score * 100);
    const barras = "█".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));
    const fmtDate = d => new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

    console.log(`${barras} ${pct}% similitud`);
    console.log(`  ORIGINAL  : "${original.descripcion}"${original.marca ? " · " + original.marca : ""}${original.modelo ? " " + original.modelo : ""}`);
    console.log(`            : cat=${original.categoria_nombre} · ${original.cantidadTotal} uds · $${original.precioRenta} · ${original.imagenUrl ? "📷 imagen" : "sin imagen"} · ${original.num_lineas_cot} cot · ${original.num_proyectos} proy · creado ${fmtDate(original.createdAt)}`);
    console.log(`  DUPLICADO : "${duplicado.descripcion}"${duplicado.marca ? " · " + duplicado.marca : ""}${duplicado.modelo ? " " + duplicado.modelo : ""}`);
    console.log(`            : cat=${duplicado.categoria_nombre} · ${duplicado.cantidadTotal} uds · $${duplicado.precioRenta} · ${duplicado.imagenUrl ? "📷 imagen" : "sin imagen"} · ${duplicado.num_lineas_cot} cot · ${duplicado.num_proyectos} proy · creado ${fmtDate(duplicado.createdAt)}`);
    console.log(`  ACCIÓN    : Reasignar ${duplicado.num_lineas_cot} línea(s) → original · eliminar duplicado`);
    console.log(`  ID orig   : ${original.id}`);
    console.log(`  ID dupl   : ${duplicado.id}`);
    console.log();
  }

  // Resumen
  const totalLineas = grupos.reduce((s, g) => s + g.duplicado.num_lineas_cot, 0);
  const totalEliminar = grupos.length;

  console.log("══════════════════════════════════════════════════════════");
  console.log(`  RESUMEN:`);
  console.log(`  · Equipos a eliminar: ${totalEliminar}`);
  console.log(`  · Líneas de cotización a reasignar: ${totalLineas}`);
  console.log("══════════════════════════════════════════════════════════\n");

  // ── Equipos sin uso (posibles ghosts de migración) ─────────────────────
  const sinUso = equipos.filter(e => e.num_lineas_cot === 0 && e.num_proyectos === 0);
  if (sinUso.length > 0) {
    console.log(`\n── Equipos sin ningún uso (0 cotizaciones, 0 proyectos) ──────────────────`);
    console.log(`   Total: ${sinUso.length} equipos\n`);
    const yaEnGrupo = new Set(grupos.flatMap(g => [g.original.id, g.duplicado.id]));
    const soloSinUso = sinUso.filter(e => !yaEnGrupo.has(e.id));
    if (soloSinUso.length > 0) {
      console.log("   Los siguientes NO fueron detectados como duplicados pero tampoco tienen uso:");
      for (const e of soloSinUso) {
        const fmtDate = d => new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
        console.log(`   · [${e.id}] "${e.descripcion}"${e.marca ? " · " + e.marca : ""}${e.modelo ? " " + e.modelo : ""} (${e.categoria_nombre}) — creado ${fmtDate(e.createdAt)}`);
      }
    }
    console.log();
  }

  if (!EJECUTAR) {
    console.log("👆 Este es solo el análisis. Para ejecutar la fusión:");
    console.log("   node scripts/analizar-equipos-duplicados.mjs --ejecutar\n");
    return;
  }

  // ── EJECUCIÓN ──────────────────────────────────────────────────────────

  console.log("🔴 INICIANDO FUSIÓN...\n");
  let reasignadas = 0;
  let eliminados = 0;
  let errores = 0;

  for (const { original, duplicado, score } of grupos) {
    const pct = Math.round(score * 100);
    process.stdout.write(`  [${pct}%] "${duplicado.descripcion}" → "${original.descripcion}" ... `);

    try {
      // 1. Reasignar líneas de cotización
      if (duplicado.num_lineas_cot > 0) {
        await sql`
          UPDATE cotizacion_lineas
          SET "equipoId" = ${original.id}
          WHERE "equipoId" = ${duplicado.id}
        `;
        reasignadas += duplicado.num_lineas_cot;
      }

      // 2. Reasignar equipos de proyectos
      if (duplicado.num_proyectos > 0) {
        await sql`
          UPDATE proyecto_equipos
          SET "equipoId" = ${original.id}
          WHERE "equipoId" = ${duplicado.id}
        `;
      }

      // 3. Verificar que no haya otras relaciones bloqueantes antes de eliminar
      const [{ cnt }] = await sql`
        SELECT COUNT(*)::int AS cnt FROM (
          SELECT id FROM cotizacion_lineas WHERE "equipoId" = ${duplicado.id}
          UNION ALL
          SELECT id FROM proyecto_equipos WHERE "equipoId" = ${duplicado.id}
          UNION ALL
          SELECT id FROM mantenimientos_equipos WHERE "equipoId" = ${duplicado.id}
          UNION ALL
          SELECT id FROM plantilla_equipo_items WHERE "equipoId" = ${duplicado.id}
          UNION ALL
          SELECT id FROM equipo_unidades WHERE "equipoId" = ${duplicado.id}
        ) sub
      `;

      if (cnt > 0) {
        console.log(`⚠  SKIP (${cnt} ref. restantes — no se eliminó)`);
        continue;
      }

      // 4. Eliminar duplicado
      await sql`DELETE FROM equipos WHERE id = ${duplicado.id}`;
      eliminados++;
      console.log(`✓  (${duplicado.num_lineas_cot} líneas reasignadas)`);

    } catch (e) {
      console.log(`✗  ERROR: ${e.message}`);
      errores++;
    }
  }

  console.log(`\n✅ Fusión completada:`);
  console.log(`   · ${reasignadas} líneas de cotización reasignadas`);
  console.log(`   · ${eliminados} equipos eliminados`);
  if (errores > 0) console.log(`   · ${errores} errores (equipos con referencias no resueltas, conservados)`);
  console.log();
}

main().catch(e => { console.error(e); process.exit(1); });
