// src/lib/rider-docx-import.ts
//
// Lee el rider del artista desde su Word y lo propone tal como viene. No hay
// modelo de lenguaje en este camino a propósito: la transcripción anterior se
// hizo a mano y acabó inventando sistemas de audio y luces que el documento no
// pedía. Aquí nada se completa, nada se normaliza a nombres de catálogo y nada
// se deduce de otros renglones — si el documento no lo dice, se queda vacío.
//
// Cada renglón se queda con su texto crudo para que el preview pueda comparar
// contra el documento antes de guardar. Nunca escribe en la base: solo propone.

import { departamentoPorTitulo } from "@/lib/rider-venue-import";

export interface RenglonRiderDoc {
  /// Null cuando el documento no dice cuántos. No se asume uno aquí.
  cantidad: number | null;
  concepto: string;
  notas: string | null;
  /// El renglón tal como venía (la fila completa de la tabla, la viñeta entera).
  crudo: string;
}

export interface SeccionRiderDoc {
  /// El título tal como lo trae el documento. Null en lo que viene antes del
  /// primer título.
  titulo: string | null;
  /// Los párrafos verbatim, en el orden del documento.
  parrafos: string[];
  renglones: RenglonRiderDoc[];
  /// Departamento que sugiere el título, null cuando el título no da pista.
  /// Es una sugerencia para el preview, no una clasificación.
  departamento: string | null;
}

export interface ResultadoRiderDoc {
  secciones: SeccionRiderDoc[];
  totalParrafos: number;
  totalRenglones: number;
}

const ENTIDADES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function aTexto(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, e) => ENTIDADES[String(e).toLowerCase()] ?? m)
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/// Un bloque del documento, en orden. La tabla va primero en la alternancia
/// para que se coma los `<p>` de sus celdas en vez de que se lean como párrafos.
const RE_BLOQUE =
  /<table[^>]*>([\s\S]*?)<\/table>|<h([1-6])[^>]*>([\s\S]*?)<\/h\2>|<li[^>]*>([\s\S]*?)<\/li>|<p[^>]*>([\s\S]*?)<\/p>/gi;

/// Word no siempre usa estilos de título: medio rider del mundo marca sus
/// secciones con negritas o con mayúsculas. Un párrafo corto, sin punto final y
/// todo en negritas (o todo en mayúsculas) es un encabezado.
function pareceEncabezado(html: string, texto: string): boolean {
  if (!texto || texto.length > 90) return false;
  const soloNegritas = /^(?:<(?:strong|b)[^>]*>[\s\S]*<\/(?:strong|b)>\s*)+$/i.test(html.trim());
  const mayusculas = texto === texto.toUpperCase() && /[A-ZÁÉÍÓÚÜÑ]/.test(texto);
  if (!soloNegritas && !mayusculas) return false;
  if (texto.endsWith(".")) return false;
  // Un número con punto es la numeración de la sección ("5. Sistema de audio");
  // un número sin punto es una cantidad gritada ("12 KARA I").
  return !/^\d/.test(texto) || /^\d{1,2}[.)]\s/.test(texto);
}

/// `4 Monitores de piso`, `04 - Snare 14"`, `2 x DI activa`. Si el renglón no
/// dice cuántos, la cantidad se queda en null: inventarla es inventar el rider.
const RE_CANTIDAD = /^[-–—•*·\s]*(\d{1,4})\s*(?:x|pzas?\.?|pz\.?|pcs?\.?|uds?\.?)?\s*[).:\-–—]?\s+(\D.*)$/i;

function palabras(texto: string): number {
  return texto.split(/\s+/).filter(Boolean).length;
}

/// Un renglón de equipo es corto y enumerable. Un párrafo de condiciones que
/// empieza con un número no lo es, y meterlo como equipo ensucia el advance.
function comoRenglon(texto: string, esVineta: boolean): RenglonRiderDoc | null {
  if (!texto) return null;
  const m = RE_CANTIDAD.exec(texto);
  if (m && texto.length <= 160 && palabras(texto) <= 22) {
    return { cantidad: Number(m[1]), concepto: m[2].trim(), notas: null, crudo: texto };
  }
  // Una viñeta sin cantidad sigue siendo equipo que el artista enumera; la
  // cantidad la pone quien revisa. La prosa con punto final no lo es.
  if (esVineta && !m && texto.length <= 120 && palabras(texto) <= 14 && !texto.endsWith(".")) {
    return { cantidad: null, concepto: texto, notas: null, crudo: texto };
  }
  return null;
}

interface FilaTabla {
  celdas: string[];
  /// Word marca su fila de encabezado con `<th>`, así que no hay que adivinarla.
  esEncabezado: boolean;
}

function filasDeTabla(html: string): FilaTabla[] {
  const filas: FilaTabla[] = [];
  for (const fila of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const celdas = [...fila[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => aTexto(c[1]));
    if (celdas.some((c) => c !== "")) filas.push({ celdas, esEncabezado: /<th[\s>]/i.test(fila[1]) });
  }
  return filas;
}

const RE_COL_CANTIDAD = /^(cant|cantidad|cdad|ctd|qty|qt|pzas?|pz|piezas?)/i;
const RE_COL_CONCEPTO = /(equipo|descripc|concepto|material|art[ií]culo|item|elemento|detalle)/i;

function esNumero(celda: string): boolean {
  return /^\d{1,4}$/.test(celda.trim());
}

/// Una columna 1, 2, 3… es la numeración de la lista, no una cantidad. Leerla
/// como cantidad pondría "14 piezas" donde el documento dice "canal 14".
function esNumeracion(valores: string[]): boolean {
  if (valores.length < 3) return false;
  return valores.every((v, i) => Number(v.trim()) === i + 1);
}

/// Qué columna es la cantidad y cuál el concepto. Un rider nombra la cosa en la
/// primera columna y la especifica en las de la derecha, así que el concepto es
/// la primera columna de texto salvo que el encabezado diga otra cosa.
function columnasDeTabla(filas: FilaTabla[]): {
  iCantidad: number | null;
  iConcepto: number;
  encabezados: string[] | null;
  desde: number;
} {
  const conEncabezado = filas[0]?.esEncabezado && filas.length > 1;
  const encabezados = conEncabezado ? filas[0].celdas : null;
  const datos = filas.slice(conEncabezado ? 1 : 0).map((f) => f.celdas);
  const ancho = Math.max(...filas.map((f) => f.celdas.length));

  let iCantidad: number | null = null;
  let iNumeracion: number | null = null;
  if (encabezados) {
    const i = encabezados.findIndex((c) => RE_COL_CANTIDAD.test(c));
    if (i >= 0) iCantidad = i;
  }
  for (let i = 0; i < ancho; i++) {
    const valores = datos.map((f) => f[i] ?? "").filter((c) => c !== "");
    if (valores.length === 0) continue;
    if (valores.filter(esNumero).length / valores.length < 0.6) continue;
    if (esNumeracion(valores)) {
      if (iNumeracion === null) iNumeracion = i;
      continue;
    }
    if (iCantidad === null) iCantidad = i;
  }

  const porEncabezado = encabezados?.findIndex((c) => RE_COL_CONCEPTO.test(c)) ?? -1;
  const primeraDeTexto = (() => {
    for (let i = 0; i < ancho; i++) {
      if (i === iCantidad || i === iNumeracion) continue;
      if (datos.some((f) => (f[i] ?? "").trim() !== "")) return i;
    }
    return 0;
  })();

  return {
    iCantidad,
    iConcepto: porEncabezado >= 0 ? porEncabezado : primeraDeTexto,
    encabezados,
    desde: conEncabezado ? 1 : 0,
  };
}

function renglonesDeTabla(html: string): RenglonRiderDoc[] {
  const filas = filasDeTabla(html);
  if (filas.length === 0) return [];
  const { iCantidad, iConcepto, encabezados, desde } = columnasDeTabla(filas);

  const renglones: RenglonRiderDoc[] = [];
  for (const { celdas: fila } of filas.slice(desde)) {
    const concepto = (fila[iConcepto] ?? "").trim();
    if (!concepto) continue;
    const bruta = iCantidad === null ? "" : (fila[iCantidad] ?? "").trim();
    const notas = fila
      .map((celda, i) => {
        if (i === iConcepto || i === iCantidad || !celda.trim()) return null;
        const etiqueta = encabezados?.[i]?.trim();
        return etiqueta ? `${etiqueta}: ${celda.trim()}` : celda.trim();
      })
      .filter(Boolean)
      .join(" · ");

    renglones.push({
      cantidad: esNumero(bruta) ? Number(bruta) : null,
      concepto,
      notas: notas || null,
      crudo: fila.filter((c) => c.trim()).join(" | "),
    });
  }
  return renglones;
}

/// El HTML que entrega mammoth, convertido en secciones en el orden del
/// documento. Un encabezado abre sección; lo que sigue le pertenece.
export function leerRiderDocx(html: string): ResultadoRiderDoc {
  const secciones: SeccionRiderDoc[] = [];
  let actual: SeccionRiderDoc = { titulo: null, parrafos: [], renglones: [], departamento: null };

  function cerrar() {
    if (actual.titulo !== null || actual.parrafos.length > 0 || actual.renglones.length > 0) secciones.push(actual);
  }

  for (const bloque of html.matchAll(RE_BLOQUE)) {
    const [, tabla, , titulo, vineta, parrafo] = bloque;

    if (tabla !== undefined) {
      actual.renglones.push(...renglonesDeTabla(bloque[0]));
      continue;
    }

    if (titulo !== undefined) {
      const texto = aTexto(titulo);
      if (!texto) continue;
      cerrar();
      actual = { titulo: texto, parrafos: [], renglones: [], departamento: departamentoPorTitulo(texto) };
      continue;
    }

    const crudo = vineta !== undefined ? vineta : parrafo;
    if (crudo === undefined) continue;
    const texto = aTexto(crudo);
    if (!texto) continue;

    if (pareceEncabezado(crudo, texto)) {
      cerrar();
      actual = { titulo: texto, parrafos: [], renglones: [], departamento: departamentoPorTitulo(texto) };
      continue;
    }

    const renglon = comoRenglon(texto, vineta !== undefined);
    if (renglon) actual.renglones.push(renglon);
    else actual.parrafos.push(texto);
  }
  cerrar();

  return {
    secciones,
    totalParrafos: secciones.reduce((s, x) => s + x.parrafos.length, 0),
    totalRenglones: secciones.reduce((s, x) => s + x.renglones.length, 0),
  };
}
