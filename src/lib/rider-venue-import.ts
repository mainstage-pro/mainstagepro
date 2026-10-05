// src/lib/rider-venue-import.ts
//
// Convierte el rider técnico de una casa —pegado como texto— en renglones de
// inventario del venue. No existe un formato: cada recinto manda su lista con
// la numeración, los separadores y el idioma que se le ocurrió, así que esto es
// un primer pase deliberadamente tolerante y lo que sale se corrige a mano
// antes de guardarse. Nunca escribe en la base: solo propone.

import { DISCIPLINAS } from "@/lib/giras";
import { canonDe, esTablaDmx } from "@/lib/advance-canon";

export interface RenglonImportado {
  disciplina: string;
  concepto: string;
  cantidad: number;
  marca: string | null;
  modelo: string | null;
  notas: string | null;
  /// La línea tal como venía, para que quien revisa el preview pueda comparar.
  crudo: string;
}

export interface ResultadoImport {
  renglones: RenglonImportado[];
  /// Líneas que se descartaron por ruido (pies de página, datos de contacto).
  descartadas: number;
  /// true cuando el texto venía con una palabra por línea, como lo extrae un
  /// lector de PDF, y hubo que rearmarlo.
  reflujo: boolean;
}

/// Encabezados del documento → disciplina. Se busca por subcadena en el
/// encabezado normalizado, de la clave más larga a la más corta, porque
/// "MICROFONÍA" y "FOH / CONTROL" caen las dos en audio.
const PISTAS_DISCIPLINA: [string, string][] = [
  ["RED DE ESCENARIO", "ENERGIA"],
  ["SOBRETARIMA", "ESCENARIO"],
  ["MICROFON", "AUDIO"],
  ["MONITOR", "AUDIO"],
  ["INALAMBRIC", "AUDIO"],
  ["CONSOLA", "AUDIO"],
  ["AUDIO", "AUDIO"],
  ["SONIDO", "AUDIO"],
  ["FOH", "AUDIO"],
  ["P.A", "AUDIO"],
  ["PA ", "AUDIO"],
  ["DELAY", "AUDIO"],
  ["ILUMINAC", "ILUMINACION"],
  ["LUCES", "ILUMINACION"],
  ["LIGHTING", "ILUMINACION"],
  ["DIMMER", "ILUMINACION"],
  ["CCTV", "VIDEO"],
  ["VIDEO", "VIDEO"],
  ["PANTALLA", "VIDEO"],
  ["PROYEC", "VIDEO"],
  ["BACKLINE", "BACKLINE"],
  ["BATERIA", "BACKLINE"],
  ["GUITARRA", "BACKLINE"],
  ["BAJO", "BACKLINE"],
  ["TECLADO", "BACKLINE"],
  ["INSTRUMENT", "BACKLINE"],
  ["ESCENARIO", "ESCENARIO"],
  ["STAGE", "ESCENARIO"],
  ["TARIMA", "ESCENARIO"],
  ["TELON", "ESCENARIO"],
  ["ENERGIA", "ENERGIA"],
  ["ELECTRIC", "ENERGIA"],
  ["PLANTA DE LUZ", "ENERGIA"],
  ["GENERADOR", "ENERGIA"],
  ["CORRIENTE", "ENERGIA"],
  ["CONTACTO", "ENERGIA"],
  ["RIGGING", "RIGGING"],
  ["TRUSS", "RIGGING"],
  ["ESTRUCTURA", "RIGGING"],
  ["MOTOR", "RIGGING"],
  ["INTERCOM", "COMUNICACION"],
  ["COMUNICAC", "COMUNICACION"],
  ["RADIO", "COMUNICACION"],
  ["PERSONAL", "PERSONAL"],
  ["CREW", "PERSONAL"],
  ["STAFF", "PERSONAL"],
  ["TECNICOS", "PERSONAL"],
  ["CAMERINO", "OTRO"],
  ["CATERING", "OTRO"],
  ["MISCELANEO", "OTRO"],
];

/// Las mismas pistas, en versalitas, para cortar el flujo de un PDF donde el
/// encabezado quedó pegado al concepto anterior. Se buscan sensibles a
/// mayúsculas: "MONITORES" abre sección, "Monitores de piso" es un concepto.
const RE_SECCION_PEGADA = new RegExp(
  `(?<=\\s)(${PISTAS_DISCIPLINA.map(([p]) => p.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
  "g",
);

/// Ruido que ningún rider aporta al inventario: pies de página, datos de
/// contacto y los encabezados de portada.
const RE_RUIDO = [
  /^(mail|correo|e-?mail|tel|telefono|teléfono|cel|whats)\s*:?/i,
  /@[\w.-]+\.\w{2,}/,
  /^(ext|extension|extensión)\b/i,
  /^p[áa]gina\s*\d+/i,
  /^\d{1,3}$/,
  /^rider\b/i,
  // Un concepto que arranca con preposición es media frase que quedó partida
  // por la cantidad: "24 de Octubre de 2026".
  /^(de|del|a|al|y|o|en|por|para|con|los|las)\s/i,
];

function limpiar(linea: string): string {
  return linea
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/// Un extractor de PDF suele escupir una palabra por renglón. Si eso pasa, el
/// texto se rearma en un solo flujo y se vuelve a cortar por los arranques de
/// concepto: la viñeta pegada a la palabra (`-Madera`, `-04`) o un encabezado
/// en mayúsculas. Sin esto el rider de un recinto entra como 3,600 renglones de
/// una palabra.
function reflujo(lineas: string[]): string[] {
  const flujo = lineas.join(" ").replace(/\s+/g, " ").trim();
  return flujo
    // La viñeta pegada a la palabra: `-Madera`, `-04`.
    .replace(/\s(?=-(?=[0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ]))/g, "\n")
    // Cantidad suelta seguida de marca o concepto: `8 MEYER SOUND MSL4`. Pide
    // mayúscula después para no partir "5 metros de fondo" a media frase.
    .replace(/\s(?=\d{1,3}\s+[A-ZÁÉÍÓÚÜÑ])/g, "\n")
    // Los encabezados de sección también vienen pegados al concepto anterior y
    // sin ellos el rider entero cae en un solo departamento.
    .replace(RE_SECCION_PEGADA, "\n$1")
    .split("\n");
}

function pareceTokenizado(lineas: string[]): boolean {
  if (lineas.length < 40) return false;
  const unaPalabra = lineas.filter((l) => !l.includes(" ")).length;
  return unaPalabra / lineas.length >= 0.5;
}

function disciplinaDeEncabezado(linea: string): string | null {
  // La numeración del índice no es una cantidad: "3. ILUMINACIÓN Y EFECTOS"
  // sigue siendo un encabezado.
  const sinIndice = linea.replace(/^\d{1,2}[.)]\s*/, "").trim();
  const n = normalizar(sinIndice);
  // Un encabezado no trae cantidades ni frases largas; si las trae es un
  // concepto que se parece a un encabezado, y vale más capturarlo que perderlo.
  if (n.length > 60 || /\d/.test(n)) return null;
  if (sinIndice !== sinIndice.toUpperCase()) return null;
  for (const [pista, disciplina] of PISTAS_DISCIPLINA) {
    if (n.includes(pista)) return disciplina;
  }
  return null;
}

/// La misma pista, pero sin exigir mayúsculas ni castigar los números: en un
/// Word el estilo de título ya dijo que es un encabezado, no hay que deducirlo
/// de la forma del texto. Null cuando el título no dice de qué departamento es.
export function departamentoPorTitulo(titulo: string): string | null {
  const n = normalizar(titulo.replace(/^\d{1,2}[.)]\s*/, ""));
  for (const [pista, disciplina] of PISTAS_DISCIPLINA) {
    // En la lista de un recinto "CONTACTOS" son tomas de corriente; en el
    // título de un rider son las personas a las que se les llama.
    if (pista === "CONTACTO") continue;
    if (n.includes(pista)) return disciplina;
  }
  return null;
}

/// Separa la cantidad del concepto. `-04 - L-Acoustics SB18m`, `12 KARA I`,
/// `01 - Snare 14"` y `6 a 8 Subwoofers` dan todos la misma lectura; cuando el
/// renglón no dice cuántos, es uno.
function partirCantidad(linea: string): { cantidad: number; resto: string } {
  const sinVineta = linea.replace(/^[-–—•*·]+\s*/, "").trim();
  // El rango ("6 a 8 subwoofers") exige espacios alrededor de la "a" y el
  // separador no admite "x": sin eso, "2 A10 – L-ACOUSTICS" se lee como el
  // rango 2 a 10 y "12 X 8" pierde el modelo.
  const m = sinVineta.match(
    /^(\d{1,3})(?:\s+a\s+\d{1,3}|\s*[-–—/]\s*\d{1,3})?\s*(?:[-–—:]|[Pp][Zz][Aa]?[Ss]?|[Pp][Cc][Ss]?)?\s+(.+)$/,
  );
  if (m) return { cantidad: Math.max(1, Number(m[1])), resto: m[2].trim() };
  const solo = sinVineta.match(/^(\d{1,3})\s*[-–—]\s*(.+)$/);
  if (solo) return { cantidad: Math.max(1, Number(solo[1])), resto: solo[2].trim() };
  return { cantidad: 1, resto: sinVineta };
}

/// Busca una marca conocida al inicio o al final del concepto. Las dos
/// escrituras existen en la vida real: "L-Acoustics SB18m" en un rider y
/// "KARA I – L-ACOUSTICS" en el siguiente. Gana la coincidencia más larga para
/// que "Meyer Sound" no se lea como "Meyer".
function partirMarca(texto: string, marcas: string[]): { marca: string | null; modelo: string | null; concepto: string } {
  const tokens = texto.split(" ");
  const normales = tokens.map(normalizar);
  const candidatas = [...marcas].sort((a, b) => b.length - a.length);

  for (const marca of candidatas) {
    const partes = normalizar(marca).split(" ").filter(Boolean);
    if (!partes.length || partes.length >= tokens.length) continue;

    if (partes.every((p, i) => normales[i] === p)) {
      const modelo = tokens.slice(partes.length).join(" ").replace(/^[-–—:/,]+\s*/, "").trim();
      if (modelo) return { marca, modelo, concepto: modelo };
    }

    const corte = tokens.length - partes.length;
    if (partes.every((p, i) => normales[corte + i] === p)) {
      const modelo = tokens.slice(0, corte).join(" ").replace(/[-–—:/,]+$/, "").trim();
      if (modelo) return { marca, modelo, concepto: modelo };
    }
  }

  return { marca: null, modelo: null, concepto: texto };
}

function esRuido(linea: string): boolean {
  if (linea.length < 3) return true;
  if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(linea)) return true;
  return RE_RUIDO.some((re) => re.test(linea));
}

export function importarRiderVenue(texto: string, marcas: string[] = []): ResultadoImport {
  const crudas = texto.split(/\r?\n/).map(limpiar).filter(Boolean);
  const tokenizado = pareceTokenizado(crudas);
  const lineas = (tokenizado ? reflujo(crudas) : crudas).map(limpiar).filter(Boolean);

  const renglones: RenglonImportado[] = [];
  let descartadas = 0;
  let disciplina = "OTRO";
  // Las líneas sueltas que no son encabezado ni concepto suelen ser la posición
  // o la condición de lo que viene abajo —"(Left)", "Main PA (Sistema
  // Principal)"—, así que se arrastran como nota de los renglones siguientes.
  let contexto: string | null = null;

  for (const linea of lineas) {
    const encabezado = disciplinaDeEncabezado(linea);
    if (encabezado) {
      disciplina = encabezado;
      contexto = null;
      continue;
    }

    if (esRuido(linea)) {
      descartadas += 1;
      continue;
    }

    const soloParentesis = /^\(.*\)$/.test(linea);
    const { cantidad, resto } = partirCantidad(linea);
    const sinCantidad = resto === linea.replace(/^[-–—•*·]+\s*/, "").trim();
    const arrancaViñeta = /^[-–—•*·]/.test(linea);

    // Sin cantidad propia y sin viñeta no es un renglón de equipo: es el rótulo
    // de lo que sigue.
    if (soloParentesis || (sinCantidad && !arrancaViñeta)) {
      contexto = linea.replace(/^\(|\)$/g, "").trim() || null;
      continue;
    }

    const { marca, modelo, concepto } = partirMarca(resto, marcas);
    if (!concepto || esRuido(concepto) || esTablaDmx(concepto)) {
      descartadas += 1;
      continue;
    }

    // El encabezado dice dónde iba el renglón en el documento; el canon dice qué
    // es. Cuando el canon lo reconoce, él manda: los riders de venue arrastran
    // párrafos enteros bajo un encabezado que ya no les corresponde.
    const canon = canonDe(concepto, marca, modelo);
    const porEncabezado = DISCIPLINAS.includes(disciplina as (typeof DISCIPLINAS)[number]) ? disciplina : "OTRO";

    renglones.push({
      disciplina: canon?.disciplina ?? porEncabezado,
      concepto,
      cantidad,
      marca,
      modelo,
      notas: contexto,
      crudo: linea,
    });
  }

  return { renglones, descartadas, reflujo: tokenizado };
}
