// src/lib/pdf-texto.ts
//
// Los PDF se dibujan con la Helvetica estándar del PDF (core font, codificación
// WinAnsi) y no hay un solo Font.register en el repo. Todo lo que cae fuera de
// ese repertorio NO se imprime: unos caracteres desaparecen sin dejar hueco
// (✓ ★ → −) y otros salen como basura (◆→Æ, ●→Ï, ▲→², emoji→—).
//
// Los literales del código ya se corrigieron, pero el texto que escribe la
// gente también llega al papel: en producción hay viajes de gira guardados como
// "Monterrey → CDMX" y accesorios llamados "Clamp de gancho 🪝". En pantalla se
// ven bien y así deben quedarse, así que no se limpia la base de datos: se
// limpia al armar el PDF, que es el único lugar donde estorban.

// Equivalencias con sentido. Lo que no está aquí y tampoco es imprimible se
// descarta, que es mejor que dejar un glifo basura en un documento que firma
// un cliente.
const EQUIVALENTES: Record<string, string> = {
  // Flechas: la convención del repo para origen/destino es »
  "\u2192": "»", "\u27F6": "»", "\u21D2": "»", "\u2794": "»", "\u279C": "»",
  "\u25B8": "»", "\u25B9": "»", "\u2023": "»", "\u276F": "»",
  "\u2190": "«", "\u21D0": "«",
  // Signos que sí tienen pareja en la fuente
  "\u2212": "-",            // menos tipográfico → guion
  "\u2264": "<=", "\u2265": ">=",
  "\u2715": "\u00D7", "\u2716": "\u00D7", "\u2A2F": "\u00D7",
  "\u2610": "[ ]", "\u2611": "[x]", "\u2612": "[x]",
  // Viñetas y adornos
  "\u25C6": "\u2022", "\u25C7": "\u2022", "\u25CF": "\u2022", "\u25CB": "\u2022",
  "\u25A0": "\u2022", "\u25A1": "\u2022", "\u2666": "\u2022", "\u2731": "\u2022",
  "\u25B2": "^", "\u25BC": "v",
  // Ligaduras tipográficas que llegan al pegar desde Word o un PDF
  "\uFB00": "ff", "\uFB01": "fi", "\uFB02": "fl", "\uFB03": "ffi", "\uFB04": "ffl",
  // Se borran: no aportan nada en papel y su ausencia no cambia el sentido
  "\u2713": "", "\u2714": "", "\u2605": "", "\u2606": "", "\u26A0": "",
};

// Lo que Helvetica core sí sabe imprimir: ASCII + latin-1 + los extras de CP1252.
// Toda clave de EQUIVALENTES queda fuera de esta clase a propósito, para que la
// vía rápida de abajo nunca se salte una sustitución pendiente.
const IMPRIMIBLE =
  /[\t\n\r\x20-\x7E\u00A0-\u00FF\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178]/;
const TIENE_RARO = new RegExp(`[^${IMPRIMIBLE.source.slice(1, -1)}]`);

/** Deja un texto como la Helvetica del PDF puede imprimirlo. */
export function limpioPdf(s: string): string {
  // Los logos viajan como data-URI base64 de cientos de KB; no tiene caso
  // recorrerlos carácter por carácter para no cambiarles nada.
  if (!TIENE_RARO.test(s)) return s;
  let fuera = false;
  const out = [...s]
    .map((ch) => {
      const eq = EQUIVALENTES[ch];
      if (eq !== undefined) {
        // Si el carácter se borra deja un hueco (" ✓" → " "), así que cuenta
        // como texto alterado y hay que recolocar los espacios.
        if (eq === "") fuera = true;
        return eq;
      }
      if (IMPRIMIBLE.test(ch)) return ch;
      fuera = true;
      return " "; // emoji, invisibles, lo que sea: hueco, no basura
    })
    .join("");
  // Solo se recolocan espacios si de verdad se tiró algo, para no alterar
  // textos que venían bien (sangrías de notas, columnas alineadas a mano).
  return fuera ? out.replace(/[ \t]{2,}/g, " ").trim() : out;
}

/**
 * Aplica limpioPdf a cada cadena de una estructura de datos, conservando la
 * forma. Se llama una vez sobre el objeto que recibe el componente, en vez de
 * recordar el detalle en cada campo nuevo que alguien agregue.
 *
 * No toca las llaves, solo los valores; y deja intactos Date, Buffer y demás
 * objetos que no son texto plano.
 */
export function limpiarTextosPdf<T>(valor: T): T {
  if (typeof valor === "string") return limpioPdf(valor) as unknown as T;
  if (Array.isArray(valor)) return valor.map(limpiarTextosPdf) as unknown as T;
  if (valor && typeof valor === "object") {
    // Un elemento de React es un objeto plano: si se recorriera, se clonaría
    // a mano algo que React considera inmutable. Se deja pasar entero.
    if ("$$typeof" in valor) return valor;
    const proto = Object.getPrototypeOf(valor);
    if (proto !== Object.prototype && proto !== null) return valor; // Date, Buffer, clases
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor)) out[k] = limpiarTextosPdf(v);
    return out as T;
  }
  return valor;
}
