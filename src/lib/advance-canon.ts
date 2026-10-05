/**
 * El canon de conceptos del advance.
 *
 * El rider del artista pide requisitos ("main L/R de line array, mínimo 8 cajas
 * por lado") y la casa contesta con productos ("12 KARA I – L-ACOUSTICS").
 * Cotejar esos dos textos letra por letra cruza el 2% de los renglones, así que
 * el cotejo no es textual: cada lado se traduce a un concepto canónico y el
 * advance cruza por esa clave.
 *
 * Las pistas mezclan a propósito dos cosas: el término genérico (lo que escribe
 * el rider) y los modelos reales que circulan en México (lo que escribe la casa).
 * Por eso la lista crece sola: cada rider de venue nuevo que no cruce es una
 * pista que falta, no un cambio de algoritmo.
 */

import { normalizar } from "@/lib/buscar";

export interface ConceptoCanon {
  clave: string;
  disciplina: string;
  label: string;
  pistas: string[];
}

export const CANON: ConceptoCanon[] = [
  // ── Audio: sistema ─────────────────────────────────────────────────────────
  {
    clave: "LINE_ARRAY",
    disciplina: "AUDIO",
    label: "Line array principal",
    pistas: [
      "line array", "lineal array", "main l r", "pa principal", "sistema principal",
      "kara", "k1", "k2", "k3", "kiva", "syva", "arcs", "vertec", "vtx", "msl4", "mica",
      "leopard", "lina", "lyon", "panther", "geo m", "geo s", "q1", "q7", "j8", "j12",
      "v8", "v12", "y8", "y10", "aero", "las", "hdl", "wpl", "wpc",
    ],
  },
  {
    clave: "SUBWOOFER",
    disciplina: "AUDIO",
    label: "Subwoofer",
    pistas: [
      "subwoofer", "sub bajo", "subgrave", "sub", "subs", "cardioide", "end fire",
      "sb18", "sb 18", "sb18m", "sb18x", "sb28", "sb 28", "ks21", "ks 21", "ks28", "ks 28",
      "700hp", "900lfc", "1100lfc", "b2 sub", "j infra", "sx28", "ksub", "18 sub",
    ],
  },
  {
    clave: "FRONTFILL",
    disciplina: "AUDIO",
    label: "Frontfill",
    pistas: ["frontfill", "front fill", "frontfills", "frente de escenario", "x8", "x 8", "x12", "x 12", "5xt", "8xt"],
  },
  {
    clave: "SIDEFILL",
    disciplina: "AUDIO",
    label: "Sidefill",
    pistas: ["sidefill", "side fill", "sidefills"],
  },
  {
    clave: "MONITOR_PISO",
    disciplina: "AUDIO",
    label: "Monitor de piso",
    pistas: [
      "monitor de piso", "monitores de piso", "wedge", "wedges", "retorno de piso",
      "m12a", "ks12", "x15", "sm80", "sm10", "115hiq", "mjf",
    ],
  },
  {
    clave: "CONSOLA_FOH",
    disciplina: "AUDIO",
    label: "Consola digital de FOH",
    pistas: [
      "consola digital", "consola de foh", "consola de audio", "mezcladora", "mixer",
      "digital mixer", "front of house", "sq5", "sq 5", "m32", "x32", "pro2", "pro x",
      "cl5", "cl3", "ql5", "ql1", "sd10", "sd12", "sd9", "dlive", "s6l", "m7cl", "ls9",
      "wing", "quantum", "profile",
    ],
  },
  {
    clave: "CONSOLA_MONITOR",
    disciplina: "AUDIO",
    label: "Consola de monitores",
    pistas: ["consola de monitores", "monitor console", "consola de monitor"],
  },
  {
    clave: "STAGEBOX",
    disciplina: "AUDIO",
    label: "Stagebox / snake de escenario",
    pistas: [
      "stagebox", "stage box", "stage rack", "audio rack", "snake", "sub snake", "subsnake",
      "multipar", "ab168", "dl16", "dl32", "s16", "sd rack", "io rack",
    ],
  },
  {
    clave: "MIC_INALAMBRICO",
    disciplina: "AUDIO",
    label: "Micrófono de mano inalámbrico",
    pistas: [
      "microfono de mano inalambrico", "micro de mano", "micros de mano", "handheld wireless",
      "inalambrico digital", "microfono inalambrico", "ulxd2", "adx2", "ad2", "qlxd2",
      "blx4r", "slx", "ewd", "ew 135", "axient",
    ],
  },
  {
    clave: "MIC_ALAMBRICO",
    disciplina: "AUDIO",
    label: "Micrófono alámbrico",
    pistas: [
      "microfono alambrico", "microfono de cable", "sm58", "sm 58", "sm57", "sm 57",
      "beta 58", "beta58", "beta 57", "beta 52", "beta 56", "beta 87", "beta 91", "beta 98",
      "sm81", "sm 81", "ksm", "e835", "e935", "e945", "e901", "e902", "e904", "e906", "e609",
      "md 421", "c414", "c 414", "c451", "atm", "pga",
    ],
  },
  {
    clave: "MIC_TALKBACK",
    disciplina: "AUDIO",
    label: "Micrófono de talkback",
    pistas: ["talkback", "talk back", "shout"],
  },
  {
    clave: "DI_ACTIVA",
    disciplina: "AUDIO",
    label: "Caja directa activa",
    pistas: ["caja directa activa", "di activa", "active di", "di active", "activate direct box", "di box active", "j48"],
  },
  {
    clave: "DI_PASIVA",
    disciplina: "AUDIO",
    label: "Caja directa pasiva",
    pistas: [
      "caja directa pasiva", "di pasiva", "passive di", "di passive", "passive direct box",
      "di box", "di stereo", "di radial", "jdi", "stage bug",
    ],
  },
  {
    clave: "PEDESTAL_MIC",
    disciplina: "AUDIO",
    label: "Pedestal de micrófono",
    pistas: [
      "pedestal de microfono", "stand de microfono", "boom stand", "boom stands", "mic stand",
      "straight stand", "mini stand", "tripie", "atril de microfono",
    ],
  },
  {
    clave: "IEM",
    disciplina: "AUDIO",
    label: "Sistema de in-ear",
    pistas: ["in ear", "in-ear", "inear", "iem", "monitoreo personal", "psm900", "psm1000", "p3t", "p10t", "ew iem"],
  },
  {
    clave: "RF_ANTENA",
    disciplina: "AUDIO",
    label: "Distribución y antenas de RF",
    pistas: ["antena", "antenas", "distribuidor de rf", "ua844", "ua860", "ua874", "ua87", "axt600", "axt610", "showlink"],
  },
  {
    clave: "PLAYBACK",
    disciplina: "AUDIO",
    label: "Playback",
    pistas: ["playback", "ableton", "pista", "cd player", "reproductor"],
  },
  {
    clave: "INTERFAZ_AUDIO",
    disciplina: "AUDIO",
    label: "Interfaz de audio",
    pistas: ["interfaz de audio", "interface de audio", "audio interface"],
  },
  {
    clave: "INTERCOM",
    disciplina: "COMUNICACION",
    label: "Intercom",
    pistas: ["intercom", "clear com", "clearcom", "diadema de intercom", "radio de comunicacion", "walkie"],
  },

  // ── Iluminación ────────────────────────────────────────────────────────────
  {
    clave: "CONSOLA_LUCES",
    disciplina: "ILUMINACION",
    label: "Consola de iluminación",
    pistas: [
      "consola de iluminacion", "consola de luces", "mesa de luces", "chamsys", "grandma",
      "grand ma", "ma lighting", "avolites", "hog", "mq40n", "mq50", "mq500", "universos",
    ],
  },
  {
    clave: "MOVIL_WASH",
    disciplina: "ILUMINACION",
    label: "Cabeza móvil wash",
    pistas: [
      "cabeza movil wash", "cabezas moviles wash", "wash zoom", "wash led", "movil wash",
      "maverick", "mac aura", "rogue r2 wash", "intimidator wash", "wash",
    ],
  },
  {
    clave: "MOVIL_BEAM",
    disciplina: "ILUMINACION",
    label: "Cabeza móvil beam o spot",
    pistas: [
      "cabeza movil beam", "cabezas moviles beam", "movil beam", "movil spot", "beam spot",
      "sharpy", "pointe", "bmfl", "rogue r3 beam", "intimidator beam", "beam 140sr",
      "beam 5r", "beam 7r", "beam 230", "mac quantum", "beam",
    ],
  },
  {
    clave: "PAR_LED",
    disciplina: "ILUMINACION",
    label: "PAR LED",
    pistas: ["par led", "par de led", "parled", "slim par", "slim proh", "six par", "colorado", "par 64 led"],
  },
  {
    clave: "BLINDER",
    disciplina: "ILUMINACION",
    label: "Blinder",
    pistas: ["blinder", "blinders", "molefay", "mole fay", "sunstrip"],
  },
  {
    clave: "STROBE",
    disciplina: "ILUMINACION",
    label: "Strobe",
    pistas: ["strobe", "estrobo", "estroboscopico", "color strike", "atomic"],
  },
  {
    clave: "HAZER",
    disciplina: "ILUMINACION",
    label: "Hazer / máquina de humo",
    pistas: [
      "hazer", "haze", "maquina de humo", "maquinas de humo", "fog generator", "fog machine",
      "amhaze", "firefog", "entour faze", "humo",
    ],
  },
  {
    clave: "FRONTAL_BLANCO",
    disciplina: "ILUMINACION",
    label: "Fixture frontal de luz blanca",
    pistas: [
      "fixture frontal", "luz blanca", "frontal de luz", "source four", "elipsoidal",
      "ellipsoidal", "leeko", "leko", "fresnel", "profile spot",
    ],
  },
  {
    clave: "SEGUIDOR",
    disciplina: "ILUMINACION",
    label: "Seguidor",
    pistas: ["seguidor", "seguidores", "follow spot", "followspot", "lycian"],
  },
  {
    clave: "BARRA_LED",
    disciplina: "ILUMINACION",
    label: "Barra LED",
    pistas: ["barra led", "barras led", "pixel bar", "pixelbar", "pxl bar", "batten"],
  },
  {
    clave: "SPLITTER_DMX",
    disciplina: "ILUMINACION",
    label: "Splitter y cableado DMX",
    pistas: ["splitter", "opto branch", "nodo dmx", "cable dmx", "linea dmx"],
  },
  {
    clave: "DIMMER",
    disciplina: "ILUMINACION",
    label: "Dimmers",
    pistas: ["dimmer", "dimmers", "canales dimmer", "rack de dimmers"],
  },

  // ── Video ──────────────────────────────────────────────────────────────────
  {
    clave: "PANTALLA_LED",
    disciplina: "VIDEO",
    label: "Pantalla LED",
    pistas: ["pantalla led", "pantallas led", "muro led", "led wall", "pitch", "pantalla gn3"],
  },
  {
    clave: "VIDEOPROYECTOR",
    disciplina: "VIDEO",
    label: "Videoproyector",
    pistas: ["videoproyector", "video proyector", "proyector", "lumens", "ansi lumens"],
  },
  {
    clave: "PANTALLA_PROYECCION",
    disciplina: "VIDEO",
    label: "Pantalla de proyección",
    pistas: ["pantalla retractil", "pantalla de proyeccion", "pantallas colgantes", "pantalla frontal de proyeccion"],
  },
  {
    clave: "SWITCHER_VIDEO",
    disciplina: "VIDEO",
    label: "Switcher de video",
    pistas: ["switcher", "atem", "mezclador de video"],
  },
  {
    clave: "CONVERSOR_VIDEO",
    disciplina: "VIDEO",
    label: "Conversión y escalado de video",
    pistas: ["conversor", "convertidor", "escalador", "hdmi a sdi", "scaler", "decimator"],
  },
  {
    clave: "PROCESADOR_VIDEO",
    disciplina: "VIDEO",
    label: "Procesador de video",
    pistas: ["procesador de video", "procesador", "rgblink", "novastar", "brompton", "distribuidor de senal", "extron"],
  },
  {
    clave: "CAMARA",
    disciplina: "VIDEO",
    label: "Cámara",
    pistas: ["camara", "camaras", "ptz", "camara robotica", "gopro", "logitech brio", "huddlecam", "cctv"],
  },
  {
    clave: "SERVIDOR_CONTENIDO",
    disciplina: "VIDEO",
    label: "Servidor de contenido",
    pistas: ["servidor de contenido", "resolume", "media server", "mediaserver", "watchout"],
  },
  {
    clave: "CABLEADO_VIDEO",
    disciplina: "VIDEO",
    label: "Tendido de video y red",
    pistas: ["tendido", "cat5", "cat5e", "cat6", "fibra", "cable hdmi", "cable sdi", "routing"],
  },

  // ── Escenario ──────────────────────────────────────────────────────────────
  {
    clave: "PISO_ESCENARIO",
    disciplina: "ESCENARIO",
    label: "Piso de escenario",
    pistas: ["piso de escenario", "escenario de madera", "duela", "faldon", "madera en color", "stage deck"],
  },
  {
    clave: "ESCALERA",
    disciplina: "ESCENARIO",
    label: "Escalera de acceso",
    pistas: ["escalera", "escaleras", "acceso al escenario", "rampa de acceso"],
  },
  {
    clave: "SOBRETARIMA",
    disciplina: "ESCENARIO",
    label: "Sobretarima / riser",
    pistas: ["sobretarima", "tarima", "tarimas", "riser", "practicable", "plataforma"],
  },
  {
    clave: "MESA",
    disciplina: "ESCENARIO",
    label: "Mesa",
    pistas: ["mesa", "mesas", "mesa de trabajo"],
  },
  {
    clave: "LAMPARA_ATRIL",
    disciplina: "ESCENARIO",
    label: "Lámpara de atril",
    pistas: ["lampara de atril", "littlite", "lampara de consola", "luz de atril"],
  },
  {
    clave: "LUZ_SERVICIO",
    disciplina: "ESCENARIO",
    label: "Iluminación de servicio",
    pistas: ["iluminacion de servicio", "luz de trabajo", "work light", "luz de montaje"],
  },
  {
    clave: "RIGGING",
    disciplina: "RIGGING",
    label: "Puntos de rigging",
    pistas: ["punto de rigging", "puntos de rigging", "motor de cadena", "chain hoist", "truss", "grid", "grill", "vara"],
  },

  // ── Energía ────────────────────────────────────────────────────────────────
  {
    clave: "CIRCUITO",
    disciplina: "ENERGIA",
    label: "Circuito eléctrico en escenario",
    pistas: ["circuito", "circuitos", "contacto", "contactos", "edison", "clavija", "aterrizado", "tierra fisica"],
  },
  {
    clave: "MULTICONTACTO",
    disciplina: "ENERGIA",
    label: "Multicontacto",
    pistas: ["multicontacto", "multicontactos", "regleta", "power strip"],
  },
  {
    clave: "EXTENSION",
    disciplina: "ENERGIA",
    label: "Extensión eléctrica",
    pistas: ["extension electrica", "extension", "extensiones"],
  },
  {
    clave: "PLANTA",
    disciplina: "ENERGIA",
    label: "Planta de luz",
    pistas: ["generador electrico", "generador", "planta de luz", "kva", "subestacion"],
  },

  // ── Backline ───────────────────────────────────────────────────────────────
  {
    clave: "AMPLI_GUITARRA",
    disciplina: "BACKLINE",
    label: "Amplificador de guitarra",
    pistas: [
      "amplificador de guitarra", "ampli de guitarra", "hot rod", "de ville", "deluxe reverb",
      "twin reverb", "jc 120", "jc120", "blues junior", "marshall jcm", "orange",
    ],
  },
  {
    clave: "AMPLI_BAJO",
    disciplina: "BACKLINE",
    label: "Amplificador de bajo",
    pistas: ["amplificador de bajo", "ampli de bajo", "ampeg", "svt", "ba 210", "ba210", "rumble", "markbass"],
  },
  {
    clave: "GUITARRA",
    disciplina: "BACKLINE",
    label: "Guitarra",
    pistas: ["guitarra electrica", "guitarra", "stratocaster", "telecaster", "les paul", "bajo electrico"],
  },
  {
    clave: "STAND_INSTRUMENTO",
    disciplina: "BACKLINE",
    label: "Pedestal de instrumento",
    pistas: [
      "pedestal de guitarra", "stand de guitarra", "stands para guitarra", "stand sencillo",
      "stands sencillos", "hercules", "stand tipo a", "stand tipo x", "stand para saxofon",
    ],
  },
  {
    clave: "CABLE_INSTRUMENTO",
    disciplina: "BACKLINE",
    label: "Cable de instrumento",
    pistas: ["cable de instrumento", "cable plug", "cables trs", "cable trs", "patch de instrumento"],
  },
  {
    clave: "BATERIA",
    disciplina: "BACKLINE",
    label: "Batería",
    pistas: [
      "bateria", "drum kit", "snare", "tarola", "bombo", "hi hat", "hihat", "platillos",
      "tom", "banco de bateria", "asiento sencillo", "pedal de bombo",
    ],
  },
  {
    clave: "TECLADO",
    disciplina: "BACKLINE",
    label: "Teclado y soporte",
    pistas: ["teclado", "keyboard", "stand de teclado", "banco de teclado", "nord", "motif"],
  },

  // ── Personal técnico ───────────────────────────────────────────────────────
  {
    clave: "ING_FOH",
    disciplina: "PERSONAL",
    label: "Ingeniero de audio de FOH",
    pistas: ["ingeniero de audio de foh", "ingeniero de foh", "foh engineer", "ingeniero de audio", "operador de foh"],
  },
  {
    clave: "TEC_MONITORES",
    disciplina: "PERSONAL",
    label: "Técnico de monitores y RF",
    pistas: ["tecnico de monitores", "monitor engineer", "ingeniero de monitores", "tecnico de rf"],
  },
  {
    clave: "TEC_AUDIO",
    disciplina: "PERSONAL",
    label: "Técnico de audio de escenario",
    pistas: ["tecnico de audio de escenario", "tecnico de audio", "stage audio", "patch man"],
  },
  {
    clave: "ING_LUCES",
    disciplina: "PERSONAL",
    label: "Ingeniero de iluminación",
    pistas: ["ingeniero de iluminacion", "lighting designer", "operador de iluminacion", "programador de luces"],
  },
  {
    clave: "TEC_LUCES",
    disciplina: "PERSONAL",
    label: "Técnico de iluminación",
    pistas: ["tecnico de iluminacion", "tecnico de luces", "lighting tech"],
  },
  {
    clave: "TEC_VIDEO",
    disciplina: "PERSONAL",
    label: "Técnico de video",
    pistas: ["tecnico de video", "video tech"],
  },
  {
    clave: "VJ",
    disciplina: "PERSONAL",
    label: "VJ",
    pistas: ["vj", "video jockey"],
  },
  {
    clave: "DIR_CCTV",
    disciplina: "PERSONAL",
    label: "Director de CCTV",
    pistas: ["director de cctv", "director de camaras", "switcher man"],
  },
  {
    clave: "CAMAROGRAFO",
    disciplina: "PERSONAL",
    label: "Camarógrafo",
    pistas: ["camarografo", "camarografos", "operador de camara"],
  },
  {
    clave: "STAGEHAND",
    disciplina: "PERSONAL",
    label: "Stagehands",
    pistas: ["stagehand", "stagehands", "cargador", "cargadores", "staff de carga", "montajista"],
  },

  // ── Hospitalidad ───────────────────────────────────────────────────────────
  {
    clave: "AGUA",
    disciplina: "OTRO",
    label: "Agua",
    pistas: ["agua natural", "agua", "botellas de agua"],
  },
  {
    clave: "TOALLA",
    disciplina: "OTRO",
    label: "Toallas",
    pistas: ["toalla", "toallas"],
  },
  {
    clave: "CAMERINO",
    disciplina: "OTRO",
    label: "Camerino",
    pistas: ["camerino", "camerinos", "vestidor"],
  },
];

/// Vocabulario de tabla de patch DMX. Los riders de venue traen el mapa de
/// canales del fixture pegado al inventario y el lector lo convierte en cientos
/// de renglones basura; esto lo reconoce para que nunca llegue al inventario.
const PALABRAS_DMX = new Set([
  "dim", "dimmer", "shutter", "color", "rgb", "gobo", "pan", "tilt", "frost", "prisma",
  "prism", "macro", "reset", "default", "focus", "lamp", "control", "effect", "rate",
  "iris", "zoom", "speed", "spee", "fine", "fino", "coarse", "mib", "fade", "react",
  "break", "master", "highlight", "hightlight", "instancias", "instances", "module",
  "modules", "channels", "ch", "atributo", "attribute", "virtual", "wheel", "rueda",
  "chase", "pos", "mod", "temp", "mixer", "background", "level", "foreground",
  "fore", "ground", "time", "macros", "stag", "single", "strobe", "pixeles", "pixels",
  "no", "on", "off", "red", "green", "blue", "white", "r", "g", "b", "w", "ar", "til",
  "giro", "velocidad", "de", "del", "la", "el", "y", "sinple", "blade", "shuut", "olor",
  "dim1on", "dimvirtual", "main", "mib",
]);

const RE_TOKEN = /[a-z0-9]+/g;

/**
 * ¿Este renglón es un pedazo de tabla de patch DMX y no un equipo?
 *
 * El criterio es la densidad: si casi todos los tokens son números o palabras
 * del vocabulario DMX, lo que se leyó fue una celda de la tabla de canales.
 */
export function esTablaDmx(concepto: string): boolean {
  const tokens = normalizar(concepto).match(RE_TOKEN) ?? [];
  if (tokens.length === 0) return true;

  let dmx = 0;
  for (const t of tokens) {
    if (/^\d+$/.test(t) || PALABRAS_DMX.has(t)) dmx++;
  }
  // Un renglón corto necesita ser 100% ruido; uno largo basta con que lo sea casi todo.
  const umbral = tokens.length <= 3 ? 1 : 0.8;
  return dmx / tokens.length >= umbral;
}

// ── Cotejo contra el canon ───────────────────────────────────────────────────

function tokens(texto: string): string[] {
  return normalizar(texto).match(RE_TOKEN) ?? [];
}

/// ¿La secuencia de tokens de `pista` aparece completa dentro de `toks`?
/// Por tokens y no por substring para que "sub" no cace dentro de "subwoofer".
function contieneSecuencia(toks: string[], pista: string[]): boolean {
  if (pista.length === 0 || pista.length > toks.length) return false;
  for (let i = 0; i <= toks.length - pista.length; i++) {
    let coincide = true;
    for (let j = 0; j < pista.length; j++) {
      if (toks[i + j] !== pista[j]) {
        coincide = false;
        break;
      }
    }
    if (coincide) return true;
  }
  return false;
}

/// Pistas ordenadas de la más larga a la más corta: la más específica gana.
/// "sub snake" tiene que ganarle a "sub", y "rogue r3 beam" a "beam".
const PISTAS_TOKENIZADAS = CANON.flatMap((c) => c.pistas.map((p) => ({ concepto: c, toks: tokens(p) })))
  .filter((p) => p.toks.length > 0)
  .sort((a, b) => b.toks.join(" ").length - a.toks.join(" ").length);

/**
 * Traduce un texto libre al concepto canónico que le corresponde. Se le pasan
 * concepto, marca y modelo juntos porque el dato que delata al equipo a veces
 * está en el modelo ("KARA I") y no en el concepto.
 *
 * La disciplina declarada no participa: es justo lo menos confiable de un rider
 * de venue, y meterla como filtro haría que un renglón mal archivado nunca cruce.
 */
export function canonDe(...partes: (string | null | undefined)[]): ConceptoCanon | null {
  const toks = tokens(partes.filter(Boolean).join(" "));
  if (toks.length === 0) return null;

  // Ordenadas de la pista más larga a la más corta, así que la primera que
  // cace es la más específica.
  for (const p of PISTAS_TOKENIZADAS) {
    if (contieneSecuencia(toks, p.toks)) return p.concepto;
  }
  return null;
}

export const CANON_POR_CLAVE: Record<string, ConceptoCanon> = Object.fromEntries(CANON.map((c) => [c.clave, c]));
