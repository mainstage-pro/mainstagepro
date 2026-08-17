// Fuente única de la lógica de imágenes para las presentaciones de cotización
// (producción y renta). Cubre el mapeo de equipo por marca/modelo y la
// resolución de galería/hero por tipo de evento con fallback hardcodeado.

// ─── Mapeo de imágenes de equipo ──────────────────────────────────────────────
const MARCA_POOL: Record<string, string[]> = {
  "rcf":           ["/images/presentacion/rcf-hdl30a.png", "/images/presentacion/rcf-sub8006.png"],
  "electro voice": ["/images/presentacion/ev-ekx12p.png", "/images/presentacion/ev-ekx18p.png"],
  "electro-voice": ["/images/presentacion/ev-ekx12p.png", "/images/presentacion/ev-ekx18p.png"],
  "ev":            ["/images/presentacion/ev-ekx12p.png", "/images/presentacion/ev-ekx18p.png"],
  "allen & heath": ["/images/presentacion/allen-heath-dlive.png", "/images/presentacion/allen-heath-sq5.png"],
  "allen&heath":   ["/images/presentacion/allen-heath-dlive.png", "/images/presentacion/allen-heath-sq5.png"],
  "shure":         ["/images/presentacion/shure-axient.png", "/images/presentacion/shure-slxd.png", "/images/presentacion/shure-sm58.png", "/images/presentacion/shure-beta52a.png"],
  "pioneer":       ["/images/presentacion/pioneer-cdj3000.png", "/images/presentacion/pioneer-djmv10.png"],
  "pioneer dj":    ["/images/presentacion/pioneer-cdj3000.png", "/images/presentacion/pioneer-djmv10.png"],
  "grand ma":      ["/images/presentacion/grandma-ma3.png", "/images/presentacion/ma-command-wing.png"],
  "grandma":       ["/images/presentacion/grandma-ma3.png", "/images/presentacion/ma-command-wing.png"],
  "ma":            ["/images/presentacion/grandma-ma3.png", "/images/presentacion/ma-command-wing.png"],
  "ma lighting":   ["/images/presentacion/grandma-ma3.png", "/images/presentacion/ma-command-wing.png"],
  "chauvet":       ["/images/presentacion/chauvet-spot260.png", "/images/presentacion/chauvet-slimpar.png", "/images/presentacion/chauvet-pinspot-bar.png"],
  "lite tek":      ["/images/presentacion/lite-tek-beam280.png", "/images/presentacion/lite-tek-bar824i.png", "/images/presentacion/lite-tek-blinder200.png", "/images/presentacion/lite-tek-flasher200.png", "/images/presentacion/lite-tek-par.png"],
  "litetek":       ["/images/presentacion/lite-tek-beam280.png", "/images/presentacion/lite-tek-bar824i.png", "/images/presentacion/lite-tek-blinder200.png", "/images/presentacion/lite-tek-par.png"],
  "lumos":         ["/images/presentacion/lumos-l7.png", "/images/presentacion/lumos-l1-retro.png", "/images/presentacion/lumos-maple-lamp.png", "/images/presentacion/lumos-sixaline.png"],
  "sunstar":       ["/images/presentacion/sunstar-kaleidos.png", "/images/presentacion/sunstar-soul-rgbw.png"],
  "sun star":      ["/images/presentacion/sunstar-kaleidos.png", "/images/presentacion/sunstar-soul-rgbw.png"],
};

const MARCA_IMAGES: Record<string, string> = {
  "midas":      "/images/presentacion/midas-m32.png",
  "sennheiser": "/images/presentacion/sennheiser-iem.png",
  "rode":       "/images/presentacion/rode-m5.png",
  "astera":     "/images/presentacion/astera-ax1.png",
  "steel pro":  "/images/presentacion/steel-pro-razor.png",
  "blackmagic": "/images/presentacion/blackmagic-atem.png",
  "predator":   "/images/presentacion/predator-9500.png",
  "wacker":     "/images/presentacion/wacker-g120.png",
};

const MODELO_IMAGES: Record<string, string> = {
  "DJM A9": "/images/presentacion/pioneer-djmv10.png",
  "DJM V10": "/images/presentacion/pioneer-djmv10.png",
  "DJM-V10": "/images/presentacion/pioneer-djmv10.png",
  "DJM 900 NXS2": "/images/presentacion/pioneer-djmv10.png",
  "DJM S11": "/images/presentacion/pioneer-djmv10.png",
  "EKX 18P": "/images/presentacion/ev-ekx18p.png",
  "EKX 12P": "/images/presentacion/ev-ekx12p.png",
  "HDL 30A": "/images/presentacion/rcf-hdl30a.png",
  "HDL 6A": "/images/presentacion/rcf-hdl30a.png",
  "SUB 8006 AS": "/images/presentacion/rcf-sub8006.png",
  "SQ5": "/images/presentacion/allen-heath-sq5.png",
  "AR24/12": "/images/presentacion/allen-heath-dlive.png",
  "SLXD B58": "/images/presentacion/shure-slxd.png",
  "BLX24 SM58": "/images/presentacion/shure-slxd.png",
  "AXIENT B58/SM58": "/images/presentacion/shure-axient.png",
  "IEM G4": "/images/presentacion/sennheiser-iem.png",
  "EK IEM G4": "/images/presentacion/sennheiser-iem.png",
  "PSM1000": "/images/presentacion/shure-axient.png",
  "BAR 824i": "/images/presentacion/lite-tek-bar824i.png",
  "BEAM 280": "/images/presentacion/lite-tek-beam280.png",
  "BLINDER 200": "/images/presentacion/lite-tek-blinder200.png",
  "FLASHER 200": "/images/presentacion/lite-tek-flasher200.png",
  "18X10 Ambar": "/images/presentacion/lite-tek-par.png",
  "Fazer 1500": "/images/presentacion/lite-tek-fazer1500.png",
  "Int SPOT 260": "/images/presentacion/chauvet-spot260.png",
  "Slimpar Q12 BT": "/images/presentacion/chauvet-slimpar.png",
  "Pinspot Bar": "/images/presentacion/chauvet-pinspot-bar.png",
  "KALEIDOS": "/images/presentacion/sunstar-kaleidos.png",
  "SM58": "/images/presentacion/shure-sm58.png",
  "SM57": "/images/presentacion/shure-sm58.png",
  "SM31": "/images/presentacion/shure-sm58.png",
  "SM81": "/images/presentacion/shure-sm58.png",
  "BETA 52A": "/images/presentacion/shure-beta52a.png",
  "BETA91A": "/images/presentacion/shure-beta52a.png",
  "Command Wing": "/images/presentacion/ma-command-wing.png",
  "MA3 Compact XT": "/images/presentacion/grandma-ma3.png",
  "L7": "/images/presentacion/lumos-l7.png",
  "L1 Retro": "/images/presentacion/lumos-l1-retro.png",
  "Maple Lamp": "/images/presentacion/lumos-maple-lamp.png",
  "Sixaline": "/images/presentacion/lumos-sixaline.png",
  "SOUL RGBW": "/images/presentacion/sunstar-soul-rgbw.png",
  "Atem Mini Pro": "/images/presentacion/blackmagic-atem.png",
  "Truss": "/images/presentacion/truss.png",
};

function idHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Estructura mínima que necesita getEquipoImage. Cualquier línea de cotización
// con estos campos es compatible (los clientes pasan su propio tipo Linea).
export type EquipoLinea = {
  id: string;
  marca: string | null;
  modelo: string | null;
  equipo?: { imagenUrl?: string | null; imagenesUrls?: string | null } | null;
};

// Prefiere la referencia viva del inventario (equipo.imagenUrl); si no, resuelve
// por modelo, luego por marca (pool determinista por id), y finalmente por marca simple.
export function getEquipoImage(linea: EquipoLinea): string | null {
  if (linea.equipo?.imagenUrl) return linea.equipo.imagenUrl;
  if (linea.modelo && MODELO_IMAGES[linea.modelo]) return MODELO_IMAGES[linea.modelo];
  const marca = (linea.marca ?? "").toLowerCase().trim();
  for (const key of Object.keys(MARCA_POOL)) {
    if (marca.includes(key) || key.includes(marca)) {
      const pool = MARCA_POOL[key];
      return pool[idHash(linea.id) % pool.length];
    }
  }
  for (const key of Object.keys(MARCA_IMAGES)) {
    if (marca.includes(key) || key.includes(marca)) return MARCA_IMAGES[key];
  }
  return null;
}

// ─── Galería de fotos por equipo (inventario) ─────────────────────────────────
// Devuelve SOLO las fotos reales EXTERNO cargadas en imagenesUrls (fotos del
// equipo en eventos). No incluye la imagen principal (imagenUrl) ni el mapeo
// de marca/modelo PNG — esos son solo para el thumbnail de la tarjeta.
export function getEquipoImagenes(linea: EquipoLinea): GaleriaItem[] {
  const items: GaleriaItem[] = [];
  const seen = new Set<string>();
  const nombre = [linea.marca, linea.modelo].filter(Boolean).join(" ").trim();

  const push = (src: string | null | undefined, caption: string) => {
    if (!src || seen.has(src)) return;
    seen.add(src);
    items.push({ src, caption });
  };

  const raw = linea.equipo?.imagenesUrls;
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        for (const item of arr) {
          if (typeof item === "string") {
            push(item, nombre);
          } else if (item && typeof item === "object" && typeof item.url === "string") {
            if (item.uso === "INTERNO") continue;
            push(item.url, typeof item.nombre === "string" && item.nombre ? item.nombre : nombre);
          }
        }
      }
    } catch {
      /* ignora JSON inválido */
    }
  }

  return items;
}

// ─── Galerías hardcodeadas (fallback) ─────────────────────────────────────────
export type GaleriaItem = { src: string; caption: string };

const GALLERY_MUSICAL: GaleriaItem[] = [
  { src: "/images/presentacion/musicales/Musicales-194.jpg",                    caption: "Show · Producción completa" },
  { src: "/images/presentacion/musicales/Musicales-037.jpg",                    caption: "Lasers · Show de iluminación" },
  { src: "/images/presentacion/musicales/Musicales-154.jpg",                    caption: "Club · Disco ball y efectos" },
  { src: "/images/presentacion/musicales/Musicales-016.jpg",                    caption: "Festival · Escenario outdoor" },
  { src: "/images/presentacion/musicales/Musicales-076.jpg",                    caption: "DJ · Performance con humo" },
  { src: "/images/presentacion/musicales/Musicales-055.jpg",                    caption: "En vivo · Artista y video wall" },
  { src: "/images/presentacion/musicales/MAGIC_ROOM_260307_GUANAJUATO_078.jpg", caption: "DJ Booth · Vista del crowd" },
];
const GALLERY_SOCIAL: GaleriaItem[] = [
  { src: "/images/presentacion/sociales/s-dj-salon.png",           caption: "El ambiente que recordarán" },
  { src: "/images/presentacion/sociales/s-hacienda-aerea.jpg",     caption: "Cada rincón, perfectamente iluminado" },
  { src: "/images/presentacion/sociales/s-boda-colonial.jpg",      caption: "Producción a la altura del momento" },
  { src: "/images/presentacion/sociales/s-piano-pista.jpg",        caption: "Detalles que marcan la diferencia" },
  { src: "/images/presentacion/sociales/s-boda-elegante.jpg",      caption: "Sonido, luz y escenario — todo en uno" },
  { src: "/images/presentacion/sociales/s-hacienda-iluminada.jpg", caption: "Tu evento, en manos expertas" },
];
const GALLERY_CORP: GaleriaItem[] = [
  { src: "/images/presentacion/empresariales/e-sala-pantallas.jpg",   caption: "Experiencias que generan impacto" },
  { src: "/images/presentacion/empresariales/e-auditorio.jpg",        caption: "Producción que refleja tu marca" },
  { src: "/images/presentacion/empresariales/e-carpa-led.jpg",        caption: "Tecnología LED de alto nivel" },
  { src: "/images/presentacion/empresariales/e-networking.jpg",       caption: "Ambientes que invitan a conectar" },
  { src: "/images/presentacion/empresariales/e-edificio-azul.jpg",    caption: "Iluminación arquitectónica de impacto" },
  { src: "/images/presentacion/empresariales/e-proyeccion-mural.jpg", caption: "Creatividad sin límites" },
];

// "Otros eventos" no tiene banco propio de fotos todavía: se arma con las tomas
// de escenario y auditorio que mejor leen fuera de musical/social/empresarial.
const GALLERY_OTROS: GaleriaItem[] = [
  { src: "/images/presentacion/empresariales/e-auditorio.jpg",        caption: "Auditorio · Producción completa" },
  { src: "/images/presentacion/musicales/Musicales-037.jpg",          caption: "Iluminación escénica" },
  { src: "/images/presentacion/empresariales/e-carpa-led.jpg",        caption: "Exterior · Pantalla LED" },
  { src: "/images/presentacion/musicales/DSC07491.jpg",               caption: "Operación técnica en vivo" },
  { src: "/images/presentacion/empresariales/e-proyeccion-mural.jpg", caption: "Proyección de gran formato" },
  { src: "/images/presentacion/musicales/Musicales-016.jpg",          caption: "Escenario montado y probado" },
];

function fallbackGaleria(tipoEvento: string): GaleriaItem[] {
  const t = (tipoEvento ?? "").toUpperCase().trim();
  if (t === "SOCIAL") return GALLERY_SOCIAL;
  if (t === "EMPRESARIAL") return GALLERY_CORP;
  if (t === "OTRO") return GALLERY_OTROS;
  return GALLERY_MUSICAL;
}

// ─── Resolución de galería/hero desde FotoTipoEvento (BD) con fallback ────────
export type FotoPresentacion = {
  id: string;
  url: string;
  caption: string | null;
  orden: number;
  destacada: boolean;
};

const HERO_MAX = 7;

const toItem = (f: FotoPresentacion): GaleriaItem => ({ src: f.url, caption: f.caption ?? "" });

// Galería de producciones: fotos de BD ordenadas; si no hay, fallback hardcodeado.
export function resolverGaleria(tipoEvento: string, galeriaFotos: FotoPresentacion[]): GaleriaItem[] {
  if (galeriaFotos.length) return galeriaFotos.map(toItem);
  return fallbackGaleria(tipoEvento);
}

// Hero: destacadas si las hay; si no, primeras N de la galería; si no, fallback.
export function resolverHero(
  tipoEvento: string,
  galeriaFotos: FotoPresentacion[],
  heroFotos: FotoPresentacion[],
): GaleriaItem[] {
  if (heroFotos.length) return heroFotos.map(toItem);
  if (galeriaFotos.length) return galeriaFotos.slice(0, HERO_MAX).map(toItem);
  return fallbackGaleria(tipoEvento);
}
