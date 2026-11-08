/**
 * Pruebas unitarias del motor de valoración de formularios (Fase 2).
 *
 * Correr con:
 *   npx tsx scripts/_test-valoracion-formulario.ts
 *
 * No hay framework de tests en el repo; sigue el patrón de scripts `_verify-*`
 * ejecutables con tsx y aserciones a mano con node:assert.
 */
import assert from "node:assert/strict";
import { evaluarRespuesta, type EntradaMotor, type PreguntaEntrada, type SeccionEntrada } from "../src/lib/valoracion-formulario";

type ValInit = PreguntaEntrada["snapshot"]["valoracion"];

function sec(id: string, bloque: string | null = null, mostrarSi: SeccionEntrada["mostrarSi"] = null): SeccionEntrada {
  return { id, bloque, mostrarSi };
}
function preg(
  id: string,
  seccionId: string,
  tipo: string,
  valor: unknown,
  valoracion: ValInit,
  extra: Partial<PreguntaEntrada> = {},
): PreguntaEntrada {
  return {
    id,
    seccionId,
    mostrarSi: null,
    snapshot: { codigo: id, texto: id, tipo, opciones: [], valoracion },
    valor,
    calificacionManual: null,
    ...extra,
  };
}

function motor(entrada: Partial<EntradaMotor> & Pick<EntradaMotor, "preguntas" | "secciones">): ReturnType<typeof evaluarRespuesta> {
  return evaluarRespuesta({
    umbralAvanza: 75,
    umbralBanco: 50,
    ...entrada,
  });
}

let pasados = 0;
let fallados = 0;
function caso(nombre: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS  ${nombre}`);
    pasados += 1;
  } catch (err) {
    console.error(`FAIL  ${nombre}`);
    if (err instanceof Error) console.error("      " + err.message.split("\n").slice(0, 10).join("\n      "));
    else console.error("      " + String(err));
    fallados += 1;
  }
}

// ─── 1. Excluyente simple (excluyeSi lista) ────────────────────────────────
caso("excluyente simple: si_no con excluyeSi=[\"No\"] excluye cuando responden No", () => {
  const r = motor({
    secciones: [sec("s1")],
    preguntas: [preg("mayoria", "s1", "si_no", "No", { tipo: "E", excluyeSi: ["No"] })],
  });
  assert.equal(r.excluido, true);
  assert.equal(r.motivoExclusion?.preguntaId, "mayoria");
  assert.equal(r.banda, null);
});

caso("excluyente simple: la misma pregunta con Sí no excluye", () => {
  const r = motor({
    secciones: [sec("s1")],
    preguntas: [preg("mayoria", "s1", "si_no", "Sí", { tipo: "E", excluyeSi: ["No"] })],
  });
  assert.equal(r.excluido, false);
});

// ─── 2. excluyeSi: "incorrecta" ─────────────────────────────────────────────
caso("excluyeSi=incorrecta excluye cuando la respuesta no coincide con correcta", () => {
  const r = motor({
    secciones: [sec("s1")],
    preguntas: [preg("alcohol", "s1", "opcion_unica", "Acepto solo una",
      { tipo: "E", correcta: "La rechazo", excluyeSi: "incorrecta" })],
  });
  assert.equal(r.excluido, true);
});

caso("excluyeSi=incorrecta NO excluye cuando coincide con correcta", () => {
  const r = motor({
    secciones: [sec("s1")],
    preguntas: [preg("alcohol", "s1", "opcion_unica", "La rechazo",
      { tipo: "E", correcta: "La rechazo", excluyeSi: "incorrecta" })],
  });
  assert.equal(r.excluido, false);
});

// ─── 3. requiere en opción múltiple ────────────────────────────────────────
caso("requiere en opción múltiple excluye si falta alguna opción marcada", () => {
  const r = motor({
    secciones: [sec("s1")],
    preguntas: [preg("rf", "s1", "opcion_multiple", ["Patch"], {
      tipo: "E", requiere: ["Patch", "RF"],
    })],
  });
  assert.equal(r.excluido, true);
  assert.match(r.motivoExclusion?.respuesta ?? "", /RF/);
});

caso("requiere no excluye si todas están marcadas", () => {
  const r = motor({
    secciones: [sec("s1")],
    preguntas: [preg("rf", "s1", "opcion_multiple", ["Patch", "RF", "Extra"], {
      tipo: "E", requiere: ["Patch", "RF"],
    })],
  });
  assert.equal(r.excluido, false);
});

// ─── 4. Opción múltiple con porOpcion + max ────────────────────────────────
caso("opción múltiple con porOpcion + max tope al máximo", () => {
  const r = motor({
    secciones: [sec("s1")],
    preguntas: [preg("tipos", "s1", "opcion_multiple",
      ["Sociales", "Empresariales", "Conciertos", "Festivales", "Giras"],
      { tipo: "P", porOpcion: 0.5, max: 3 })],
  });
  // 5 opciones * 0.5 = 2.5, posible = 3 (max) → %  = 2.5/3 = 83.3
  assert.equal(r.puntosObtenidos, 2.5);
  assert.equal(r.puntosPosibles, 3);
  assert.ok(r.porcentajePreliminar != null && Math.abs(r.porcentajePreliminar - 83.3) < 0.2, `prelim=${r.porcentajePreliminar}`);
  assert.equal(r.banda, "AVANZA");
});

caso("opción múltiple con max aplica también a sumas que lo exceden", () => {
  const r = motor({
    secciones: [sec("s1")],
    preguntas: [preg("tipos", "s1", "opcion_multiple",
      Array.from({ length: 10 }, (_, i) => `op${i}`),
      { tipo: "P", porOpcion: 1, max: 2 })],
  });
  assert.equal(r.puntosObtenidos, 2);
  assert.equal(r.puntosPosibles, 2);
});

// ─── 5. Sección oculta no suma a posibles ─────────────────────────────────
caso("sección oculta por mostrarSi NO suma a puntos posibles", () => {
  // La sección "operador" sólo se muestra si la pregunta nivel=Operador. Aquí
  // responden nivel=Técnico así que la sección operador queda invisible.
  const r = motor({
    secciones: [
      sec("general"),
      sec("operador", "operador", { pregunta: "nivel", valorEn: ["Operador"] }),
    ],
    preguntas: [
      preg("nivel", "general", "opcion_unica", "Técnico", { tipo: "I" }),
      preg("mezcla", "operador", "opcion_unica", "A", { tipo: "P", correcta: "A", puntos: 5 }),
    ],
  });
  // Solo la pregunta de nivel es visible (I=0 puntos). La de mezcla no cuenta.
  assert.equal(r.puntosPosibles, 0);
  assert.equal(r.porcentajePreliminar, null);
});

caso("pregunta oculta por mostrarSi no suma ni obtenidos ni posibles", () => {
  const r = motor({
    secciones: [sec("s1")],
    preguntas: [
      preg("gate", "s1", "si_no", "No", { tipo: "I" }),
      preg("si_viene", "s1", "opcion_unica", "A", { tipo: "P", correcta: "A", puntos: 3 },
        { mostrarSi: { pregunta: "gate", valorEn: ["Sí"] } }),
    ],
  });
  assert.equal(r.puntosPosibles, 0);
});

// ─── 6. Preliminar vs final con M sin calificar y luego calificada ─────────
caso("preliminar: con M sin calificar, los M se excluyen de posible y final es null", () => {
  const r = motor({
    secciones: [sec("s1")],
    preguntas: [
      preg("auto", "s1", "opcion_unica", "A", { tipo: "P", correcta: "A", puntos: 2 }),
      preg("abierta", "s1", "parrafo", "texto", { tipo: "M", max: 3 }),
    ],
  });
  // Preliminar = 2/2 = 100 (M fuera)
  assert.equal(r.porcentajePreliminar, 100);
  assert.equal(r.porcentajeFinal, null);
  assert.equal(r.mPendientes, 1);
  assert.equal(r.puntosPosibles, 5); // 2 + 3
});

caso("final: al calificar la M, se completa porcentaje final", () => {
  const abierta = preg("abierta", "s1", "parrafo", "texto", { tipo: "M", max: 3 });
  abierta.calificacionManual = 2;
  const r = motor({
    secciones: [sec("s1")],
    preguntas: [
      preg("auto", "s1", "opcion_unica", "A", { tipo: "P", correcta: "A", puntos: 2 }),
      abierta,
    ],
  });
  assert.equal(r.mPendientes, 0);
  // 2 + 2 = 4 sobre 5 posibles = 80
  assert.equal(r.porcentajeFinal, 80);
  assert.equal(r.banda, "AVANZA");
});

// ─── 7. Sugerencia de nivel inferior ───────────────────────────────────────
caso("sugerencia Operador: ingeniero <50% con tecnico y operador ≥75%", () => {
  const r = motor({
    secciones: [
      sec("t", "tecnico"),
      sec("o", "operador"),
      sec("i", "ingeniero"),
    ],
    preguntas: [
      preg("t1", "t", "opcion_unica", "A", { tipo: "P", correcta: "A", puntos: 1 }),
      preg("t2", "t", "opcion_unica", "A", { tipo: "P", correcta: "A", puntos: 1 }),
      preg("t3", "t", "opcion_unica", "A", { tipo: "P", correcta: "A", puntos: 1 }),
      preg("o1", "o", "opcion_unica", "A", { tipo: "P", correcta: "A", puntos: 1 }),
      preg("o2", "o", "opcion_unica", "A", { tipo: "P", correcta: "A", puntos: 1 }),
      preg("o3", "o", "opcion_unica", "A", { tipo: "P", correcta: "A", puntos: 1 }),
      preg("i1", "i", "opcion_unica", "X", { tipo: "P", correcta: "A", puntos: 1 }),
      preg("i2", "i", "opcion_unica", "X", { tipo: "P", correcta: "A", puntos: 1 }),
      preg("i3", "i", "opcion_unica", "X", { tipo: "P", correcta: "A", puntos: 1 }),
    ],
  });
  assert.equal(r.nivelSugerido, "Operador");
});

caso("sugerencia Técnico: operador <50% con tecnico ≥75%", () => {
  const r = motor({
    secciones: [
      sec("t", "tecnico"),
      sec("o", "operador"),
    ],
    preguntas: [
      preg("t1", "t", "opcion_unica", "A", { tipo: "P", correcta: "A", puntos: 1 }),
      preg("t2", "t", "opcion_unica", "A", { tipo: "P", correcta: "A", puntos: 1 }),
      preg("t3", "t", "opcion_unica", "A", { tipo: "P", correcta: "A", puntos: 1 }),
      preg("o1", "o", "opcion_unica", "X", { tipo: "P", correcta: "A", puntos: 1 }),
      preg("o2", "o", "opcion_unica", "X", { tipo: "P", correcta: "A", puntos: 1 }),
      preg("o3", "o", "opcion_unica", "X", { tipo: "P", correcta: "A", puntos: 1 }),
    ],
  });
  assert.equal(r.nivelSugerido, "Técnico");
});

caso("sin sugerencia si el nivel aplicado sale bien", () => {
  const r = motor({
    secciones: [
      sec("t", "tecnico"),
      sec("o", "operador"),
    ],
    preguntas: [
      preg("t1", "t", "opcion_unica", "A", { tipo: "P", correcta: "A", puntos: 1 }),
      preg("o1", "o", "opcion_unica", "A", { tipo: "P", correcta: "A", puntos: 1 }),
    ],
  });
  assert.equal(r.nivelSugerido, null);
});

// ─── 8. Desglose por bloque ────────────────────────────────────────────────
caso("desglose por bloque reporta porcentaje por cada bloque visible", () => {
  const r = motor({
    secciones: [sec("g", "general"), sec("b", "base")],
    preguntas: [
      preg("g1", "g", "opcion_unica", "A", { tipo: "P", correcta: "A", puntos: 2 }),
      preg("b1", "b", "opcion_unica", "X", { tipo: "P", correcta: "A", puntos: 2 }),
    ],
  });
  const g = r.desglose.find((d) => d.bloque === "general");
  const b = r.desglose.find((d) => d.bloque === "base");
  assert.equal(g?.porcentaje, 100);
  assert.equal(b?.porcentaje, 0);
});

// ─── 9. Bandas ─────────────────────────────────────────────────────────────
caso("banda BANCO entre umbral banco y avanza", () => {
  const r = motor({
    secciones: [sec("s1")],
    preguntas: [
      preg("q1", "s1", "opcion_unica", "A", { tipo: "P", correcta: "A", puntos: 1 }),
      preg("q2", "s1", "opcion_unica", "A", { tipo: "P", correcta: "A", puntos: 1 }),
      preg("q3", "s1", "opcion_unica", "X", { tipo: "P", correcta: "A", puntos: 2 }),
    ],
  });
  // 2/4 = 50 → BANCO
  assert.equal(r.porcentajePreliminar, 50);
  assert.equal(r.banda, "BANCO");
});

caso("banda DESCARTAR debajo del umbral banco", () => {
  const r = motor({
    secciones: [sec("s1")],
    preguntas: [
      preg("q1", "s1", "opcion_unica", "X", { tipo: "P", correcta: "A", puntos: 1 }),
      preg("q2", "s1", "opcion_unica", "X", { tipo: "P", correcta: "A", puntos: 1 }),
    ],
  });
  assert.equal(r.porcentajePreliminar, 0);
  assert.equal(r.banda, "DESCARTAR");
});

// ─── resumen ───────────────────────────────────────────────────────────────
console.log(`\n${pasados} pasados, ${fallados} fallados`);
process.exit(fallados > 0 ? 1 : 0);
