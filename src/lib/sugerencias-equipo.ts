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

/**
 * Capacidades máximas por sistema según GUÍA BASE EQUIPOS Mainstage Pro 2026:
 *
 * EV EKX 12P + EV EKX 18SP
 *   2 EKX12P                          →  Musical: 30   | Social: 50
 *   2 EKX12P + 2 EKX18SP              →  Musical: 60   | Social: 100
 *   2 EKX12P + 4 EKX18SP              →  Musical: 100  | Social: 200
 *   4 EKX12P + 4 EKX18SP              →  Musical: 150  | Social: 250
 *
 * RCF HDL 6A + RCF SUB 8006 AS
 *   6 HDL6A + 2 EKX18SP               →  Musical: 180  | Social: 200  | Empresarial: 200
 *   8 HDL6A + 2 SUB8006               →  Musical: 250  | Social: 400  | Empresarial: 400
 *  12 HDL6A + 3 SUB8006               →  Musical: 500  | Social: 600  | Empresarial: 600
 *  16 HDL6A + 4 SUB8006               →  Musical: 800  | Social: 1000 | Empresarial: 1000
 *
 * RCF HDL 30A + RCF SUB 8006 AS
 *   8 HDL30A + 4 SUB8006              →  Musical: 1000 | Social: 1200 | Empresarial: 1200
 *  12 HDL30A + 6 SUB8006              →  Musical: 1500 | Social: N/A  | Empresarial: 1800
 *  16 HDL30A + 8 SUB8006              →  Musical: 2000 | Social: N/A  | Empresarial: 2500
 *  20 HDL30A + 10 SUB8006             →  Musical: 3000 | Social: N/A  | Empresarial: 4000
 */
export function getSugerencias(tipoEvento: string, asistentes: number, servicios?: string[]): SugGroup[] {
  if (asistentes <= 0) return [];
  const tipo = tipoEvento.toUpperCase();

  let grupos: SugGroup[] = [];

  if (tipo === "SOCIAL") {
    if (asistentes <= 50)    grupos = socialMini();
    else if (asistentes <= 100)  grupos = socialPequeno();
    else if (asistentes <= 250)  grupos = socialMediano();
    else if (asistentes <= 400)  grupos = socialGrande();
    else if (asistentes <= 600)  grupos = socialMuyGrande();
    else if (asistentes <= 1000) grupos = socialXxl();
    else if (asistentes <= 1200) grupos = socialMega();
    else return aviso("1200");

    if (servicios?.includes("CHISPEROS")) grupos.push(extraChisperos());
    if (servicios?.includes("HUMO_FRIO"))  grupos.push(extraHumoFrio());
    if (servicios?.includes("CONFETI"))    grupos.push(extraConfeti());
    if (servicios?.includes("ILUM_ARQ"))   grupos.push(extraIlumArq());
    if (servicios?.includes("KARAOKE"))    grupos.push(extraKaraoke());

  } else if (tipo === "EMPRESARIAL") {
    if (asistentes <= 50)    grupos = empresarialMini();
    else if (asistentes <= 100)  grupos = empresarialPequeno();
    else if (asistentes <= 200)  grupos = empresarialMediano();
    else if (asistentes <= 400)  grupos = empresarialGrande();
    else if (asistentes <= 600)  grupos = empresarialMuyGrande();
    else if (asistentes <= 1000) grupos = empresarialXxl();
    else if (asistentes <= 1200) grupos = empresarialMega();
    else if (asistentes <= 1800) grupos = empresarialMega12();
    else if (asistentes <= 2500) grupos = empresarialMega16();
    else if (asistentes <= 4000) grupos = empresarialMega20();
    else return aviso("4000");

    if (servicios?.includes("STREAMING"))    grupos.push(extraStreaming());
    if (servicios?.includes("GRABACION"))    grupos.push(extraGrabacion());
    if (servicios?.includes("ESCENOGRAFIA")) grupos.push(extraEscenografia());

  } else if (tipo === "MUSICAL") {
    if (asistentes <= 30)    grupos = musicalMini();
    else if (asistentes <= 60)   grupos = musicalMicro();
    else if (asistentes <= 100)  grupos = musicalPequeno();
    else if (asistentes <= 150)  grupos = musicalMediano();
    else if (asistentes <= 250)  grupos = musicalGrande();
    else if (asistentes <= 500)  grupos = musicalMuyGrande();
    else if (asistentes <= 800)  grupos = musicalXxl();
    else if (asistentes <= 1000) grupos = musicalMega8();
    else if (asistentes <= 1500) grupos = musicalMega12();
    else if (asistentes <= 2000) grupos = musicalMega16();
    else if (asistentes <= 3000) grupos = musicalMega20();
    else return aviso("3000");

    if (servicios?.includes("ESTRUCTURAS")) grupos.push(extraEstructuras());
  } else {
    return [];
  }

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
      desc: `Más de ${limite} personas — validar con producción antes de cotizar.`,
      cant: 0, esOpcional: false,
    }],
  }];
}

// ══════════════════════════════════════════════════════════════════════════════
// SOCIAL  (máximos PDF: EKX→250, HDL6A→1000, HDL30A→1200)
// ══════════════════════════════════════════════════════════════════════════════

function socialMini(): SugGroup[] {          // ≤50
  return [
    { cat: "Audio", items: [
      { desc: "EKX 12P", cant: 2, esOpcional: false, nota: "EV — cubre hasta 50 pers. social" },
      { desc: "inalámbrico", cant: 1, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led inalámbrico", cant: 8, esOpcional: false, nota: "6-10 piezas" },
      { desc: "barra led", cant: 2, esOpcional: true },
    ]},
  ];
}

function socialPequeno(): SugGroup[] {       // ≤100
  return [
    { cat: "Audio", items: [
      { desc: "EKX 12P", cant: 2, esOpcional: false, nota: "EV — cubre hasta 100 pers. social" },
      { desc: "EKX 18P", cant: 2, esOpcional: false },
      { desc: "inalámbrico", cant: 2, esOpcional: false, nota: "brindis o protocolo" },
      { desc: "SQ5", cant: 1, esOpcional: true, nota: "si hay múltiples micrófonos" },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led inalámbrico", cant: 10, esOpcional: false, nota: "8-12 piezas" },
      { desc: "par led", cant: 6, esOpcional: false },
      { desc: "barra led", cant: 3, esOpcional: true },
      { desc: "haze", cant: 1, esOpcional: true },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 2, esOpcional: true },
      { desc: "DJM A9", cant: 1, esOpcional: true, nota: "mixer DJ" },
      { desc: "booth", cant: 1, esOpcional: true },
    ]},
  ];
}

function socialMediano(): SugGroup[] {       // ≤250
  return [
    { cat: "Audio", items: [
      { desc: "EKX 12P", cant: 4, esOpcional: false, nota: "EV — cubre hasta 250 pers. social" },
      { desc: "EKX 18P", cant: 4, esOpcional: false },
      { desc: "SQ5", cant: 1, esOpcional: false },
      { desc: "inalámbrico", cant: 2, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led inalámbrico", cant: 14, esOpcional: false, nota: "12-16 piezas" },
      { desc: "spot", cant: 5, esOpcional: false },
      { desc: "barra led", cant: 4, esOpcional: false },
      { desc: "blinder", cant: 4, esOpcional: true },
      { desc: "haze", cant: 1, esOpcional: true },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 2, esOpcional: false },
      { desc: "DJM A9", cant: 1, esOpcional: false },
      { desc: "booth", cant: 1, esOpcional: false },
    ]},
  ];
}

function socialGrande(): SugGroup[] {        // ≤400
  return [
    { cat: "Audio", items: [
      { desc: "HDL 6A", cant: 8, esOpcional: false, nota: "RCF — cubre hasta 400 pers. social" },
      { desc: "SUB 8006 AS", cant: 2, esOpcional: false, nota: "subs RCF" },
      { desc: "SQ5", cant: 1, esOpcional: false },
      { desc: "inalámbrico", cant: 3, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led inalámbrico", cant: 18, esOpcional: false, nota: "16-20 piezas" },
      { desc: "spot", cant: 7, esOpcional: false },
      { desc: "beam", cant: 7, esOpcional: false },
      { desc: "blinder", cant: 6, esOpcional: false },
      { desc: "strobe", cant: 8, esOpcional: false },
      { desc: "haze", cant: 2, esOpcional: false },
      { desc: "torre truss", cant: 2, esOpcional: false },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 2, esOpcional: false },
      { desc: "DJM A9", cant: 1, esOpcional: false },
      { desc: "booth", cant: 1, esOpcional: false },
    ]},
  ];
}

function socialMuyGrande(): SugGroup[] {     // ≤600
  return [
    { cat: "Audio", items: [
      { desc: "HDL 6A", cant: 12, esOpcional: false, nota: "RCF — cubre hasta 600 pers. social" },
      { desc: "SUB 8006 AS", cant: 3, esOpcional: false },
      { desc: "SQ5", cant: 1, esOpcional: false },
      { desc: "inalámbrico", cant: 4, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led inalámbrico", cant: 20, esOpcional: false },
      { desc: "spot", cant: 9, esOpcional: false },
      { desc: "beam", cant: 9, esOpcional: false },
      { desc: "blinder", cant: 8, esOpcional: false },
      { desc: "strobe", cant: 12, esOpcional: false },
      { desc: "haze", cant: 2, esOpcional: false },
      { desc: "torre truss", cant: 2, esOpcional: false },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 3, esOpcional: false },
      { desc: "DJM A9", cant: 1, esOpcional: false },
      { desc: "booth", cant: 1, esOpcional: false },
    ]},
  ];
}

function socialXxl(): SugGroup[] {           // ≤1000
  return [
    { cat: "Audio", items: [
      { desc: "HDL 6A", cant: 16, esOpcional: false, nota: "RCF — cubre hasta 1000 pers. social" },
      { desc: "SUB 8006 AS", cant: 4, esOpcional: false },
      { desc: "SQ5", cant: 1, esOpcional: false },
      { desc: "inalámbrico", cant: 4, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led inalámbrico", cant: 26, esOpcional: false },
      { desc: "spot", cant: 10, esOpcional: false },
      { desc: "beam", cant: 10, esOpcional: false },
      { desc: "blinder", cant: 10, esOpcional: false },
      { desc: "strobe", cant: 16, esOpcional: false },
      { desc: "haze", cant: 3, esOpcional: false },
      { desc: "torre truss", cant: 4, esOpcional: false },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 4, esOpcional: false },
      { desc: "DJM V10", cant: 1, esOpcional: false },
      { desc: "booth", cant: 1, esOpcional: false },
    ]},
  ];
}

function socialMega(): SugGroup[] {          // ≤1200
  return [
    { cat: "Audio", items: [
      { desc: "HDL 30A", cant: 8, esOpcional: false, nota: "RCF HDL 30A — cubre hasta 1200 pers. social" },
      { desc: "SUB 8006 AS", cant: 4, esOpcional: false },
      { desc: "SQ5", cant: 1, esOpcional: false },
      { desc: "inalámbrico", cant: 5, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led inalámbrico", cant: 30, esOpcional: false },
      { desc: "spot", cant: 12, esOpcional: false },
      { desc: "beam", cant: 12, esOpcional: false },
      { desc: "blinder", cant: 10, esOpcional: false },
      { desc: "strobe", cant: 18, esOpcional: false },
      { desc: "haze", cant: 3, esOpcional: false },
      { desc: "torre truss", cant: 4, esOpcional: false },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 4, esOpcional: false },
      { desc: "DJM V10", cant: 1, esOpcional: false },
      { desc: "RMX 1000", cant: 1, esOpcional: true },
      { desc: "booth", cant: 1, esOpcional: false },
    ]},
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// EMPRESARIAL  (máximos PDF: EKX→~100, HDL6A→1000, HDL30A→4000)
// ══════════════════════════════════════════════════════════════════════════════

function empresarialMini(): SugGroup[] {     // ≤50
  return [
    { cat: "Audio", items: [
      { desc: "EKX 12P", cant: 2, esOpcional: false },
      { desc: "inalámbrico", cant: 2, esOpcional: false },
      { desc: "diadema", cant: 1, esOpcional: true },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led", cant: 6, esOpcional: false },
      { desc: "barra led", cant: 2, esOpcional: false },
    ]},
    { cat: "Video", items: [
      { desc: "pantalla LED", cant: 1, esOpcional: true, nota: "3-4 m²" },
      { desc: "Novastar", cant: 1, esOpcional: true },
    ]},
  ];
}

function empresarialPequeno(): SugGroup[] {  // ≤100
  return [
    { cat: "Audio", items: [
      { desc: "EKX 12P", cant: 2, esOpcional: false },
      { desc: "EKX 18P", cant: 2, esOpcional: false },
      { desc: "SQ5", cant: 1, esOpcional: false },
      { desc: "inalámbrico", cant: 2, esOpcional: false },
      { desc: "diadema", cant: 1, esOpcional: true },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led", cant: 8, esOpcional: false },
      { desc: "barra led", cant: 3, esOpcional: false },
      { desc: "pinspot", cant: 4, esOpcional: true },
    ]},
    { cat: "Video", items: [
      { desc: "pantalla LED", cant: 1, esOpcional: true, nota: "3-6 m²" },
      { desc: "Novastar", cant: 1, esOpcional: true },
      { desc: "Atem Mini Pro", cant: 1, esOpcional: true },
    ]},
  ];
}

function empresarialMediano(): SugGroup[] {  // ≤200
  return [
    { cat: "Audio", items: [
      { desc: "HDL 6A", cant: 6, esOpcional: false, nota: "RCF — cubre hasta 200 pers. empresarial" },
      { desc: "EKX 18P", cant: 2, esOpcional: false, nota: "subs EV como complemento" },
      { desc: "SQ5", cant: 1, esOpcional: false },
      { desc: "inalámbrico", cant: 3, esOpcional: false },
      { desc: "diadema", cant: 1, esOpcional: true },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led", cant: 12, esOpcional: false },
      { desc: "barra led", cant: 4, esOpcional: false },
      { desc: "spot", cant: 3, esOpcional: true },
    ]},
    { cat: "Video", items: [
      { desc: "pantalla LED", cant: 1, esOpcional: false, nota: "6 m²" },
      { desc: "Novastar", cant: 1, esOpcional: false },
      { desc: "Atem Mini Pro", cant: 1, esOpcional: false },
    ]},
  ];
}

function empresarialGrande(): SugGroup[] {   // ≤400
  return [
    { cat: "Audio", items: [
      { desc: "HDL 6A", cant: 8, esOpcional: false, nota: "RCF — cubre hasta 400 pers. empresarial" },
      { desc: "SUB 8006 AS", cant: 2, esOpcional: false },
      { desc: "SQ5", cant: 1, esOpcional: false },
      { desc: "inalámbrico", cant: 4, esOpcional: false },
      { desc: "diadema", cant: 1, esOpcional: true },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led", cant: 16, esOpcional: false },
      { desc: "spot", cant: 6, esOpcional: false },
      { desc: "barra led", cant: 5, esOpcional: false },
      { desc: "haze", cant: 1, esOpcional: true },
      { desc: "torre truss", cant: 2, esOpcional: false },
    ]},
    { cat: "Video", items: [
      { desc: "pantalla LED", cant: 1, esOpcional: false, nota: "9 m²" },
      { desc: "Novastar", cant: 1, esOpcional: false },
      { desc: "Atem Mini Pro", cant: 1, esOpcional: false },
    ]},
  ];
}

function empresarialMuyGrande(): SugGroup[] { // ≤600
  return [
    { cat: "Audio", items: [
      { desc: "HDL 6A", cant: 12, esOpcional: false, nota: "RCF — cubre hasta 600 pers. empresarial" },
      { desc: "SUB 8006 AS", cant: 3, esOpcional: false },
      { desc: "SQ5", cant: 1, esOpcional: false },
      { desc: "inalámbrico", cant: 4, esOpcional: false },
      { desc: "IEM G4", cant: 1, esOpcional: true },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led", cant: 20, esOpcional: false },
      { desc: "spot", cant: 8, esOpcional: false },
      { desc: "beam", cant: 6, esOpcional: true },
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

function empresarialXxl(): SugGroup[] {      // ≤1000
  return [
    { cat: "Audio", items: [
      { desc: "HDL 6A", cant: 16, esOpcional: false, nota: "RCF — cubre hasta 1000 pers. empresarial" },
      { desc: "SUB 8006 AS", cant: 4, esOpcional: false },
      { desc: "SQ5", cant: 1, esOpcional: false },
      { desc: "inalámbrico", cant: 5, esOpcional: false },
      { desc: "IEM G4", cant: 1, esOpcional: true },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led", cant: 26, esOpcional: false },
      { desc: "spot", cant: 10, esOpcional: false },
      { desc: "beam", cant: 8, esOpcional: false },
      { desc: "blinder", cant: 6, esOpcional: false },
      { desc: "haze", cant: 2, esOpcional: false },
      { desc: "torre truss", cant: 4, esOpcional: false },
    ]},
    { cat: "Video", items: [
      { desc: "pantalla LED", cant: 1, esOpcional: false, nota: "12-15 m²" },
      { desc: "Novastar", cant: 1, esOpcional: false },
      { desc: "Atem Mini Pro", cant: 1, esOpcional: false },
    ]},
  ];
}

function empresarialMega(): SugGroup[] {     // ≤1200
  return [
    { cat: "Audio", items: [
      { desc: "HDL 30A", cant: 8, esOpcional: false, nota: "RCF HDL 30A — cubre hasta 1200 pers. empresarial" },
      { desc: "SUB 8006 AS", cant: 4, esOpcional: false },
      { desc: "SQ5", cant: 1, esOpcional: false },
      { desc: "inalámbrico", cant: 5, esOpcional: false },
      { desc: "IEM G4", cant: 1, esOpcional: true },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led", cant: 30, esOpcional: false },
      { desc: "spot", cant: 12, esOpcional: false },
      { desc: "beam", cant: 10, esOpcional: false },
      { desc: "blinder", cant: 8, esOpcional: false },
      { desc: "haze", cant: 3, esOpcional: false },
      { desc: "torre truss", cant: 4, esOpcional: false },
    ]},
    { cat: "Video", items: [
      { desc: "pantalla LED", cant: 1, esOpcional: false, nota: "15-18 m²" },
      { desc: "Novastar", cant: 1, esOpcional: false },
      { desc: "Atem Mini Pro", cant: 1, esOpcional: false },
    ]},
  ];
}

function empresarialMega12(): SugGroup[] {   // ≤1800
  return [
    { cat: "Audio", items: [
      { desc: "HDL 30A", cant: 12, esOpcional: false, nota: "RCF HDL 30A — cubre hasta 1800 pers. empresarial" },
      { desc: "SUB 8006 AS", cant: 6, esOpcional: false },
      { desc: "SQ5", cant: 1, esOpcional: false },
      { desc: "inalámbrico", cant: 6, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led", cant: 36, esOpcional: false },
      { desc: "spot", cant: 14, esOpcional: false },
      { desc: "beam", cant: 12, esOpcional: false },
      { desc: "blinder", cant: 10, esOpcional: false },
      { desc: "haze", cant: 4, esOpcional: false },
      { desc: "torre truss", cant: 6, esOpcional: false },
    ]},
    { cat: "Video", items: [
      { desc: "pantalla LED", cant: 1, esOpcional: false, nota: "18-24 m²" },
      { desc: "Novastar", cant: 1, esOpcional: false },
      { desc: "Atem Mini Pro", cant: 1, esOpcional: false },
    ]},
  ];
}

function empresarialMega16(): SugGroup[] {   // ≤2500
  return [
    { cat: "Audio", items: [
      { desc: "HDL 30A", cant: 16, esOpcional: false, nota: "RCF HDL 30A — cubre hasta 2500 pers. empresarial" },
      { desc: "SUB 8006 AS", cant: 8, esOpcional: false },
      { desc: "SQ5", cant: 1, esOpcional: false },
      { desc: "inalámbrico", cant: 6, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led", cant: 44, esOpcional: false },
      { desc: "spot", cant: 16, esOpcional: false },
      { desc: "beam", cant: 16, esOpcional: false },
      { desc: "blinder", cant: 12, esOpcional: false },
      { desc: "haze", cant: 4, esOpcional: false },
      { desc: "torre truss", cant: 8, esOpcional: false },
    ]},
    { cat: "Video", items: [
      { desc: "pantalla LED", cant: 1, esOpcional: false, nota: "24-30 m²" },
      { desc: "Novastar", cant: 1, esOpcional: false },
      { desc: "Atem Mini Pro", cant: 1, esOpcional: false },
    ]},
  ];
}

function empresarialMega20(): SugGroup[] {   // ≤4000
  return [
    { cat: "Audio", items: [
      { desc: "HDL 30A", cant: 20, esOpcional: false, nota: "RCF HDL 30A — cubre hasta 4000 pers. empresarial" },
      { desc: "SUB 8006 AS", cant: 10, esOpcional: false },
      { desc: "SQ5", cant: 1, esOpcional: false },
      { desc: "inalámbrico", cant: 6, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led", cant: 50, esOpcional: false },
      { desc: "spot", cant: 20, esOpcional: false },
      { desc: "beam", cant: 20, esOpcional: false },
      { desc: "blinder", cant: 14, esOpcional: false },
      { desc: "haze", cant: 5, esOpcional: false },
      { desc: "torre truss", cant: 8, esOpcional: false },
    ]},
    { cat: "Video", items: [
      { desc: "pantalla LED", cant: 1, esOpcional: false, nota: "30-40 m²" },
      { desc: "Novastar", cant: 1, esOpcional: false },
      { desc: "Atem Mini Pro", cant: 1, esOpcional: false },
    ]},
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// MUSICAL  (máximos PDF: EKX→150, HDL6A→800, HDL30A→3000)
// ══════════════════════════════════════════════════════════════════════════════

function musicalMini(): SugGroup[] {         // ≤30
  return [
    { cat: "Audio", items: [
      { desc: "EKX 12P", cant: 2, esOpcional: false, nota: "EV — cubre hasta 30 pers. musical" },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 2, esOpcional: false },
      { desc: "DJM A9", cant: 1, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led", cant: 6, esOpcional: false },
      { desc: "beam", cant: 2, esOpcional: true },
    ]},
  ];
}

function musicalMicro(): SugGroup[] {        // ≤60
  return [
    { cat: "Audio", items: [
      { desc: "EKX 12P", cant: 2, esOpcional: false, nota: "EV — cubre hasta 60 pers. musical" },
      { desc: "EKX 18P", cant: 2, esOpcional: false },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 2, esOpcional: false },
      { desc: "DJM A9", cant: 1, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "par led", cant: 8, esOpcional: false },
      { desc: "beam", cant: 3, esOpcional: false },
      { desc: "strobe", cant: 2, esOpcional: true },
      { desc: "haze", cant: 1, esOpcional: true },
    ]},
  ];
}

function musicalPequeno(): SugGroup[] {      // ≤100
  return [
    { cat: "Audio", items: [
      { desc: "EKX 12P", cant: 2, esOpcional: false, nota: "EV — cubre hasta 100 pers. musical" },
      { desc: "EKX 18P", cant: 4, esOpcional: false },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 2, esOpcional: false },
      { desc: "DJM A9", cant: 1, esOpcional: false },
      { desc: "booth", cant: 1, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "spot", cant: 4, esOpcional: false },
      { desc: "beam", cant: 4, esOpcional: false },
      { desc: "strobe", cant: 4, esOpcional: false },
      { desc: "blinder", cant: 2, esOpcional: false },
      { desc: "haze", cant: 1, esOpcional: false },
    ]},
  ];
}

function musicalMediano(): SugGroup[] {      // ≤150
  return [
    { cat: "Audio", items: [
      { desc: "EKX 12P", cant: 4, esOpcional: false, nota: "EV — cubre hasta 150 pers. musical" },
      { desc: "EKX 18P", cant: 4, esOpcional: false },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 2, esOpcional: false },
      { desc: "DJM A9", cant: 1, esOpcional: false },
      { desc: "booth", cant: 1, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "spot", cant: 4, esOpcional: false },
      { desc: "beam", cant: 5, esOpcional: false },
      { desc: "strobe", cant: 6, esOpcional: false },
      { desc: "blinder", cant: 3, esOpcional: false },
      { desc: "haze", cant: 1, esOpcional: false },
      { desc: "láser", cant: 1, esOpcional: true },
    ]},
  ];
}

function musicalGrande(): SugGroup[] {       // ≤250
  return [
    { cat: "Audio", items: [
      { desc: "HDL 6A", cant: 8, esOpcional: false, nota: "RCF — cubre hasta 250 pers. musical" },
      { desc: "SUB 8006 AS", cant: 2, esOpcional: false },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 3, esOpcional: false },
      { desc: "DJM A9", cant: 1, esOpcional: false },
      { desc: "booth", cant: 1, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "spot", cant: 5, esOpcional: false },
      { desc: "beam", cant: 6, esOpcional: false },
      { desc: "strobe", cant: 8, esOpcional: false },
      { desc: "blinder", cant: 4, esOpcional: false },
      { desc: "haze", cant: 2, esOpcional: false },
      { desc: "torre truss", cant: 2, esOpcional: false },
      { desc: "láser", cant: 2, esOpcional: true },
    ]},
  ];
}

function musicalMuyGrande(): SugGroup[] {    // ≤500
  return [
    { cat: "Audio", items: [
      { desc: "HDL 6A", cant: 12, esOpcional: false, nota: "RCF — cubre hasta 500 pers. musical" },
      { desc: "SUB 8006 AS", cant: 3, esOpcional: false },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 3, esOpcional: false },
      { desc: "DJM V10", cant: 1, esOpcional: false },
      { desc: "RMX 1000", cant: 1, esOpcional: true },
      { desc: "booth", cant: 1, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "beam", cant: 8, esOpcional: false },
      { desc: "spot", cant: 6, esOpcional: false },
      { desc: "strobe", cant: 10, esOpcional: false },
      { desc: "blinder", cant: 5, esOpcional: false },
      { desc: "haze", cant: 2, esOpcional: false },
      { desc: "torre truss", cant: 2, esOpcional: false },
      { desc: "láser", cant: 3, esOpcional: true },
    ]},
  ];
}

function musicalXxl(): SugGroup[] {          // ≤800
  return [
    { cat: "Audio", items: [
      { desc: "HDL 6A", cant: 16, esOpcional: false, nota: "RCF — cubre hasta 800 pers. musical" },
      { desc: "SUB 8006 AS", cant: 4, esOpcional: false },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 4, esOpcional: false },
      { desc: "DJM V10", cant: 1, esOpcional: false },
      { desc: "RMX 1000", cant: 1, esOpcional: false },
      { desc: "booth", cant: 1, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "beam", cant: 10, esOpcional: false },
      { desc: "spot", cant: 8, esOpcional: false },
      { desc: "strobe", cant: 14, esOpcional: false },
      { desc: "blinder", cant: 7, esOpcional: false },
      { desc: "haze", cant: 2, esOpcional: false },
      { desc: "torre truss", cant: 2, esOpcional: false },
      { desc: "láser", cant: 4, esOpcional: true },
    ]},
    { cat: "Video", items: [
      { desc: "pantalla LED", cant: 1, esOpcional: true, nota: "si el evento lo requiere" },
      { desc: "Novastar", cant: 1, esOpcional: true },
    ]},
  ];
}

function musicalMega8(): SugGroup[] {        // ≤1000
  return [
    { cat: "Audio", items: [
      { desc: "HDL 30A", cant: 8, esOpcional: false, nota: "RCF HDL 30A — cubre hasta 1000 pers. musical" },
      { desc: "SUB 8006 AS", cant: 4, esOpcional: false },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 4, esOpcional: false },
      { desc: "DJM V10", cant: 1, esOpcional: false },
      { desc: "RMX 1000", cant: 1, esOpcional: false },
      { desc: "booth", cant: 1, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "beam", cant: 12, esOpcional: false },
      { desc: "spot", cant: 10, esOpcional: false },
      { desc: "strobe", cant: 16, esOpcional: false },
      { desc: "blinder", cant: 8, esOpcional: false },
      { desc: "haze", cant: 3, esOpcional: false },
      { desc: "torre truss", cant: 4, esOpcional: false },
      { desc: "láser", cant: 4, esOpcional: true },
    ]},
    { cat: "Video", items: [
      { desc: "pantalla LED", cant: 1, esOpcional: false, nota: "9-12 m²" },
      { desc: "Novastar", cant: 1, esOpcional: false },
    ]},
  ];
}

function musicalMega12(): SugGroup[] {       // ≤1500
  return [
    { cat: "Audio", items: [
      { desc: "HDL 30A", cant: 12, esOpcional: false, nota: "RCF HDL 30A — cubre hasta 1500 pers. musical" },
      { desc: "SUB 8006 AS", cant: 6, esOpcional: false },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 4, esOpcional: false },
      { desc: "DJM V10", cant: 1, esOpcional: false },
      { desc: "RMX 1000", cant: 1, esOpcional: false },
      { desc: "booth", cant: 1, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "beam", cant: 14, esOpcional: false },
      { desc: "spot", cant: 12, esOpcional: false },
      { desc: "strobe", cant: 20, esOpcional: false },
      { desc: "blinder", cant: 10, esOpcional: false },
      { desc: "haze", cant: 3, esOpcional: false },
      { desc: "torre truss", cant: 6, esOpcional: false },
      { desc: "láser", cant: 6, esOpcional: true },
    ]},
    { cat: "Video", items: [
      { desc: "pantalla LED", cant: 1, esOpcional: false, nota: "12-15 m²" },
      { desc: "Novastar", cant: 1, esOpcional: false },
    ]},
  ];
}

function musicalMega16(): SugGroup[] {       // ≤2000
  return [
    { cat: "Audio", items: [
      { desc: "HDL 30A", cant: 16, esOpcional: false, nota: "RCF HDL 30A — cubre hasta 2000 pers. musical" },
      { desc: "SUB 8006 AS", cant: 8, esOpcional: false },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 4, esOpcional: false },
      { desc: "DJM V10", cant: 1, esOpcional: false },
      { desc: "RMX 1000", cant: 1, esOpcional: false },
      { desc: "booth", cant: 1, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "beam", cant: 16, esOpcional: false },
      { desc: "spot", cant: 14, esOpcional: false },
      { desc: "strobe", cant: 24, esOpcional: false },
      { desc: "blinder", cant: 12, esOpcional: false },
      { desc: "haze", cant: 4, esOpcional: false },
      { desc: "torre truss", cant: 8, esOpcional: false },
    ]},
    { cat: "Video", items: [
      { desc: "pantalla LED", cant: 1, esOpcional: false, nota: "15-20 m²" },
      { desc: "Novastar", cant: 1, esOpcional: false },
      { desc: "Atem Mini Pro", cant: 1, esOpcional: true },
    ]},
  ];
}

function musicalMega20(): SugGroup[] {       // ≤3000
  return [
    { cat: "Audio", items: [
      { desc: "HDL 30A", cant: 20, esOpcional: false, nota: "RCF HDL 30A — cubre hasta 3000 pers. musical" },
      { desc: "SUB 8006 AS", cant: 10, esOpcional: false },
    ]},
    { cat: "DJ / Consola", items: [
      { desc: "CDJ 3000", cant: 4, esOpcional: false },
      { desc: "DJM V10", cant: 1, esOpcional: false },
      { desc: "RMX 1000", cant: 1, esOpcional: false },
      { desc: "booth", cant: 1, esOpcional: false },
    ]},
    { cat: "Iluminación", items: [
      { desc: "beam", cant: 20, esOpcional: false },
      { desc: "spot", cant: 16, esOpcional: false },
      { desc: "strobe", cant: 28, esOpcional: false },
      { desc: "blinder", cant: 14, esOpcional: false },
      { desc: "haze", cant: 5, esOpcional: false },
      { desc: "torre truss", cant: 10, esOpcional: false },
    ]},
    { cat: "Video", items: [
      { desc: "pantalla LED", cant: 1, esOpcional: false, nota: "20-30 m²" },
      { desc: "Novastar", cant: 1, esOpcional: false },
      { desc: "Atem Mini Pro", cant: 1, esOpcional: true },
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
