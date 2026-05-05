"use client";
import { useEffect, useRef, useState } from "react";

const GOLD = "#B3985B";
const WA   = "https://wa.me/524461432565?text=Hola%2C%20me%20gustar%C3%ADa%20obtener%20m%C3%A1s%20informaci%C3%B3n%20sobre%20los%20servicios%20de%20Mainstage%20Pro.";

const HERO_SLIDES = [
  { src: "/images/presentacion/musicales/Musicales-016.jpg",        label: "Musicales" },
  { src: "/images/presentacion/sociales/s-hacienda-iluminada.jpg",  label: "Sociales" },
  { src: "/images/presentacion/empresariales/e-sala-pantallas.jpg", label: "Empresariales" },
];

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold });
    obs.observe(el); return () => obs.disconnect();
  }, [threshold]);
  return { ref, vis };
}

function useCounter(target: number, duration = 1800) {
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

// ─── Animation wrapper ────────────────────────────────────────────────────────
function R({ children, delay = 0, y = 40, className = "" }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  const { ref, vis } = useReveal();
  return (
    <div ref={ref} className={className}
         style={{
           transitionDelay: `${delay}ms`,
           opacity: vis ? 1 : 0,
           transform: vis ? "translateY(0)" : `translateY(${y}px)`,
           transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)",
         }}>
      {children}
    </div>
  );
}

// ─── Counter block ────────────────────────────────────────────────────────────
function StatCount({ target, suffix = "", label }: { target: number; suffix?: string; label: string }) {
  const { count, ref } = useCounter(target);
  return (
    <div ref={ref} className="flex flex-col items-center">
      <span className="font-bold tabular-nums leading-none" style={{ fontSize: "clamp(3rem,7vw,6rem)", color: GOLD }}>
        {count}{suffix}
      </span>
      <span className="text-white/50 text-sm tracking-[0.14em] uppercase mt-2">{label}</span>
    </div>
  );
}

// ─── Mexico service map ────────────────────────────────────────────────────────
function MexicoMap() {
  // Simplified SVG map of Mexico. State shapes are approximate but geographically consistent.
  // ViewBox 740×520. Bajío region center ≈ (328, 348).
  return (
    <div className="relative w-full max-w-2xl mx-auto select-none">
      <svg viewBox="0 0 740 520" className="w-full" style={{ filter: "drop-shadow(0 0 40px rgba(179,152,91,0.08))" }}>
        <defs>
          {/* Radial glow emanating from Bajío center */}
          <radialGradient id="bajioGlow" cx="44%" cy="67%" r="70%" gradientUnits="objectBoundingBox">
            <stop offset="0%"   stopColor="#B3985B" stopOpacity="0.22" />
            <stop offset="30%"  stopColor="#B3985B" stopOpacity="0.10" />
            <stop offset="60%"  stopColor="#B3985B" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#B3985B" stopOpacity="0"    />
          </radialGradient>
          <radialGradient id="stateHighlight" cx="50%" cy="50%" r="60%">
            <stop offset="0%"   stopColor="#B3985B" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#B3985B" stopOpacity="0.55" />
          </radialGradient>
        </defs>

        {/* ── Mexico mainland silhouette ── */}
        <path
          d="M 108,42 L 196,38 L 308,36 L 416,36 L 510,38 L 582,40 L 625,42
             L 650,48 L 664,80 L 668,118 L 656,160 L 636,202 L 620,242 L 616,278
             L 622,306 L 636,332 L 654,356 L 670,376 L 690,394 L 706,410 L 718,434
             L 708,462 L 690,488 L 664,512 L 636,520 L 606,510 L 578,492 L 554,470
             L 530,450 L 514,460 L 492,482 L 464,498 L 438,504 L 413,498 L 394,482
             L 381,474 L 370,480 L 344,488 L 317,472 L 290,452 L 264,432 L 242,414
             L 226,396 L 213,376 L 198,356 L 182,344 L 163,346 L 144,342 L 124,326
             L 110,304 L 106,278 L 116,252 L 116,228 L 108,206 L 100,186
             L 98,164 L 104,146 L 110,124 L 108,96 Z"
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="0.8"
        />

        {/* ── Baja California peninsula ── */}
        <path
          d="M 102,46 L 90,70 L 77,108 L 66,144 L 56,178 L 50,212
             L 49,246 L 52,268 L 62,278 L 70,268 L 72,244 L 70,210
             L 72,178 L 78,144 L 88,110 L 98,78 L 106,52 Z"
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="0.8"
        />

        {/* ── Interior state lines (simplified major divisions) ── */}
        <g stroke="rgba(255,255,255,0.06)" strokeWidth="0.6" fill="none">
          {/* North tier roughly */}
          <line x1="220" y1="38" x2="218" y2="140" />
          <line x1="320" y1="36" x2="315" y2="170" />
          <line x1="450" y1="36" x2="445" y2="150" />
          <line x1="562" y1="40" x2="558" y2="120" />
          {/* Center dividers */}
          <line x1="215" y1="140" x2="200" y2="300" />
          <line x1="315" y1="170" x2="305" y2="330" />
          <line x1="400" y1="160" x2="395" y2="298" />
          <line x1="445" y1="150" x2="440" y2="280" />
          <line x1="558" y1="120" x2="552" y2="240" />
          {/* Gulf coast divider */}
          <line x1="552" y1="240" x2="620" y2="240" />
          {/* Central cross lines */}
          <line x1="200" y1="300" x2="440" y2="280" />
          <line x1="260" y1="370" x2="510" y2="350" />
          <line x1="305" y1="330" x2="300" y2="450" />
          <line x1="395" y1="298" x2="400" y2="345" />
          <line x1="400" y1="430" x2="510" y2="450" />
          <line x1="510" y1="350" x2="556" y2="470" />
        </g>

        {/* ── Radial glow from Bajío ── */}
        <rect x="0" y="0" width="740" height="520" fill="url(#bajioGlow)" />

        {/* ── Highlighted states ── */}

        {/* Guanajuato */}
        <path
          d="M 266,375 L 278,327 L 308,320 L 348,323 L 354,344 L 344,373 L 330,388 L 298,393 L 270,382 Z"
          fill="url(#stateHighlight)"
          stroke="#B3985B"
          strokeWidth="0.8"
          opacity="0.85"
        />

        {/* Querétaro */}
        <path
          d="M 347,337 L 353,298 L 377,296 L 395,311 L 390,337 L 372,344 L 350,340 Z"
          fill="url(#stateHighlight)"
          stroke="#B3985B"
          strokeWidth="0.8"
          opacity="0.85"
        />

        {/* Aguascalientes (part of Bajío) */}
        <path
          d="M 247,325 L 252,308 L 268,306 L 271,318 L 264,330 L 250,330 Z"
          fill="url(#stateHighlight)"
          stroke="#B3985B"
          strokeWidth="0.8"
          opacity="0.75"
        />

        {/* Ciudad de México (tiny) */}
        <path
          d="M 379,392 L 381,372 L 398,372 L 400,390 L 388,398 Z"
          fill="#B3985B"
          stroke="#B3985B"
          strokeWidth="0.5"
          opacity="0.95"
        />

        {/* Puebla */}
        <path
          d="M 401,378 L 407,347 L 433,344 L 463,356 L 466,380 L 452,415 L 432,429 L 407,424 L 402,408 Z"
          fill="url(#stateHighlight)"
          stroke="#B3985B"
          strokeWidth="0.8"
          opacity="0.85"
        />

        {/* ── Service city dots ── */}
        {/* Querétaro city */}
        <circle cx="371" cy="316" r="4.5" fill="#B3985B" />
        <circle cx="371" cy="316" r="8"   fill="#B3985B" opacity="0.2" />
        {/* Guanajuato / San Miguel */}
        <circle cx="312" cy="352" r="4.5" fill="#B3985B" />
        <circle cx="312" cy="352" r="8"   fill="#B3985B" opacity="0.2" />
        {/* CDMX */}
        <circle cx="390" cy="381" r="5"   fill="#B3985B" />
        <circle cx="390" cy="381" r="9"   fill="#B3985B" opacity="0.2" />
        {/* Puebla city */}
        <circle cx="436" cy="390" r="4.5" fill="#B3985B" />
        <circle cx="436" cy="390" r="8"   fill="#B3985B" opacity="0.2" />

        {/* ── Labels ── */}
        <text x="371" y="306" textAnchor="middle" fill="white" fontSize="9" fontWeight="600" opacity="0.85" letterSpacing="0.5">Querétaro</text>
        <text x="298" y="347" textAnchor="middle" fill="white" fontSize="9" fontWeight="600" opacity="0.85" letterSpacing="0.5">Guanajuato</text>
        <text x="409" y="374" textAnchor="start"  fill="white" fontSize="9" fontWeight="600" opacity="0.85" letterSpacing="0.5">CDMX</text>
        <text x="458" y="400" textAnchor="start"  fill="white" fontSize="9" fontWeight="600" opacity="0.85" letterSpacing="0.5">Puebla</text>

        {/* El Bajío region label */}
        <text x="310" y="415" textAnchor="middle" fill="#B3985B" fontSize="8" fontWeight="700" opacity="0.65" letterSpacing="1.5">EL BAJÍO</text>
      </svg>

      <p className="text-center text-white/25 text-xs mt-3 tracking-wide">
        También realizamos servicios en toda la República Mexicana — contáctanos para condiciones.
      </p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ServiciosClient() {
  const scrolled  = useScrollHeader();
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setHeroIdx(i => (i + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bg-[#080808] text-white min-h-screen" style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>

      <style>{`
        @keyframes kenBurns { from { transform:scale(1) translate(0,0); } to { transform:scale(1.06) translate(-1%,-0.8%); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
        @keyframes marquee { from { transform:translateX(0); } to { transform:translateX(-50%); } }
        @keyframes pulse-ring { 0% { transform:scale(1); opacity:0.4; } 100% { transform:scale(1.4); opacity:0; } }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: rgba(179,152,91,0.35); border-radius: 2px; }
      `}</style>

      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 transition-all duration-500"
           style={{ background: scrolled ? "rgba(8,8,8,0.95)" : "transparent", backdropFilter: scrolled ? "blur(12px)" : "none", borderBottom: scrolled ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="Mainstage Pro" className="h-7 object-contain" draggable={false} />
          <a href={WA} target="_blank" rel="noopener noreferrer"
             className="text-xs font-semibold tracking-[0.14em] uppercase px-5 py-2.5 rounded-full transition-all duration-300"
             style={{ background: GOLD, color: "#000" }}>
            Contactar
          </a>
        </div>
      </nav>

      {/* ── Hero con slideshow ── */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Slideshow */}
        {HERO_SLIDES.map((slide, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={slide.src}
            src={slide.src}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: i === heroIdx ? 1 : 0,
              transform: i === heroIdx ? "scale(1.04)" : "scale(1)",
              transition: "opacity 1.4s ease-in-out, transform 8s ease-out",
              zIndex: i === heroIdx ? 1 : 0,
            }}
          />
        ))}

        {/* Gradient overlay */}
        <div className="absolute inset-0 z-10" style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.25) 0%, rgba(8,8,8,0.45) 40%, rgba(8,8,8,0.82) 80%, #080808 100%)" }} />

        {/* Slide type indicator */}
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {HERO_SLIDES.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setHeroIdx(i)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] tracking-widest uppercase transition-all duration-500"
              style={{
                background: i === heroIdx ? `${GOLD}25` : "transparent",
                border: `1px solid ${i === heroIdx ? GOLD : "rgba(255,255,255,0.15)"}`,
                color: i === heroIdx ? GOLD : "rgba(255,255,255,0.4)",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="relative z-20 text-center px-6 max-w-4xl mx-auto">
          <p className="text-[#B3985B] text-xs font-semibold tracking-[0.28em] uppercase mb-6"
             style={{ animation: "fadeUp 0.8s ease forwards 0.2s", opacity: 0 }}>
            Mainstage Pro · Soluciones Audiovisuales
          </p>
          <h1 className="font-bold text-white leading-[1.0]"
              style={{ fontSize: "clamp(2.8rem,8vw,7rem)", letterSpacing: "-0.03em", animation: "fadeUp 0.9s ease forwards 0.4s", opacity: 0 }}>
            Todo resuelto.<br />
            <span style={{ color: GOLD }}>Tú solo disfruta.</span>
          </h1>
          <p className="text-white/60 mt-8 max-w-lg mx-auto"
             style={{ fontSize: "clamp(1rem,2vw,1.15rem)", animation: "fadeUp 0.9s ease forwards 0.65s", opacity: 0 }}>
            Audio, iluminación, video y operadores expertos. Un solo equipo que lo maneja todo — antes, durante y después de tu evento.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
               style={{ animation: "fadeUp 0.9s ease forwards 0.85s", opacity: 0 }}>
            <a href={WA} target="_blank" rel="noopener noreferrer"
               className="px-8 py-4 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105"
               style={{ background: GOLD }}>
              Habla con nosotros
            </a>
            <a href="#servicios"
               className="px-8 py-4 rounded-full font-semibold text-white/70 text-sm tracking-wide border border-white/15 hover:border-white/30 transition-all duration-300">
              Ver servicios
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40 z-20"
             style={{ animation: "fadeUp 1s ease forwards 1.2s" }}>
          <span className="text-xs tracking-[0.18em] uppercase text-white/50">Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-white/40 to-transparent" />
        </div>
      </section>

      {/* ── Statement ── */}
      <section className="py-28 px-6 max-w-5xl mx-auto">
        <R>
          <h2 className="font-bold text-white leading-[1.1]"
              style={{ fontSize: "clamp(2rem,5vw,4rem)", letterSpacing: "-0.025em" }}>
            Nuestro trabajo es que<br />
            <span style={{ color: GOLD }}>tú no tengas que preocuparte.</span>
          </h2>
          <p className="text-white/50 mt-6 max-w-xl" style={{ fontSize: "clamp(1rem,1.8vw,1.15rem)" }}>
            Técnica impecable, operadores que saben lo que hacen y un solo responsable para cualquier cosa.
            Así de simple.
          </p>
        </R>
      </section>

      {/* ── Stats ── */}
      <section className="py-20 px-6 border-t border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-10 sm:gap-4">
          <StatCount target={7}   suffix="+"  label="Años de experiencia" />
          <StatCount target={750} suffix="+"  label="Eventos realizados"  />
          <StatCount target={5}   suffix=""   label="Zonas de servicio"   />
          <StatCount target={100} suffix="%"  label="Compromiso con cada evento" />
        </div>
      </section>

      {/* ── Servicios ── */}
      <section id="servicios" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Lo que ofrecemos</p>
            <h2 className="font-bold text-white leading-tight mb-16"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.02em" }}>
              Tres formas de trabajar<br />con Mainstage Pro
            </h2>
          </R>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: "L1",
                title: "Renta de equipo",
                body: "El equipo correcto para tu fecha.",
                detail: "Audio · Iluminación · Video · DJ Gear",
                delay: 0,
              },
              {
                num: "L2",
                title: "Producción técnica",
                body: "Equipo y operadores. Sin coordinar piezas sueltas.",
                detail: "Ingenieros especializados · Operación completa",
                delay: 120,
              },
              {
                num: "L3",
                title: "Dirección técnica",
                body: "De la planeación al cierre. Todo resuelto.",
                detail: "Coordinación integral · Un solo responsable",
                delay: 240,
              },
            ].map(s => (
              <R key={s.num} delay={s.delay}>
                <div className="group relative rounded-2xl p-8 h-full flex flex-col cursor-default"
                     style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
                     onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${GOLD}40`; (e.currentTarget as HTMLDivElement).style.background = "rgba(179,152,91,0.04)"; }}
                     onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.025)"; }}>
                  <span className="text-[#B3985B]/40 text-xs font-mono tracking-widest mb-6">{s.num}</span>
                  <h3 className="font-bold text-white text-xl mb-4 leading-tight">{s.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed flex-1">{s.body}</p>
                  <p className="text-[#B3985B]/60 text-xs mt-6 leading-relaxed border-t border-white/[0.05] pt-5">{s.detail}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tipos de eventos ── */}
      <section className="py-28 px-6 bg-[#060606]">
        <div className="max-w-6xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Para qué eventos trabajamos</p>
            <h2 className="font-bold text-white leading-tight mb-16"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.02em" }}>
              Cada evento, con la producción<br />que merece
            </h2>
          </R>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                title: "Musicales",
                sub: "Conciertos · Festivales · DJ Sets · Showcases",
                img: "/images/presentacion/musicales/Musicales-016.jpg",
                href: "/presentacion/evento/musical",
                delay: 0,
              },
              {
                title: "Sociales",
                sub: "Bodas · XV Años · Fiestas privadas · Celebraciones",
                img: "/images/presentacion/sociales/s-hacienda-iluminada.jpg",
                href: "/presentacion/evento/social",
                delay: 120,
              },
              {
                title: "Empresariales",
                sub: "Conferencias · Lanzamientos · Corporativos · Ferias",
                img: "/images/presentacion/empresariales/e-sala-pantallas.jpg",
                href: "/presentacion/evento/empresarial",
                delay: 240,
              },
            ].map(ev => (
              <R key={ev.title} delay={ev.delay}>
                <a href={ev.href}
                   className="group block relative rounded-2xl overflow-hidden"
                   style={{ height: "340px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ev.img} alt={ev.title} draggable={false}
                       className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 transition-all duration-300"
                       style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)" }} />
                  <div className="absolute bottom-0 left-0 right-0 p-7">
                    <h3 className="font-bold text-white text-xl mb-1">{ev.title}</h3>
                    <p className="text-white/50 text-xs">{ev.sub}</p>
                    <div className="flex items-center gap-2 mt-4 text-[#B3985B] text-xs font-semibold tracking-wide uppercase">
                      Ver presentación
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-hover:translate-x-1">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </div>
                  </div>
                </a>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Por qué Mainstage ── */}
      <section className="py-24 px-6 bg-[#060606]">
        <div className="max-w-6xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Por qué Mainstage Pro</p>
            <h2 className="font-bold text-white leading-tight mb-14"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.02em" }}>
              Lo que nos hace<br />
              <span style={{ color: GOLD }}>la opción correcta.</span>
            </h2>
          </R>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { title: "Llegas a disfrutar, no a resolver.", body: "Anticipamos cada detalle técnico antes del evento. Tú te enfocas en tus invitados." },
              { title: "Operadores que viven en escena.",    body: "No enviamos asistentes sin experiencia. El que operó cientos de eventos es el que opera el tuyo." },
              { title: "Todo listo antes del primero.",      body: "Sistema montado y calibrado antes de que llegue el primer invitado. Sin excusas." },
              { title: "Una llamada lo resuelve todo.",      body: "Cualquier ajuste, cambio o emergencia: un solo responsable, antes y durante el evento." },
            ].map((item, i) => (
              <R key={item.title} delay={i * 90}>
                <div className="rounded-2xl p-6 h-full"
                     style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-8 h-px mb-6" style={{ background: GOLD }} />
                  <h4 className="font-semibold text-white text-sm mb-3 leading-snug">{item.title}</h4>
                  <p className="text-white/40 text-xs leading-relaxed">{item.body}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Proceso ── */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Cómo trabajamos</p>
            <h2 className="font-bold text-white leading-tight mb-16"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.02em" }}>
              De cero a evento impecable —<br />en cinco pasos
            </h2>
          </R>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10 mb-14">
            {[
              { n: "1", title: "Contáctanos",            body: "Cuéntanos tu evento. Respondemos en menos de 24h." },
              { n: "2", title: "Levantamiento técnico",  body: "Analizamos el espacio y el programa. La propuesta es precisa desde el primer borrador." },
              { n: "3", title: "Cotización personalizada", body: "Clara, sin letra chica. Ajustamos lo que necesites." },
              { n: "4", title: "Confirmación y reserva", body: "Contrato, anticipo y la fecha bloqueada en nuestra agenda." },
              { n: "5", title: "Coordinación previa",    body: "Revisamos el programa contigo. Llegamos listos para ejecutar." },
            ].map((step, i) => (
              <R key={step.n} delay={i * 80}>
                <div className="flex gap-6">
                  <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
                       style={{ background: "rgba(179,152,91,0.1)", color: GOLD, border: `1px solid ${GOLD}25` }}>
                    {step.n}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1.5">{step.title}</h4>
                    <p className="text-white/45 text-sm leading-relaxed">{step.body}</p>
                  </div>
                </div>
              </R>
            ))}
          </div>

          {/* Frase final — no es paso */}
          <R delay={400}>
            <div className="rounded-2xl px-8 py-7 text-center"
                 style={{ background: `rgba(179,152,91,0.06)`, border: `1px solid ${GOLD}22` }}>
              <p className="font-bold text-white" style={{ fontSize: "clamp(1.3rem,3vw,2rem)", letterSpacing: "-0.02em" }}>
                El día de tu evento,<br />
                <span style={{ color: GOLD }}>solo disfruta.</span>
              </p>
            </div>
          </R>
        </div>
      </section>

      {/* ── Zonas de servicio ── */}
      <section className="py-24 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Zonas de servicio</p>
            <h2 className="font-bold text-white leading-tight mb-4"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.02em" }}>
              Donde trabajamos
            </h2>
            <p className="text-white/40 text-sm mb-14">
              Querétaro · Guanajuato · El Bajío · Ciudad de México · Puebla
            </p>
          </R>
          <R delay={120}>
            <MexicoMap />
          </R>
          <R delay={200}>
            <div className="mt-10 text-center">
              <a href="/presentacion/inventario"
                 className="text-[#B3985B] text-sm font-semibold tracking-wide inline-flex items-center gap-2 hover:gap-3 transition-all">
                Ver inventario de equipo
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            </div>
          </R>
        </div>
      </section>

      {/* ── Tagline ── */}
      <section className="py-32 px-6 relative overflow-hidden" style={{ background: "#040404" }}>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <R y={20}>
            <div className="mb-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="absolute inset-0 rounded-full pointer-events-none"
                     style={{ border: `1px solid ${GOLD}18`, animation: `pulse-ring ${2 + i * 0.5}s ease-out ${i * 0.8}s infinite`, margin: "auto", width: "60%", height: "200%" }} />
              ))}
            </div>
            <p className="font-bold text-white leading-[1.08]"
               style={{ fontSize: "clamp(2rem,6vw,5rem)", letterSpacing: "-0.03em" }}>
              Para que mañana,<br />
              <span style={{ color: GOLD }}>todos sigan hablando de tu evento.</span>
            </p>
          </R>
        </div>
      </section>

      {/* ── Galería ── */}
      <section className="py-20 px-6 bg-[#060606]">
        <div className="max-w-6xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Nuestro trabajo</p>
            <h2 className="font-bold text-white leading-tight mb-12"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.02em" }}>
              Cada evento, una producción<br /><span style={{ color: GOLD }}>hecha a medida.</span>
            </h2>
          </R>
          <div className="columns-2 sm:columns-3 gap-3 space-y-3">
            {[
              { src: "/images/presentacion/musicales/Musicales-016.jpg",      alt: "Musical" },
              { src: "/images/presentacion/sociales/s-hacienda-iluminada.jpg", alt: "Social" },
              { src: "/images/presentacion/empresariales/e-sala-pantallas.jpg",alt: "Empresarial" },
              { src: "/images/presentacion/musicales/Musicales-037.jpg",      alt: "Musical" },
              { src: "/images/presentacion/sociales/s-piano-pista.jpg",       alt: "Social" },
              { src: "/images/presentacion/empresariales/e-auditorio.jpg",    alt: "Empresarial" },
              { src: "/images/presentacion/musicales/MAGIC_ROOM_260307_GUANAJUATO_078.jpg", alt: "Musical" },
              { src: "/images/presentacion/sociales/s-boda-colonial.jpg",     alt: "Social" },
              { src: "/images/presentacion/empresariales/e-networking.jpg",   alt: "Empresarial" },
              { src: "/images/presentacion/musicales/Musicales-076.jpg",      alt: "Musical" },
              { src: "/images/presentacion/sociales/s-dj-salon.png",          alt: "Social" },
              { src: "/images/presentacion/empresariales/e-edificio-azul.jpg",alt: "Empresarial" },
            ].map((p, i) => (
              <R key={i} delay={i * 40} className="break-inside-avoid">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt={p.alt} draggable={false}
                     className="w-full rounded-xl object-cover hover:opacity-90 transition-opacity duration-300" />
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-6">Siguiente paso</p>
            <h2 className="font-bold text-white leading-tight mb-6"
                style={{ fontSize: "clamp(1.8rem,4vw,3.2rem)", letterSpacing: "-0.025em" }}>
              Tu próximo evento,<br />
              <span style={{ color: GOLD }}>en buenas manos.</span>
            </h2>
            <p className="text-white/45 mb-10">
              Escríbenos. Respondemos en menos de 24 horas.
            </p>
            <a href={WA} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-3 px-10 py-5 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-xl"
               style={{ background: GOLD, boxShadow: `0 0 0 0 ${GOLD}40` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Iniciar conversación
            </a>
          </R>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 border-t border-white/[0.04] text-center">
        <p className="text-white/20 text-xs tracking-wide">
          © {new Date().getFullYear()} Mainstage Pro · Soluciones Audiovisuales Profesionales
        </p>
      </footer>

    </div>
  );
}
