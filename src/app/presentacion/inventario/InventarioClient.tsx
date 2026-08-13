"use client";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import PresentacionNav from "@/components/presentacion/PresentacionNav";

const GOLD = "#B3985B";
const WA   = "https://wa.me/524461432565?text=Hola%2C%20me%20gustar%C3%ADa%20conocer%20el%20equipo%20disponible%20para%20mi%20evento.";

// Image maps fetched asynchronously after hydration (avoids 3+ MB base64 in initial HTML)
type ImageMap = Record<string, string>;      // id -> portada
type GaleriaMap = Record<string, string[]>;  // id -> fotos adicionales asignadas en Equipos

// ─── Types ─────────────────────────────────────────────────────────────────────
interface EquipoData {
  id: string; descripcion: string; marca: string | null;
  modelo: string | null; cantidadTotal: number; estado: string; notas: string | null;
  imagenUrl?: string | null; precioRenta: number;
}
interface CategoriaData { nombre: string; orden: number; equipos: EquipoData[]; }
interface Props { data: { categorias: CategoriaData[]; totalEquipos: number; totalUnidades: number; categoriaOrden?: string[] } }
// Productos = "sistemas armados a partir del inventario" (cargados en cliente vía /api/productos/publico)
interface ProductoItemData { cantidad: number; equipo: { id: string; descripcion: string; marca: string | null; modelo: string | null } }
interface ProductoCoberturaData { tipoEvento: string; rangos: string | null; subtipos: string | null }
interface ProductoData {
  id: string; nombre: string; descripcion: string | null; categoria: string | null;
  tiposEvento: string | null; imagenUrl: string | null; precioFinal: number;
  coberturas: ProductoCoberturaData[]; items: ProductoItemData[];
}
interface QuoteItem {
  id: string;
  descripcion: string;
  marca?: string | null;
  modelo?: string | null;
  cantidad: number;
  precioUnitario: number;
  esPersonalizado: boolean;
}
type Tab = "catalogo" | "productos" | "lista" | "precios" | "cotizador";
// Pestañas ocultas por completo del sitio público.
const HIDDEN_TABS: Tab[] = ["precios", "cotizador"];
// Pestañas accesibles como pill (nav compacta) pero SIN tarjeta grande en el hero — presencia discreta.
const HERO_HIDDEN_TABS: Tab[] = ["lista"];
const isTabVisible = (t: Tab) => !HIDDEN_TABS.includes(t);
const isHeroCardVisible = (t: Tab) => !HIDDEN_TABS.includes(t) && !HERO_HIDDEN_TABS.includes(t);

// ─── Image mapping ──────────────────────────────────────────────────────────────
const MARCA_IMGS: Record<string, string> = {
  "rcf":          "/images/presentacion/rcf-hdl30a.png",
  "electro voice":"/images/presentacion/ev-ekx12p.png",
  "electro-voice":"/images/presentacion/ev-ekx12p.png",
  "ev":           "/images/presentacion/ev-ekx12p.png",
  "allen & heath":"/images/presentacion/allen-heath-dlive.png",
  "allen&heath":  "/images/presentacion/allen-heath-dlive.png",
  "midas":        "/images/presentacion/midas-m32.png",
  "shure":        "/images/presentacion/shure-axient.png",
  "sennheiser":   "/images/presentacion/sennheiser-iem.png",
  "rode":         "/images/presentacion/rode-m5.png",
  "pioneer":      "/images/presentacion/pioneer-cdj3000.png",
  "pioneer dj":   "/images/presentacion/pioneer-cdj3000.png",
  "grandma":      "/images/presentacion/grandma-ma3.png",
  "grand ma":     "/images/presentacion/grandma-ma3.png",
  "ma lighting":  "/images/presentacion/grandma-ma3.png",
  "astera":       "/images/presentacion/astera-ax1.png",
  "chauvet":      "/images/presentacion/chauvet-spot260.png",
  "lite tek":     "/images/presentacion/lite-tek-beam280.png",
  "litetek":      "/images/presentacion/lite-tek-beam280.png",
  "lumos":        "/images/presentacion/lumos-l7.png",
  "sun star":     "/images/presentacion/sunstar-kaleidos.png",
  "sunstar":      "/images/presentacion/sunstar-soul-rgbw.png",
  "steel pro":    "/images/presentacion/steel-pro-razor.png",
  "blackmagic":   "/images/presentacion/blackmagic-atem.png",
  "predator":     "/images/presentacion/predator-9500.png",
  "wacker":       "/images/presentacion/wacker-g120.png",
  "yamaha":       "/images/presentacion/allen-heath-sq5.png",
};
const MODELO_IMGS: Record<string, string> = {
  "DJM V10":       "/images/presentacion/pioneer-djmv10.png",
  "DJM-V10":       "/images/presentacion/pioneer-djmv10.png",
  "DJM A9":        "/images/presentacion/pioneer-djmv10.png",
  "DJM 900 NXS2":  "/images/presentacion/pioneer-djmv10.png",
  "DJM S11":       "/images/presentacion/pioneer-djmv10.png",
  "EKX 18P":       "/images/presentacion/ev-ekx18p.png",
  "EKX 12P":       "/images/presentacion/ev-ekx12p.png",
  "HDL 30A":       "/images/presentacion/rcf-hdl30a.png",
  "HDL 6A":        "/images/presentacion/rcf-hdl30a.png",
  "SUB 8006 AS":   "/images/presentacion/rcf-sub8006.png",
  "SQ5":           "/images/presentacion/allen-heath-sq5.png",
  "BAR 824i":      "/images/presentacion/lite-tek-bar824i.png",
  "BEAM 280":      "/images/presentacion/lite-tek-beam280.png",
  "BLINDER 200":   "/images/presentacion/lite-tek-blinder200.png",
  "FLASHER 200":   "/images/presentacion/lite-tek-flasher200.png",
  "Fazer 1500":    "/images/presentacion/lite-tek-fazer1500.png",
  "Int SPOT 260":  "/images/presentacion/chauvet-spot260.png",
  "Slimpar Q12 BT":"/images/presentacion/chauvet-slimpar.png",
  "Pinspot Bar":   "/images/presentacion/chauvet-pinspot-bar.png",
  "KALEIDOS":      "/images/presentacion/sunstar-kaleidos.png",
  "SM58":          "/images/presentacion/shure-sm58.png",
  "SM57":          "/images/presentacion/shure-sm58.png",
  "BETA 52A":      "/images/presentacion/shure-beta52a.png",
  "Command Wing":  "/images/presentacion/ma-command-wing.png",
  "MA3 Compact XT":"/images/presentacion/grandma-ma3.png",
  "L7":            "/images/presentacion/lumos-l7.png",
  "L1 Retro":      "/images/presentacion/lumos-l1-retro.png",
  "Maple Lamp":    "/images/presentacion/lumos-maple-lamp.png",
  "Sixaline":      "/images/presentacion/lumos-sixaline.png",
  "SOUL RGBW":     "/images/presentacion/sunstar-soul-rgbw.png",
  "Atem Mini Pro": "/images/presentacion/blackmagic-atem.png",
};
const CAT_DESC: Record<string, string> = {
  "Sistemas de Audio":          "Line arrays, subwoofers y monitores activos para cobertura uniforme en cualquier venue, desde jardines hasta auditorios.",
  "Equipo de Audio":            "Line arrays, subwoofers y monitores activos para cobertura uniforme en cualquier venue, desde jardines hasta auditorios.",
  "Consolas de Audio":          "Consolas digitales para mezcla en vivo con control total sobre señal, efectos y ruteo.",
  "Sistemas de Microfonía":     "Micrófonos de solapa, headset y de mano para oradores, artistas y ceremonias.",
  "Microfonía e Inalámbricos":  "Micrófonos de solapa, headset y de mano para oradores, artistas y ceremonias.",
  "Monitoreo In-Ear":           "Sistemas IEM para artistas y técnicos en tarima — mezcla personalizada sin interferencias.",
  "Equipo de Iluminación":      "Cabezas móviles, beams, pares LED, efectos especiales y estructuras de soporte.",
  "Consolas de Iluminación":    "Control de cues, escenas y efectos en tiempo real. Programación previa para cada momento.",
  "Consolas/Equipo para DJ":    "CDJs, mezcladoras y setup profesional verificado antes de que el artista llegue.",
  "DJ Booths":                  "Booths estructurales con integración de equipo técnico, adaptables al espacio y concepto.",
  "Equipo para DJ":             "CDJs, mezcladoras y setup profesional verificado antes de que el artista llegue.",
  "Pantalla / Video":           "Pantallas, procesadores de señal y sistemas de proyección para contenido en vivo.",
  "Entarimado":                 "Estructuras modulares para tarimas, risers y escenarios — estables y adaptables.",
};

// ─── Force logo + exclude ────────────────────────────────────────────────────
// Solo equipos que AÚN no tienen foto de portada — se muestra el logo como placeholder.
// Al subir su portada (imagenUrl), quítalos de esta lista para que se vea la foto.
const FORCE_LOGO_KEYWORDS = [
  "esquinero de truss a 45","motores de rigging",
  "booth decorativo premium color blanco",
  "torre decorativa premium blanco 2 metros","torre decorativa premium blanco 2.5 metros",
  "entarimado 2.5",
];
const EXCLUDE_KEYWORDS = ["colocación de puntos de colgado","anclaje en alturas"];

function shouldForceLogo(eq: EquipoData) {
  const d = (eq.descripcion ?? "").toLowerCase();
  return FORCE_LOGO_KEYWORDS.some(k => d.includes(k.toLowerCase()));
}
function shouldExclude(eq: EquipoData) {
  const d = (eq.descripcion ?? "").toLowerCase();
  return EXCLUDE_KEYWORDS.some(k => d.includes(k.toLowerCase()));
}
function getEqImg(eq: EquipoData, imageMap?: ImageMap): string | null {
  if (shouldForceLogo(eq)) return null;
  // Check async-loaded image map first, then fallback to static maps
  if (imageMap && imageMap[eq.id]) return imageMap[eq.id];
  if (eq.imagenUrl) return eq.imagenUrl;
  if (eq.modelo) {
    for (const [k, v] of Object.entries(MODELO_IMGS))
      if (eq.modelo.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(eq.modelo.toLowerCase())) return v;
  }
  const m = (eq.marca ?? "").toLowerCase().trim();
  for (const [k, v] of Object.entries(MARCA_IMGS))
    if (m.includes(k) || k.includes(m)) return v;
  return null;
}
function fmtPrice(n: number) { return "$" + n.toLocaleString("es-MX", { maximumFractionDigits: 0 }); }
function eqDisplayName(eq: EquipoData) { return [eq.marca, eq.modelo].filter(Boolean).join(" ") || eq.descripcion; }

// ─── Productos (sistemas armados) — helpers ──────────────────────────────────────
const TIPO_EVENTO_LABEL: Record<string, string> = { MUSICAL: "Musical", SOCIAL: "Social", EMPRESARIAL: "Empresarial" };
function parseTags(json: string | null): string[] {
  if (!json) return [];
  try { const v = JSON.parse(json); return Array.isArray(v) ? v : []; } catch { return []; }
}
function nombreEqProd(e: ProductoItemData["equipo"]): string {
  return e.marca && e.modelo ? `${e.marca} ${e.modelo}` : e.marca || e.modelo || e.descripcion;
}
function composicionStr(p: ProductoData): string {
  return p.items.map(it => `${it.cantidad}× ${nombreEqProd(it.equipo)}`).join(", ");
}
// Capacidad global: mínimo de los mínimos y máximo de los máximos entre los rangos de todas las coberturas.
function capacidadProd(p: ProductoData): { min: number; max: number } | null {
  let min = Infinity, max = -Infinity;
  for (const c of p.coberturas ?? [])
    for (const label of parseTags(c.rangos)) {
      const m = label.match(/(\d+)\D+(\d+)/);
      if (!m) continue;
      min = Math.min(min, parseInt(m[1], 10));
      max = Math.max(max, parseInt(m[2], 10));
    }
  return isFinite(min) && isFinite(max) ? { min, max } : null;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────────
function useReveal(threshold = 0.08) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold });
    obs.observe(el); return () => obs.disconnect();
  }, [threshold]);
  return { ref, vis };
}
function useCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStarted(true); obs.disconnect(); } }, { threshold: 0, rootMargin: "0px 0px -10% 0px" });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!started) return;
    let cur = 0; const step = target / (duration / 16);
    const t = setInterval(() => { cur += step; if (cur >= target) { setCount(target); clearInterval(t); } else setCount(Math.floor(cur)); }, 16);
    return () => clearInterval(t);
  }, [started, target, duration]);
  return { count, ref };
}

// ─── Reveal wrapper ─────────────────────────────────────────────────────────────
function R({ children, delay = 0, y = 36, className = "" }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  const { ref, vis } = useReveal();
  return (
    <div ref={ref} className={className}
         style={{ transitionDelay: `${delay}ms`, opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : `translateY(${y}px)`, transition: "opacity 0.75s cubic-bezier(0.16,1,0.3,1), transform 0.75s cubic-bezier(0.16,1,0.3,1)" }}>
      {children}
    </div>
  );
}

// ─── Equipo card (catálogo) ──────────────────────────────────────────────────────
function EquipoCard({ eq, delay = 0, onImageClick, imageMap, galeriaMap }: { eq: EquipoData; delay?: number; onImageClick: (images: string[], alt: string) => void; imageMap?: ImageMap; galeriaMap?: GaleriaMap }) {
  const img = getEqImg(eq, imageMap);
  const [hovered, setHovered] = useState(false);
  // Galería = fotos adicionales asignadas en el módulo de Equipos. Solo clickeable si existen.
  const extras = galeriaMap?.[eq.id] ?? [];
  const galeria = img ? Array.from(new Set([img, ...extras])) : extras;
  const hasGaleria = extras.length > 0 && galeria.length > 0;
  return (
    <R delay={delay}>
      <div className="group relative rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-300"
           style={{ background: hovered ? "rgba(179,152,91,0.04)" : "rgba(255,255,255,0.025)", border: `1px solid ${hovered ? GOLD + "40" : "rgba(255,255,255,0.07)"}`, boxShadow: hovered ? "0 8px 40px rgba(0,0,0,0.4)" : "none" }}
           onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <div className="relative flex items-center justify-center p-5 overflow-hidden"
             style={{ height: "160px", background: "#050505", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={eq.descripcion} draggable={false} loading="lazy"
                 onClick={hasGaleria ? () => onImageClick(galeria, eqDisplayName(eq)) : undefined}
                 className={`max-h-full max-w-full object-contain transition-all duration-500 ${hasGaleria ? "cursor-pointer" : ""}`}
                 style={{ transform: hovered ? "scale(1.07)" : "scale(1)", filter: hovered ? "brightness(1.1)" : "brightness(0.9)" }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logo-icon.png" alt="Mainstage Pro" draggable={false} className="w-16 h-16 object-contain opacity-10" />
          )}
          {hasGaleria && (
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full px-3 py-1 pointer-events-none transition-opacity duration-300"
                 style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.12)", opacity: hovered ? 1 : 0.75, backdropFilter: "blur(4px)" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
              <span className="text-[10px] tracking-wide" style={{ color: "rgba(255,255,255,0.85)" }}>Clic para ver fotos</span>
            </div>
          )}
          <div className="absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-bold"
               style={{ background: `${GOLD}20`, color: GOLD, border: `1px solid ${GOLD}50` }}>
            {eq.cantidadTotal}<span style={{fontSize:"9px",fontWeight:400,opacity:0.8,marginLeft:"2px"}}>unidades</span>
          </div>
        </div>
        <div className="p-5 flex-1 flex flex-col">
          <p className="text-white font-semibold text-sm leading-snug mb-1 line-clamp-2">{eqDisplayName(eq)}</p>
          {(eq.marca || eq.modelo) && <p className="text-white/40 text-xs leading-snug line-clamp-2">{eq.descripcion}</p>}
          {eq.notas && <p className="text-white/20 text-xs mt-2 leading-relaxed line-clamp-2">{eq.notas}</p>}
        </div>
      </div>
    </R>
  );
}

// ─── Stat counter ────────────────────────────────────────────────────────────────
function StatBlock({ target, suffix = "", label, sub }: { target: number; suffix?: string; label: string; sub: string }) {
  const { count, ref } = useCounter(target, 2200);
  return (
    <div ref={ref} className="flex flex-col items-center text-center px-6 py-8">
      <span className="font-bold tabular-nums leading-none" style={{ fontSize: "clamp(4rem,10vw,8rem)", letterSpacing: "-0.04em", color: GOLD, lineHeight: 1 }}>{count}{suffix}</span>
      <span className="text-white font-semibold mt-3 text-lg">{label}</span>
      <span className="text-white/35 text-sm mt-1">{sub}</span>
    </div>
  );
}

// ─── Tab nav compacto (sticky scroll) ────────────────────────────────────────────
function TabNav({ active, onChange, quoteCount }: { active: Tab; onChange: (t: Tab) => void; quoteCount: number }) {
  const tabs: { key: Tab; label: string }[] = ([
    { key: "catalogo", label: "Catálogo" },
    { key: "productos", label: "Productos" },
    { key: "lista",    label: "Lista" },
    { key: "precios",  label: "Lista de precios" },
    { key: "cotizador", label: "Cotizador" },
  ] as { key: Tab; label: string }[]).filter(t => isTabVisible(t.key));
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
                className="relative text-xs px-4 py-2 rounded-full transition-all duration-300 font-medium whitespace-nowrap"
                style={{ background: active === t.key ? GOLD : "rgba(255,255,255,0.05)", color: active === t.key ? "#000" : "rgba(255,255,255,0.45)", border: `1px solid ${active === t.key ? GOLD : "rgba(255,255,255,0.08)"}` }}>
          {t.label}
          {t.key === "cotizador" && quoteCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ background: active === "cotizador" ? "#000" : GOLD, color: active === "cotizador" ? GOLD : "#000" }}>
              {quoteCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Tab selector central (sección hero) ─────────────────────────────────────────
function TabSelector({ active, onChange, quoteCount }: { active: Tab; onChange: (t: Tab) => void; quoteCount: number }) {
  const cards: { key: Tab; icon: React.ReactNode; title: string; desc: string }[] = ([
    {
      key: "catalogo",
      icon: (
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="18" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="2" y="18" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="18" y="18" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      ),
      title: "Catálogo",
      desc: "Explora todo el equipo disponible por categoría con fichas técnicas y fotos.",
    },
    {
      key: "productos",
      icon: (
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
          <path d="M16 3l11 6v14l-11 6-11-6V9l11-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M5 9l11 6 11-6M16 15v14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      ),
      title: "Productos",
      desc: "Sistemas armados a partir del inventario, listos para operar, con el equipo que los compone.",
    },
    {
      key: "lista",
      icon: (
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
          <path d="M11 8h17M11 16h17M11 24h17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="5" cy="8" r="1.5" fill="currentColor"/>
          <circle cx="5" cy="16" r="1.5" fill="currentColor"/>
          <circle cx="5" cy="24" r="1.5" fill="currentColor"/>
        </svg>
      ),
      title: "Lista",
      desc: "Vista de tabla con todo el equipo por categoría: marca, modelo y unidades.",
    },
    {
      key: "precios",
      icon: (
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
          <path d="M6 8h20M6 14h14M6 20h18M6 26h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="26" cy="23" r="4" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M26 21v2l1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      title: "Lista de precios",
      desc: "Consulta tarifas por día de evento organizadas por categoría de equipo.",
    },
    {
      key: "cotizador",
      icon: (
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
          <path d="M10 6H6a2 2 0 00-2 2v18a2 2 0 002 2h20a2 2 0 002-2V8a2 2 0 00-2-2h-4" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="10" y="3" width="12" height="6" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M10 15h12M10 20h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="24" cy="22" r="4" fill="currentColor" opacity="0.2"/>
          <path d="M24 20v2h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      title: "Cotizador",
      desc: "Selecciona equipos y obtén un presupuesto estimado al instante para tu evento.",
    },
  ] as { key: Tab; icon: React.ReactNode; title: string; desc: string }[]).filter(c => isHeroCardVisible(c.key));
  if (cards.length <= 1) return null;
  return (
    <section style={{ background: "#060606", borderBottom: `1px solid ${GOLD}10`, padding: "3rem 1.5rem" }}>
      <div style={{ maxWidth: "780px", margin: "0 auto" }}>
        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "0.5rem", fontFamily: "monospace" }}>Explorar</p>
        <h2 style={{ textAlign: "center", fontSize: "clamp(1.3rem,3vw,1.9rem)", fontWeight: 700, letterSpacing: "-0.03em", color: "white", marginBottom: "0.35rem" }}>{"¿Qué deseas explorar?"}</h2>
        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "0.82rem", marginBottom: "2rem" }}>{"Elige una sección para continuar."}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0.75rem" }}>
          {cards.map(c => {
            const isActive = active === c.key;
            return (
              <button
                key={c.key}
                id={`tab-card-${c.key}`}
                onClick={() => onChange(c.key)}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1.25rem 1.25rem",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
                  background: isActive ? GOLD : "rgba(255,255,255,0.03)",
                  border: `1.5px solid ${isActive ? GOLD : `${GOLD}20`}`,
                  color: isActive ? "#000" : GOLD,
                  textAlign: "left",
                  boxShadow: isActive ? `0 6px 30px ${GOLD}28` : "none",
                  transform: isActive ? "translateY(-2px)" : "translateY(0)",
                }}
              >
                <span style={{ opacity: isActive ? 0.8 : 0.9, flexShrink: 0 }}>
                  {c.icon}
                </span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.95rem", letterSpacing: "-0.01em", color: isActive ? "#000" : "white", marginBottom: "0.2rem" }}>
                    {c.title}
                    {c.key === "cotizador" && quoteCount > 0 && (
                      <span style={{ marginLeft: "0.5rem", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", background: isActive ? "#000" : GOLD, color: isActive ? GOLD : "#000", fontSize: "10px", fontWeight: 700, verticalAlign: "middle" }}>
                        {quoteCount}
                      </span>
                    )}
                  </p>
                  <p style={{ fontSize: "0.82rem", color: isActive ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.35)", lineHeight: 1.5, fontWeight: 400 }}>{c.desc}</p>
                </div>
                {isActive && (
                  <span style={{ position: "absolute", top: "1.25rem", right: "1.25rem", fontSize: "12px", opacity: 0.5, color: "#000" }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Productos (sistemas armados a partir del inventario) ─────────────────────────
// Familia = grupo de productos con el mismo equipo dominante (el item de mayor cantidad).
// Colapsa variantes por cantidad (x04, x08, x12…) en una sola miniatura; al hacer clic
// se muestran todas las configuraciones/sets de esa familia.
interface FamiliaProducto { key: string; img: string | null; productos: ProductoData[] }

function equipoDominante(p: ProductoData): ProductoItemData["equipo"] | null {
  if (!p.items?.length) return null;
  let best = p.items[0];
  for (const it of p.items) if (it.cantidad > best.cantidad) best = it;
  return best.equipo;
}
function familiaKey(p: ProductoData): string {
  const eq = equipoDominante(p);
  return (eq ? nombreEqProd(eq) : p.nombre) || "Otros";
}

// Reúne los tipos de evento de todas las configuraciones de la familia (sin duplicar).
function familiaTipos(fam: FamiliaProducto): string[] {
  const set = new Set<string>();
  for (const p of fam.productos) for (const t of parseTags(p.tiposEvento)) set.add(t);
  return Array.from(set);
}

// Fila de lista (no tarjeta): miniatura discreta + nombre + acción "Ver configuraciones"
// colocada abajo/al costado, nunca encimada sobre la imagen.
function FamiliaRow({ fam, onClick }: { fam: FamiliaProducto; onClick: () => void }) {
  const n = fam.productos.length;
  const tipos = familiaTipos(fam);
  const thumb = (
    <div className="w-11 h-11 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
         style={{ background: "#080808", border: "1px solid rgba(255,255,255,0.06)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={fam.img || "/logo-icon.png"} alt="" draggable={false} loading="lazy"
           className={`object-contain ${fam.img ? "w-10 h-10" : "w-4 h-4 opacity-15"}`} />
    </div>
  );
  const verBtn = (
    <button type="button" onClick={onClick}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap"
            style={{ background: `${GOLD}12`, color: GOLD, border: `1px solid ${GOLD}30` }}>
      Ver {n === 1 ? "configuración" : `${n} configuraciones`}
      <span>→</span>
    </button>
  );
  const tiposBadges = tipos.length > 0 ? (
    <div className="flex flex-wrap gap-1">
      {tipos.map(t => (
        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${GOLD}12`, color: GOLD, border: `1px solid ${GOLD}20` }}>
          {TIPO_EVENTO_LABEL[t] || t}
        </span>
      ))}
    </div>
  ) : <span className="text-white/20 text-xs">—</span>;
  return (
    <div>
      {/* Desktop */}
      <div className="hidden md:grid px-5 py-3.5 items-center transition-colors hover:bg-white/[0.025]"
           style={{ gridTemplateColumns: "52px 1.9fr 1.4fr auto", gap: "16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        {thumb}
        <div className="min-w-0">
          <p className="text-white text-sm font-medium leading-snug line-clamp-2">{fam.key}</p>
          <p className="text-white/35 text-xs leading-snug mt-0.5">{n} {n === 1 ? "configuración disponible" : "configuraciones disponibles"}</p>
        </div>
        {tiposBadges}
        <div className="justify-self-end">{verBtn}</div>
      </div>
      {/* Mobile */}
      <div className="md:hidden flex gap-3 px-4 py-3.5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        {thumb}
        <div className="min-w-0 flex-1">
          <p className="text-white text-sm font-medium leading-snug line-clamp-2">{fam.key}</p>
          <div className="flex items-center gap-2 flex-wrap mt-2">{tiposBadges}</div>
          <div className="mt-2.5">{verBtn}</div>
        </div>
      </div>
    </div>
  );
}

function FamiliaModal({ label, productos, onClose }: { label: string; productos: ProductoData[]; onClose: () => void }) {
  return (
    <div onClick={onClose}
         style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.25rem", backdropFilter: "blur(12px)", animation: "fadeIn 0.2s ease" }}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
           style={{ maxHeight: "85vh", background: "#0a0a0a", border: `1px solid ${GOLD}25`, boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}>
        <div className="flex items-start justify-between gap-4 px-6 py-5" style={{ borderBottom: `1px solid ${GOLD}15` }}>
          <div>
            <p className="text-white/25 text-[10px] tracking-[0.28em] uppercase mb-1.5 font-mono">Configuraciones disponibles</p>
            <h3 className="text-white font-bold leading-tight" style={{ fontSize: "clamp(1.1rem,3vw,1.5rem)", letterSpacing: "-0.02em" }}>{label}</h3>
          </div>
          <button onClick={onClose} aria-label="Cerrar"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "50%", width: "36px", height: "36px", color: "white", fontSize: "16px", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div className="overflow-y-auto">
          {productos.map((p, i) => {
            const cap = capacidadProd(p);
            const tipos = parseTags(p.tiposEvento);
            const comp = composicionStr(p);
            return (
              <div key={p.id} className="px-6 py-4" style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : undefined }}>
                <p className="text-white text-sm font-semibold leading-snug">{p.nombre}</p>
                {comp && <p className="text-white/40 text-xs leading-snug mt-1">{comp}</p>}
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  {tipos.map(t => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: `${GOLD}12`, color: GOLD, border: `1px solid ${GOLD}20` }}>
                      {TIPO_EVENTO_LABEL[t] || t}
                    </span>
                  ))}
                  {cap && <span className="text-white/50 text-[11px] tabular-nums">· {cap.min}–{cap.max} pers.</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProductosTab({ productos, loading, categoriaOrden = [] }: { productos: ProductoData[]; loading: boolean; categoriaOrden?: string[] }) {
  const [openFam, setOpenFam] = useState<{ label: string; productos: ProductoData[] } | null>(null);

  useEffect(() => {
    if (!openFam) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenFam(null); };
    window.addEventListener("keydown", fn); return () => window.removeEventListener("keydown", fn);
  }, [openFam]);

  // Agrupa por categoría (orden del inventario de equipos, categoriaOrden) y dentro de
  // cada una por familia de equipo dominante.
  const cats = useMemo(() => {
    const catMap = new Map<string, ProductoData[]>();
    for (const p of productos) {
      const c = (p.categoria || "OTRO").trim() || "OTRO";
      if (!catMap.has(c)) catMap.set(c, []);
      catMap.get(c)!.push(p);
    }
    const orderIdx = (c: string) => { const i = categoriaOrden.indexOf(c); return i === -1 ? Number.MAX_SAFE_INTEGER : i; };
    return Array.from(catMap.entries())
      .map(([cat, ps]) => {
        const famMap = new Map<string, FamiliaProducto>();
        for (const p of ps) {
          const k = familiaKey(p);
          if (!famMap.has(k)) famMap.set(k, { key: k, img: null, productos: [] });
          const f = famMap.get(k)!;
          f.productos.push(p);
          if (!f.img && p.imagenUrl) f.img = p.imagenUrl;
        }
        return { cat, familias: Array.from(famMap.values()), total: ps.length };
      })
      .filter(g => g.familias.length > 0)
      .sort((a, b) => { const d = orderIdx(a.cat) - orderIdx(b.cat); return d !== 0 ? d : a.cat.localeCompare(b.cat); });
  }, [productos, categoriaOrden]);

  return (
    <div className="max-w-6xl mx-auto py-16 px-4 sm:px-6">
      <R>
        <div className="mb-10">
          <p className="text-white/20 text-xs tracking-[0.3em] uppercase mb-3 font-mono">Mainstage Pro · Sistemas listos</p>
          <h2 className="font-bold text-white" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", letterSpacing: "-0.03em" }}>Productos por categoría</h2>
          <p className="text-white/35 text-sm mt-3 max-w-2xl">Sistemas armados a partir de nuestro inventario, listos para operar. Abre cada equipo para ver las configuraciones disponibles.</p>
        </div>
      </R>

      {loading && productos.length === 0 ? (
        <R><p className="text-white/30 text-sm py-16 text-center">Cargando productos…</p></R>
      ) : cats.length === 0 ? (
        <R><p className="text-white/30 text-sm py-16 text-center">Aún no hay productos publicados.</p></R>
      ) : (
        <div className="space-y-10">
          {cats.map((g, gi) => (
            <R key={g.cat} delay={Math.min(gi * 30, 300)}>
              <section>
                <div className="flex items-center justify-between gap-4 mb-4 pb-3" style={{ borderBottom: `1px solid ${GOLD}18` }}>
                  <h3 className="font-bold text-white" style={{ fontSize: "clamp(1.15rem,3vw,1.7rem)", letterSpacing: "-0.02em" }}>{g.cat}</h3>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0" style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}20` }}>
                    {g.total} {g.total === 1 ? "producto" : "productos"}
                  </span>
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                  {/* Encabezados (desktop) */}
                  <div className="hidden md:grid px-5 py-3 text-[10px] font-semibold text-white/25 tracking-widest uppercase"
                       style={{ gridTemplateColumns: "52px 1.9fr 1.4fr auto", gap: "16px" }}>
                    <span />
                    <span>Equipo</span>
                    <span>Tipo de evento</span>
                    <span className="justify-self-end">Configuraciones</span>
                  </div>
                  {g.familias.map((f) => (
                    <FamiliaRow key={f.key} fam={f}
                                onClick={() => setOpenFam({ label: f.key, productos: f.productos })} />
                  ))}
                </div>
              </section>
            </R>
          ))}
        </div>
      )}

      {openFam && <FamiliaModal label={openFam.label} productos={openFam.productos} onClose={() => setOpenFam(null)} />}
    </div>
  );
}

// ─── Lista (tabla por categoría) ─────────────────────────────────────────────────
function ListaTab({ categorias, imageMap }: { categorias: CategoriaData[]; imageMap?: ImageMap }) {
  const COLS = "44px 2.2fr 1fr 1fr 72px";
  const totalEquipos  = categorias.reduce((s, c) => s + c.equipos.length, 0);
  const totalUnidades = categorias.reduce((s, c) => s + c.equipos.reduce((a, e) => a + e.cantidadTotal, 0), 0);

  return (
    <div className="max-w-6xl mx-auto py-16 px-4 sm:px-6">
      <R>
        <div className="mb-10">
          <p className="text-white/20 text-xs tracking-[0.3em] uppercase mb-3 font-mono">Mainstage Pro · Catálogo técnico</p>
          <h2 className="font-bold text-white" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", letterSpacing: "-0.03em" }}>Inventario por categoría</h2>
          <p className="text-white/35 text-sm mt-3">Vista de lista de todo el equipo disponible, organizado por categoría.</p>
          <div className="flex items-center gap-2 mt-5">
            <span className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}25` }}>
              {totalEquipos} equipos
            </span>
            <span className="text-xs px-3 py-1.5 rounded-full text-white/40" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {totalUnidades} unidades
            </span>
          </div>
        </div>
      </R>

      <div className="space-y-10">
        {categorias.map((cat, ci) => (
          <R key={cat.nombre} delay={Math.min(ci * 30, 300)}>
            <section>
              <div className="flex items-center justify-between gap-4 mb-4 pb-3" style={{ borderBottom: `1px solid ${GOLD}18` }}>
                <h3 className="font-bold text-white" style={{ fontSize: "clamp(1.15rem,3vw,1.7rem)", letterSpacing: "-0.02em" }}>{cat.nombre}</h3>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}20` }}>
                    {cat.equipos.length} {cat.equipos.length === 1 ? "equipo" : "equipos"}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full text-white/40" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {cat.equipos.reduce((a, e) => a + e.cantidadTotal, 0)} unid.
                  </span>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                {/* Encabezados (desktop) */}
                <div className="hidden md:grid px-5 py-3 text-[10px] font-semibold text-white/25 tracking-widest uppercase"
                     style={{ gridTemplateColumns: COLS, gap: "16px" }}>
                  <span />
                  <span>Equipo</span>
                  <span>Marca</span>
                  <span>Modelo</span>
                  <span className="text-center">Unid.</span>
                </div>

                {cat.equipos.map((eq, i) => {
                  const img = getEqImg(eq, imageMap);
                  const thumb = (
                    <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
                         style={{ background: "#080808", border: "1px solid rgba(255,255,255,0.06)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img || "/logo-icon.png"} alt="" draggable={false} loading="lazy"
                           className={`object-contain ${img ? "w-8 h-8" : "w-4 h-4 opacity-15"}`} />
                    </div>
                  );
                  const unidBadge = (
                    <span className="inline-flex items-center justify-center text-xs font-bold rounded-full px-2.5 py-1"
                          style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}40` }}>
                      {eq.cantidadTotal}
                    </span>
                  );
                  return (
                    <div key={eq.id}>
                      {/* Desktop */}
                      <div className="hidden md:grid px-5 py-3 items-center transition-colors hover:bg-white/[0.025]"
                           style={{ gridTemplateColumns: COLS, gap: "16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        {thumb}
                        <span className="text-white text-sm font-medium leading-snug line-clamp-2">{eq.descripcion}</span>
                        <span className="text-white/50 text-sm truncate">{eq.marca || "—"}</span>
                        <span className="text-white/50 text-sm truncate">{eq.modelo || "—"}</span>
                        <span className="text-center">{unidBadge}</span>
                      </div>
                      {/* Mobile */}
                      <div className="md:hidden flex items-center gap-3 px-4 py-3"
                           style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        {thumb}
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-sm font-medium leading-snug line-clamp-2">{eq.descripcion}</p>
                          {(eq.marca || eq.modelo) && (
                            <p className="text-white/40 text-xs truncate mt-0.5">{[eq.marca, eq.modelo].filter(Boolean).join(" · ")}</p>
                          )}
                        </div>
                        {unidBadge}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </R>
        ))}
      </div>
    </div>
  );
}

// ─── Lista de precios ──────────────────────────────────────────────────────────────
function PreciosTab({ categorias, onAddItem, onSwitchToCotizador, imageMap }: {
  categorias: CategoriaData[];
  onAddItem: (eq: EquipoData) => void;
  onSwitchToCotizador: () => void;
  imageMap?: ImageMap;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set(categorias.map(c => c.nombre)));
  const toggle = (n: string) => setOpen(prev => { const s = new Set(prev); s.has(n) ? s.delete(n) : s.add(n); return s; });

  return (
    <div className="max-w-5xl mx-auto py-16 px-4 sm:px-6">
      <R>
        <div className="mb-10">
          <p className="text-white/20 text-xs tracking-[0.3em] uppercase mb-3 font-mono">Mainstage Pro · Catálogo técnico</p>
          <h2 className="font-bold text-white" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", letterSpacing: "-0.03em" }}>Lista de precios</h2>
          <p className="text-white/35 text-sm mt-3">{"Precios de renta por día de evento."} La operación técnica (técnicos, traslado e instalación) se cotiza por separado.</p>
        </div>
      </R>

      <div className="space-y-3">
        {categorias.map((cat, ci) => (
          <R key={cat.nombre} delay={ci * 35}>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
              <button className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors"
                      style={{ borderBottom: open.has(cat.nombre) ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                      onClick={() => toggle(cat.nombre)}>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-white">{cat.nombre}</span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}20` }}>
                    {cat.equipos.length} equipos
                  </span>
                </div>
                <svg style={{ transform: open.has(cat.nombre) ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease", flexShrink: 0 }}
                     width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {open.has(cat.nombre) && (
                <div>
                  {/* Column headers */}
                  <div className="hidden sm:grid px-5 py-2 text-[10px] font-semibold text-white/20 tracking-widest uppercase"
                       style={{ gridTemplateColumns: "36px 1fr 60px 100px 90px", gap: "12px" }}>
                    <span />
                    <span>Equipo</span>
                    <span className="text-center">Unid.</span>
                    <span className="text-right">{"Precio/día"}</span>
                    <span />
                  </div>
                  {cat.equipos.map((eq, i) => {
                    const img = getEqImg(eq, imageMap);
                    return (
                      <div key={eq.id} className="grid px-5 py-3 items-center group transition-colors hover:bg-white/[0.025]"
                           style={{ gridTemplateColumns: "36px 1fr auto", gap: "12px", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
                        {/* thumb */}
                        <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
                             style={{ background: "#080808", border: "1px solid rgba(255,255,255,0.06)" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img || "/logo-icon.png"} alt="" draggable={false} loading="lazy"
                               className={`object-contain ${img ? "w-8 h-8" : "w-4 h-4 opacity-15"}`} />
                        </div>
                        {/* name */}
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium leading-snug">{eqDisplayName(eq)}</p>
                          {(eq.marca || eq.modelo) && <p className="text-white/30 text-xs mt-0.5 truncate">{eq.descripcion}</p>}
                        </div>
                        {/* price + action */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="hidden sm:flex items-center gap-1">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                              {eq.cantidadTotal}
                            </span>
                          </div>
                          <span className={`text-sm font-semibold tabular-nums ${eq.precioRenta > 0 ? "" : "text-white/25 text-xs"}`}
                                style={{ color: eq.precioRenta > 0 ? GOLD : undefined }}>
                            {eq.precioRenta > 0 ? fmtPrice(eq.precioRenta) : "Consultar"}
                          </span>
                          <button onClick={() => { onAddItem(eq); onSwitchToCotizador(); }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap"
                                  style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}30` }}>
                            + Cotizar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </R>
        ))}
      </div>

      <R>
        <p className="mt-10 text-center text-white/20 text-xs">
          {"* Precios de referencia por día de evento. Sujetos a disponibilidad y confirmación."}
        </p>
      </R>
    </div>
  );
}

// ─── Cotizador ────────────────────────────────────────────────────────────────────
function CotizadorTab({ categorias, quoteItems, onAddItem, onUpdateQty, onRemoveItem, onAddCustom, imageMap }: {
  categorias: CategoriaData[];
  quoteItems: QuoteItem[];
  onAddItem: (eq: EquipoData) => void;
  onUpdateQty: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onAddCustom: (desc: string) => void;
  imageMap?: ImageMap;
}) {
  const [search, setSearch]         = useState("");
  const [activeCat, setActiveCat]   = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const [dias, setDias]             = useState(1);
  const [nombre,     setNombre]     = useState("");
  const [telefono,   setTelefono]   = useState("");
  const [evento,     setEvento]     = useState("");
  const [fecha,      setFecha]      = useState("");
  const [tipoEvento, setTipoEvento] = useState("");
  const [lugar,      setLugar]      = useState("");
  const [invitados,  setInvitados]  = useState("");
  const [ambiente,   setAmbiente]   = useState("");
  const [horario,    setHorario]    = useState("");
  const [notas,      setNotas]      = useState("");
  const [sending,    setSending]    = useState(false);
  const [sent,       setSent]       = useState(false);

  const allEquipos = useMemo(() => categorias.flatMap(c => c.equipos), [categorias]);

  const filtered = useMemo(() => {
    const pool = activeCat ? (categorias.find(c => c.nombre === activeCat)?.equipos ?? []) : allEquipos;
    const q = search.toLowerCase();
    if (!q) return pool;
    return pool.filter(eq =>
      eq.descripcion.toLowerCase().includes(q) ||
      (eq.marca || "").toLowerCase().includes(q) ||
      (eq.modelo || "").toLowerCase().includes(q)
    );
  }, [search, activeCat, allEquipos, categorias]);

  const qtyInCart = useCallback((id: string) => quoteItems.find(i => i.id === id)?.cantidad ?? 0, [quoteItems]);
  const subtotal  = useMemo(() => quoteItems.reduce((s, i) => s + (i.esPersonalizado ? 0 : i.precioUnitario * i.cantidad), 0), [quoteItems]);

  function buildWAMsg() {
    const catalog = quoteItems.filter(i => !i.esPersonalizado);
    const custom  = quoteItems.filter(i =>  i.esPersonalizado);
    let msg = "Hola! Me interesa una cotización de equipo para mi evento.\n\n";
    const infoLines: string[] = [];
    if (nombre)     infoLines.push(`• Contacto: ${nombre}`);
    if (telefono)   infoLines.push(`• Teléfono: ${telefono}`);
    if (evento)     infoLines.push(`• Nombre del evento: ${evento}`);
    if (fecha)      infoLines.push(`• Fecha: ${fecha}`);
    if (tipoEvento) infoLines.push(`• Tipo de evento: ${tipoEvento}`);
    if (lugar)      infoLines.push(`• Lugar / Venue: ${lugar}`);
    if (invitados)  infoLines.push(`• Invitados aprox.: ${invitados}`);
    if (ambiente)   infoLines.push(`• Ambiente: ${ambiente}`);
    if (horario)    infoLines.push(`• Horario: ${horario}`);
    if (notas)      infoLines.push(`• Notas: ${notas}`);
    if (infoLines.length) msg += `*Información del evento:*\n${infoLines.join("\n")}\n\n`;
    if (catalog.length) {
      msg += "🎛 *Equipos del catálogo Mainstage Pro:*\n";
      catalog.forEach(i => {
        const name = [i.marca, i.modelo].filter(Boolean).join(" ") || i.descripcion;
        msg += `• ${name} × ${i.cantidad}`;
        if (i.precioUnitario > 0) msg += ` → ${fmtPrice(i.precioUnitario * i.cantidad)}/día`;
        msg += "\n";
      });
    }
    if (custom.length) {
      msg += "\n📝 *Equipos adicionales a conseguir:*\n";
      custom.forEach(i => { msg += `• ${i.descripcion}\n`; });
    }
    msg += "\n──────────────────────────\n";
    if (subtotal > 0) {
      msg += `Subtotal de equipos: ${fmtPrice(subtotal)}/día`;
      if (dias > 1) msg += ` × ${dias} días = *${fmtPrice(subtotal * dias)}*`;
      msg += "\n";
    }
    msg += "_(Operación técnica, traslado e instalación se cotiza por separado)_";
    return msg;
  }

  function buildEquiposDescripcion() {
    const lines: string[] = [];
    const catalog = quoteItems.filter(i => !i.esPersonalizado);
    const custom  = quoteItems.filter(i =>  i.esPersonalizado);
    if (dias > 1) lines.push(`Duración: ${dias} días`);
    if (catalog.length) {
      lines.push("Equipos del catálogo:");
      catalog.forEach(i => {
        const name = [i.marca, i.modelo].filter(Boolean).join(" ") || i.descripcion;
        lines.push(`• ${name} × ${i.cantidad}`);
      });
    }
    if (custom.length) {
      lines.push("Equipos adicionales a conseguir:");
      custom.forEach(i => lines.push(`• ${i.descripcion}`));
    }
    if (subtotal > 0) {
      lines.push(`Subtotal equipos: ${fmtPrice(subtotal)}/día` + (dias > 1 ? ` (${fmtPrice(subtotal * dias)} × ${dias} días)` : ""));
    }
    const extra: string[] = [];
    if (evento)   extra.push(`Evento: ${evento}`);
    if (ambiente) extra.push(`Ambiente: ${ambiente}`);
    if (horario)  extra.push(`Horario: ${horario}`);
    if (notas)    extra.push(`Notas: ${notas}`);
    if (extra.length) lines.push("", ...extra);
    return lines.join("\n");
  }

  async function handleSend() {
    if (sending) return;
    setSending(true);
    // Grabar la solicitud (best-effort: no bloquea el WhatsApp si falla)
    if (nombre.trim()) {
      try {
        await fetch("/api/cotizacion/solicitar-publico", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clienteNombre: nombre,
            contactoTelefono: telefono,
            fechaEvento: fecha,
            lugarEvento: lugar,
            tipoEvento,
            asistentes: invitados,
            equiposDescripcion: buildEquiposDescripcion(),
            notaEspecial: notas,
          }),
        });
      } catch { /* ignore */ }
    }
    window.open(`https://wa.me/524461432565?text=${encodeURIComponent(buildWAMsg())}`, "_blank");
    setSent(true);
    setSending(false);
  }

  const inp: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: "10px", color: "white", padding: "10px 14px", fontSize: "13px",
    width: "100%", outline: "none", transition: "border-color 0.2s",
  };
  const inpSm: React.CSSProperties = { ...inp, fontSize: "12px", padding: "8px 12px" };
  const focusGold = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = `${GOLD}60`);
  const blurGold  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = "rgba(255,255,255,0.09)");

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── Left: equipment browser ── */}
        <div className="flex-1 min-w-0">
          <div className="mb-5">
            <h2 className="font-bold text-white text-xl mb-1" style={{ letterSpacing: "-0.02em" }}>Arma tu presupuesto</h2>
            <p className="text-white/35 text-sm">Selecciona los equipos que necesitas.</p>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                   placeholder="Buscar por nombre, marca o modelo…"
                   style={{ ...inpSm, paddingLeft: "34px" }}
                   onFocus={focusGold} onBlur={blurGold} />
          </div>

          {/* Category pills */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            <button onClick={() => setActiveCat(null)}
                    className="text-xs px-3 py-1 rounded-full font-medium transition-all"
                    style={{ background: !activeCat ? GOLD : "rgba(255,255,255,0.04)", color: !activeCat ? "#000" : "rgba(255,255,255,0.4)", border: `1px solid ${!activeCat ? GOLD : "rgba(255,255,255,0.07)"}` }}>
              Todos
            </button>
            {categorias.map(c => (
              <button key={c.nombre} onClick={() => setActiveCat(c.nombre === activeCat ? null : c.nombre)}
                      className="text-xs px-3 py-1 rounded-full font-medium transition-all"
                      style={{ background: activeCat === c.nombre ? GOLD : "rgba(255,255,255,0.04)", color: activeCat === c.nombre ? "#000" : "rgba(255,255,255,0.4)", border: `1px solid ${activeCat === c.nombre ? GOLD : "rgba(255,255,255,0.07)"}` }}>
                {c.nombre}
              </button>
            ))}
          </div>

          {/* ── Compact list ── */}
          <div className="rounded-xl overflow-hidden mb-5" style={{ border: "1px solid rgba(255,255,255,0.07)", maxHeight: "440px", overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-white/25 text-sm">No encontramos equipos con ese criterio.</div>
            ) : filtered.map((eq, idx) => {
              const qty = qtyInCart(eq.id);
              const img = getEqImg(eq, imageMap);
              const inCart = qty > 0;
              return (
                <div key={eq.id}
                     className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                     style={{
                       borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined,
                       background: inCart ? `${GOLD}07` : "transparent",
                     }}>
                  {/* thumbnail */}
                  <div className="shrink-0 w-8 h-8 rounded-md overflow-hidden flex items-center justify-center" style={{ background: "#050505" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img || "/logo-icon.png"} alt="" draggable={false} loading="lazy"
                         className={`object-contain ${img ? "max-h-7 max-w-full" : "w-4 h-4 opacity-10"}`} />
                  </div>
                  {/* name + price */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium leading-snug truncate">{eqDisplayName(eq)}</p>
                    {eq.precioRenta > 0 && (
                      <p className="text-[10px]" style={{ color: `${GOLD}90` }}>{fmtPrice(eq.precioRenta)}/día</p>
                    )}
                  </div>
                  {/* controls */}
                  {qty === 0 ? (
                    <button onClick={() => onAddItem(eq)}
                            className="shrink-0 text-xs px-3 py-1 rounded-full font-semibold transition-all"
                            style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}25` }}>
                      + Agregar
                    </button>
                  ) : (
                    <div className="shrink-0 flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${GOLD}45`, background: `${GOLD}12` }}>
                      <button onClick={() => onUpdateQty(eq.id, -1)}
                              className="w-7 h-7 flex items-center justify-center text-sm font-bold hover:bg-white/10 transition-colors"
                              style={{ color: GOLD }}>−</button>
                      <span className="text-white font-bold text-xs px-1.5">{qty}</span>
                      <button onClick={() => onUpdateQty(eq.id, 1)}
                              className="w-7 h-7 flex items-center justify-center text-sm font-bold hover:bg-white/10 transition-colors"
                              style={{ color: GOLD }}>+</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Custom item */}
          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-white font-semibold text-xs mb-0.5">¿No encuentras lo que necesitas?</p>
            <p className="text-white/30 text-xs mb-3">Agrégalo por concepto y nuestro equipo lo consigue o te da alternativas.</p>
            <div className="flex gap-2">
              <input type="text" value={customText} onChange={e => setCustomText(e.target.value)}
                     onKeyDown={e => { if (e.key === "Enter" && customText.trim()) { onAddCustom(customText.trim()); setCustomText(""); } }}
                     placeholder="Ej: Generador 50kva, pantalla LED curva…"
                     style={inpSm} onFocus={focusGold} onBlur={blurGold} />
              <button onClick={() => { if (customText.trim()) { onAddCustom(customText.trim()); setCustomText(""); } }}
                      className="shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                      style={{ background: `${GOLD}20`, color: GOLD, border: `1px solid ${GOLD}35` }}>
                Agregar
              </button>
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="w-full lg:w-80 xl:w-[360px] shrink-0">
          <div className="sticky top-24 space-y-4">

            {/* Quote summary */}
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${GOLD}25`, background: "#060606" }}>
              <div className="px-5 py-4" style={{ borderBottom: `1px solid ${GOLD}15` }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white text-sm">Tu presupuesto</h3>
                  {quoteItems.length > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: `${GOLD}15`, color: GOLD }}>
                      {quoteItems.length} {quoteItems.length === 1 ? "ítem" : "ítems"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-xs flex-1">{`Días del evento:`}</span>
                  <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                    <button onClick={() => setDias(d => Math.max(1, d - 1))} className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors">−</button>
                    <span className="text-white text-sm font-semibold px-2">{dias}</span>
                    <button onClick={() => setDias(d => d + 1)} className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors">+</button>
                  </div>
                </div>
              </div>

              <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                {quoteItems.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-white/20 text-xs leading-relaxed">Tu presupuesto está vacío.<br />Agrega equipos de la lista.</p>
                  </div>
                ) : quoteItems.map((item, idx) => (
                  <div key={item.id} className="px-4 py-2.5 flex items-start gap-2.5"
                       style={{ borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium leading-snug line-clamp-1">{item.descripcion}</p>
                      {!item.esPersonalizado && item.precioUnitario > 0 && (
                        <p className="text-white/30 text-[10px] mt-0.5">
                          {fmtPrice(item.precioUnitario)} × {item.cantidad} × {dias} {"día"}{dias > 1 ? "s" : ""} = <span style={{ color: GOLD }}>{fmtPrice(item.precioUnitario * item.cantidad * dias)}</span>
                        </p>
                      )}
                      {item.esPersonalizado && <p className="text-white/25 text-[10px] mt-0.5 italic">precio a confirmar</p>}
                    </div>
                    {!item.esPersonalizado && (
                      <div className="flex items-center rounded-lg overflow-hidden shrink-0" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                        <button onClick={() => onUpdateQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors text-sm">−</button>
                        <span className="text-white text-xs font-semibold px-1">{item.cantidad}</span>
                        <button onClick={() => onUpdateQty(item.id, 1)} className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors text-sm">+</button>
                      </div>
                    )}
                    <button onClick={() => onRemoveItem(item.id)}
                            className="shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-red-900/30"
                            style={{ color: "rgba(255,255,255,0.2)" }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {quoteItems.length > 0 && subtotal > 0 && (
                <>
                  <div className="px-5 py-4 flex items-baseline justify-between" style={{ borderTop: `1px solid ${GOLD}15` }}>
                    <span className="text-white/40 text-xs">{dias > 1 ? `Total (${dias} días)` : "Subtotal / día"}</span>
                    <span className="text-white font-bold text-xl" style={{ letterSpacing: "-0.02em" }}>{fmtPrice(subtotal * dias)}</span>
                  </div>
                  <div className="px-5 pb-4">
                    <p className="text-[11px] leading-relaxed rounded-lg px-3 py-2.5" style={{ background: `${GOLD}0D`, border: `1px solid ${GOLD}20`, color: `${GOLD}` }}>
                      {"Se pueden generar descuentos por volumen de renta de equipos. Contacta a tu vendedor para una cotización a la medida."}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* ── Discovery form ── */}
            <div className="rounded-2xl p-5 space-y-2.5" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#060606" }}>
              <div className="mb-1">
                <p className="text-white font-semibold text-sm">{"Información del evento"}</p>
                <p className="text-white/30 text-xs mt-0.5">{"Completa para que nuestro equipo prepare una cotización exacta."}</p>
              </div>

              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                     placeholder="Tu nombre" style={inpSm} onFocus={focusGold} onBlur={blurGold} />
              <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
                     placeholder="Tu teléfono / WhatsApp" style={inpSm} onFocus={focusGold} onBlur={blurGold} />
              <input type="text" value={evento} onChange={e => setEvento(e.target.value)}
                     placeholder="Nombre del evento" style={inpSm} onFocus={focusGold} onBlur={blurGold} />
              <input type="text" value={fecha} onChange={e => setFecha(e.target.value)}
                     placeholder="Fecha (dd/mm/aaaa)" style={inpSm} onFocus={focusGold} onBlur={blurGold} />

              <select value={tipoEvento} onChange={e => setTipoEvento(e.target.value)}
                      style={{ ...inpSm, appearance: "none" } as React.CSSProperties}
                      onFocus={focusGold} onBlur={blurGold}>
                <option value="">{"Tipo de evento…"}</option>
                <option>Boda</option>
                <option>{"Corporativo / Empresa"}</option>
                <option>{"Concierto / Show"}</option>
                <option>Festival</option>
                <option>{"Cumpleaños / Fiesta privada"}</option>
                <option>{"Congreso / Convención"}</option>
                <option>{"Lanzamiento de producto"}</option>
                <option>{"Graduación"}</option>
                <option>Otro</option>
              </select>

              <input type="text" value={lugar} onChange={e => setLugar(e.target.value)}
                     placeholder="Lugar / Venue" style={inpSm} onFocus={focusGold} onBlur={blurGold} />

              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={invitados} onChange={e => setInvitados(e.target.value)}
                       placeholder="# Invitados" style={inpSm} onFocus={focusGold} onBlur={blurGold} />
                <select value={ambiente} onChange={e => setAmbiente(e.target.value)}
                        style={{ ...inpSm, appearance: "none" } as React.CSSProperties}
                        onFocus={focusGold} onBlur={blurGold}>
                  <option value="">{"Ambiente…"}</option>
                  <option>Interior</option>
                  <option>Exterior</option>
                  <option>Mixto</option>
                </select>
              </div>

              <input type="text" value={horario} onChange={e => setHorario(e.target.value)}
                     placeholder="Horario aprox. (setup 2pm, evento 6pm–1am)" style={inpSm} onFocus={focusGold} onBlur={blurGold} />

              <textarea value={notas} onChange={e => setNotas(e.target.value)}
                        placeholder="Notas (techo, generador, accesos, nivel de sonido…)"
                        rows={3}
                        style={{ ...inpSm, resize: "vertical" } as React.CSSProperties}
                        onFocus={focusGold} onBlur={blurGold} />

              <button onClick={handleSend} disabled={sending}
                      className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
                      style={{ background: GOLD, color: "#000", boxShadow: `0 4px 20px ${GOLD}30` }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {sending ? "Enviando…" : sent ? "Abrir WhatsApp de nuevo" : "Solicitar cotización completa"}
              </button>
              {sent && (
                <p className="text-center text-[11px] leading-relaxed" style={{ color: `${GOLD}` }}>
                  {"✓ Recibimos tu solicitud. Nuestro equipo te contactará para afinar la cotización."}
                </p>
              )}
              <p className="text-white/20 text-[10px] leading-relaxed text-center">
                {"* La operación técnica (técnicos, traslado e instalación) se cotiza por separado."}
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Main ─────────────────────────────────────────────────────────────────────────
export default function InventarioClient({ data }: Props) {
  const [activeTab, setActiveTab]         = useState<Tab>("catalogo");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [lightbox, setLightbox]           = useState<{ images: string[]; index: number; alt: string } | null>(null);
  const [quoteItems, setQuoteItems]       = useState<QuoteItem[]>([]);
  // DB images loaded asynchronously — not in initial HTML payload
  const [imageMap, setImageMap]           = useState<ImageMap>({});
  const [galeriaMap, setGaleriaMap]       = useState<GaleriaMap>({});
  // Productos (sistemas armados) — cargados en cliente vía endpoint público
  const [productos, setProductos]         = useState<ProductoData[]>([]);
  const [productosLoading, setProductosLoading] = useState(true);

  // Fetch DB images after hydration (runs once on client)
  useEffect(() => {
    fetch("/api/presentacion/imagenes")
      .then(r => r.ok ? r.json() : { cover: {}, galeria: {} })
      .then((res: { cover?: ImageMap; galeria?: GaleriaMap }) => {
        setImageMap(res.cover ?? {});
        setGaleriaMap(res.galeria ?? {});
      })
      .catch(() => { /* silently ignore — static fallback images still work */ });
  }, []);

  // Fetch productos after hydration (runs once on client)
  useEffect(() => {
    fetch("/api/productos/publico")
      .then(r => r.ok ? r.json() : { productos: [] })
      .then((res: { productos?: ProductoData[] }) => setProductos(res.productos ?? []))
      .catch(() => { /* silently ignore */ })
      .finally(() => setProductosLoading(false));
  }, []);

  // Lightbox helpers (gallery-capable)
  const openLightbox  = useCallback((images: string[], alt: string, index = 0) => {
    if (!images.length) return;
    setLightbox({ images, index, alt });
  }, []);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const stepLightbox  = useCallback((delta: number) => {
    setLightbox(lb => lb ? { ...lb, index: (lb.index + delta + lb.images.length) % lb.images.length } : lb);
  }, []);
  useEffect(() => {
    if (!lightbox) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowRight") stepLightbox(1);
      else if (e.key === "ArrowLeft") stepLightbox(-1);
    };
    window.addEventListener("keydown", fn); return () => window.removeEventListener("keydown", fn);
  }, [lightbox, closeLightbox, stepLightbox]);


  // Quote helpers
  const addItem = useCallback((eq: EquipoData) => {
    setQuoteItems(prev => {
      const exists = prev.find(i => i.id === eq.id);
      if (exists) return prev.map(i => i.id === eq.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { id: eq.id, descripcion: eq.descripcion, marca: eq.marca, modelo: eq.modelo, cantidad: 1, precioUnitario: eq.precioRenta, esPersonalizado: false }];
    });
  }, []);
  const updateQty = useCallback((id: string, delta: number) => {
    setQuoteItems(prev => prev.flatMap(i => {
      if (i.id !== id) return [i];
      const q = i.cantidad + delta;
      return q <= 0 ? [] : [{ ...i, cantidad: q }];
    }));
  }, []);
  const removeItem = useCallback((id: string) => setQuoteItems(prev => prev.filter(i => i.id !== id)), []);
  const addCustom  = useCallback((desc: string) => {
    setQuoteItems(prev => [...prev, { id: `custom-${Date.now()}`, descripcion: desc, cantidad: 1, precioUnitario: 0, esPersonalizado: true }]);
  }, []);

  // Filter excluded
  const filteredCategorias = useMemo(() =>
    data.categorias.map(cat => ({ ...cat, equipos: cat.equipos.filter(eq => !shouldExclude(eq)) }))
                   .filter(cat => cat.equipos.length > 0),
    [data.categorias]
  );

  // Scroll spy (catálogo only)
  useEffect(() => {
    if (activeTab !== "catalogo") return;
    const fn = () => {
      for (const cat of filteredCategorias) {
        const el = document.getElementById(`cat-${cat.orden}`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= 100 && r.bottom > 100) { setActiveCategory(cat.nombre); break; }
      }
    };
    window.addEventListener("scroll", fn, { passive: true }); fn();
    return () => window.removeEventListener("scroll", fn);
  }, [filteredCategorias, activeTab]);

  const scrollToCategory = (orden: number) => {
    document.getElementById(`cat-${orden}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const brands = ["Pioneer DJ","RCF","Allen & Heath","Shure","Sennheiser","Grand MA","Chauvet","Astera","Lite Tek","Lumos","Electro-Voice","Rode","Blackmagic","Midas","Sun Star"];

  return (
    <div className="bg-[#050505] text-white min-h-screen" style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      <style>{`
        @keyframes fadeUp   { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes marquee  { from { transform:translateX(0); } to { transform:translateX(-50%); } }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar       { width:3px; height:3px; }
        ::-webkit-scrollbar-track { background:#000; }
        ::-webkit-scrollbar-thumb { background:rgba(179,152,91,0.35); border-radius:2px; }
      `}</style>

      {/* ── Lightbox (galería) ── */}
      {lightbox && (
        <div onClick={closeLightbox} style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.92)", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(12px)", animation:"fadeIn 0.2s ease" }}>
          <button onClick={closeLightbox}
                  style={{ position:"absolute", top:"1.5rem", right:"1.5rem", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"50%", width:"44px", height:"44px", color:"white", fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
          {lightbox.images.length > 1 && (
            <button onClick={e => { e.stopPropagation(); stepLightbox(-1); }} aria-label="Anterior"
                    style={{ position:"absolute", left:"1.5rem", top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"50%", width:"48px", height:"48px", color:"white", fontSize:"22px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox.images[lightbox.index]} alt={lightbox.alt} onClick={e => e.stopPropagation()} draggable={false}
               style={{ maxWidth:"90vw", maxHeight:"85vh", objectFit:"contain", borderRadius:"12px", boxShadow:"0 32px 80px rgba(0,0,0,0.8)" }} />
          {lightbox.images.length > 1 && (
            <button onClick={e => { e.stopPropagation(); stepLightbox(1); }} aria-label="Siguiente"
                    style={{ position:"absolute", right:"1.5rem", top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"50%", width:"48px", height:"48px", color:"white", fontSize:"22px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
          )}
          <div style={{ position:"absolute", bottom:"2rem", left:"50%", transform:"translateX(-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:"6px" }}>
            <p style={{ color:"rgba(255,255,255,0.5)", fontSize:"13px", whiteSpace:"nowrap" }}>{lightbox.alt}</p>
            {lightbox.images.length > 1 && (
              <span style={{ color:"rgba(255,255,255,0.35)", fontSize:"11px", letterSpacing:"0.08em" }}>{lightbox.index + 1} / {lightbox.images.length}</span>
            )}
          </div>
        </div>
      )}

      {/* ── Nav unificada ── */}
      <PresentacionNav />

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden text-center" style={{ minHeight: "100svh" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(179,152,91,0.06) 0%, transparent 70%), linear-gradient(to bottom, #050505 0%, #080808 50%, #050505 100%)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(179,152,91,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(179,152,91,0.03) 1px, transparent 1px)`, backgroundSize: "80px 80px", animation: "fadeIn 2s ease forwards 0.5s", opacity: 0 }} />
        <div className="relative z-10 px-6 max-w-5xl mx-auto">
          <div className="mb-10" style={{ animation: "fadeUp 0.7s ease forwards 0.1s", opacity: 0 }}>
            <span className="text-xs tracking-[0.3em] uppercase px-4 py-2 rounded-full" style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}25` }}>
              Mainstage Pro · Catálogo Técnico
            </span>
          </div>
          <h1 className="font-bold leading-[0.95]" style={{ fontSize: "clamp(3.5rem,12vw,10rem)", letterSpacing: "-0.04em", animation: "fadeUp 0.9s ease forwards 0.3s", opacity: 0 }}>El equipo.</h1>
          <h1 className="font-bold leading-[0.95]" style={{ fontSize: "clamp(3.5rem,12vw,10rem)", letterSpacing: "-0.04em", color: GOLD, animation: "fadeUp 0.9s ease forwards 0.5s", opacity: 0 }}>Disponible.</h1>
          <p className="text-white/40 mt-10 max-w-xl mx-auto leading-relaxed" style={{ fontSize: "clamp(1rem,1.8vw,1.2rem)", animation: "fadeUp 0.9s ease forwards 0.75s", opacity: 0 }}>
            Audio, iluminación y video de nivel profesional. Todo listo para operar en tu evento.
          </p>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3" style={{ animation: "fadeUp 1s ease forwards 1.1s", opacity: 0 }}>
          <span className="text-xs tracking-[0.2em] uppercase text-white/30">Explorar</span>
          <div className="w-px h-12 bg-gradient-to-b from-[#B3985B40] to-transparent" />
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-4 px-6 border-y" style={{ borderColor: `${GOLD}12` }}>
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#1a1a0a]">
          <StatBlock target={data.totalEquipos}      label="Referencias de equipo" sub="modelos distintos en inventario"  />
          <StatBlock target={data.totalUnidades}      label="Unidades totales"       sub="piezas listas para tu evento"     />
          <StatBlock target={filteredCategorias.length} label="Categorías"            sub="familias de equipo audiovisual"  />
        </div>
      </section>

      {/* ── Tab selector central ── */}
      <TabSelector active={activeTab} onChange={t => { setActiveTab(t); setTimeout(() => document.getElementById('tab-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }} quoteCount={quoteItems.length} />

      {/* ── Sticky compact tab nav (aparece al scrollear) ── */}
      <div className="sticky top-16 z-40 py-3 px-6 transition-all duration-300"
           style={{ background: "rgba(5,5,5,0.97)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${GOLD}10` }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <TabNav active={activeTab} onChange={setActiveTab} quoteCount={quoteItems.length} />
          {activeTab === "catalogo" && (
            <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto">
              {filteredCategorias.map(cat => (
                <button key={cat.nombre} onClick={() => scrollToCategory(cat.orden)}
                        className="text-xs px-3 py-1.5 rounded-full transition-all whitespace-nowrap"
                        style={{ background: activeCategory === cat.nombre ? GOLD : "rgba(255,255,255,0.04)", color: activeCategory === cat.nombre ? "#000" : "rgba(255,255,255,0.4)", border: `1px solid ${activeCategory === cat.nombre ? GOLD : "rgba(255,255,255,0.06)"}`, fontWeight: activeCategory === cat.nombre ? "700" : "400" }}>
                  {cat.nombre}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Anchor para scroll al contenido */}
      <div id="tab-content" />

      {/* ── Tab content ── */}
      {activeTab === "catalogo" && (
        <>
          {filteredCategorias.map((cat, ci) => (
            <section key={cat.nombre} id={`cat-${cat.orden}`} className="py-20 px-6"
                     style={{ background: ci % 2 === 0 ? "#050505" : "#070707" }}>
              <div className="max-w-7xl mx-auto">
                <R y={24}>
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-14 pb-6" style={{ borderBottom: `1px solid ${GOLD}15` }}>
                    <div>
                      <p className="text-white/20 text-xs tracking-[0.3em] uppercase mb-3 font-mono">
                        {String(ci + 1).padStart(2, "0")} / {String(filteredCategorias.length).padStart(2, "0")}
                      </p>
                      <h2 className="font-bold text-white leading-none" style={{ fontSize: "clamp(1.8rem,5vw,3.6rem)", letterSpacing: "-0.03em" }}>{cat.nombre}</h2>
                      {CAT_DESC[cat.nombre] && <p className="text-white/35 text-sm leading-relaxed mt-3 max-w-xl">{CAT_DESC[cat.nombre]}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}25` }}>
                        {cat.equipos.length} {cat.equipos.length === 1 ? "equipo" : "equipos"}
                      </span>
                      <span className="text-xs px-3 py-1.5 rounded-full text-white/40" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        {cat.equipos.reduce((s, e) => s + e.cantidadTotal, 0)} unidades
                      </span>
                    </div>
                  </div>
                </R>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {cat.equipos.map((eq, i) => (
                    <EquipoCard key={eq.id} eq={eq} delay={Math.min(i * 50, 400)} onImageClick={openLightbox} imageMap={imageMap} galeriaMap={galeriaMap} />
                  ))}
                </div>
              </div>
            </section>
          ))}

          {/* Brands marquee */}
          <section className="py-20 overflow-hidden" style={{ background: "#030303", borderTop: `1px solid ${GOLD}10`, borderBottom: `1px solid ${GOLD}10` }}>
            <R><p className="text-center text-white/25 text-xs tracking-[0.28em] uppercase mb-10">Marcas con las que trabajamos</p></R>
            <div className="relative">
              <div className="flex whitespace-nowrap" style={{ animation: "marquee 25s linear infinite" }}>
                {[...brands, ...brands].map((b, i) => (
                  <span key={i} className="inline-flex items-center gap-6 mx-4 text-white/20 text-sm font-medium tracking-widest uppercase">
                    {b}<span style={{ color: `${GOLD}40`, fontSize: "6px" }}>●</span>
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Solicitud especial */}
          <section className="py-24 px-6" style={{ background: "#070707", borderTop: `1px solid ${GOLD}10` }}>
            <div className="max-w-3xl mx-auto">
              <R>
                <div className="rounded-2xl p-10 sm:p-14 text-center" style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}20` }}>
                  <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-5">Solicitud especial</p>
                  <h2 className="font-bold text-white leading-tight mb-5" style={{ fontSize: "clamp(1.6rem,4vw,2.6rem)", letterSpacing: "-0.025em" }}>¿No ves lo que necesitas?</h2>
                  <p className="text-white/40 mb-8 leading-relaxed max-w-lg mx-auto text-sm">
                    Si tienes un requerimiento técnico específico que no aparece en este catálogo, contáctanos. Evaluamos cada solicitud y nos encargamos de conseguirlo.
                  </p>
                  <a href={WA} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105"
                     style={{ background: GOLD }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Hacer una solicitud
                  </a>
                </div>
              </R>
            </div>
          </section>

          {/* CTA final */}
          <section className="py-32 px-6">
            <div className="max-w-3xl mx-auto text-center">
              <R>
                <h2 className="font-bold text-white leading-tight mb-8" style={{ fontSize: "clamp(2rem,5vw,4rem)", letterSpacing: "-0.03em" }}>
                  ¿Quieres este equipo<br /><span style={{ color: GOLD }}>en tu evento?</span>
                </h2>
                <p className="text-white/40 mb-12 leading-relaxed max-w-lg mx-auto">Contáctanos, cuéntanos el tipo de evento y te preparamos una propuesta personalizada. Respuesta en menos de 24 horas.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a href={WA} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-3 px-10 py-5 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                     style={{ background: GOLD, boxShadow: `0 4px 40px ${GOLD}30` }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Ver disponibilidad
                  </a>
                  <a href="/presentacion/servicios" className="text-white/40 text-sm hover:text-[#B3985B] transition-colors">Conocer nuestros servicios →</a>
                </div>
              </R>
            </div>
          </section>
        </>
      )}

      {activeTab === "productos" && (
        <ProductosTab productos={productos} loading={productosLoading} categoriaOrden={data.categoriaOrden ?? []} />
      )}

      {activeTab === "lista" && (
        <ListaTab categorias={filteredCategorias} imageMap={imageMap} />
      )}

      {activeTab === "precios" && (
        <PreciosTab categorias={filteredCategorias} onAddItem={addItem} onSwitchToCotizador={() => setActiveTab("cotizador")} imageMap={imageMap} />
      )}

      {activeTab === "cotizador" && (
        <CotizadorTab categorias={filteredCategorias} quoteItems={quoteItems}
          onAddItem={addItem} onUpdateQty={updateQty} onRemoveItem={removeItem} onAddCustom={addCustom} imageMap={imageMap} />
      )}

      {/* Footer */}
      <footer className="py-10 px-6 border-t text-center" style={{ borderColor: `${GOLD}10` }}>
        <p className="text-white/15 text-xs tracking-widest uppercase">
          © {new Date().getFullYear()} Mainstage Pro · Producción audiovisual · Querétaro · SMA · CDMX
        </p>
      </footer>
    </div>
  );
}
