"use client";

import { useEffect, useRef, useState } from "react";

const GOLD = "#B3985B";

function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el); return () => obs.disconnect();
  }, [threshold]);
  return { ref, vis };
}

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const fn = () => setY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return y;
}

function R({ children, delay = 0, y = 28, className = "" }: {
  children: React.ReactNode; delay?: number; y?: number; className?: string;
}) {
  const { ref, vis } = useReveal();
  return (
    <div ref={ref} className={className}
         style={{
           transitionDelay: `${delay}ms`,
           opacity: vis ? 1 : 0,
           transform: vis ? "translateY(0)" : `translateY(${y}px)`,
           transition: "opacity 0.65s cubic-bezier(0.16,1,0.3,1), transform 0.65s cubic-bezier(0.16,1,0.3,1)",
         }}>
      {children}
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return <p className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>{label}</p>;
}

function SectionTitle({ tag, children }: { tag: string; children: React.ReactNode }) {
  return (
    <R>
      <Tag label={tag} />
      <h2 className="font-bold text-white leading-tight mb-10"
          style={{ fontSize: "clamp(2rem,5vw,3.5rem)", letterSpacing: "-0.025em" }}>
        {children}
      </h2>
    </R>
  );
}

function Card({ children, gold = false }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <div className="rounded-2xl p-6 h-full"
         style={{
           background: gold ? "rgba(179,152,91,0.04)" : "rgba(255,255,255,0.025)",
           border: `1px solid ${gold ? "rgba(179,152,91,0.15)" : "rgba(255,255,255,0.06)"}`,
         }}>
      {children}
    </div>
  );
}

export default function AlineacionClient() {
  const scrollY = useScrollY();
  const navOpacity = Math.min(0.95, scrollY / 80);
  const [activeNav, setActiveNav] = useState("");

  useEffect(() => {
    const sections = ["identidad","servicios","mercado","cultura","ejecucion","equipo"];
    const obs = new IntersectionObserver(
      (entries) => { entries.forEach(e => { if (e.isIntersecting) setActiveNav(e.target.id); }); },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  const NAV = [
    { id: "identidad", label: "01 Identidad" },
    { id: "servicios", label: "02 Servicios" },
    { id: "mercado",   label: "03 Mercado" },
    { id: "cultura",   label: "04 Cultura" },
    { id: "ejecucion", label: "05 Ejecución" },
    { id: "equipo",    label: "06 Equipo" },
  ];

  return (
    <main className="bg-[#060606] text-white overflow-x-hidden"
          style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:.3} 100%{transform:scale(1.5);opacity:0} }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: rgba(179,152,91,0.35); border-radius: 2px; }
      `}</style>

      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50"
           style={{
             background: `rgba(6,6,6,${navOpacity})`,
             backdropFilter: scrollY > 20 ? "blur(20px)" : "none",
             borderBottom: scrollY > 20 ? "1px solid rgba(255,255,255,0.04)" : "none",
             transition: "background .3s",
           }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="Mainstage Pro" className="h-5 opacity-90" draggable={false} />
          <div className="hidden lg:flex items-center gap-6">
            {NAV.map(({ id, label }) => (
              <a key={id} href={`#${id}`}
                 className="text-[11px] tracking-wide transition-colors duration-200"
                 style={{ color: activeNav === id ? GOLD : "rgba(255,255,255,0.3)" }}>
                {label}
              </a>
            ))}
          </div>
          <span className="text-white/20 text-xs tracking-wider hidden sm:block">v1.1 · 2026</span>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col justify-center px-6 sm:px-12 pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          opacity: 0.03,
          backgroundImage: "linear-gradient(rgba(179,152,91,1) 1px,transparent 1px),linear-gradient(90deg,rgba(179,152,91,1) 1px,transparent 1px)",
          backgroundSize: "80px 80px",
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 60%, rgba(179,152,91,0.05) 0%, transparent 65%)",
        }} />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-10 px-3 py-1.5 rounded-full w-fit"
               style={{ border: "1px solid rgba(179,152,91,0.2)", background: "rgba(179,152,91,0.04)",
                        animation: "fadeUp .6s ease forwards .1s", opacity: 0 }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: GOLD }}>
              Alineación Estratégica · Mainstage Pro
            </span>
          </div>

          <h1 className="font-bold text-white leading-[0.95] mb-6"
              style={{ fontSize: "clamp(3rem,10vw,8rem)", letterSpacing: "-0.04em",
                       animation: "fadeUp .8s ease forwards .25s", opacity: 0 }}>
            Esto es<br />
            <span style={{ color: GOLD }}>Mainstage</span><br />
            <span className="text-white/30">Pro.</span>
          </h1>

          <p className="text-white/45 mb-10"
             style={{ fontSize: "clamp(1rem,2vw,1.15rem)",
                      animation: "fadeUp .8s ease forwards .45s", opacity: 0 }}>
            Quiénes somos, qué hacemos, cómo operamos<br className="hidden sm:block" />
            y qué se espera de cada persona en el equipo.
          </p>

          <div className="flex flex-wrap gap-2"
               style={{ animation: "fadeUp .8s ease forwards .6s", opacity: 0 }}>
            {NAV.map(({ id, label }) => (
              <a key={id} href={`#${id}`}
                 className="text-xs px-4 py-2 rounded-full hover:text-white transition-colors"
                 style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}>
                {label}
              </a>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-20">
          <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/50 to-transparent" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 01 IDENTIDAD */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section id="identidad" className="py-20 px-6 sm:px-12 border-t border-white/[0.04]" style={{ background: "#040404" }}>
        <div className="max-w-5xl mx-auto space-y-14">

          <SectionTitle tag="01 — Identidad">Por qué existimos.</SectionTitle>

          {/* Origen + Misión + Visión */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                label: "Origen",
                headline: "Pasión por los eventos en vivo.",
                body: "Existimos para que el show funcione, suene, se vea y se viva al nivel que el proyecto merece.",
              },
              {
                label: "Misión",
                headline: "Convertir ideas en experiencias reales.",
                body: "Desarrollo y ejecución de producción técnica con creatividad, organización y profesionalismo.",
              },
              {
                label: "Visión",
                headline: "Aliados clave de marcas y artistas.",
                body: "Ser parte del equipo de producción de nuestros clientes a nivel nacional.",
              },
            ].map((item, i) => (
              <R key={item.label} delay={i * 70}>
                <Card gold={i === 0}>
                  <Tag label={item.label} />
                  <p className="text-white font-bold text-base mb-2 leading-snug">{item.headline}</p>
                  <p className="text-white/45 text-sm leading-relaxed">{item.body}</p>
                </Card>
              </R>
            ))}
          </div>

          {/* Propuesta + Promesa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <R>
              <Card>
                <Tag label="Propuesta de valor" />
                <p className="text-white font-bold text-xl mb-2">Descubrimos, dirigimos, planeamos y ejecutamos.</p>
                <p className="text-white/40 text-sm">Tres líneas de servicio para el nivel de acompañamiento que cada cliente necesita.</p>
              </Card>
            </R>
            <R delay={80}>
              <Card gold>
                <Tag label="Promesa de servicio" />
                <p className="text-white font-bold text-xl mb-2">Seguridad y control. Sin improvisación.</p>
                <p className="text-white/40 text-sm">Equipo confiable, procesos claros, comunicación honesta y ejecución consistente.</p>
              </Card>
            </R>
          </div>

          {/* Diferenciadores */}
          <div>
            <R><p className="text-[10px] uppercase tracking-widest mb-6" style={{ color: GOLD }}>Lo que nos hace diferentes</p></R>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { n: "D1", title: "Calidad humana",          body: "Actitud y profesionalismo bajo presión." },
                { n: "D2", title: "Descubrimiento profundo", body: "Entendemos el proyecto antes de cotizar." },
                { n: "D3", title: "Dirección técnica integral", body: "Un responsable para todo lo técnico." },
                { n: "D4", title: "Inventario + aliados",    body: "Cobertura en Querétaro y todo México." },
                { n: "D5", title: "Ritmo y seguimiento",     body: "Reuniones, entregables y control de cambios." },
                { n: "D6", title: "Replicabilidad",          body: "Cada proyecto se convierte en modelo mejorable." },
              ].map((d, i) => (
                <R key={d.n} delay={i * 50}>
                  <div className="rounded-xl p-4 h-full"
                       style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-[#B3985B]/30 text-[10px] font-mono tracking-widest mb-2">{d.n}</p>
                    <p className="text-white text-sm font-semibold mb-1">{d.title}</p>
                    <p className="text-white/35 text-xs">{d.body}</p>
                  </div>
                </R>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 02 SERVICIOS */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section id="servicios" className="py-20 px-6 sm:px-12 border-t border-white/[0.04]" style={{ background: "#060606" }}>
        <div className="max-w-5xl mx-auto space-y-10">

          <SectionTitle tag="02 — Oferta de servicios">Tres líneas.<br />Un estándar.</SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                num: "L1", title: "Renta de equipo", tagline: "Equipo listo. Sin operación.",
                includes: ["Cotización de renta","Entrega o recolección","Equipo revisado y listo"],
                delay: 0,
              },
              {
                num: "L2", title: "Producción técnica", tagline: "Equipo + operadores.",
                includes: ["Montaje, operación y desmontaje","Coordinación interna de tiempos","Descubrimiento básico del alcance"],
                delay: 80,
              },
              {
                num: "L3", title: "Dirección Técnica Integral", tagline: "Alianza total. Un responsable.",
                includes: ["Brief técnico y control de cambios","Renders, plots y plan de operación","Riders, estándares y checklists"],
                delay: 160,
              },
            ].map(s => (
              <R key={s.num} delay={s.delay}>
                <div className="rounded-2xl overflow-hidden h-full flex flex-col"
                     style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="p-6 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <span className="text-[#B3985B]/35 text-xs font-mono tracking-widest block mb-2">{s.num}</span>
                    <h3 className="text-white font-bold text-lg mb-1">{s.title}</h3>
                    <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider">{s.tagline}</p>
                  </div>
                  <div className="p-6 flex-1">
                    <ul className="space-y-2">
                      {s.includes.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-white/55">
                          <span className="shrink-0 mt-0.5" style={{ color: GOLD }}>✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </R>
            ))}
          </div>

          <R delay={100}>
            <div className="rounded-xl p-5 flex gap-4 items-start"
                 style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="text-white/20 text-xs uppercase tracking-widest shrink-0 mt-0.5">Fuera de alcance</span>
              <p className="text-white/40 text-sm">
                Carpas, mobiliario, banquete, seguridad, decoración. Sí coordinamos aliados para escenario, rigging, planta de luz y pirotecnia — siempre con acuerdo por escrito.
              </p>
            </div>
          </R>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 03 MERCADO */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section id="mercado" className="py-20 px-6 sm:px-12 border-t border-white/[0.04]" style={{ background: "#040404" }}>
        <div className="max-w-5xl mx-auto space-y-12">

          <SectionTitle tag="03 — Enfoque de mercado">Tres tipos de evento.<br />Un nivel de ejecución.</SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                label: "Musical",
                enfoque: "Impacto · Potencia · Sin fallas",
                segmentos: ["Promotores y productoras","Venues con música en vivo","Gobiernos / municipios","Managers y bookers"],
                img: "/images/presentacion/musicales/Musicales-016.jpg",
                delay: 0,
              },
              {
                label: "Social",
                enfoque: "Emoción · Ambiente · Momentos",
                segmentos: ["Wedding planners","Salones, jardines, haciendas","Familias y particulares","Coordinadores de eventos"],
                img: "/images/presentacion/sociales/s-hacienda-iluminada.jpg",
                delay: 80,
              },
              {
                label: "Empresarial",
                enfoque: "Claridad · Formalidad · Imagen",
                segmentos: ["Empresas (Marketing, RH)","Agencias BTL y de eventos","Hoteles y centros de convenciones","Universidades y asociaciones"],
                img: "/images/presentacion/empresariales/e-sala-pantallas.jpg",
                delay: 160,
              },
            ].map(ev => (
              <R key={ev.label} delay={ev.delay}>
                <div className="rounded-2xl overflow-hidden h-full flex flex-col"
                     style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="relative h-36 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ev.img} alt={ev.label} draggable={false}
                         className="w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)" }} />
                    <p className="absolute bottom-3 left-4 text-white font-bold text-base">{ev.label}</p>
                  </div>
                  <div className="p-5 flex-1 space-y-3" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: GOLD }}>{ev.enfoque}</p>
                    <ul className="space-y-1">
                      {ev.segmentos.map((s, i) => (
                        <li key={i} className="text-xs text-white/40 flex items-start gap-1.5">
                          <span className="shrink-0" style={{ color: GOLD }}>·</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </R>
            ))}
          </div>

          {/* Cliente ideal vs alertas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <R>
              <Card gold>
                <p className="text-white font-bold mb-4">✓ Cliente ideal</p>
                <ul className="space-y-2">
                  {[
                    "Comunica presupuesto con claridad",
                    "Solicita con tiempo, comparte información",
                    "Respeta procesos y horarios",
                    "Prefiere calidad sobre precio bajo",
                    "Se comunica de forma colaborativa",
                  ].map((item, i) => (
                    <li key={i} className="text-sm text-white/55 flex items-start gap-2">
                      <span style={{ color: GOLD }}>✓</span>{item}
                    </li>
                  ))}
                </ul>
              </Card>
            </R>
            <R delay={80}>
              <div className="rounded-2xl p-6 h-full"
                   style={{ background: "rgba(255,59,48,0.02)", border: "1px solid rgba(255,59,48,0.1)" }}>
                <p className="text-white font-bold mb-4">⚠ Señales de alerta</p>
                <ul className="space-y-2">
                  {[
                    "Solo busca el precio más bajo",
                    "Cambia la cotización sin criterio",
                    "Genera urgencias artificiales",
                    "No respeta límites ni disponibilidad",
                    "Intenta trasladar su responsabilidad",
                  ].map((item, i) => (
                    <li key={i} className="text-sm text-white/35 flex items-start gap-2">
                      <span className="text-red-400/50">✕</span>{item}
                    </li>
                  ))}
                </ul>
                <p className="text-white/25 text-xs mt-4 pt-4 border-t border-red-400/[0.06]">
                  Cuando se combinan varias señales → es válido decir NO.
                </p>
              </div>
            </R>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 04 CULTURA */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section id="cultura" className="py-20 px-6 sm:px-12 border-t border-white/[0.04]" style={{ background: "#060606" }}>
        <div className="max-w-5xl mx-auto space-y-12">

          <SectionTitle tag="04 — Cultura operable">Los valores que<br />nos rigen.</SectionTitle>

          {/* Valores */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { n: "V1", title: "Responsabilidad",         body: "Lo que asumimos, lo cumplimos." },
              { n: "V2", title: "Excelencia operativa",    body: "Que funcione bien, cada vez." },
              { n: "V3", title: "Proactividad",            body: "Anticipar, no solo reaccionar." },
              { n: "V4", title: "Honestidad",              body: "Decimos lo que es, siempre." },
              { n: "V5", title: "Trabajo en equipo",       body: "Especialistas que operan como uno." },
              { n: "V6", title: "Respeto",                 body: "Incluso bajo presión. Sin excepción." },
              { n: "V7", title: "Enfoque en el cliente",   body: "El objetivo de cada tarea." },
              { n: "V8", title: "Anticipación",            body: "Prevenir es mejor que resolver." },
            ].map((v, i) => (
              <R key={v.n} delay={i * 45}>
                <div className="rounded-xl p-4 h-full"
                     style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-[#B3985B]/30 text-[10px] font-mono tracking-widest mb-2">{v.n}</p>
                  <p className="text-white text-sm font-semibold mb-1">{v.title}</p>
                  <p className="text-white/35 text-xs">{v.body}</p>
                </div>
              </R>
            ))}
          </div>

          {/* Principios + Reglas de oro */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <R><p className="text-[10px] uppercase tracking-widest mb-5" style={{ color: GOLD }}>Principios rectores</p></R>
              <div className="space-y-0">
                {[
                  "Verdad y claridad antes de ejecutar.",
                  "Sin culpas. Resolvemos y mejoramos.",
                  "Procesos sobre improvisación.",
                  "Calidad sin atajos.",
                  "Servicio excepcional con límites.",
                ].map((p, i) => (
                  <R key={i} delay={i * 55}>
                    <div className="flex gap-4 py-3.5 border-b" style={{ borderColor: "rgba(179,152,91,0.07)" }}>
                      <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                            style={{ background: "rgba(179,152,91,0.08)", color: GOLD }}>{i + 1}</span>
                      <p className="text-white/60 text-sm">{p}</p>
                    </div>
                  </R>
                ))}
              </div>
            </div>
            <div>
              <R><p className="text-[10px] uppercase tracking-widest mb-5" style={{ color: GOLD }}>Reglas de oro</p></R>
              <div className="space-y-0">
                {[
                  "Respeto siempre, sin negociar.",
                  "Lo crítico va por escrito.",
                  "Cumplimos o avisamos con anticipación.",
                  "Cuidamos los recursos como propios.",
                  "Escalamos a tiempo, no después.",
                ].map((p, i) => (
                  <R key={i} delay={i * 55 + 80}>
                    <div className="flex gap-4 py-3.5 border-b" style={{ borderColor: "rgba(179,152,91,0.07)" }}>
                      <span className="shrink-0 text-[#B3985B]/40 mt-0.5">—</span>
                      <p className="text-white/60 text-sm">{p}</p>
                    </div>
                  </R>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 05 EJECUCIÓN */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section id="ejecucion" className="py-20 px-6 sm:px-12 border-t border-white/[0.04]" style={{ background: "#040404" }}>
        <div className="max-w-5xl mx-auto space-y-12">

          <SectionTitle tag="05 — Estándares de ejecución">Cómo operamos<br />en la práctica.</SectionTitle>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { icon: "📋", title: "Orden maestro",      body: "Todo en la plataforma Mainstage. Nada fuera del sistema." },
              { icon: "👔", title: "Imagen profesional", body: "En el evento, en el taller, con el cliente." },
              { icon: "🔧", title: "Espacios limpios",   body: "Al cierre de cada jornada, sin excepción." },
              { icon: "🎯", title: "Anticipación",       body: "Resolver antes de que se vuelva visible." },
              { icon: "🔄", title: "Consistencia",       body: "Mejor bien siempre que brillante una vez." },
              { icon: "📈", title: "Mejora continua",    body: "Todos proponen. No solo se reportan problemas." },
            ].map((item, i) => (
              <R key={item.title} delay={i * 55}>
                <div className="rounded-xl p-5 h-full"
                     style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="text-xl mb-3">{item.icon}</div>
                  <p className="text-white font-semibold text-sm mb-1">{item.title}</p>
                  <p className="text-white/35 text-xs">{item.body}</p>
                </div>
              </R>
            ))}
          </div>

          {/* Marco de decisión */}
          <R delay={80}>
            <Card gold>
              <p className="text-[10px] uppercase tracking-widest mb-5" style={{ color: GOLD }}>Marco de decisión</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {[
                  { cond: "No está definido", action: "→ Comunica a Dirección. No asumas." },
                  { cond: "Ya está definido",  action: "→ Ejecuta con autonomía y criterio." },
                  { cond: "La autonomía",      action: "→ Es obligatoria. La dependencia no es profesionalismo." },
                ].map((item, i) => (
                  <div key={i}>
                    <p className="text-white font-semibold text-sm mb-1">{item.cond}</p>
                    <p className="text-white/40 text-sm">{item.action}</p>
                  </div>
                ))}
              </div>
            </Card>
          </R>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 06 EQUIPO */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section id="equipo" className="py-20 px-6 sm:px-12 border-t border-white/[0.04]" style={{ background: "#060606" }}>
        <div className="max-w-5xl mx-auto space-y-12">

          <SectionTitle tag="06 — Equipo y estructura">Lo que se espera<br />de cada uno.</SectionTitle>

          {/* Expectativa */}
          <R>
            <div className="rounded-2xl p-8 text-center"
                 style={{ background: "rgba(179,152,91,0.04)", border: "1px solid rgba(179,152,91,0.12)" }}>
              <p className="font-bold text-white leading-tight mb-3"
                 style={{ fontSize: "clamp(1.3rem,3vw,2rem)", letterSpacing: "-0.02em" }}>
                "Cada persona lidera su puesto<br />
                <span style={{ color: GOLD }}>con mentalidad de dueño."</span>
              </p>
              <p className="text-white/40 text-sm max-w-lg mx-auto">
                Iniciativa, criterio y visión más allá de la tarea. El objetivo es elevar la experiencia del cliente en cada evento.
              </p>
            </div>
          </R>

          {/* Escalera */}
          <div>
            <R><p className="text-[10px] uppercase tracking-widest mb-5" style={{ color: GOLD }}>Escalera de crecimiento</p></R>
            <div className="flex flex-col sm:flex-row gap-2">
              {[
                { level: "1", title: "Técnico",              desc: "Operación en campo" },
                { level: "2", title: "Coord. de sub-área",   desc: "Supervisión de área" },
                { level: "3", title: "Gerente de área",      desc: "Gestión y resultados" },
                { level: "4", title: "Gerente general",      desc: "Coordinación total" },
                { level: "5", title: "Dir. de operaciones",  desc: "Estrategia operativa" },
                { level: "6", title: "Director general",     desc: "Visión y crecimiento" },
              ].map((step, i) => (
                <R key={step.level} delay={i * 60} className="flex-1">
                  <div className="rounded-xl p-4 h-full text-center"
                       style={{
                         background: i === 0 ? "rgba(179,152,91,0.08)" : "rgba(255,255,255,0.02)",
                         border: `1px solid ${i === 0 ? "rgba(179,152,91,0.2)" : "rgba(255,255,255,0.05)"}`,
                       }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-2"
                         style={{ background: i === 0 ? GOLD : "rgba(255,255,255,0.06)", color: i === 0 ? "#000" : "rgba(255,255,255,0.3)" }}>
                      {step.level}
                    </div>
                    <p className="text-white text-xs font-semibold leading-tight mb-0.5">{step.title}</p>
                    <p className="text-white/25 text-[10px]">{step.desc}</p>
                  </div>
                </R>
              ))}
            </div>
          </div>

          {/* Especialización + Colaboración */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <R>
              <Card>
                <Tag label="Especialización" />
                <p className="text-white font-bold text-base mb-1">Cada quien domina su rol.</p>
                <p className="text-white/40 text-sm">El nivel individual eleva el estándar de toda la operación.</p>
              </Card>
            </R>
            <R delay={80}>
              <Card>
                <Tag label="Colaboración" />
                <p className="text-white font-bold text-base mb-1">Pero operamos como uno.</p>
                <p className="text-white/40 text-sm">La coordinación entre áreas no es opcional para entregar eventos de alto nivel.</p>
              </Card>
            </R>
          </div>

          {/* Mensaje */}
          <R>
            <div className="rounded-2xl p-8 relative overflow-hidden"
                 style={{ background: "#040404", border: "1px solid rgba(179,152,91,0.15)" }}>
              <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full pointer-events-none"
                   style={{ border: "1px solid rgba(179,152,91,0.04)" }} />
              <Tag label="Mensaje del equipo" />
              <blockquote className="text-white/70 text-base leading-relaxed max-w-3xl" style={{ fontStyle: "italic" }}>
                "Esto es más que un negocio: es un sueño construido desde la pasión por los eventos.{" "}
                <strong className="not-italic text-white/90">Lo más valioso de Mainstage Pro es su gente.</strong>{" "}
                Energía, responsabilidad y trabajo en equipo — para que más personas vivan momentos inolvidables gracias a lo que hacemos."
              </blockquote>
              <p className="mt-5 text-white/20 text-xs">— Guía General de Mainstage Pro, v1.1</p>
            </div>
          </R>
        </div>
      </section>

      {/* ── CIERRE ── */}
      <section className="py-28 px-6 sm:px-12 border-t border-white/[0.04]" style={{ background: "#040404" }}>
        <div className="max-w-4xl mx-auto text-center">
          <R y={20}>
            <div className="relative inline-block mb-10">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="absolute rounded-full pointer-events-none"
                     style={{
                       border: "1px solid rgba(179,152,91,0.1)",
                       animation: `pulse-ring ${2.5 + i * 0.6}s ease-out ${i * 0.8}s infinite`,
                       width: `${100 + i * 60}%`, height: `${100 + i * 60}%`,
                       top: `${-i * 30}%`, left: `${-i * 30}%`,
                     }} />
              ))}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-white.png" alt="Mainstage Pro" className="h-9 relative z-10 opacity-70" draggable={false} />
            </div>
            <h2 className="font-bold text-white leading-[0.95] mb-5"
                style={{ fontSize: "clamp(2.4rem,7vw,6rem)", letterSpacing: "-0.035em" }}>
              Somos el equipo<br />
              <span style={{ color: GOLD }}>que hace que</span><br />
              el show pase.
            </h2>
            <p className="text-white/25 max-w-md mx-auto text-sm leading-relaxed">
              Cada decisión debería poder justificarse con esta guía.<br />Si no puede, se clarifica antes de ejecutar.
            </p>
            <p className="mt-8 text-white/15 text-xs tracking-widest uppercase">
              Guía General · v1.1 · Mainstage Pro · 2026
            </p>
          </R>
        </div>
      </section>

      <footer className="py-8 px-6 text-center border-t border-white/[0.04]">
        <p className="text-white/10 text-xs tracking-wide">© 2026 Mainstage Pro · Uso interno · mainstagepro.mx</p>
      </footer>

    </main>
  );
}
