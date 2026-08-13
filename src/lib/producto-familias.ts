// Taxonomía comercial fina de productos, para agrupar alternativas de intercambio (botón ⇄).
// La familia es un segundo eje además de `categoria`: `categoria` agrupa grueso para la UI de
// catálogo; `familia` agrupa por concepto intercambiable (todos los sistemas de audio entre sí,
// todas las pantallas entre sí, etc.). `subfamilia` afina las familias muy grandes (iluminación).

export type FamiliaDef = {
  slug: string;
  label: string;
  // Prefijos/keywords del nombre que clasifican un producto en esta familia (case-insensitive).
  prefijos: string[];
};

// Orden importa: la primera familia cuyo prefijo haga match gana.
export const FAMILIAS: FamiliaDef[] = [
  { slug: "consola-audio", label: "Consolas de audio", prefijos: ["consola de audio", "mezcladora", "yamaha mg", "yamaha dm", "yamaha cl", "allen & heath", "allen heath", "a&h ", "midas ", "behringer x32", "xenyx"] },
  { slug: "consola-iluminacion", label: "Consolas de iluminación", prefijos: ["consola de iluminacion", "consola de iluminación", "wolfmix", "command wing", "grand ma", "grandma", "ma3", "ma command"] },
  { slug: "sistema-audio", label: "Sistemas de audio", prefijos: ["sistema de audio"] },
  { slug: "microfonia", label: "Microfonía", prefijos: ["microfonos", "micrófonos", "kit de microfonos", "kit de micrófonos", "microfonia", "microfonía"] },
  { slug: "pantalla-led", label: "Pantallas LED", prefijos: ["pantalla led", "banner led"] },
  { slug: "cabina-dj", label: "Cabinas DJ (equipo)", prefijos: ["cabina dj"] },
  { slug: "dj-booth", label: "DJ Booths (estructura)", prefijos: ["dj booth", "booth "] },
  { slug: "maquina-niebla", label: "Máquinas de niebla/humo", prefijos: ["maquina de niebla", "máquina de niebla", "maquina de humo", "máquina de humo", "fazer", "hazer"] },
  { slug: "truss", label: "Truss", prefijos: ["truss"] },
  { slug: "entarimado", label: "Entarimado", prefijos: ["entarimado"] },
  { slug: "pista-baile", label: "Pistas de baile", prefijos: ["pista de baile"] },
  { slug: "polipasto", label: "Polipastos", prefijos: ["polipasto"] },
  { slug: "set-iluminacion", label: "Sets de iluminación", prefijos: ["set de iluminacion", "set de iluminación"] },
];

// Subfamilias de `set-iluminacion` por tipo de fixture; keywords en el nombre.
export const SUBFAMILIAS_ILUMINACION: { slug: string; label: string; keywords: string[] }[] = [
  { slug: "beam", label: "Beam", keywords: ["beam"] },
  { slug: "spot", label: "Spot", keywords: ["spot", "intimidator"] },
  { slug: "wash", label: "Wash", keywords: ["wash", "19x40", "19 x 40"] },
  { slug: "kaleidos", label: "Kaleidos", keywords: ["kaleidos", "sun star"] },
  { slug: "par-led", label: "PAR LED", keywords: ["par led", "slimpar", "par 64", "18x10", "18×10"] },
  { slug: "flasher", label: "Flasher / Strobo", keywords: ["flasher", "strobo", "strobe"] },
  { slug: "blinder", label: "Blinder", keywords: ["blinder"] },
  { slug: "laser", label: "Láser", keywords: ["laser", "láser"] },
  { slug: "pinspot", label: "Pinspot", keywords: ["pinspot", "pin spot"] },
];

function norm(s: string): string {
  return (s || "").toLowerCase().trim();
}

// Clasifica un producto por su nombre. Devuelve familia (y subfamilia si aplica).
// Se usa para backfill masivo y como default al crear/editar un producto.
export function clasificarFamilia(nombre: string): { familia: string | null; subfamilia: string | null } {
  const n = norm(nombre);
  const fam = FAMILIAS.find((f) => f.prefijos.some((p) => n.includes(norm(p))));
  if (!fam) return { familia: null, subfamilia: null };
  let subfamilia: string | null = null;
  if (fam.slug === "set-iluminacion") {
    const sub = SUBFAMILIAS_ILUMINACION.find((s) => s.keywords.some((k) => n.includes(norm(k))));
    subfamilia = sub?.slug ?? null;
  }
  return { familia: fam.slug, subfamilia };
}

export function labelFamilia(slug: string | null | undefined): string {
  if (!slug) return "";
  return FAMILIAS.find((f) => f.slug === slug)?.label ?? slug;
}
