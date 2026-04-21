"use client";
import { useEffect, useRef, useState } from "react";

const GOLD  = "#B3985B";
const WA    = "https://wa.me/524461432565?text=Hola%2C%20me%20gustar%C3%ADa%20obtener%20m%C3%A1s%20informaci%C3%B3n%20sobre%20los%20servicios%20de%20Mainstage%20Pro.";

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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ServiciosClient() {
  const scrolled = useScrollHeader();

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

      {/* ── Hero ── */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/presentacion/hero-festival.png" alt="" draggable={false}
               className="w-full h-full object-cover"
               style={{ animation: "kenBurns 12s ease forwards" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.3) 0%, rgba(8,8,8,0.5) 40%, rgba(8,8,8,0.85) 80%, #080808 100%)" }} />
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <p className="text-[#B3985B] text-xs font-semibold tracking-[0.28em] uppercase mb-6"
             style={{ animation: "fadeUp 0.8s ease forwards 0.2s", opacity: 0 }}>
            Mainstage Pro · Soluciones Audiovisuales
          </p>
          <h1 className="font-bold text-white leading-[1.0]"
              style={{ fontSize: "clamp(2.8rem,8vw,7rem)", letterSpacing: "-0.03em", animation: "fadeUp 0.9s ease forwards 0.4s", opacity: 0 }}>
            Producción técnica<br />
            <span style={{ color: GOLD }}>profesional.</span>
          </h1>
          <p className="text-white/60 mt-8 leading-relaxed max-w-xl mx-auto"
             style={{ fontSize: "clamp(1rem,2vw,1.2rem)", animation: "fadeUp 0.9s ease forwards 0.65s", opacity: 0 }}>
            7 años resolviendo la producción técnica de eventos que no pueden fallar.
            Sonido, luz, video y operadores — todo en un solo equipo, con un solo responsable.
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
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40"
             style={{ animation: "fadeUp 1s ease forwards 1.2s" }}>
          <span className="text-xs tracking-[0.18em] uppercase text-white/50">Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-white/40 to-transparent" />
        </div>
      </section>

      {/* ── Statement ── */}
      <section className="py-28 px-6 max-w-5xl mx-auto">
        <R>
          <p className="text-white/30 text-xs tracking-[0.22em] uppercase mb-6">Nuestra propuesta</p>
          <h2 className="font-bold text-white leading-[1.1]"
              style={{ fontSize: "clamp(2rem,5vw,4rem)", letterSpacing: "-0.025em" }}>
            No somos un proveedor<br />
            <span style={{ color: GOLD }}>más de equipo.</span>
          </h2>
          <p className="text-white/55 mt-8 max-w-2xl leading-relaxed" style={{ fontSize: "clamp(1rem,1.8vw,1.2rem)" }}>
            Somos el equipo técnico detrás de más de 750 eventos. Operadores formados en campo,
            equipo de nivel profesional y una sola fuente de responsabilidad — para que tú te enfoques
            en lo que importa y nosotros en que nada falle.
          </p>
        </R>
      </section>

      {/* ── Stats ── */}
      <section className="py-20 px-6 border-t border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-10 sm:gap-4">
          <StatCount target={7}   suffix="+"  label="Años de experiencia" />
          <StatCount target={750} suffix="+"  label="Eventos realizados"  />
          <StatCount target={3}   suffix=""   label="Zonas de servicio"   />
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
                body: "El equipo profesional que necesitas, entregado e instalado a tiempo. Todo sale de nuestro inventario — sin intermediarios, sin sorpresas.",
                detail: "Audio · Iluminación · Video · DJ Gear · Rigging",
                delay: 0,
              },
              {
                num: "L2",
                title: "Producción técnica",
                body: "Equipo + operadores especializados en un solo servicio. Nosotros montamos, operamos y desmontamos. Tú recibes el resultado — sin gestionar piezas por separado.",
                detail: "Ingenieros de audio e iluminación · Operación durante el evento",
                delay: 120,
              },
              {
                num: "L3",
                title: "Dirección técnica",
                body: "Diseño, planeación, coordinación y operación integral del área técnica. La capa más completa: una sola fuente de responsabilidad para todo lo técnico.",
                detail: "Desde el concepto hasta el cierre · Coordinación con tu equipo y proveedores",
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
              { title: "7 años de experiencia real", body: "Desde 2019 produciendo eventos de todos los tamaños. Conocemos lo que puede pasar y cómo anticiparlo antes de que sea un problema." },
              { title: "Ingenieros, no improvisados", body: "Cada operador trabaja en campo constantemente. El día del evento no es momento de aprender — nuestro equipo ya sabe qué hacer." },
              { title: "Setup a tiempo, siempre", body: "Llegamos con margen real para montar, calibrar y verificar todo antes de que llegue el primer invitado o artista." },
              { title: "Un solo interlocutor", body: "Audio, luz, video y operadores en un solo contrato. Si algo necesita ajuste antes o durante el evento, una llamada lo resuelve." },
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
              De cero a evento impecable —<br />en seis pasos
            </h2>
          </R>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10">
            {[
              { n: "1", title: "Contáctanos", body: "Escríbenos o llámanos. Te enviamos un formulario breve para entender tus necesidades." },
              { n: "2", title: "Levantamiento técnico", body: "Analizamos las necesidades del evento, el espacio y el programa. Con esa información diseñamos la solución técnica adecuada — no una propuesta genérica." },
              { n: "3", title: "Cotización personalizada", body: "Una propuesta clara, basada en condiciones reales del espacio. Sin supuestos ni letra chica." },
              { n: "4", title: "Ajustes y revisión", body: "Hacemos los cambios necesarios para que el resultado sea exactamente lo que imaginas." },
              { n: "5", title: "Cierre y reserva", body: "Formalizamos con contrato, recibimos el anticipo y bloqueamos la fecha en nuestra agenda." },
              { n: "6", title: "Tú disfrutas, nosotros ejecutamos", body: "Montaje, operación y desmontaje. Cuidamos cada detalle para que todo salga impecable." },
            ].map((step, i) => (
              <R key={step.n} delay={i * 80}>
                <div className="flex gap-6">
                  <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
                       style={{ background: i === 5 ? GOLD : "rgba(179,152,91,0.1)", color: i === 5 ? "#000" : GOLD, border: `1px solid ${GOLD}25` }}>
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
        </div>
      </section>

      {/* ── Zonas de servicio ── */}
      <section className="py-16 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <R>
            <p className="text-white/30 text-xs tracking-[0.2em] uppercase">Zonas de servicio</p>
            <p className="text-white text-lg font-medium mt-1">
              Querétaro · San Miguel de Allende · Ciudad de México · El Bajío
            </p>
          </R>
          <R delay={100}>
            <a href="/presentacion/inventario"
               className="text-[#B3985B] text-sm font-semibold tracking-wide flex items-center gap-2 hover:gap-3 transition-all">
              Ver inventario de equipo
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
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
              Tu evento merece técnica<br />
              <span style={{ color: GOLD }}>que no se note — solo se sienta.</span>
            </p>
          </R>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-6">Siguiente paso</p>
            <h2 className="font-bold text-white leading-tight mb-8"
                style={{ fontSize: "clamp(1.8rem,4vw,3.2rem)", letterSpacing: "-0.025em" }}>
              Cuéntanos sobre tu evento.<br />
              Nosotros nos encargamos de que todo funcione.
            </h2>
            <p className="text-white/45 mb-10 leading-relaxed">
              Respuesta en menos de 24 horas. Sin compromiso. Solo una conversación para entender qué necesitas y cotizarte con precisión.
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
