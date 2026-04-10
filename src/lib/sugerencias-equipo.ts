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

/** Devuelve grupos de equipo sugerido según tipo de evento y número de asistentes.
 *  Guía comercial de arranque — no reemplaza revisión técnica en eventos grandes. */
export function getSugerencias(tipoEvento: string, asistentes: number): SugGroup[] {
  if (asistentes <= 0) return [];
  const tipo = tipoEvento.toUpperCase();

  if (tipo === "SOCIAL") {
    if (asistentes <= 100) return socialPequeno();
    if (asistentes <= 200) return socialMediano();
    if (asistentes <= 350) return socialGrande();
    return aviso("350");
  }
  if (tipo === "EMPRESARIAL") {
    if (asistentes <= 100) return empresarialPequeno();
    if (asistentes <= 250) return empresarialMediano();
    if (asistentes <= 500) return empresarialGrande();
    return aviso("500");
  }
  if (tipo === "MUSICAL") {
    if (asistentes <= 150) return musicalPequeno();
    if (asistentes <= 300) return musicalMediano();
    if (asistentes <= 600) return musicalGrande();
    return aviso("600");
  }
  return [];
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

// ── SOCIAL PEQUEÑO ≤100 ───────────────────────────────────────────────────────
function socialPequeno(): SugGroup[] {
  return [
    { cat: "Audio", items: [
      { desc: "EKX 12P", cant: 2, esOpcional: false },
      { desc: "EKX 18P", cant: 1, esOpcional: false, nota: "2 si el espacio lo requiere" },
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
      { desc: "EKX 12P", cant: 4, esOpcional: false },
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

// ── SOCIAL GRANDE 201-350 ─────────────────────────────────────────────────────
function socialGrande(): SugGroup[] {
  return [
    { cat: "Audio", items: [
      { desc: "HDL 6A", cant: 8, esOpcional: false, nota: "premium — base: 4 EKX 12P + 4 EKX 18P" },
      { desc: "SUB 8006 AS", cant: 2, esOpcional: false, nota: "4 si exterior o pista intensa" },
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
function empresarialMediano(): SugGroup[] {
  return [
    { cat: "Audio", items: [
      { desc: "HDL 6A", cant: 7, esOpcional: false, nota: "6-8 — o 4 EKX 12P si setup más simple" },
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
function empresarialGrande(): SugGroup[] {
  return [
    { cat: "Audio", items: [
      { desc: "HDL 6A", cant: 10, esOpcional: false, nota: "8-12 según venue" },
      { desc: "SUB 8006 AS", cant: 3, esOpcional: false, nota: "2-4 según contenido musical" },
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

// ── MUSICAL PEQUEÑO ≤150 ──────────────────────────────────────────────────────
function musicalPequeno(): SugGroup[] {
  return [
    { cat: "Audio", items: [
      { desc: "EKX 12P", cant: 4, esOpcional: false, nota: "o 6-8 HDL 6A para más presión" },
      { desc: "EKX 18P", cant: 3, esOpcional: false, nota: "2-4 — o 2 SUB 8006 AS para más punch" },
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

// ── MUSICAL MEDIANO 151-300 ───────────────────────────────────────────────────
function musicalMediano(): SugGroup[] {
  return [
    { cat: "Audio", items: [
      { desc: "HDL 6A", cant: 8, esOpcional: false, nota: "12 si exterior o más presión" },
      { desc: "SUB 8006 AS", cant: 3, esOpcional: false, nota: "2-4 según intensidad" },
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

// ── MUSICAL GRANDE 301-600 ────────────────────────────────────────────────────
function musicalGrande(): SugGroup[] {
  return [
    { cat: "Audio", items: [
      { desc: "HDL 6A", cant: 14, esOpcional: false, nota: "12-16 — considerar flybar si se cuelga" },
      { desc: "SUB 8006 AS", cant: 4, esOpcional: false },
      { desc: "SQ5", cant: 1, esOpcional: true, nota: "si hay voces, instrumentos o playback" },
      { desc: "IEM G4", cant: 1, esOpcional: true, nota: "show híbrido" },
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
      { desc: "strobe", cant: 16, esOpcional: false, nota: "12-20" },
      { desc: "blinder", cant: 7, esOpcional: false, nota: "6-8" },
      { desc: "haze", cant: 2, esOpcional: false },
      { desc: "torre truss", cant: 2, esOpcional: false, nota: "más torres y nodo DMX según complejidad" },
    ]},
    { cat: "Video", items: [
      { desc: "pantalla LED", cant: 1, esOpcional: false, nota: "9-12 m²" },
      { desc: "Novastar", cant: 1, esOpcional: false },
    ]},
  ];
}
