"use client";
import { useEffect, useRef, useState } from "react";
import PresentacionNav from "@/components/presentacion/PresentacionNav";
import ServiciosCards from "@/components/presentacion/ServiciosCards";
import { useTiposEventoMaterial, type MaterialTipoEvento } from "@/lib/tipos-evento-cliente";

const GOLD = "#B3985B";
const WA   = "https://wa.me/524461432565?text=Hola%2C%20me%20gustar%C3%ADa%20obtener%20m%C3%A1s%20informaci%C3%B3n%20sobre%20los%20servicios%20de%20Mainstage%20Pro.";

// El slug enlaza con el tipo de evento (fuente maestra); la imagen se toma de su
// mejor destacada, con esta ruta como fallback si aún no cargó.
const HERO_SLIDES = [
  { slug: "musical",     src: "/images/presentacion/musicales/Musicales-016.jpg",        label: "Musicales" },
  { slug: "social",      src: "/images/presentacion/sociales/s-hacienda-iluminada.jpg",  label: "Sociales" },
  { slug: "empresarial", src: "/images/presentacion/empresariales/e-sala-pantallas.jpg", label: "Empresariales" },
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
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStarted(true); obs.disconnect(); } }, { threshold: 0, rootMargin: "0px 0px -10% 0px" });
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
    <div ref={ref} className="flex flex-col items-center text-center">
      <span className="font-bold tabular-nums leading-none" style={{ fontSize: "clamp(2.4rem,5vw,3.6rem)", color: GOLD }}>
        {count}{suffix}
      </span>
      <span className="text-white/45 text-[11px] sm:text-xs tracking-[0.12em] uppercase mt-2">{label}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ServiciosClient({ initialTipos = [] }: { initialTipos?: MaterialTipoEvento[] }) {
  const [heroIdx, setHeroIdx] = useState(0);
  const { coverPorSlug } = useTiposEventoMaterial(initialTipos);
  const slides = HERO_SLIDES.map((s) => ({ ...s, src: coverPorSlug(s.slug, s.src) }));

  useEffect(() => {
    const t = setInterval(() => setHeroIdx(i => (i + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bg-[#080808] text-white min-h-screen" style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: rgba(179,152,91,0.35); border-radius: 2px; }
      `}</style>

      {/* ── Nav unificada ── */}
      <PresentacionNav />

      {/* ── Hero con slideshow ── */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        {slides.map((slide, i) => (
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

        <div className="absolute inset-0 z-10" style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.25) 0%, rgba(8,8,8,0.45) 40%, rgba(8,8,8,0.82) 80%, #080808 100%)" }} />

        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex gap-2">
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
            Mainstage Pro · Producción técnica de eventos
          </p>
          <h1 className="font-bold text-white leading-[1.0]"
              style={{ fontSize: "clamp(2.8rem,8vw,7rem)", letterSpacing: "-0.03em", animation: "fadeUp 0.9s ease forwards 0.4s", opacity: 0 }}>
            Todo resuelto.<br />
            <span style={{ color: GOLD }}>Tú solo disfruta.</span>
          </h1>
          <p className="text-white/60 mt-8 max-w-lg mx-auto"
             style={{ fontSize: "clamp(1rem,2vw,1.15rem)", animation: "fadeUp 0.9s ease forwards 0.65s", opacity: 0 }}>
            Audio, iluminación, video y operadores expertos. Un solo equipo que lo maneja todo.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
               style={{ animation: "fadeUp 0.9s ease forwards 0.85s", opacity: 0 }}>
            <a href={WA} target="_blank" rel="noopener noreferrer"
               className="px-8 py-4 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105"
               style={{ background: GOLD }}>
              Contactar
            </a>
            <a href="/presentacion/inventario"
               className="px-8 py-4 rounded-full font-semibold text-white/70 text-sm tracking-wide border border-white/15 hover:border-white/30 transition-all duration-300">
              Ver inventario
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40 z-20"
             style={{ animation: "fadeUp 1s ease forwards 1.2s" }}>
          <span className="text-xs tracking-[0.18em] uppercase text-white/50">Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-white/40 to-transparent" />
        </div>
      </section>

      {/* ── Stats (franja compacta) ── */}
      <section className="py-14 px-6 border-b border-white/[0.05]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-4">
          <StatCount target={7}   suffix="+" label="Años de experiencia" />
          <StatCount target={750} suffix="+" label="Eventos realizados"  />
          <StatCount target={5}   suffix=""  label="Zonas de servicio"   />
          <StatCount target={100} suffix="%" label="Compromiso" />
        </div>
      </section>

      {/* ── Servicios: 3 niveles ── */}
      <section id="servicios" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Lo que ofrecemos</p>
            <h2 className="font-bold text-white leading-tight mb-12"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.02em" }}>
              Tres formas de trabajar<br />con Mainstage Pro
            </h2>
          </R>

          <ServiciosCards />
        </div>
      </section>

      {/* ── Tipos de eventos ── */}
      <section className="py-24 px-6 bg-[#060606]">
        <div className="max-w-6xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Para qué eventos trabajamos</p>
            <h2 className="font-bold text-white leading-tight mb-12"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.02em" }}>
              Cada evento, con la producción<br />que merece
            </h2>
          </R>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { title: "Musicales",     sub: "Conciertos · Festivales · DJ Sets",   img: "/images/presentacion/musicales/Musicales-016.jpg",        href: "/presentacion/evento/musical",     delay: 0 },
              { title: "Sociales",      sub: "Bodas · XV Años · Fiestas privadas",  img: "/images/presentacion/sociales/s-hacienda-iluminada.jpg",  href: "/presentacion/evento/social",      delay: 120 },
              { title: "Empresariales", sub: "Conferencias · Lanzamientos · Ferias",img: "/images/presentacion/empresariales/e-sala-pantallas.jpg", href: "/presentacion/evento/empresarial", delay: 240 },
              { title: "Otros eventos", sub: "Deportivos · Teatro · Comedia · Prensa", img: "/images/presentacion/empresariales/e-auditorio.jpg",  href: "/presentacion/evento/otro",        delay: 360 },
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

      {/* ── Por qué Mainstage (razones de una línea) ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Por qué Mainstage Pro</p>
            <h2 className="font-bold text-white leading-tight mb-12"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.02em" }}>
              Lo que nos hace<br /><span style={{ color: GOLD }}>la opción correcta.</span>
            </h2>
          </R>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "Llegas a disfrutar, no a resolver.",
              "Operadores que viven en escena.",
              "Todo listo antes del primer invitado.",
              "Una llamada lo resuelve todo.",
            ].map((title, i) => (
              <R key={title} delay={i * 90}>
                <div className="rounded-2xl p-6 h-full" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-8 h-px mb-6" style={{ background: GOLD }} />
                  <h4 className="font-semibold text-white text-sm leading-snug">{title}</h4>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cómo trabajamos + Zonas (bloque compacto fusionado) ── */}
      <section className="py-24 px-6 bg-[#060606] border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Cómo trabajamos — timeline horizontal compacto */}
          <div>
            <R>
              <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Cómo trabajamos</p>
              <h2 className="font-bold text-white leading-tight mb-10"
                  style={{ fontSize: "clamp(1.6rem,3.5vw,2.4rem)", letterSpacing: "-0.02em" }}>
                De cero a evento impecable
              </h2>
            </R>
            <div className="space-y-5">
              {[
                { n: "1", title: "Contáctanos",             body: "Respondemos en menos de 24 h." },
                { n: "2", title: "Levantamiento técnico",   body: "Analizamos espacio y programa." },
                { n: "3", title: "Cotización personalizada",body: "Clara, sin letra chica." },
                { n: "4", title: "Confirmación y reserva",  body: "Fecha bloqueada en agenda." },
                { n: "5", title: "Coordinación previa",     body: "Llegamos listos para ejecutar." },
              ].map((step, i) => (
                <R key={step.n} delay={i * 70}>
                  <div className="flex gap-4 items-start">
                    <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                         style={{ background: "rgba(179,152,91,0.1)", color: GOLD, border: `1px solid ${GOLD}25` }}>
                      {step.n}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-sm">{step.title}</h4>
                      <p className="text-white/40 text-xs leading-relaxed">{step.body}</p>
                    </div>
                  </div>
                </R>
              ))}
            </div>
          </div>

          {/* Zonas — lista corta */}
          <div>
            <R>
              <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Zonas de servicio</p>
              <h2 className="font-bold text-white leading-tight mb-10"
                  style={{ fontSize: "clamp(1.6rem,3.5vw,2.4rem)", letterSpacing: "-0.02em" }}>
                Dónde trabajamos
              </h2>
            </R>
            <R delay={80}>
              <div className="border-t border-white/[0.06]">
                {[
                  { ciudad: "Querétaro",              detalle: "Base de operaciones",       primary: true  },
                  { ciudad: "León",                   detalle: "El Bajío",                  primary: true  },
                  { ciudad: "San Miguel de Allende",  detalle: "Guanajuato",                primary: false },
                  { ciudad: "Ciudad de México",       detalle: "CDMX y ZMVM",               primary: true  },
                  { ciudad: "Puebla",                 detalle: "Puebla · Tlaxcala",         primary: false },
                ].map((z, i) => (
                  <div key={i} className="flex items-center justify-between py-4 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${z.primary ? "bg-[#B3985B]" : "bg-white/20"}`} />
                      <span className={`font-semibold tracking-tight ${z.primary ? "text-white" : "text-white/50"}`}
                            style={{ fontSize: "clamp(1rem,2vw,1.2rem)" }}>
                        {z.ciudad}
                      </span>
                    </div>
                    <span className="text-white/30 text-xs">{z.detalle}</span>
                  </div>
                ))}
              </div>
            </R>
            <R delay={160}>
              <p className="text-white/25 text-xs leading-relaxed mt-6">
                ¿Tu evento es fuera de estas ciudades? Nos desplazamos a cualquier punto de la República.
              </p>
            </R>
          </div>
        </div>
      </section>

      {/* ── Prueba social: nuestro trabajo ── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Nuestro trabajo</p>
            <h2 className="font-bold text-white leading-tight mb-10"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.02em" }}>
              Cada evento, una producción<br /><span style={{ color: GOLD }}>hecha a medida.</span>
            </h2>
          </R>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              "/images/presentacion/musicales/Musicales-016.jpg",
              "/images/presentacion/sociales/s-hacienda-iluminada.jpg",
              "/images/presentacion/empresariales/e-sala-pantallas.jpg",
              "/images/presentacion/musicales/Musicales-037.jpg",
              "/images/presentacion/sociales/s-piano-pista.jpg",
              "/images/presentacion/empresariales/e-auditorio.jpg",
            ].map((src, i) => (
              <R key={i} delay={i * 50} className="overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="Producción Mainstage Pro" draggable={false}
                     className="w-full h-full object-cover aspect-[4/3] hover:scale-105 transition-transform duration-500" />
              </R>
            ))}
          </div>
          <R delay={120}>
            <div className="mt-8 text-center">
              <a href="/presentacion/galeria"
                 className="text-[#B3985B] text-sm font-semibold tracking-wide inline-flex items-center gap-2 hover:gap-3 transition-all">
                Ver galería completa
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            </div>
          </R>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-28 px-6" style={{ background: "#040404" }}>
        <div className="max-w-3xl mx-auto text-center">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-6">Siguiente paso</p>
            <h2 className="font-bold text-white leading-tight mb-6"
                style={{ fontSize: "clamp(1.9rem,5vw,3.4rem)", letterSpacing: "-0.025em" }}>
              Tu próximo evento,<br />
              <span style={{ color: GOLD }}>en buenas manos.</span>
            </h2>
            <p className="text-white/45 mb-10">
              Escríbenos. Respondemos en menos de 24 horas.
            </p>
            <a href={WA} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-3 px-10 py-5 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105"
               style={{ background: GOLD }}>
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
          © {new Date().getFullYear()} Mainstage Pro · Producción técnica de eventos
        </p>
      </footer>

    </div>
  );
}
