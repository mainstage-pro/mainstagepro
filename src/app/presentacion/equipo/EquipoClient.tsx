"use client";
import { useEffect, useRef, useState } from "react";

const GOLD = "#B3985B";
const WA   = "https://wa.me/524461432565?text=Hola%2C%20vi%20la%20presentaci%C3%B3n%20de%20Mainstage%20Pro%20y%20me%20interesa%20saber%20m%C3%A1s%20sobre%20las%20oportunidades%20del%20equipo.";

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
export default function EquipoClient() {
  const scrolled = useScrollHeader();

  return (
    <div className="bg-[#080808] text-white min-h-screen" style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>

      <style>{`
        @keyframes kenBurns { from { transform:scale(1) translate(0,0); } to { transform:scale(1.06) translate(-1%,-0.8%); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
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
            Conversemos
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/presentacion/hero-festival.png" alt="" draggable={false}
               className="w-full h-full object-cover"
               style={{ animation: "kenBurns 14s ease forwards" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.45) 0%, rgba(8,8,8,0.55) 40%, rgba(8,8,8,0.88) 80%, #080808 100%)" }} />
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <p className="text-[#B3985B] text-xs font-semibold tracking-[0.28em] uppercase mb-6"
             style={{ animation: "fadeUp 0.8s ease forwards 0.2s", opacity: 0 }}>
            Mainstage Pro · Únete al equipo
          </p>
          <h1 className="font-bold text-white leading-[1.0]"
              style={{ fontSize: "clamp(2.8rem,8vw,7rem)", letterSpacing: "-0.03em", animation: "fadeUp 0.9s ease forwards 0.4s", opacity: 0 }}>
            No es solo<br />
            <span style={{ color: GOLD }}>un trabajo.</span>
          </h1>
          <p className="text-white/60 mt-8 leading-relaxed max-w-xl mx-auto"
             style={{ fontSize: "clamp(1rem,2vw,1.2rem)", animation: "fadeUp 0.9s ease forwards 0.65s", opacity: 0 }}>
            Es el escenario. Es el ruido de una multitud cuando el show arranca.
            Es hacer que algo grande pase — y saber que tú fuiste parte de eso.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
               style={{ animation: "fadeUp 0.9s ease forwards 0.85s", opacity: 0 }}>
            <a href="#por-que"
               className="px-8 py-4 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105"
               style={{ background: GOLD }}>
              Descubre Mainstage Pro
            </a>
            <a href={WA} target="_blank" rel="noopener noreferrer"
               className="px-8 py-4 rounded-full font-semibold text-white/70 text-sm tracking-wide border border-white/15 hover:border-white/30 transition-all duration-300">
              Ya quiero platicar
            </a>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40"
             style={{ animation: "fadeUp 1s ease forwards 1.2s" }}>
          <span className="text-xs tracking-[0.18em] uppercase text-white/50">Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-white/40 to-transparent" />
        </div>
      </section>

      {/* ── Statement ── */}
      <section className="py-28 px-6 max-w-5xl mx-auto">
        <R>
          <p className="text-white/30 text-xs tracking-[0.22em] uppercase mb-6">Quiénes somos</p>
          <h2 className="font-bold text-white leading-[1.1]"
              style={{ fontSize: "clamp(2rem,5vw,4rem)", letterSpacing: "-0.025em" }}>
            Somos el equipo técnico<br />
            <span style={{ color: GOLD }}>que hace que el show pase.</span>
          </h2>
          <p className="text-white/55 mt-8 max-w-2xl leading-relaxed" style={{ fontSize: "clamp(1rem,1.8vw,1.2rem)" }}>
            Mainstage Pro es una empresa de producción técnica audiovisual con base en Querétaro.
            Potenciamos cada evento con audio, iluminación y video de alto nivel —
            garantizando que el mensaje y la experiencia lleguen con impacto.
            Equipo 100% propio, operadores formados internamente, y una cultura donde
            cada persona importa y cada evento es una oportunidad real para crecer.
          </p>
        </R>
      </section>

      {/* ── Stats ── */}
      <section className="py-20 px-6 border-t border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-10 sm:gap-4">
          <StatCount target={8}   suffix="+"  label="Años en el mercado"   />
          <StatCount target={500} suffix="+"  label="Eventos realizados"   />
          <StatCount target={3}   suffix=""   label="Zonas de operación"   />
          <StatCount target={100} suffix="%"  label="Equipo propio"        />
        </div>
      </section>

      {/* ── Por qué Mainstage ── */}
      <section id="por-que" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Por qué aquí</p>
            <h2 className="font-bold text-white leading-tight mb-16"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.02em" }}>
              Lo que hace diferente<br />trabajar en Mainstage Pro
            </h2>
          </R>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                title: "Proyectos reales desde el primer día",
                body: "No hay simulacros. Desde el inicio estás en campo, con equipo profesional, en eventos que la gente recuerda. Aprendes haciendo, no observando.",
                detail: "Audio · Iluminación · Video · Logística en vivo",
                delay: 0,
              },
              {
                num: "02",
                title: "Un equipo que te respalda",
                body: "Somos pocos y nos conocemos bien. Hay comunicación directa, decisiones rápidas y un ambiente donde puedes preguntar, proponer y equivocarte sin drama.",
                detail: "Cultura abierta · Aprendizaje constante · Sin burocracia",
                delay: 120,
              },
              {
                num: "03",
                title: "Crecimiento con propósito",
                body: "Si das resultados, avanzas. Aquí no hay techo de cristal. Las personas que han crecido más son las que se involucran, proponen y empujan los estándares hacia arriba.",
                detail: "Responsabilidad creciente · Reconocimiento real",
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

      {/* ── Lo que hacemos ── */}
      <section className="py-28 px-6 bg-[#060606]">
        <div className="max-w-6xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Nuestro trabajo</p>
            <h2 className="font-bold text-white leading-tight mb-6"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.02em" }}>
              Los escenarios donde operamos
            </h2>
            <p className="text-white/45 text-base leading-relaxed mb-16 max-w-2xl">
              Cada tipo de evento tiene su propio ritmo, sus propias exigencias y su propio sabor.
              Aquí no hay días iguales.
            </p>
          </R>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                title: "Musicales",
                sub: "Conciertos · Festivales · DJ Sets · Showcases",
                description: "El sonido tiene que ser perfecto. La iluminación tiene que contar una historia. Y tú estás ahí cuando pasa.",
                img: "/images/presentacion/m-stage-green.jpg",
                delay: 0,
              },
              {
                title: "Sociales",
                sub: "Bodas · XV Años · Fiestas privadas",
                description: "Momentos únicos que se viven una sola vez. La responsabilidad es alta y la satisfacción también.",
                img: "/images/presentacion/s-couple-purple.png",
                delay: 120,
              },
              {
                title: "Empresariales",
                sub: "Conferencias · Lanzamientos · Corporativos",
                description: "Precisión, logística y ejecución al más alto nivel. Cuando el cliente necesita que todo salga perfecto.",
                img: "/images/presentacion/e-corp-screens.jpg",
                delay: 240,
              },
            ].map(ev => (
              <R key={ev.title} delay={ev.delay}>
                <div className="group relative rounded-2xl overflow-hidden" style={{ height: "380px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ev.img} alt={ev.title} draggable={false}
                       className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)" }} />
                  <div className="absolute bottom-0 left-0 right-0 p-7 space-y-2">
                    <p className="text-[#B3985B] text-xs uppercase tracking-wider">{ev.sub}</p>
                    <h3 className="font-bold text-white text-xl">{ev.title}</h3>
                    <p className="text-white/55 text-sm leading-relaxed">{ev.description}</p>
                  </div>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cómo es el día a día ── */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">El día a día</p>
            <h2 className="font-bold text-white leading-tight mb-16"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.02em" }}>
              Cómo se ve trabajar<br />con nosotros
            </h2>
          </R>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10">
            {[
              { n: "→", title: "Preparación y logística", body: "Revisas el equipo, coordinas tiempos, confirmas riders técnicos. La ejecución perfecta empieza con una buena preparación." },
              { n: "→", title: "Montaje en campo", body: "Llegas al venue, instalas el sistema, haces pruebas de sonido e iluminación. Trabajo físico, técnico y creativo al mismo tiempo." },
              { n: "→", title: "Operación en vivo", body: "El show está corriendo. Tú estás en la consola. Todo lo que pasa en el escenario pasa también por tus manos." },
              { n: "→", title: "Cierre y aprendizaje", body: "Desmontaje, inventario, retroalimentación del equipo. Cada evento deja una lección que hace mejor al siguiente." },
              { n: "→", title: "Colaboración constante", body: "Trabajamos en equipo, no en silos. Si alguien tiene una mejor idea, la escuchamos. Los mejores eventos nacen de la suma de todos." },
              { n: "→", title: "Orgullo del oficio", body: "Al final del día, cuando las luces se apagan y la gente sale feliz, sabes que lo que hiciste importó. Eso no se olvida." },
            ].map((step, i) => (
              <R key={i} delay={i * 80}>
                <div className="flex gap-6">
                  <div className="shrink-0 w-8 h-8 flex items-center justify-center text-sm font-bold"
                       style={{ color: GOLD }}>
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

      {/* ── Valores ── */}
      <section className="py-28 px-6 bg-[#060606]">
        <div className="max-w-6xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Lo que nos mueve</p>
            <h2 className="font-bold text-white leading-tight mb-16"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.02em" }}>
              Los valores que guían<br />cada decisión
            </h2>
          </R>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: "◈", title: "Excelencia", body: "No es suficiente con que funcione. Tiene que sonar, verse y sentirse perfecto. El detalle importa — siempre, no solo cuando alguien está mirando." },
              { icon: "◉", title: "Responsabilidad", body: "Cuando algo está bajo tu cargo, está bajo tu cargo. Sin excusas, sin echar balones. Resolvemos antes de que el problema se convierta en incidente." },
              { icon: "◎", title: "Compromiso y pasión", body: "Llegamos preparados, nos quedamos hasta que todo cierra bien y salimos orgullosos de lo que hicimos. No es un trabajo — es un oficio que importa." },
              { icon: "◆", title: "Mejora continua", body: "La industria evoluciona rápido. Quien se detiene, se queda atrás. Aquí aprendemos juntos, compartimos lo que funciona y mejoramos después de cada evento." },
            ].map((v, i) => (
              <R key={v.title} delay={i * 100}>
                <div className="rounded-2xl p-7 h-full"
                     style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="text-[#B3985B] text-2xl mb-5">{v.icon}</div>
                  <h4 className="font-bold text-white mb-3">{v.title}</h4>
                  <p className="text-white/45 text-sm leading-relaxed">{v.body}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Beneficios ── */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Lo que ofrecemos</p>
            <h2 className="font-bold text-white leading-tight mb-16"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.02em" }}>
              Más allá del salario
            </h2>
          </R>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { title: "Equipo profesional de primer nivel", detail: "Trabajarás con el mismo equipo que usamos en los mejores eventos del país. No con equipo viejo de práctica." },
              { title: "Ambiente de trabajo real", detail: "Sin cubículos, sin reuniones interminables. Trabajo dinámico, en campo y con propósito claro en cada jornada." },
              { title: "Crecimiento dentro de la empresa", detail: "Las personas que hoy tienen más responsabilidades empezaron aprendiendo. Si das resultados, hay camino hacia arriba." },
              { title: "Red de contactos en la industria", detail: "Trabajar en producción de eventos te conecta con artistas, promotores, marcas y clientes de toda la región." },
              { title: "Proyectos que puedes presumir", detail: "Festivales, conciertos, eventos corporativos de alto perfil. Construyes un portafolio de trabajo del que te sientes orgulloso." },
              { title: "Un equipo que se cuida", detail: "Somos personas antes que colaboradores. Aquí hay respeto, comunicación y la certeza de que no estás solo en el campo." },
            ].map((b, i) => (
              <R key={b.title} delay={i * 70}>
                <div className="flex gap-5 p-6 rounded-2xl"
                     style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="shrink-0 w-2 h-2 rounded-full mt-2" style={{ background: GOLD }} />
                  <div>
                    <h4 className="font-semibold text-white mb-1.5 text-sm">{b.title}</h4>
                    <p className="text-white/40 text-sm leading-relaxed">{b.detail}</p>
                  </div>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tagline ── */}
      <section className="py-32 px-6 relative overflow-hidden" style={{ background: "#040404" }}>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <R y={20}>
            <div className="mb-8 relative h-0">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="absolute inset-0 rounded-full pointer-events-none"
                     style={{ border: `1px solid ${GOLD}18`, animation: `pulse-ring ${2 + i * 0.5}s ease-out ${i * 0.8}s infinite`, margin: "auto", width: "60%", height: "200%" }} />
              ))}
            </div>
            <p className="font-bold text-white leading-[1.08]"
               style={{ fontSize: "clamp(2rem,6vw,5rem)", letterSpacing: "-0.03em" }}>
              "Somos el equipo<br />
              <span style={{ color: GOLD }}>que hace que el show pase."</span>
            </p>
            <p className="text-white/35 mt-8 text-base max-w-xl mx-auto leading-relaxed">
              Buscamos personas que se comprometan, que quieran mejorar con cada evento y que se emocionen con lo que hacen.
              Si eso te describe, queremos conocerte.
            </p>
          </R>
        </div>
      </section>

      {/* ── Proceso de integración ── */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Cómo es el proceso</p>
            <h2 className="font-bold text-white leading-tight mb-16"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.02em" }}>
              De la primera conversación<br />al primer evento
            </h2>
          </R>

          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px hidden sm:block" style={{ background: `linear-gradient(to bottom, ${GOLD}30, transparent)` }} />
            <div className="space-y-10">
              {[
                { n: "1", title: "Primera conversación", body: "Platícanos quién eres, qué te interesa y qué experiencia traes. Queremos conocerte como persona, no solo como candidato." },
                { n: "2", title: "Conocemos tu perfil", body: "Entendemos tus habilidades técnicas, tu disponibilidad y tus expectativas. Sin presiones — queremos que la propuesta tenga sentido para los dos." },
                { n: "3", title: "Te presentamos nuestra propuesta", body: "Si hay match, te hacemos una propuesta clara: rol, compensación, beneficios y lo que esperamos de ti. Sin letra chica." },
                { n: "4", title: "Tú decides", body: "Te damos el tiempo que necesitas para pensar. Si aceptas, coordinamos tu integración para que tu primer día sea lo más cómodo posible." },
                { n: "5", title: "Bienvenido al equipo", body: "Te presentamos al equipo, te mostramos cómo trabajamos y empezamos juntos. Tu primera jornada en campo no está lejos." },
              ].map((step, i) => (
                <R key={step.n} delay={i * 100}>
                  <div className="flex gap-8 sm:gap-10">
                    <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold z-10"
                         style={{ background: i === 4 ? GOLD : "rgba(179,152,91,0.12)", color: i === 4 ? "#000" : GOLD, border: `1px solid ${GOLD}25` }}>
                      {step.n}
                    </div>
                    <div className="pt-1.5">
                      <h4 className="font-semibold text-white mb-1.5">{step.title}</h4>
                      <p className="text-white/45 text-sm leading-relaxed">{step.body}</p>
                    </div>
                  </div>
                </R>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-6">Siguiente paso</p>
            <h2 className="font-bold text-white leading-tight mb-8"
                style={{ fontSize: "clamp(1.8rem,4vw,3.2rem)", letterSpacing: "-0.025em" }}>
              Si esto resuena contigo,<br />
              hablemos.
            </h2>
            <p className="text-white/45 mb-10 leading-relaxed">
              No necesitas un CV perfecto ni experiencia en todos los equipos.
              Solo necesitas ganas de crecer, disposición para aprender y compromiso real con lo que haces.
            </p>
            <a href={WA} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-3 px-10 py-5 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-xl"
               style={{ background: GOLD, boxShadow: `0 0 0 0 ${GOLD}40` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Quiero ser parte del equipo
            </a>
          </R>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 border-t border-white/[0.04] text-center">
        <p className="text-white/20 text-xs tracking-wide">
          © {new Date().getFullYear()} Mainstage Pro · mainstagepro.mx
        </p>
      </footer>

    </div>
  );
}
