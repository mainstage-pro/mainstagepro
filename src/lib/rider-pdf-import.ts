// src/lib/rider-pdf-import.ts
//
// El rider que manda el artista casi siempre es un PDF, no un Word. Aquí el PDF
// se convierte a un HTML mínimo (h2, p, ul/li, table) para que lo lea el MISMO
// parser que el Word: leerRiderDocx(). Un solo parser semántico para las dos
// entradas, porque dos parsers divergen y el que se usa menos se podre.
//
// No hay modelo de lenguaje en este camino, igual que en el Word: nada se
// normaliza a nombres de catálogo, nada se completa y nada se deduce. Lo único
// que se reconstruye es la ESTRUCTURA que el PDF nunca guardó — qué era título,
// qué era tabla, qué era viñeta y qué era párrafo — y eso se deduce de las
// coordenadas y del tamaño de letra, no del significado del texto.

/// Una corrida de texto del PDF, con su caja. `alto` es el tamaño de letra.
interface Pieza {
  texto: string;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  fuente: string;
}

interface PaginaPdf {
  piezas: Pieza[];
  alto: number;
}

/// Un trozo de línea separado de sus vecinos por un hueco de columna.
interface Columna {
  texto: string;
  x: number;
  fin: number;
}

interface Linea {
  pagina: number;
  y: number;
  /// Tamaño de letra dominante de la línea.
  alto: number;
  /// Fuente dominante. pdfjs no expone el nombre real ("Helvetica-Bold"), solo
  /// un id opaco por fuente del documento ("g_d0_f1"), así que no sirve para
  /// saber si es negrita, pero sí para saber si DIFIERE de la del cuerpo.
  fuente: string;
  columnas: Columna[];
  texto: string;
  /// Borde derecho, para saber si la línea venía partida por el ancho de la caja.
  der: number;
}

/// El texto de una misma línea no cae exactamente en el mismo Y.
const TOLERANCIA_Y = 2.5;
/// Dos columnas se consideran la misma cuando sus inicios caen así de cerca.
const TOLERANCIA_X = 8;

function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const o = [...valores].sort((a, b) => a - b);
  return o[Math.floor(o.length / 2)];
}

function palabras(texto: string): number {
  return texto.split(/\s+/).filter(Boolean).length;
}

function normalizar(texto: string): string {
  return texto.replace(/[\u00a0\u2007\u202f]/g, " ").replace(/\s+/g, " ").trim();
}

function esc(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Extracción ──────────────────────────────────────────────────────────────

/// Sin worker y sin bajar fuentes por red: esto corre en una función serverless
/// que no tiene más disco que su propio bundle.
async function leerPaginas(buffer: Buffer): Promise<PaginaPdf[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const tarea = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    // Nada de red: `useWorkerFetch` apagado y sin `standardFontDataUrl`. Las
    // fuentes solo afectan el dibujo, y aquí únicamente se lee el texto.
    useWorkerFetch: false,
    disableFontFace: true,
    // `isEvalSupported` ya no existe: pdfjs 6 quitó el eval de raíz.
    verbosity: 0,
  });

  try {
    const doc = await tarea.promise;
    const paginas: PaginaPdf[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const pagina = await doc.getPage(n);
      const { items } = await pagina.getTextContent();
      const piezas: Pieza[] = [];
      for (const item of items) {
        // Lo que no trae `str` son marcas de contenido, no texto.
        if (!("str" in item)) continue;
        if (!item.str.trim()) continue;
        piezas.push({
          texto: item.str,
          x: item.transform[4],
          y: item.transform[5],
          ancho: item.width,
          alto: item.height || Math.abs(item.transform[3]) || 10,
          fuente: item.fontName,
        });
      }
      paginas.push({ piezas, alto: pagina.view[3] - pagina.view[1] });
      pagina.cleanup();
    }
    return paginas;
  } finally {
    // Sin esto el worker simulado se queda vivo y la función serverless se come
    // la memoria del PDF entre invocaciones.
    await tarea.destroy();
  }
}

// ── Líneas y columnas ───────────────────────────────────────────────────────

/// Un hueco de columna es mucho más ancho que el espacio entre palabras de esa
/// misma línea; el espacio se estima del tamaño de letra (~0.25 em).
function umbralColumna(alto: number): number {
  return Math.max(alto * 0.75, 8);
}

function armarLinea(piezas: Pieza[], pagina: number): Linea {
  const orden = [...piezas].sort((a, b) => a.x - b.x);
  const alto = mediana(orden.map((p) => p.alto)) || 10;
  const umbral = umbralColumna(alto);

  const columnas: Columna[] = [];
  let actual: Columna = { texto: orden[0].texto, x: orden[0].x, fin: orden[0].x + orden[0].ancho };
  for (let i = 1; i < orden.length; i++) {
    const p = orden[i];
    const hueco = p.x - actual.fin;
    if (hueco > umbral) {
      columnas.push(actual);
      actual = { texto: p.texto, x: p.x, fin: p.x + p.ancho };
      continue;
    }
    // Muchos PDF parten una palabra en varias corridas por el kerning: ahí el
    // hueco es ~0 y pegar un espacio rompería la palabra.
    actual.texto += hueco > alto * 0.12 ? ` ${p.texto}` : p.texto;
    actual.fin = Math.max(actual.fin, p.x + p.ancho);
  }
  columnas.push(actual);

  const porFuente = new Map<string, number>();
  for (const p of orden) porFuente.set(p.fuente, (porFuente.get(p.fuente) ?? 0) + p.texto.length);
  const fuente = [...porFuente.entries()].sort((a, b) => b[1] - a[1])[0][0];

  for (const c of columnas) c.texto = normalizar(c.texto);

  return {
    pagina,
    y: orden[0].y,
    alto,
    fuente,
    columnas: columnas.filter((c) => c.texto !== ""),
    texto: normalizar(columnas.map((c) => c.texto).join(" ")),
    der: Math.max(...columnas.map((c) => c.fin)),
  };
}

/// En PDF la Y crece hacia arriba, así que la página se lee de mayor a menor Y.
function enLineas(piezas: Pieza[], pagina: number): Linea[] {
  const orden = [...piezas].sort((a, b) => b.y - a.y || a.x - b.x);
  const grupos: Pieza[][] = [];
  for (const p of orden) {
    const g = grupos[grupos.length - 1];
    if (g && Math.abs(g[0].y - p.y) <= Math.max(TOLERANCIA_Y, g[0].alto * 0.25)) g.push(p);
    else grupos.push([p]);
  }
  return grupos.map((g) => armarLinea(g, pagina)).filter((l) => l.texto !== "");
}

/// El número de página y el nombre del artista al pie se repiten en todas las
/// hojas: entran como renglones basura si no se tiran. Los dígitos se igualan
/// para que "Página 3 de 12" cuente como una sola línea repetida.
function sinRepetidos(porPagina: Linea[][], paginas: PaginaPdf[]): Linea[][] {
  if (porPagina.length < 3) return porPagina;

  const clave = (l: Linea) => `${l.texto.replace(/\d+/g, "#")}@${Math.round(l.y / 10)}`;
  const conteo = new Map<string, number>();
  for (const lineas of porPagina) {
    for (const k of new Set(lineas.map(clave))) conteo.set(k, (conteo.get(k) ?? 0) + 1);
  }
  const minimo = Math.max(2, Math.ceil(porPagina.length * 0.6));

  return porPagina.map((lineas, i) => {
    const altoPagina = paginas[i].alto || 792;
    return lineas.filter((l) => {
      const margen = l.y > altoPagina * 0.9 || l.y < altoPagina * 0.1;
      return !(margen && (conteo.get(clave(l)) ?? 0) >= minimo);
    });
  });
}

// ── Tablas ──────────────────────────────────────────────────────────────────

const RE_TITULO_COLUMNA =
  /^(cant|cantidad|cdad|ctd|qty|qt|pzas?|pz|piezas?|ch|canal|channel|no|num|núm|n[º°]|#|equipo|descripci[óo]n|concepto|material|art[íi]culo|item|elemento|detalle|instrumento|micr[óo]fono|mic|modelo|marca|tipo|notas|nota|observaciones|obs|stand|base|insert|posici[óo]n|pos)\.?:?$/i;

/// Los inicios de columna de todas las filas, agrupados. Sirven de rejilla: así
/// una celda vacía deja su hueco en el `<tr>` en vez de correr las demás una
/// posición, que es lo que arruina la detección de la columna de cantidad.
function unificarColumnas(filas: Linea[]): number[] {
  const todos = filas.flatMap((f) => f.columnas.map((c) => c.x)).sort((a, b) => a - b);
  const grupos: number[][] = [];
  for (const x of todos) {
    const g = grupos[grupos.length - 1];
    if (g && x - g[g.length - 1] <= TOLERANCIA_X) g.push(x);
    else grupos.push([x]);
  }
  return grupos.map((g) => g.reduce((s, v) => s + v, 0) / g.length);
}

function celdas(linea: Linea, rejilla: number[]): string[] {
  const fila = rejilla.map(() => "");
  for (const c of linea.columnas) {
    let i = 0;
    for (let j = 1; j < rejilla.length; j++) {
      if (Math.abs(rejilla[j] - c.x) < Math.abs(rejilla[i] - c.x)) i = j;
    }
    fila[i] = fila[i] ? `${fila[i]} ${c.texto}` : c.texto;
  }
  return fila;
}

/// Una línea entra a la tabla si sus columnas caen donde las del grupo. Permite
/// una columna nueva (la de notas que solo traen algunas filas).
function alinea(linea: Linea, rejilla: number[]): boolean {
  const coincidencias = linea.columnas.filter((c) => rejilla.some((x) => Math.abs(x - c.x) <= TOLERANCIA_X)).length;
  return coincidencias >= 2 && coincidencias >= linea.columnas.length - 1;
}

/// Una línea con dos columnas puede ser un "Fecha:   12 de mayo"; una tabla son
/// varias seguidas con los inicios de columna alineados entre sí.
function grupoDeTabla(lineas: Linea[], desde: number, esTituloGrande: (l: Linea) => boolean): Linea[] | null {
  if (lineas[desde].columnas.length < 2) return null;
  const filas = [lineas[desde]];
  let rejilla = unificarColumnas(filas);

  for (let i = desde + 1; i < lineas.length; i++) {
    const l = lineas[i];
    if (l.columnas.length < 2 || esVineta(l.texto) || esTituloGrande(l) || !alinea(l, rejilla)) break;
    filas.push(l);
    rejilla = unificarColumnas(filas);
  }
  return filas.length >= 2 ? filas : null;
}

function esMayusculas(texto: string): boolean {
  return texto === texto.toUpperCase() && /[A-ZÁÉÍÓÚÜÑ]/.test(texto);
}

/// `leerRiderDocx` lee el `<th>` para saber qué columna es la cantidad y cuál el
/// concepto, así que vale la pena acertarle a la fila de encabezado.
function esFilaEncabezado(filas: Linea[], rejilla: string[][]): boolean {
  if (filas.length < 2) return false;

  const primera = rejilla[0].filter((c) => c.trim() !== "");
  if (primera.length >= 2 && primera.filter((c) => RE_TITULO_COLUMNA.test(c)).length >= Math.ceil(primera.length / 2)) {
    return true;
  }
  // La primera fila en una fuente que no usa ninguna otra fila es la fila en
  // negritas (pdfjs no dice "Bold", pero sí distingue una fuente de otra).
  const resto = filas.slice(1);
  if (!resto.some((f) => f.fuente === filas[0].fuente)) return true;
  if (filas[0].alto > Math.max(...resto.map((f) => f.alto)) + 0.5) return true;
  return esMayusculas(filas[0].texto) && !resto.every((f) => esMayusculas(f.texto));
}

function tablaHtml(filas: Linea[]): string {
  const rejilla = unificarColumnas(filas);
  const grid = filas.map((f) => celdas(f, rejilla));
  const conEncabezado = esFilaEncabezado(filas, grid);

  const tr = grid.map((fila, i) => {
    const et = conEncabezado && i === 0 ? "th" : "td";
    return `<tr>${fila.map((c) => `<${et}>${esc(c)}</${et}>`).join("")}</tr>`;
  });
  return `<table>${tr.join("")}</table>`;
}

// ── Viñetas, títulos y párrafos ─────────────────────────────────────────────

/// El guion y el asterisco exigen espacio detrás para no comerse el "-04 - SB18"
/// ni partir un modelo; los bolos redondos no hacen falta.
const RE_VINETA = /^([•·◦‣▪\u2022\uf0b7\uf0a7]\s*|[-–—*]\s+)/;

function esVineta(texto: string): boolean {
  return RE_VINETA.test(texto);
}

/// Mismo criterio que `pareceEncabezado` del Word: un número con punto es la
/// numeración de la sección ("5. Sistema de audio"); un número sin punto es una
/// cantidad gritada ("12 KARA I") y eso es equipo, no título.
function noEsCantidad(texto: string): boolean {
  return !/^\d/.test(texto) || /^\d{1,2}[.)]\s/.test(texto);
}

type ClaseTitulo = "H2" | "FUERTE" | null;

function claseDeTitulo(linea: Linea, medianaAlto: number, fuenteCuerpo: string): ClaseTitulo {
  const t = linea.texto;
  if (!t || t.length > 90 || /[.,;]$/.test(t) || !noEsCantidad(t)) return null;

  if (linea.alto >= medianaAlto * 1.15) return "H2";

  // "FUERTE" sale como `<p><strong>` y la decisión final la toma
  // `pareceEncabezado` del parser del Word, que ya sabe distinguir un párrafo
  // en negritas de un título. Las mayúsculas las reconoce él solo.
  const otraFuente = linea.fuente !== fuenteCuerpo && palabras(t) <= 12 && !/^[a-záéíóúüñ]/.test(t);
  const negritas = /bold|black|heavy|semibold/i.test(linea.fuente) || otraFuente;
  if ((negritas || esMayusculas(t)) && palabras(t) <= 16) return "FUERTE";
  return null;
}

/// Un párrafo partido en seis líneas se lee como seis renglones de equipo
/// basura, así que la prosa que venía de corrido se vuelve a pegar. Se une solo
/// cuando la línea anterior quedó abierta: sin punto y, o siguiendo en
/// minúscula, o llegando al margen derecho de la caja de texto.
function continua(previa: Linea, siguiente: Linea, margenDer: number): boolean {
  if (previa.pagina !== siguiente.pagina) return false;
  if (previa.y - siguiente.y > previa.alto * 2.4) return false;
  if (/[.:;!?]$/.test(previa.texto)) return false;
  if (/^[a-záéíóúüñ(]/.test(siguiente.texto)) return true;
  return previa.der >= margenDer - 6;
}

// ── Armado del HTML ─────────────────────────────────────────────────────────

function aHtml(lineas: Linea[], medianaAlto: number, fuenteCuerpo: string, margenDer: number): string {
  const html: string[] = [];
  let parrafo: Linea[] = [];
  let vinetas: string[] = [];

  const esTituloGrande = (l: Linea) => claseDeTitulo(l, medianaAlto, fuenteCuerpo) === "H2";

  const cerrarParrafo = () => {
    if (parrafo.length === 0) return;
    html.push(`<p>${esc(parrafo.map((l) => l.texto).join(" "))}</p>`);
    parrafo = [];
  };
  const cerrarVinetas = () => {
    if (vinetas.length === 0) return;
    html.push(`<ul>${vinetas.map((v) => `<li>${esc(v)}</li>`).join("")}</ul>`);
    vinetas = [];
  };

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];

    // La viñeta se revisa antes que la tabla: el símbolo es una decisión del
    // autor, los huecos horizontales son una interpretación nuestra.
    if (esVineta(linea.texto)) {
      cerrarParrafo();
      vinetas.push(linea.texto.replace(RE_VINETA, ""));
      continue;
    }

    const titulo = claseDeTitulo(linea, medianaAlto, fuenteCuerpo);

    // La fila de encabezado de una tabla viene en negritas y parece título: la
    // tabla se intenta primero y solo un título de cuerpo mayor le gana. Si el
    // "CANT / DESCRIPCIÓN" se va como título, la tabla pierde su `<th>` y sus
    // renglones se cuelgan de una sección inventada.
    if (titulo !== "H2") {
      const tabla = grupoDeTabla(lineas, i, esTituloGrande);
      if (tabla) {
        cerrarParrafo();
        cerrarVinetas();
        html.push(tablaHtml(tabla));
        i += tabla.length - 1;
        continue;
      }
    }

    if (titulo !== null) {
      cerrarParrafo();
      cerrarVinetas();
      html.push(titulo === "H2" ? `<h2>${esc(linea.texto)}</h2>` : `<p><strong>${esc(linea.texto)}</strong></p>`);
      continue;
    }

    cerrarVinetas();
    const previa = parrafo[parrafo.length - 1];
    if (previa && !continua(previa, linea, margenDer)) cerrarParrafo();
    parrafo.push(linea);
  }

  cerrarParrafo();
  cerrarVinetas();
  return html.join("\n");
}

/// El PDF del rider como el HTML mínimo que `leerRiderDocx` sabe leer. Devuelve
/// cadena vacía cuando el PDF no trae capa de texto (un escaneo, una foto).
export async function pdfAHtml(buffer: Buffer): Promise<string> {
  const paginas = await leerPaginas(buffer);
  const limpias = sinRepetidos(
    paginas.map((p, i) => enLineas(p.piezas, i + 1)),
    paginas,
  );
  const lineas = limpias.flat();
  if (lineas.length === 0) return "";

  const piezas = paginas.flatMap((p) => p.piezas);
  const medianaAlto = mediana(piezas.map((p) => p.alto)) || 10;

  const porFuente = new Map<string, number>();
  for (const p of piezas) porFuente.set(p.fuente, (porFuente.get(p.fuente) ?? 0) + p.texto.length);
  const fuenteCuerpo = [...porFuente.entries()].sort((a, b) => b[1] - a[1])[0][0];

  // El margen derecho de la caja de texto, para saber qué línea venía partida
  // por el ancho y no por punto y aparte.
  const bordes = lineas.filter((l) => l.columnas.length === 1).map((l) => l.der).sort((a, b) => a - b);
  const margenDer = bordes.length > 0 ? bordes[Math.floor(bordes.length * 0.9)] : Infinity;

  return aHtml(lineas, medianaAlto, fuenteCuerpo, margenDer);
}
