/**
 * Sugerencias de montaje: dado un equipo, propone función / soporte / zona.
 *
 * Mismo patrón que `rider-accesorios.ts`: primero se busca una regla por modelo
 * concreto del catálogo, luego un default por categoría, y si nada aplica se
 * deja la posición en blanco para que el coordinador la llene.
 *
 * La sugerencia es un punto de partida editable, no una verdad: en eventos
 * chicos se acepta tal cual y en grandes se parte y se corrige.
 */

export type SugerenciaMontaje = {
  funcion: string | null;
  soporte: string | null;
  zona: string | null;
};

const VACIA: SugerenciaMontaje = { funcion: null, soporte: null, zona: null };

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type Regla = { patrones: string[] } & SugerenciaMontaje;

/** Reglas por modelo. Se evalúan en orden: la primera que coincida gana. */
const REGLAS: Regla[] = [
  // ── AUDIO: bafles y subgraves ────────────────────────────────────────────
  { patrones: ["ekx 18", "ekx-18", "sub 8006", "sub 9006", "subwoofer", "subgrave"], funcion: "SUBGRAVE", soporte: "PISO", zona: "ESCENARIO" },
  { patrones: ["hdl 30", "hdl-30"], funcion: "PA_PRINCIPAL", soporte: "ARRAY_VOLADO", zona: "ESCENARIO" },
  { patrones: ["hdl 6", "hdl-6"], funcion: "PA_REFUERZO", soporte: "ARRAY_VOLADO", zona: "ESCENARIO" },
  { patrones: ["ekx 12", "ekx-12"], funcion: "PA_PRINCIPAL", soporte: "TRIPIE", zona: "ESCENARIO" },

  // ── AUDIO: consolas y stageboxes ─────────────────────────────────────────
  { patrones: ["stagebox", "sd32", "ar24", "ar 24"], funcion: "STAGEBOX", soporte: "RACK", zona: "ESCENARIO" },
  { patrones: ["xenyx", "mg10", "mg 10"], funcion: "SUBMEZCLA", soporte: "MESA", zona: "FOH" },
  { patrones: ["mesa plegable"], funcion: "MESA_CONTROL", soporte: "PISO", zona: "FOH" },
  { patrones: ["x32", "m32", "cl5", "dm7", "sq5", "dlive", "d live", "3224"], funcion: "CONSOLA_FOH", soporte: "MESA", zona: "FOH" },

  // ── AUDIO: microfonía ────────────────────────────────────────────────────
  { patrones: ["beta 52", "beta52"], funcion: "BATERIA", soporte: "PEDESTAL_CORTO", zona: "ESCENARIO" },
  { patrones: ["beta 91", "beta91"], funcion: "BATERIA", soporte: "PISO", zona: "ESCENARIO" },
  { patrones: ["sm57"], funcion: "INSTRUMENTO", soporte: "PEDESTAL_BOOM", zona: "ESCENARIO" },
  { patrones: ["sm81", "rode m5", "m5"], funcion: "AMBIENTE", soporte: "PEDESTAL_BOOM", zona: "ESCENARIO" },
  { patrones: ["sm31"], funcion: "VOZ_PRINCIPAL", soporte: "SOLAPA_DIADEMA", zona: "ESCENARIO" },
  { patrones: ["bodypack", "wa302", "diadema", "solapa", "lavalier"], funcion: "MC_PRESENTADOR", soporte: "SOLAPA_DIADEMA", zona: "ESCENARIO" },
  { patrones: ["b58", "sm58", "blx24", "slxd", "axient", "ulxd"], funcion: "VOZ_PRINCIPAL", soporte: "MANO", zona: "ESCENARIO" },

  // ── AUDIO: in-ear ────────────────────────────────────────────────────────
  { patrones: ["iem", "psm1000", "psm 1000", "in-ear", "in ear"], funcion: "IEM_MUSICO", soporte: "RACK", zona: "ESCENARIO" },

  // ── DJ ───────────────────────────────────────────────────────────────────
  { patrones: ["rmx"], funcion: "EFECTOS", soporte: "BOOTH", zona: "CABINA_DJ" },
  { patrones: ["cdj", "djm", "ddj", "flx10"], funcion: "DJ_PRINCIPAL", soporte: "BOOTH", zona: "CABINA_DJ" },
  { patrones: ["podio"], funcion: "PODIO", soporte: "PISO", zona: "CABINA_DJ" },
  { patrones: ["booth decorativo", "front decorativo"], funcion: "FRONT_DECORATIVO", soporte: "PISO", zona: "CABINA_DJ" },
  { patrones: ["booth", "cabina dj"], funcion: "BOOTH_PRINCIPAL", soporte: "PISO", zona: "CABINA_DJ" },

  // ── ILUMINACIÓN ──────────────────────────────────────────────────────────
  { patrones: ["fazer", "maquina de humo", "hazer", "humo"], funcion: "ATMOSFERA", soporte: "PISO", zona: "ESCENARIO" },
  { patrones: ["laser"], funcion: "LASER", soporte: "TRUSS_TERRENA", zona: "ESCENARIO" },
  { patrones: ["pinspot"], funcion: "PINSPOT_MESAS", soporte: "MESA_CENTRO", zona: "SALON" },
  { patrones: ["blinder", "flasher", "estrobo"], funcion: "BLINDER_ESTROBO", soporte: "TRUSS_VOLADA", zona: "ESCENARIO" },
  { patrones: ["beam", "razor"], funcion: "BEAM_AEREO", soporte: "TRUSS_VOLADA", zona: "ESCENARIO" },
  { patrones: ["spot 260", "int spot"], funcion: "SPOT_GOBOS", soporte: "TRUSS_VOLADA", zona: "ESCENARIO" },
  { patrones: ["kaleidos", "soul rgbw", "wash 19x40", "19x40"], funcion: "WASH_ESCENARIO", soporte: "TRUSS_VOLADA", zona: "ESCENARIO" },
  { patrones: ["200 ww", "200ww"], funcion: "FRONT_WASH", soporte: "TRUSS_VOLADA", zona: "FRENTE_ESCENARIO" },
  { patrones: ["slimpar", "18x10", "18 x 10"], funcion: "UPLIGHT", soporte: "BASE_PISO", zona: "SALON" },
  { patrones: ["ax1", "pixel tube", "astera", "bar 824", "sixaline"], funcion: "PIXEL_DECORATIVO", soporte: "ESTRUCTURA", zona: "ESCENARIO" },
  { patrones: ["retro", "maple lamp", "lumos l7", "l1 retro"], funcion: "WASH_SALON", soporte: "PISO", zona: "SALON" },

  // ── ILUMINACIÓN: control ─────────────────────────────────────────────────
  { patrones: ["splitter"], funcion: "SPLITTER_DMX", soporte: "RACK", zona: "ESCENARIO" },
  { patrones: ["nodo"], funcion: "NODO_DMX", soporte: "RACK", zona: "ESCENARIO" },
  { patrones: ["wolfmix", "grand ma", "grandma", "ma3", "command wing"], funcion: "CONSOLA_PRINCIPAL", soporte: "MESA", zona: "FOH" },

  // ── EFECTOS ESPECIALES ───────────────────────────────────────────────────
  { patrones: ["bazuca", "chispero", "pirotecnia", "confeti"], funcion: "MOMENTO_CLAVE", soporte: "PISO", zona: "FRENTE_ESCENARIO" },

  // ── VIDEO ────────────────────────────────────────────────────────────────
  { patrones: ["atem", "switcher"], funcion: "SWITCHER", soporte: "MESA", zona: "FOH" },
  { patrones: ["pantalla", "led wall", "proyector"], funcion: "PANTALLA_PRINCIPAL", soporte: "GROUND_SUPPORT", zona: "ESCENARIO" },

  // ── RIGGING ──────────────────────────────────────────────────────────────
  { patrones: ["hk53", "polipasto", "motor", "hoist"], funcion: "PUNTO_CUELGUE", soporte: "MOTOR", zona: "ESCENARIO" },
  { patrones: ["ground support"], funcion: "GROUND_SUPPORT", soporte: "BASE_LASTRE", zona: "ESCENARIO" },
  { patrones: ["carpa", "toldo", "shade tech"], funcion: "CARPA_TECHO", soporte: "ESTACAS", zona: "EXTERIOR" },
  { patrones: ["corner", "trl 0", "trussing", "truss"], funcion: "TRUSS_FRONTAL", soporte: "GROUND_SUPPORT", zona: "ESCENARIO" },

  // ── STAGE ────────────────────────────────────────────────────────────────
  { patrones: ["pista de baile", "pista"], funcion: "PISTA_PRINCIPAL", soporte: "PISO_NIVELADO", zona: "PISTA" },
  { patrones: ["mampara", "backdrop"], funcion: "FONDO_ESCENARIO", soporte: "BASE_LASTRE", zona: "ESCENARIO" },
  { patrones: ["topline", "entarimado", "tarima", "riser"], funcion: "ESCENARIO_PRINCIPAL", soporte: "PATAS_REGULABLES", zona: "ESCENARIO" },

  // ── ELECTRICIDAD ─────────────────────────────────────────────────────────
  { patrones: ["predator", "generator", "planta"], funcion: "PLANTA", soporte: "PISO_LIBRE", zona: "ACOMETIDA" },
  { patrones: ["mtlf", "tlin", "distro", "tablero"], funcion: "DISTRIBUCION", soporte: "RACK", zona: "ACOMETIDA" },
  { patrones: ["extension", "cable"], funcion: "EXTENSION", soporte: "PISO_CANALETA", zona: "ESCENARIO" },
];

/** Default por categoría cuando ningún modelo coincide. */
const DEFAULTS_POR_CATEGORIA: Record<string, SugerenciaMontaje> = {
  "Equipo de Audio": { funcion: "PA_PRINCIPAL", soporte: "TRIPIE", zona: "ESCENARIO" },
  "Consolas de Audio": { funcion: "CONSOLA_FOH", soporte: "MESA", zona: "FOH" },
  "Sistemas de Microfonía": { funcion: "VOZ_PRINCIPAL", soporte: "MANO", zona: "ESCENARIO" },
  "Monitoreo In-Ear": { funcion: "IEM_MUSICO", soporte: "RACK", zona: "ESCENARIO" },
  "Consolas/Equipo para DJ": { funcion: "DJ_PRINCIPAL", soporte: "BOOTH", zona: "CABINA_DJ" },
  "DJ Booths": { funcion: "BOOTH_PRINCIPAL", soporte: "PISO", zona: "CABINA_DJ" },
  "Equipo de Iluminación": { funcion: "WASH_SALON", soporte: "BASE_PISO", zona: "SALON" },
  "Consolas de Iluminación": { funcion: "CONSOLA_PRINCIPAL", soporte: "MESA", zona: "FOH" },
  "Efectos especiales": { funcion: "MOMENTO_CLAVE", soporte: "PISO", zona: "FRENTE_ESCENARIO" },
  "Pantalla / Video": { funcion: "PANTALLA_PRINCIPAL", soporte: "GROUND_SUPPORT", zona: "ESCENARIO" },
  "Rigging y Estructuras": { funcion: "TRUSS_FRONTAL", soporte: "GROUND_SUPPORT", zona: "ESCENARIO" },
  Entarimado: { funcion: "ESCENARIO_PRINCIPAL", soporte: "PATAS_REGULABLES", zona: "ESCENARIO" },
  "Pistas de baile": { funcion: "PISTA_PRINCIPAL", soporte: "PISO_NIVELADO", zona: "PISTA" },
  "Mamparas decorativas": { funcion: "FONDO_ESCENARIO", soporte: "BASE_LASTRE", zona: "ESCENARIO" },
  Escenografía: { funcion: "FONDO_ESCENARIO", soporte: "BASE_LASTRE", zona: "ESCENARIO" },
  "Toldos y lonas": { funcion: "CUBIERTA_INVITADOS", soporte: "ESTACAS", zona: "EXTERIOR" },
  "Corriente Eléctrica": { funcion: "DISTRIBUCION", soporte: "PISO_CANALETA", zona: "ACOMETIDA" },
  Vehículos: { funcion: "TRANSPORTE_EQUIPO", soporte: "ESTACIONAMIENTO", zona: "STAGING" },
};

export function sugerirMontaje(
  equipo: { marca?: string | null; modelo?: string | null; descripcion?: string | null },
  categoria?: string | null,
): SugerenciaMontaje {
  const texto = normalizar([equipo.marca, equipo.modelo, equipo.descripcion].filter(Boolean).join(" "));

  if (texto) {
    for (const regla of REGLAS) {
      if (regla.patrones.some((p) => texto.includes(p))) {
        return { funcion: regla.funcion, soporte: regla.soporte, zona: regla.zona };
      }
    }
  }

  if (categoria && DEFAULTS_POR_CATEGORIA[categoria]) return DEFAULTS_POR_CATEGORIA[categoria];
  return VACIA;
}
