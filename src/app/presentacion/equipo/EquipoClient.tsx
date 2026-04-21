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

function R({ children, delay = 0, y = 32, className = "" }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  const { ref, vis } = useReveal();
  return (
    <div ref={ref} className={className}
         style={{
           transitionDelay: `${delay}ms`,
           opacity: vis ? 1 : 0,
           transform: vis ? "translateY(0)" : `translateY(${y}px)`,
           transition: "opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)",
         }}>
      {children}
    </div>
  );
}

function StatCount({ target, suffix = "", label }: { target: number; suffix?: string; label: string }) {
  const { count, ref } = useCounter(target);
  return (
    <div ref={ref} className="flex flex-col items-center">
      <span className="font-bold tabular-nums leading-none" style={{ fontSize: "clamp(2.8rem,6vw,5rem)", color: GOLD }}>
        {count}{suffix}
      </span>
      <span className="text-white/40 text-xs tracking-[0.14em] uppercase mt-2 text-center">{label}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function EquipoClient() {
  const scrolled = useScrollHeader();

  return (
    <div className="bg-[#080808] text-white min-h-screen"
         style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      <style>{`
        @keyframes kenBurns { from { transform:scale(1) translate(0,0); } to { transform:scale(1.07) translate(-1.2%,-0.6%); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #080808; }
        ::-webkit-scrollbar-thumb { background: rgba(179,152,91,0.35); border-radius: 2px; }
      `}</style>

      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 transition-all duration-500"
           style={{ background: scrolled ? "rgba(8,8,8,0.95)" : "transparent", backdropFilter: scrolled ? "blur(12px)" : "none", borderBottom: scrolled ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="Mainstage Pro" className="h-7 object-contain" draggable={false} />
          <a href={WA} target="_blank" rel="noopener noreferrer"
             className="text-xs font-semibold tracking-[0.14em] uppercase px-5 py-2.5 rounded-full transition-all duration-300 hover:opacity-85"
             style={{ background: GOLD, color: "#000" }}>
            Conversemos
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/presentacion/musicales/Afrodise-59.jpg" alt="" draggable={false}
               className="w-full h-full object-cover"
               style={{ animation: "kenBurns 16s ease forwards" }} />
          <div className="absolute inset-0"
               style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.3) 0%, rgba(8,8,8,0.55) 40%, rgba(8,8,8,0.9) 78%, #080808 100%)" }} />
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <p className="text-[#B3985B] text-xs font-medium tracking-[0.32em] uppercase mb-8"
             style={{ animation: "fadeUp 0.8s ease forwards 0.2s", opacity: 0 }}>
            Mainstage Pro · Únete al equipo
          </p>
          <h1 className="font-bold text-white leading-[1.02]"
              style={{ fontSize: "clamp(2.8rem,8vw,7rem)", letterSpacing: "-0.03em", animation: "fadeUp 0.95s ease forwards 0.4s", opacity: 0 }}>
            La noche que alguien<br />
            <span style={{ color: GOLD }}>va a recordar,</span><br />
            la construyes tú.
          </h1>
          <p className="text-white/50 mt-8 leading-relaxed max-w-xl mx-auto"
             style={{ fontSize: "clamp(0.95rem,1.8vw,1.15rem)", animation: "fadeUp 0.95s ease forwards 0.65s", opacity: 0 }}>
            Buscamos personas que se muevan por más que un sueldo. Que encuentren valor en el oficio, en el equipo y en lo que juntos somos capaces de crear.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
               style={{ animation: "fadeUp 0.95s ease forwards 0.88s", opacity: 0 }}>
            <a href="#escenarios"
               className="px-9 py-4 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105"
               style={{ background: GOLD }}>
              Conoce el mundo
            </a>
            <a href={WA} target="_blank" rel="noopener noreferrer"
               className="px-9 py-4 rounded-full font-semibold text-white/60 text-sm tracking-wide border border-white/15 hover:border-white/30 transition-all duration-300">
              Ya quiero platicar
            </a>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-25">
          <div className="w-px h-12 bg-gradient-to-b from-white/60 to-transparent mx-auto" />
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-20 px-6 border-t border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-3 gap-10 sm:gap-6">
          <StatCount target={7}   suffix="+" label="Años en el mercado" />
          <StatCount target={750} suffix="+" label="Eventos producidos"  />
          <StatCount target={3}   suffix=""  label="Zonas de operación"  />
        </div>
      </section>

      {/* ── Para quién es esto ── */}
      <section className="py-32 px-6 bg-[#060606]">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-5">Para quién es esto</p>
            <h2 className="font-bold text-white leading-[1.05] mb-16"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.025em" }}>
              Este lugar es para ti<br />
              <span style={{ color: "rgba(255,255,255,0.3)" }}>si el escenario te mueve.</span>
            </h2>
          </R>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                num: "01",
                title: "Te apasiona el medio",
                body: "No buscas un empleo cualquiera. Algo en los eventos en vivo —el audio, la luz, la energía de la gente— te llama. Ese impulso es lo más valioso que puedes traer.",
                delay: 0,
              },
              {
                num: "02",
                title: "Quieres aprender haciendo",
                body: "Aquí no hay simulacros ni teoría sin práctica. Desde el primer evento estás en campo, con equipo real, resolviendo situaciones reales. Se aprende rápido porque se vive rápido.",
                delay: 100,
              },
              {
                num: "03",
                title: "Te importa el resultado colectivo",
                body: "Un show bien producido no lo hace una sola persona. Aquí importa que el conjunto funcione. Las personas que más crecen son las que empujan al equipo, no solo a sí mismas.",
                delay: 200,
              },
            ].map(s => (
              <R key={s.num} delay={s.delay}>
                <div className="rounded-2xl p-8 h-full flex flex-col"
                     style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="font-mono text-[0.6rem] tracking-widest mb-6" style={{ color: GOLD }}>{s.num}</span>
                  <h3 className="font-bold text-white text-lg mb-4 leading-snug">{s.title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed flex-1">{s.body}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Escenarios ── */}
      <section id="escenarios" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-5">Los escenarios donde operamos</p>
            <h2 className="font-bold text-white leading-[1.05] mb-5"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.025em" }}>
              Cada tipo de evento tiene<br />su propio ritmo.
            </h2>
            <p className="text-white/35 text-sm mb-16 max-w-xl">Aquí no hay días iguales.</p>
          </R>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                title: "Musicales",
                sub: "Conciertos · Festivales · DJ Sets · Showcases",
                desc: "El sonido tiene que ser perfecto. La iluminación tiene que contar una historia. Y tú estás ahí cuando el show arranca.",
                img: "/images/presentacion/musicales/Musicales-016.jpg",
                delay: 0,
              },
              {
                title: "Sociales",
                sub: "Bodas · XV Años · Fiestas privadas",
                desc: "Momentos únicos que se viven una sola vez. La responsabilidad es alta — y la satisfacción al final también.",
                img: "/images/presentacion/sociales/s-hacienda-iluminada.jpg",
                delay: 100,
              },
              {
                title: "Empresariales",
                sub: "Conferencias · Lanzamientos · Corporativos",
                desc: "Precisión, logística y ejecución al más alto nivel. Cuando el cliente necesita que todo salga perfecto.",
                img: "/images/presentacion/empresariales/e-auditorio.jpg",
                delay: 200,
              },
            ].map(ev => (
              <R key={ev.title} delay={ev.delay}>
                <div className="group relative rounded-2xl overflow-hidden" style={{ height: "400px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ev.img} alt={ev.title} draggable={false}
                       className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0"
                       style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.25) 55%, transparent 100%)" }} />
                  <div className="absolute bottom-0 left-0 right-0 p-7 space-y-2">
                    <p className="text-[#B3985B] text-xs uppercase tracking-wider">{ev.sub}</p>
                    <h3 className="font-bold text-white text-xl">{ev.title}</h3>
                    <p className="text-white/50 text-sm leading-relaxed">{ev.desc}</p>
                  </div>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Lo que te espera ── */}
      <section className="py-28 px-6 bg-[#060606]">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-5">Lo que te espera aquí</p>
            <h2 className="font-bold text-white leading-[1.05] mb-16"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.025em" }}>
              Más allá del sueldo.
            </h2>
          </R>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px"
               style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", overflow: "hidden" }}>
            {[
              { title: "Proyectos que puedes presumir", body: "Festivales, conciertos, eventos corporativos de alto perfil. Construyes un portafolio del que te sientes orgulloso — en cada evento." },
              { title: "Un equipo que te respalda", body: "Somos pocos y nos conocemos bien. Comunicación directa, decisiones rápidas y un ambiente donde puedes preguntar, proponer y equivocarte sin drama." },
              { title: "Red dentro de la industria", body: "Trabajar en producción de eventos te conecta con artistas, promotores, booking y clientes de toda la región. Eso tiene un valor que no se refleja en el recibo de nómina." },
              { title: "Crecimiento real", body: "Las personas que hoy tienen más responsabilidades empezaron aprendiendo aquí. Si das resultados, hay camino. Sin techo de cristal." },
            ].map((b, i) => (
              <R key={i} delay={i * 80}>
                <div className="p-8 sm:p-10"
                     style={{ background: "rgba(255,255,255,0.025)", borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.06)" : "none", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                  <p className="font-mono text-[0.6rem] tracking-widest mb-5" style={{ color: GOLD }}>{String(i + 1).padStart(2, "0")}</p>
                  <h4 className="font-semibold text-white mb-3 leading-snug" style={{ fontSize: "0.95rem" }}>{b.title}</h4>
                  <p className="text-white/40 text-sm leading-relaxed">{b.body}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Valores ── */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-5">Lo que nos mueve</p>
            <h2 className="font-bold text-white leading-[1.05] mb-16"
                style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.025em" }}>
              Cuatro cosas que no<br />negociamos.
            </h2>
          </R>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: "◈", title: "Excelencia", body: "Funcionar no es suficiente. Tiene que sonar, verse y sentirse perfecto. El detalle importa siempre." },
              { icon: "◉", title: "Responsabilidad", body: "Lo que está a tu cargo, está resuelto. Sin excusas, sin balones. Antes de que el problema se note." },
              { icon: "◎", title: "Pasión por el oficio", body: "El escenario se siente diferente cuando amas lo que haces. Buscamos esa diferencia en cada persona." },
              { icon: "◆", title: "Equipo primero", body: "El mejor show es el que nadie hace solo. Lo que suma al conjunto importa más que el protagonismo individual." },
            ].map((v, i) => (
              <R key={v.title} delay={i * 80}>
                <div className="rounded-2xl p-7 h-full"
                     style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="text-2xl mb-5" style={{ color: GOLD }}>{v.icon}</div>
                  <h4 className="font-bold text-white mb-3 text-base">{v.title}</h4>
                  <p className="text-white/40 text-sm leading-relaxed">{v.body}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA + Proceso ── */}
      <section className="py-32 px-6 bg-[#040404]">
        <div className="max-w-4xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-5 text-center">Siguiente paso</p>
            <h2 className="font-bold text-white leading-[1.05] text-center mb-4"
                style={{ fontSize: "clamp(2rem,5vw,4rem)", letterSpacing: "-0.028em" }}>
              Si esto resuena contigo,<br />hablemos.
            </h2>
            <p className="text-white/35 text-center mb-14 max-w-lg mx-auto text-sm leading-relaxed">
              No necesitas un CV perfecto. Solo ganas genuinas de aprender, compromiso real y que el medio te mueva.
            </p>
          </R>

          <R delay={100}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px mb-14"
                 style={{ border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", overflow: "hidden" }}>
              {[
                { n: "1", t: "Nos escribes", d: "Cuéntanos quién eres y qué te interesa. Sin presiones." },
                { n: "2", t: "Platicamos", d: "Una conversación directa para conocernos y ver si hay match." },
                { n: "3", t: "Primer evento", d: "Si encajamos, tu primera jornada en campo no está lejos." },
              ].map((p, i) => (
                <div key={i} className="p-7 text-center"
                     style={{ background: "rgba(255,255,255,0.02)", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-4 text-xs font-bold"
                       style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}25` }}>
                    {p.n}
                  </div>
                  <h4 className="font-semibold text-white text-sm mb-2">{p.t}</h4>
                  <p className="text-white/35 text-xs leading-relaxed">{p.d}</p>
                </div>
              ))}
            </div>
          </R>

          <R delay={200}>
            <div className="text-center">
              <a href={WA} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-3 px-10 py-5 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105"
                 style={{ background: GOLD }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Quiero ser parte del equipo
              </a>
            </div>
          </R>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 border-t border-white/[0.04] text-center">
        <p className="text-white/18 text-xs tracking-wide">
          © {new Date().getFullYear()} Mainstage Pro · mainstagepro.mx
        </p>
      </footer>
    </div>
  );
}
