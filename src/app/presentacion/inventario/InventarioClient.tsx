"use client";
import { useEffect, useRef, useState } from "react";

const GOLD = "#B3985B";
const WA   = "https://wa.me/524461432565?text=Hola%2C%20me%20gustar%C3%ADa%20conocer%20el%20equipo%20disponible%20para%20mi%20evento.";

// ─── Types ────────────────────────────────────────────────────────────────────
interface EquipoData {
  id: string; descripcion: string; marca: string | null;
  modelo: string | null; cantidadTotal: number; estado: string; notas: string | null;
  imagenUrl?: string | null; precioRenta: number;
}
interface CategoriaData { nombre: string; orden: number; equipos: EquipoData[]; }
interface Props { data: { categorias: CategoriaData[]; totalEquipos: number; totalUnidades: number } }

// ─── Image mapping ────────────────────────────────────────────────────────────
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
// ─── Category descriptions ────────────────────────────────────────────────────
const CAT_DESC: Record<string, string> = {
  "Sistemas de Audio":          "Line arrays, subwoofers y monitores activos para cobertura uniforme en cualquier venue, desde jardines hasta auditorios.",
  "Equipo de Audio":            "Line arrays, subwoofers y monitores activos para cobertura uniforme en cualquier venue, desde jardines hasta auditorios.",
  "Consolas de Audio":          "Consolas digitales para mezcla en vivo con control total sobre señal, efectos y ruteo — desde el primer orador hasta el último acorde.",
  "Sistemas de Microfonía":     "Micrófonos de solapa, headset y de mano para oradores, artistas y ceremonias, con operación técnica dedicada.",
  "Microfonía e Inalámbricos":  "Micrófonos de solapa, headset y de mano para oradores, artistas y ceremonias, con operación técnica dedicada.",
  "Monitoreo In-Ear":           "Sistemas IEM para artistas y técnicos en tarima — cada músico escucha su mezcla personalizada sin interferencias.",
  "Equipo de Iluminación":      "Cabezas móviles, beams, pares LED, efectos especiales y estructuras de soporte operados en vivo desde consola.",
  "Consolas de Iluminación":    "Control de cues, escenas y efectos en tiempo real. Programación previa para que cada momento del evento tenga su luz.",
  "Consolas/Equipo para DJ":    "CDJs, mezcladoras y setup profesional verificado antes de que el artista llegue — el rider cubierto sin negociaciones.",
  "DJ Booths":                  "Booths estructurales con integración de equipo técnico, adaptables al espacio y al concepto del evento.",
  "Equipo para DJ":             "CDJs, mezcladoras y setup profesional verificado antes de que el artista llegue — el rider cubierto sin negociaciones.",
  "Pantalla / Video":           "Pantallas, procesadores de señal y sistemas de proyección para presentaciones, contenido en vivo y transmisiones.",
  "Entarimado":                 "Estructuras modulares para tarimas, risers y escenarios — estables, certificadas y adaptables a cualquier dimensión.",
};

// ─── Price formatter ──────────────────────────────────────────────────────────
function fmtPrice(n: number): string {
  return "$" + n.toLocaleString("es-MX", { maximumFractionDigits: 0 });
}

const CAT_HERO_IMGS: Record<string, string> = {
  "Equipo de Audio":         "/images/presentacion/rcf-hdl30a.jpg",
  "Sistemas de Audio":       "/images/presentacion/rcf-hdl30a.jpg",
  "Consolas de Audio":       "/images/presentacion/allen-heath-dlive.jpg",
  "Sistemas de Microfonía":  "/images/presentacion/shure-slxd.png",
  "Microfonía e Inalámbricos":"/images/presentacion/shure-slxd.png",
  "Monitoreo In-Ear":        "/images/presentacion/sennheiser-iem.png",
  "Equipo de Iluminación":   "/images/presentacion/equip-light.jpg",
  "Consolas de Iluminación": "/images/presentacion/grandma-ma3.png",
  "Consolas/Equipo para DJ": "/images/presentacion/pioneer-cdj3000.webp",
  "DJ Booths":               "/images/presentacion/pioneer-cdj3000.webp",
  "Equipo para DJ":          "/images/presentacion/pioneer-cdj3000.webp",
  "Pantalla / Video":        "/images/presentacion/e-corp-screens.jpg",
  "Entarimado":              "/images/presentacion/entarimado.png",
};

function getEqImg(eq: EquipoData): string | null {
  // DB image takes absolute priority
  if (eq.imagenUrl) return eq.imagenUrl;
  // Fallback to hardcoded map (covers equipment without DB image yet)
  if (eq.modelo) {
    for (const [k, v] of Object.entries(MODELO_IMGS)) {
      if (eq.modelo.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(eq.modelo.toLowerCase())) return v;
    }
  }
  const m = (eq.marca ?? "").toLowerCase().trim();
  for (const [k, v] of Object.entries(MARCA_IMGS)) {
    if (m.includes(k) || k.includes(m)) return v;
  }
  return null;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
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
  const [count, setCount]     = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStarted(true); obs.disconnect(); } }, { threshold: 0.5 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!started) return;
    let cur = 0; const step = target / (duration / 16);
    const t = setInterval(() => {
      cur += step;
      if (cur >= target) { setCount(target); clearInterval(t); } else setCount(Math.floor(cur));
    }, 16);
    return () => clearInterval(t);
  }, [started, target, duration]);
  return { count, ref };
}

function useScrollHeader() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true }); fn();
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return scrolled;
}

// ─── Animated reveal wrapper ──────────────────────────────────────────────────
function R({ children, delay = 0, y = 36, className = "" }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  const { ref, vis } = useReveal();
  return (
    <div ref={ref} className={className}
         style={{
           transitionDelay: `${delay}ms`,
           opacity: vis ? 1 : 0,
           transform: vis ? "translateY(0)" : `translateY(${y}px)`,
           transition: "opacity 0.75s cubic-bezier(0.16,1,0.3,1), transform 0.75s cubic-bezier(0.16,1,0.3,1)",
         }}>
      {children}
    </div>
  );
}

// ─── Equipment card ───────────────────────────────────────────────────────────
function EquipoCard({ eq, delay = 0 }: { eq: EquipoData; delay?: number }) {
  const img = getEqImg(eq);
  const [hovered, setHovered] = useState(false);
  return (
    <R delay={delay}>
      <div className="group relative rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-300"
           style={{
             background: hovered ? "rgba(179,152,91,0.04)" : "rgba(255,255,255,0.025)",
             border: `1px solid ${hovered ? GOLD + "40" : "rgba(255,255,255,0.07)"}`,
             boxShadow: hovered ? `0 8px 40px rgba(0,0,0,0.4)` : "none",
           }}
           onMouseEnter={() => setHovered(true)}
           onMouseLeave={() => setHovered(false)}>
        {/* Image area */}
        <div className="relative flex items-center justify-center p-5 overflow-hidden"
             style={{ height: "160px", background: "#050505", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={eq.descripcion} draggable={false}
                 className="max-h-full max-w-full object-contain transition-all duration-500"
                 style={{ transform: hovered ? "scale(1.07)" : "scale(1)", filter: hovered ? "brightness(1.1)" : "brightness(0.9)" }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logo-icon.png" alt="Mainstage Pro" draggable={false}
                 className="w-16 h-16 object-contain opacity-10" />
          )}
          {/* Qty badge */}
          <div className="absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-bold"
               style={{ background: eq.cantidadTotal > 4 ? GOLD : "#1a1a1a", color: eq.cantidadTotal > 4 ? "#000" : GOLD, border: `1px solid ${GOLD}30` }}>
            ×{eq.cantidadTotal}
          </div>
        </div>
        {/* Info */}
        <div className="p-5 flex-1 flex flex-col">
          {/* Primary name: Marca + Modelo, or fall back to descripcion */}
          <p className="text-white font-semibold text-sm leading-snug mb-1 line-clamp-2">
            {[eq.marca, eq.modelo].filter(Boolean).join(" ") || eq.descripcion}
          </p>
          {/* Secondary: descripcion (only when we have a marca/modelo to show as primary) */}
          {(eq.marca || eq.modelo) && (
            <p className="text-white/40 text-xs leading-snug line-clamp-2">{eq.descripcion}</p>
          )}
          {eq.notas && <p className="text-white/20 text-xs mt-2 leading-relaxed line-clamp-2">{eq.notas}</p>}
          {eq.precioRenta > 0 && (
            <p className="text-[#B3985B] text-xs font-semibold mt-3 pt-3"
               style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              {fmtPrice(eq.precioRenta)} <span className="text-white/25 font-normal">/ día</span>
            </p>
          )}
        </div>
      </div>
    </R>
  );
}

// ─── Stat counter block ───────────────────────────────────────────────────────
function StatBlock({ target, suffix = "", label, sub }: { target: number; suffix?: string; label: string; sub: string }) {
  const { count, ref } = useCounter(target, 2200);
  return (
    <div ref={ref} className="flex flex-col items-center text-center px-6 py-8">
      <span className="font-bold tabular-nums leading-none"
            style={{ fontSize: "clamp(4rem,10vw,8rem)", letterSpacing: "-0.04em", color: GOLD, lineHeight: 1 }}>
        {count}{suffix}
      </span>
      <span className="text-white font-semibold mt-3 text-lg">{label}</span>
      <span className="text-white/35 text-sm mt-1">{sub}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function InventarioClient({ data }: Props) {
  const scrolled  = useScrollHeader();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Scroll spy for sticky category nav
  useEffect(() => {
    const fn = () => {
      for (const cat of data.categorias) {
        const el = document.getElementById(`cat-${cat.orden}`);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 100 && rect.bottom > 100) { setActiveCategory(cat.nombre); break; }
      }
    };
    window.addEventListener("scroll", fn, { passive: true }); fn();
    return () => window.removeEventListener("scroll", fn);
  }, [data.categorias]);

  const scrollToCategory = (orden: number) => {
    const el = document.getElementById(`cat-${orden}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // BRANDS marquee
  const brands = ["Pioneer DJ", "RCF", "Allen & Heath", "Shure", "Sennheiser", "Grand MA", "Chauvet", "Astera", "Lite Tek", "Lumos", "Electro-Voice", "Rode", "Blackmagic", "Midas", "Sun Star"];

  return (
    <div className="bg-[#050505] text-white min-h-screen" style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      <style>{`
        @keyframes kenBurns { from { transform:scale(1); } to { transform:scale(1.05) translate(-0.8%,-0.5%); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes marquee { from { transform:translateX(0); } to { transform:translateX(-50%); } }
        @keyframes pulse { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: rgba(179,152,91,0.35); border-radius: 2px; }
      `}</style>

      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 transition-all duration-500"
           style={{ background: scrolled ? "rgba(5,5,5,0.97)" : "transparent", backdropFilter: scrolled ? "blur(20px)" : "none", borderBottom: scrolled ? `1px solid ${GOLD}12` : "none" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
          <a href="/presentacion/servicios">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-white.png" alt="Mainstage Pro" className="h-7 object-contain" draggable={false} />
          </a>
          <a href={WA} target="_blank" rel="noopener noreferrer"
             className="text-xs font-semibold tracking-[0.14em] uppercase px-5 py-2.5 rounded-full transition-all duration-300 hover:scale-105"
             style={{ background: GOLD, color: "#000" }}>
            Agenda tu equipo
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden text-center" style={{ minHeight: "100svh" }}>
        {/* Subtle background pattern */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(179,152,91,0.06) 0%, transparent 70%), linear-gradient(to bottom, #050505 0%, #080808 50%, #050505 100%)"
        }} />
        {/* Animated grid lines */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `linear-gradient(rgba(179,152,91,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(179,152,91,0.03) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          animation: "fadeIn 2s ease forwards 0.5s", opacity: 0
        }} />

        <div className="relative z-10 px-6 max-w-5xl mx-auto">
          <div className="mb-10" style={{ animation: "fadeUp 0.7s ease forwards 0.1s", opacity: 0 }}>
            <span className="text-xs tracking-[0.3em] uppercase px-4 py-2 rounded-full"
                  style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}25` }}>
              Mainstage Pro · Catálogo Técnico
            </span>
          </div>

          <h1 className="font-bold leading-[0.95]"
              style={{ fontSize: "clamp(3.5rem,12vw,10rem)", letterSpacing: "-0.04em", animation: "fadeUp 0.9s ease forwards 0.3s", opacity: 0 }}>
            El equipo.
          </h1>
          <h1 className="font-bold leading-[0.95]"
              style={{ fontSize: "clamp(3.5rem,12vw,10rem)", letterSpacing: "-0.04em", color: GOLD, animation: "fadeUp 0.9s ease forwards 0.5s", opacity: 0 }}>
            Disponible.
          </h1>
          <p className="text-white/40 mt-10 max-w-xl mx-auto leading-relaxed"
             style={{ fontSize: "clamp(1rem,1.8vw,1.2rem)", animation: "fadeUp 0.9s ease forwards 0.75s", opacity: 0 }}>
            Audio, iluminación y video de nivel profesional.
            Todo listo para operar en tu evento.
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
             style={{ animation: "fadeUp 1s ease forwards 1.1s", opacity: 0 }}>
          <span className="text-xs tracking-[0.2em] uppercase text-white/30">Explorar</span>
          <div className="w-px h-12 bg-gradient-to-b from-[#B3985B40] to-transparent" />
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-4 px-6 border-y" style={{ borderColor: `${GOLD}12` }}>
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#1a1a0a]">
          <StatBlock target={data.totalEquipos}   suffix="" label="Referencias de equipo" sub="modelos distintos en inventario"   />
          <StatBlock target={data.totalUnidades}   suffix="" label="Unidades totales"       sub="piezas listas para tu evento"      />
          <StatBlock target={data.categorias.length} suffix="" label="Categorías"            sub="familias de equipo audiovisual"   />
        </div>
      </section>

      {/* ── Category sticky nav ── */}
      <div className="sticky top-16 z-40 overflow-x-auto no-scrollbar py-3 px-6 transition-all duration-300"
           style={{ background: "rgba(5,5,5,0.92)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${GOLD}10` }}>
        <div className="flex items-center gap-2 min-w-max">
          {data.categorias.map(cat => (
            <button key={cat.nombre}
                    onClick={() => scrollToCategory(cat.orden)}
                    className="text-xs px-4 py-2 rounded-full transition-all duration-300 whitespace-nowrap"
                    style={{
                      background: activeCategory === cat.nombre ? GOLD : "rgba(255,255,255,0.04)",
                      color: activeCategory === cat.nombre ? "#000" : "rgba(255,255,255,0.5)",
                      fontWeight: activeCategory === cat.nombre ? "700" : "400",
                      border: `1px solid ${activeCategory === cat.nombre ? GOLD : "rgba(255,255,255,0.06)"}`,
                    }}>
              {cat.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* ── Categories ── */}
      {data.categorias.map((cat, ci) => (
        <section key={cat.nombre} id={`cat-${cat.orden}`} className="py-20 px-6"
                 style={{ background: ci % 2 === 0 ? "#050505" : "#070707" }}>
          <div className="max-w-7xl mx-auto">
            {/* Category header */}
            <R y={24}>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-14 pb-6"
                   style={{ borderBottom: `1px solid ${GOLD}15` }}>
                <div>
                  <p className="text-white/20 text-xs tracking-[0.3em] uppercase mb-3 font-mono">
                    {String(ci + 1).padStart(2, "0")} / {String(data.categorias.length).padStart(2, "0")}
                  </p>
                  <h2 className="font-bold text-white leading-none"
                      style={{ fontSize: "clamp(1.8rem,5vw,3.6rem)", letterSpacing: "-0.03em" }}>
                    {cat.nombre}
                  </h2>
                  {CAT_DESC[cat.nombre] && (
                    <p className="text-white/35 text-sm leading-relaxed mt-3 max-w-xl">{CAT_DESC[cat.nombre]}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs px-3 py-1.5 rounded-full font-semibold"
                        style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}25` }}>
                    {cat.equipos.length} {cat.equipos.length === 1 ? "equipo" : "equipos"}
                  </span>
                  <span className="text-xs px-3 py-1.5 rounded-full text-white/40"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {cat.equipos.reduce((s, e) => s + e.cantidadTotal, 0)} unidades
                  </span>
                </div>
              </div>
            </R>

            {/* Equipment grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {cat.equipos.map((eq, i) => (
                <EquipoCard key={eq.id} eq={eq} delay={Math.min(i * 50, 400)} />
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* ── Brands marquee ── */}
      <section className="py-20 overflow-hidden" style={{ background: "#030303", borderTop: `1px solid ${GOLD}10`, borderBottom: `1px solid ${GOLD}10` }}>
        <R>
          <p className="text-center text-white/25 text-xs tracking-[0.28em] uppercase mb-10">Marcas con las que trabajamos</p>
        </R>
        <div className="relative">
          <div className="flex whitespace-nowrap" style={{ animation: "marquee 25s linear infinite" }}>
            {[...brands, ...brands].map((b, i) => (
              <span key={i} className="inline-flex items-center gap-6 mx-4 text-white/20 text-sm font-medium tracking-widest uppercase">
                {b}
                <span style={{ color: `${GOLD}40`, fontSize: "6px" }}>●</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solicitud especial ── */}
      <section className="py-24 px-6" style={{ background: "#070707", borderTop: `1px solid ${GOLD}10` }}>
        <div className="max-w-3xl mx-auto">
          <R>
            <div className="rounded-2xl p-10 sm:p-14 text-center"
                 style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}20` }}>
              <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-5">Solicitud especial</p>
              <h2 className="font-bold text-white leading-tight mb-5"
                  style={{ fontSize: "clamp(1.6rem,4vw,2.6rem)", letterSpacing: "-0.025em" }}>
                ¿No ves lo que necesitas?
              </h2>
              <p className="text-white/40 mb-8 leading-relaxed max-w-lg mx-auto text-sm">
                Si tienes un requerimiento técnico específico que no aparece en este catálogo, contáctanos.
                Evaluamos cada solicitud y nos encargamos de conseguirlo — solo dinos qué necesitas.
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

      {/* ── CTA ── */}
      <section className="py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <R>
            <h2 className="font-bold text-white leading-tight mb-8"
                style={{ fontSize: "clamp(2rem,5vw,4rem)", letterSpacing: "-0.03em" }}>
              ¿Quieres este equipo<br />
              <span style={{ color: GOLD }}>en tu evento?</span>
            </h2>
            <p className="text-white/40 mb-12 leading-relaxed max-w-lg mx-auto">
              Contáctanos, cuéntanos el tipo de evento y te preparamos una propuesta personalizada.
              Respuesta en menos de 24 horas.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href={WA} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-3 px-10 py-5 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                 style={{ background: GOLD, boxShadow: `0 4px 40px ${GOLD}30` }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Ver disponibilidad
              </a>
              <a href="/presentacion/servicios"
                 className="text-white/40 text-sm hover:text-[#B3985B] transition-colors">
                Conocer nuestros servicios →
              </a>
            </div>
          </R>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t text-center" style={{ borderColor: `${GOLD}10` }}>
        <p className="text-white/15 text-xs tracking-widest uppercase">
          © {new Date().getFullYear()} Mainstage Pro · Producción audiovisual · Querétaro · SMA · CDMX
        </p>
      </footer>
    </div>
  );
}
