export interface SugItem {
  desc: string;
  cant: number;
  esOpcional: boolean;
  nota?: string;
}

export interface SugGroup {
  cat: string;
  items: SugItem[];
}

// IDs de servicios que corresponden a cada grupo de sugerencias
const GRUPO_SERVICIOS: Record<string, string[]> = {
  "Audio":           ["AUDIO_PA", "AUDIO_MONITOR", "AUDIO_CONF"],
  "Iluminación":     ["ILUM_AMBIENTAL", "ILUM_ARTISTICA", "ILUM_ESCENARIO", "ILUM_PISTA", "ILUM_ARQ", "PISTA_BAILE"],
  "DJ / Consola":    ["DJ"],
  "Video":           ["VIDEO_LED", "PROYECCION", "VIDEO_PRODUCCION"],
  "Backline":        ["BACKLINE"],
  "Efectos":         ["EFECTOS", "CHISPEROS", "HUMO_FRIO", "CONFETI"],
  "Streaming":       ["STREAMING", "GRABACION"],
};

/** Devuelve grupos de equipo sugerido según tipo de evento y número de asistentes.
 *  Pasa `servicios` (IDs de serviciosInteres del trato) para filtrar grupos relevantes.
 *  Guía comercial de arranque — no reemplaza revisión técnica en eventos grandes. */
export function getSugerencias(tipoEvento: string, asistentes: number, servicios?: string[]): SugGroup[] {
  if (asistentes <= 0) return [];
  const tipo = tipoEvento.toUpperCase();

  let grupos: SugGroup[] = [];

  if (tipo === "SOCIAL") {
    if (asistentes <= 100) grupos = socialPequeno();
    else if (asistentes <= 200) grupos = socialMediano();
    else if (asistentes <= 400) grupos = socialGrande();
    else if (asistentes <= 800) grupos = socialMuyGrande();
    else return aviso("800");
    if (servicios?.includes("CHISPEROS")) grupos.push(extraChisperos());
    if (servicios?.includes("HUMO_FRIO")) grupos.push(extraHumoFrio());
    if (servicios?.includes("CONFETI")) grupos.push(extraConfeti());
    if (servicios?.includes("ILUM_ARQ")) grupos.push(extraIlumArq());
    if (servicios?.includes("KARAOKE")) grupos.push(extraKaraoke());
  } else if (tipo === "EMPRESARIAL") {
    if (asistentes <= 100) grupos = empresarialPequeno();
    else if (asistentes <= 250) grupos = empresarialMediano();
    else if (asistentes <= 500) grupos = empresarialGrande();
    else if (asistentes <= 1200) grupos = empresarialMuyGrande();
    else return aviso("1200");
    if (servicios?.includes("STREAMING")) grupos.push(extraStreaming());
    if (servicios?.includes("GRABACION")) grupos.push(extraGrabacion());
    if (servicios?.includes("ESCENOGRAFIA")) grupos.push(extraEscenografia());
  } else if (tipo === "MUSICAL") {
    if (asistentes <= 150) grupos = musicalPequeno();
    else if (asistentes <= 400) grupos = musicalMediano();
    else if (asistentes <= 700) grupos = musicalGrande();
    else if (asistentes <= 1000) grupos = musicalMuyGrande();
    else return aviso("1000");
    if (servicios?.includes("ESTRUCTURAS")) grupos.push(extraEstructuras());
  } else {
    return [];
  }

  // Si se pasaron servicios, filtrar grupos que no tienen relación
  if (servicios && servicios.length > 0) {
    return grupos.filter(g => {
      const relacionados = GRUPO_SERVICIOS[g.cat];
      if (!relacionados) return true;
      return relacionados.some(id => servicios.includes(id));
    });
  }

  return grupos;
}

function aviso(limite: string): SugGroup[] {
  return [{
    cat: "Aviso",
    items: [{
      desc: `Más de ${limite} personas — esta guía es solo referencia comercial. Validar con producción antes de cotizar.`,
      cant: 0, esOpcional: false,
    }],
  }];
}

// ══════════════════════════════════════════════════════════════════════════════
// SOCIAL
// ══════════════════════════════════════════════════════════════════════════════

// ── SOCIAL PEQUEÑO ≤100 ───────────────────────────────────────────────────────
function socialPequeno(): SugGroup[] {
  return [
    { cat: "Audio", items: [
      { desc: "EKX 12P", cant: 2, esOpcional: false, nota: "1 por lado" },
      { desc: "EKX 18P", cant: 1, esOpcional: false, nota: "2 si hay pista de baile" },
      { desc: "inalámbrico", cant: 2, esOpcional: false, nota: "brindis o protocolo" },
      { desc: "SQ5", cant: 1, esOpcional: true, nota: "si hay múltiples micrófonos" },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led inalámbrico", cant: 10, esOpcional: false, nota: "8-12 para ambientación" },
      { desc: "par led", cant: 6, esOpcional: false, nota: "baño de color" },
      { desc: "barra led", cant: 3, esOpcional: true, nota: "mesa principal o detalles" },
      { desc: "haze", cant: 1, esOpcional: true, nota: "si quieren ambiente de fiesta" },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 2, esOpcional: true, nota: "si hay DJ profesional" },
      { desc: "DJM A9", cant: 1, esOpcional: true, nota: "mixer DJ" },
      { desc: "booth", cant: 1, esOpcional: true },
    ]},
  ];
}

// ── SOCIAL MEDIANO 101-200 ────────────────────────────────────────────────────
function socialMediano(): SugGroup[] {
  return [
    { cat: "Audio", items: [
      { desc: "EKX 12P", cant: 4, esOpcional: false, nota: "o 6-8 HDL 6A para más presión" },
      { desc: "EKX 18P", cant: 3, esOpcional: false, nota: "2-4 según pista" },
      { desc: "SQ5", cant: 1, esOpcional: false, nota: "protocolo + DJ + mezcla completa" },
      { desc: "inalámbrico", cant: 2, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led inalámbrico", cant: 14, esOpcional: false, nota: "12-16 piezas" },
      { desc: "spot", cant: 5, esOpcional: false },
      { desc: "barra led", cant: 4, esOpcional: false, nota: "apoyo decorativo" },
      { desc: "blinder", cant: 4, esOpcional: true, nota: "más energía en pista" },
      { desc: "haze", cant: 1, esOpcional: true },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 2, esOpcional: false },
      { desc: "DJM A9", cant: 1, esOpcional: false, nota: "mixer DJ" },
      { desc: "booth", cant: 1, esOpcional: false },
      { desc: "tarima DJ", cant: 1, esOpcional: true },
    ]},
  ];
}

// ── SOCIAL GRANDE 201-400 ─────────────────────────────────────────────────────
// RCF HDL 6A: 8 módulos cubre hasta ~400 sociales (interior)
function socialGrande(): SugGroup[] {
  return [
    { cat: "Audio", items: [
      { desc: "HDL 6A", cant: 8, esOpcional: false, nota: "RCF — 4 por lado; hasta ~400 pers. interior" },
      { desc: "SUB 8006 AS", cant: 4, esOpcional: false, nota: "2-4 subs RCF según intensidad de pista" },
      { desc: "SQ5", cant: 1, esOpcional: false },
      { desc: "inalámbrico", cant: 3, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led inalámbrico", cant: 18, esOpcional: false, nota: "16-20 piezas" },
      { desc: "spot", cant: 7, esOpcional: false },
      { desc: "beam", cant: 7, esOpcional: false },
      { desc: "blinder", cant: 6, esOpcional: false },
      { desc: "strobe", cant: 10, esOpcional: false },
      { desc: "haze", cant: 2, esOpcional: false },
      { desc: "torre truss", cant: 2, esOpcional: false },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 3, esOpcional: false, nota: "2-4 según evento" },
      { desc: "DJM A9", cant: 1, esOpcional: false },
      { desc: "booth", cant: 1, esOpcional: false, nota: "premium o riser" },
    ]},
  ];
}

// ── SOCIAL MUY GRANDE 401-800 ─────────────────────────────────────────────────
// RCF HDL 30A: 10 módulos hasta ~800 sociales / 12 módulos hasta ~1200 sociales
function socialMuyGrande(): SugGroup[] {
  return [
    { cat: "Audio", items: [
      { desc: "HDL 30A", cant: 10, esOpcional: false, nota: "RCF line array — 5 por lado; cubre hasta ~800 pers." },
      { desc: "SUB 8006 AS", cant: 6, esOpcional: false, nota: "4-8 subs RCF según recinto y pista" },
      { desc: "SQ5", cant: 1, esOpcional: false },
      { desc: "inalámbrico", cant: 4, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led inalámbrico", cant: 24, esOpcional: false, nota: "20-28 piezas" },
      { desc: "spot", cant: 10, esOpcional: false },
      { desc: "beam", cant: 10, esOpcional: false },
      { desc: "blinder", cant: 8, esOpcional: false },
      { desc: "strobe", cant: 14, esOpcional: false },
      { desc: "haze", cant: 3, esOpcional: false },
      { desc: "torre truss", cant: 4, esOpcional: false },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 4, esOpcional: false },
      { desc: "DJM V10", cant: 1, esOpcional: false },
      { desc: "RMX 1000", cant: 1, esOpcional: true },
      { desc: "booth", cant: 1, esOpcional: false, nota: "premium" },
    ]},
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// EMPRESARIAL
// ══════════════════════════════════════════════════════════════════════════════

// ── EMPRESARIAL PEQUEÑO ≤100 ──────────────────────────────────────────────────
function empresarialPequeno(): SugGroup[] {
  return [
    { cat: "Audio", items: [
      { desc: "EKX 12P", cant: 2, esOpcional: false },
      { desc: "EKX 18P", cant: 1, esOpcional: true, nota: "si hay video o entrada musical" },
      { desc: "SQ5", cant: 1, esOpcional: false, nota: "o MG10XUF para setup más simple" },
      { desc: "inalámbrico", cant: 2, esOpcional: false },
      { desc: "diadema", cant: 1, esOpcional: true, nota: "si hay presentador o conferenciante" },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led", cant: 8, esOpcional: false, nota: "6-10 para ambientación" },
      { desc: "barra led", cant: 3, esOpcional: false, nota: "RGBW para escenario o back" },
      { desc: "pinspot", cant: 4, esOpcional: true, nota: "branding o decoración puntual" },
    ]},
    { cat: "Video", items: [
      { desc: "pantalla LED", cant: 1, esOpcional: true, nota: "3-6 m² según venue" },
      { desc: "Novastar", cant: 1, esOpcional: true, nota: "si hay pantalla LED" },
      { desc: "Atem Mini Pro", cant: 1, esOpcional: true, nota: "si hay cambio de fuentes" },
    ]},
  ];
}

// ── EMPRESARIAL MEDIANO 101-250 ───────────────────────────────────────────────
// RCF HDL 6A: 8-10 módulos para empresariales hasta ~250 pers.
function empresarialMediano(): SugGroup[] {
  return [
    { cat: "Audio", items: [
      { desc: "HDL 6A", cant: 8, esOpcional: false, nota: "RCF — 4 por lado; o 4 EKX 12P si setup más simple" },
      { desc: "SUB 8006 AS", cant: 2, esOpcional: false, nota: "o 2 EKX 18P" },
      { desc: "SQ5", cant: 1, esOpcional: false },
      { desc: "inalámbrico", cant: 3, esOpcional: false },
      { desc: "diadema", cant: 1, esOpcional: true, nota: "conductor principal" },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led", cant: 13, esOpcional: false, nota: "10-16 piezas" },
      { desc: "barra led", cant: 5, esOpcional: false, nota: "RGBW / lineales para escenario" },
      { desc: "spot", cant: 3, esOpcional: true, nota: "más presencia visual" },
      { desc: "haze", cant: 1, esOpcional: true, nota: "solo si hay show, no conferencia" },
    ]},
    { cat: "Video", items: [
      { desc: "pantalla LED", cant: 1, esOpcional: false, nota: "6-9 m²" },
      { desc: "Novastar", cant: 1, esOpcional: false },
      { desc: "Atem Mini Pro", cant: 1, esOpcional: false },
    ]},
  ];
}

// ── EMPRESARIAL GRANDE 251-500 ────────────────────────────────────────────────
// RCF HDL 6A: 10-12 módulos para empresariales hasta ~500 pers.
function empresarialGrande(): SugGroup[] {
  return [
    { cat: "Audio", items: [
      { desc: "HDL 6A", cant: 10, esOpcional: false, nota: "RCF — 5 por lado; cubre hasta ~500 pers." },
      { desc: "SUB 8006 AS", cant: 4, esOpcional: false, nota: "2-4 subs según contenido musical" },
      { desc: "SQ5", cant: 1, esOpcional: false },
      { desc: "inalámbrico", cant: 4, esOpcional: false },
      { desc: "IEM G4", cant: 1, esOpcional: true, nota: "si hay panel, músicos o playback" },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led", cant: 20, esOpcional: false, nota: "16-24 piezas" },
      { desc: "spot", cant: 7, esOpcional: false },
      { desc: "beam", cant: 7, esOpcional: true, nota: "si hay show de apertura" },
      { desc: "blinder", cant: 4, esOpcional: false },
      { desc: "haze", cant: 2, esOpcional: false },
      { desc: "torre truss", cant: 2, esOpcional: false },
    ]},
    { cat: "Video", items: [
      { desc: "pantalla LED", cant: 1, esOpcional: false, nota: "9-12 m²" },
      { desc: "Novastar", cant: 1, esOpcional: false },
      { desc: "Atem Mini Pro", cant: 1, esOpcional: false },
    ]},
  ];
}

// ── EMPRESARIAL MUY GRANDE 501-1200 ──────────────────────────────────────────
// RCF HDL 30A: 8 módulos hasta ~1200 empresariales
function empresarialMuyGrande(): SugGroup[] {
  return [
    { cat: "Audio", items: [
      { desc: "HDL 30A", cant: 8, esOpcional: false, nota: "RCF line array — 4 por lado; cubre hasta ~1200 pers. empresarial" },
      { desc: "SUB 8006 AS", cant: 6, esOpcional: false, nota: "4-8 subs RCF" },
      { desc: "SQ5", cant: 1, esOpcional: false },
      { desc: "inalámbrico", cant: 5, esOpcional: false },
      { desc: "IEM G4", cant: 1, esOpcional: true, nota: "si hay presentadores con in-ear" },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led", cant: 28, esOpcional: false, nota: "24-32 piezas" },
      { desc: "spot", cant: 10, esOpcional: false },
      { desc: "beam", cant: 10, esOpcional: false },
      { desc: "blinder", cant: 6, esOpcional: false },
      { desc: "haze", cant: 3, esOpcional: false },
      { desc: "torre truss", cant: 4, esOpcional: false },
    ]},
    { cat: "Video", items: [
      { desc: "pantalla LED", cant: 1, esOpcional: false, nota: "12-18 m² en una o dos pantallas" },
      { desc: "Novastar", cant: 1, esOpcional: false },
      { desc: "Atem Mini Pro", cant: 1, esOpcional: false },
    ]},
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// MUSICAL
// ══════════════════════════════════════════════════════════════════════════════

// ── MUSICAL PEQUEÑO ≤150 ──────────────────────────────────────────────────────
// EV EKX cubre bien hasta ~150 personas en musicales (recinto o semi-exterior)
function musicalPequeno(): SugGroup[] {
  return [
    { cat: "Audio", items: [
      { desc: "EKX 12P", cant: 4, esOpcional: false, nota: "EV — 2 por lado; o 6-8 HDL 6A para más presión" },
      { desc: "EKX 18P", cant: 3, esOpcional: false, nota: "2-4 subs EV — o 2 SUB 8006 AS para más punch" },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 2, esOpcional: false },
      { desc: "DJM A9", cant: 1, esOpcional: false, nota: "o 900 NXS2 / V10" },
      { desc: "booth", cant: 1, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "spot", cant: 4, esOpcional: false },
      { desc: "beam", cant: 4, esOpcional: false },
      { desc: "strobe", cant: 4, esOpcional: false },
      { desc: "blinder", cant: 2, esOpcional: false },
      { desc: "haze", cant: 1, esOpcional: false },
      { desc: "barra led", cant: 2, esOpcional: true },
      { desc: "láser", cant: 1, esOpcional: true },
    ]},
  ];
}

// ── MUSICAL MEDIANO 151-400 ───────────────────────────────────────────────────
// RCF HDL 6A: 8-12 módulos cubre bien musicales hasta ~400 pers.
function musicalMediano(): SugGroup[] {
  return [
    { cat: "Audio", items: [
      { desc: "HDL 6A", cant: 10, esOpcional: false, nota: "RCF — 5 por lado; 12 si exterior o mayor presión" },
      { desc: "SUB 8006 AS", cant: 4, esOpcional: false, nota: "2-6 subs RCF según intensidad" },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 3, esOpcional: false, nota: "3-4" },
      { desc: "DJM V10", cant: 1, esOpcional: false, nota: "o A9" },
      { desc: "RMX 1000", cant: 1, esOpcional: true },
      { desc: "booth", cant: 1, esOpcional: false, nota: "premium o riser" },
    ]},
    { cat: "Iluminación", items: [
      { desc: "beam", cant: 7, esOpcional: false, nota: "6-8" },
      { desc: "spot", cant: 5, esOpcional: false, nota: "4-6" },
      { desc: "strobe", cant: 10, esOpcional: false, nota: "8-12" },
      { desc: "blinder", cant: 4, esOpcional: false },
      { desc: "haze", cant: 2, esOpcional: false },
      { desc: "torre truss", cant: 2, esOpcional: false },
      { desc: "láser", cant: 3, esOpcional: true },
    ]},
    { cat: "Video", items: [
      { desc: "pantalla LED", cant: 1, esOpcional: true, nota: "6-12 m² si el evento lo requiere" },
      { desc: "Novastar", cant: 1, esOpcional: true },
    ]},
  ];
}

// ── MUSICAL GRANDE 401-700 ────────────────────────────────────────────────────
// RCF HDL 30A: 8 módulos hasta ~1000 musicales (guía PDF: 8 medios = 1000 máx musicales)
function musicalGrande(): SugGroup[] {
  return [
    { cat: "Audio", items: [
      { desc: "HDL 30A", cant: 8, esOpcional: false, nota: "RCF line array — 4 por lado; hasta ~700 pers. (8 medios = máx 1000 musicales)" },
      { desc: "SUB 8006 AS", cant: 6, esOpcional: false, nota: "4-8 subs RCF" },
      { desc: "SQ5", cant: 1, esOpcional: true, nota: "si hay voces, instrumentos o playback" },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 4, esOpcional: false },
      { desc: "DJM V10", cant: 1, esOpcional: false },
      { desc: "RMX 1000", cant: 1, esOpcional: true },
      { desc: "booth", cant: 1, esOpcional: false, nota: "premium" },
    ]},
    { cat: "Iluminación", items: [
      { desc: "beam", cant: 10, esOpcional: false, nota: "8-12" },
      { desc: "spot", cant: 7, esOpcional: false, nota: "6-8" },
      { desc: "strobe", cant: 14, esOpcional: false, nota: "12-18" },
      { desc: "blinder", cant: 7, esOpcional: false, nota: "6-8" },
      { desc: "haze", cant: 2, esOpcional: false },
      { desc: "torre truss", cant: 2, esOpcional: false },
      { desc: "láser", cant: 4, esOpcional: true },
    ]},
    { cat: "Video", items: [
      { desc: "pantalla LED", cant: 1, esOpcional: false, nota: "9-12 m²" },
      { desc: "Novastar", cant: 1, esOpcional: false },
    ]},
  ];
}

// ── MUSICAL MUY GRANDE 701-1000 ───────────────────────────────────────────────
// RCF HDL 30A: 10-12 módulos para musicales 700-1000 pers.
function musicalMuyGrande(): SugGroup[] {
  return [
    { cat: "Audio", items: [
      { desc: "HDL 30A", cant: 12, esOpcional: false, nota: "RCF line array — 6 por lado; hasta 1000 pers. musicales" },
      { desc: "SUB 8006 AS", cant: 8, esOpcional: false, nota: "6-10 subs RCF — considerar doble apilado" },
      { desc: "SQ5", cant: 1, esOpcional: false },
      { desc: "IEM G4", cant: 1, esOpcional: true, nota: "show híbrido o playback" },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 4, esOpcional: false },
      { desc: "DJM V10", cant: 1, esOpcional: false },
      { desc: "RMX 1000", cant: 1, esOpcional: false },
      { desc: "booth", cant: 1, esOpcional: false, nota: "premium" },
    ]},
    { cat: "Iluminación", items: [
      { desc: "beam", cant: 14, esOpcional: false, nota: "12-16" },
      { desc: "spot", cant: 10, esOpcional: false, nota: "8-12" },
      { desc: "strobe", cant: 18, esOpcional: false, nota: "16-24" },
      { desc: "blinder", cant: 10, esOpcional: false, nota: "8-12" },
      { desc: "haze", cant: 3, esOpcional: false },
      { desc: "torre truss", cant: 4, esOpcional: false, nota: "más torres según venue — nodo DMX adicional" },
      { desc: "láser", cant: 6, esOpcional: true },
    ]},
    { cat: "Video", items: [
      { desc: "pantalla LED", cant: 1, esOpcional: false, nota: "12-20 m² — considerar 2 pantallas laterales" },
      { desc: "Novastar", cant: 1, esOpcional: false },
      { desc: "Atem Mini Pro", cant: 1, esOpcional: true, nota: "si hay cambio de cámaras o streaming" },
    ]},
  ];
}

// ── EXTRAS ESPECÍFICOS ────────────────────────────────────────────────────────
function extraChisperos(): SugGroup {
  return { cat: "Efectos", items: [
    { desc: "chispero / cold spark", cant: 2, esOpcional: false, nota: "2-4 según coreografía" },
    { desc: "técnico de efectos", cant: 1, esOpcional: false },
  ]};
}
function extraHumoFrio(): SugGroup {
  return { cat: "Efectos", items: [
    { desc: "máquina humo frío / dry ice", cant: 1, esOpcional: false, nota: "ideal para primera pieza" },
    { desc: "CO2 jets", cant: 2, esOpcional: true },
  ]};
}
function extraConfeti(): SugGroup {
  return { cat: "Efectos", items: [
    { desc: "cañón de confeti", cant: 2, esOpcional: false, nota: "sincronizar con DJ" },
  ]};
}
function extraIlumArq(): SugGroup {
  return { cat: "Iluminación", items: [
    { desc: "par led inalámbrico", cant: 12, esOpcional: false, nota: "baño de paredes, columnas o árboles" },
    { desc: "par led IP exterior", cant: 6, esOpcional: true, nota: "si hay jardín o fachada" },
    { desc: "barra led", cant: 4, esOpcional: true, nota: "detalles decorativos" },
  ]};
}
function extraKaraoke(): SugGroup {
  return { cat: "Karaoke", items: [
    { desc: "micrófono inalámbrico", cant: 2, esOpcional: false },
    { desc: "pantalla / proyección para letras", cant: 1, esOpcional: false },
  ]};
}
function extraStreaming(): SugGroup {
  return { cat: "Streaming", items: [
    { desc: "Atem Mini Pro / switcher", cant: 1, esOpcional: false },
    { desc: "cámara PTZ o cámara fija", cant: 1, esOpcional: false, nota: "mínimo 1; 2-3 para cobertura completa" },
    { desc: "encoder / stream deck", cant: 1, esOpcional: false },
    { desc: "técnico de streaming", cant: 1, esOpcional: false },
  ]};
}
function extraGrabacion(): SugGroup {
  return { cat: "Grabación", items: [
    { desc: "cámara profesional", cant: 1, esOpcional: false, nota: "2 si se quiere multi-ángulo" },
    { desc: "tarjeta captura / grabadora", cant: 1, esOpcional: false },
    { desc: "técnico de video", cant: 1, esOpcional: false },
  ]};
}
function extraEscenografia(): SugGroup {
  return { cat: "Escenografía", items: [
    { desc: "backdrop / pantalla de tela", cant: 1, esOpcional: false, nota: "medir espacio con anticipación" },
    { desc: "podio / atril", cant: 1, esOpcional: true },
  ]};
}
function extraEstructuras(): SugGroup {
  return { cat: "Estructuras", items: [
    { desc: "torre truss", cant: 2, esOpcional: false, nota: "altura y tipo según venue" },
    { desc: "nodo DMX / consola", cant: 1, esOpcional: false },
    { desc: "rigging / sling", cant: 4, esOpcional: true, nota: "si hay suspensión en techo" },
  ]};
}
