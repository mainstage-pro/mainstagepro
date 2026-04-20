"use client";

import { useEffect, useRef, useState } from "react";

const GOLD = "#B3985B";

// ─── Hooks ────────────────────────────────────────────────────────────────────
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

// ─── Animation wrapper ────────────────────────────────────────────────────────
function R({ children, delay = 0, y = 36, className = "" }: {
  children: React.ReactNode; delay?: number; y?: number; className?: string;
}) {
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

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ id, children, dark = false, className = "" }: {
  id?: string; children: React.ReactNode; dark?: boolean; className?: string;
}) {
  return (
    <section id={id}
             className={`py-24 px-6 sm:px-12 ${className}`}
             style={{ background: dark ? "#040404" : "#060606" }}>
      <div className="max-w-5xl mx-auto">
        {children}
      </div>
    </section>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SH({ tag, title, sub }: { tag: string; title: React.ReactNode; sub?: string }) {
  return (
    <R>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>
        {tag}
      </p>
      <h2 className="font-bold text-white mb-4 leading-tight"
          style={{ fontSize: "clamp(2rem,5vw,4rem)", letterSpacing: "-0.025em" }}>
        {title}
      </h2>
      {sub && <p className="text-white/40 text-sm leading-relaxed max-w-2xl mb-12">{sub}</p>}
    </R>
  );
}

// ─── Value card ───────────────────────────────────────────────────────────────
function ValueCard({ n, title, body, delay }: { n: string; title: string; body: string; delay: number }) {
  return (
    <R delay={delay}>
      <div className="rounded-2xl p-6 h-full"
           style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="text-[#B3985B]/30 text-xs font-mono tracking-widest mb-4">{n}</div>
        <h4 className="text-white font-bold mb-2 text-sm">{title}</h4>
        <p className="text-white/40 text-xs leading-relaxed">{body}</p>
      </div>
    </R>
  );
}

// ─── Numbered principle ───────────────────────────────────────────────────────
function Principle({ n, title, body, delay }: { n: number; title: string; body: string; delay: number }) {
  return (
    <R delay={delay}>
      <div className="flex gap-5 py-5 border-b" style={{ borderColor: "rgba(179,152,91,0.08)" }}>
        <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
             style={{ background: "rgba(179,152,91,0.08)", color: GOLD, border: `1px solid rgba(179,152,91,0.15)` }}>
          {n}
        </div>
        <div>
          <p className="text-white font-semibold text-sm mb-1">{title}</p>
          <p className="text-white/40 text-xs leading-relaxed">{body}</p>
        </div>
      </div>
    </R>
  );
}

// ─── Service card ─────────────────────────────────────────────────────────────
function ServiceCard({ num, title, tagline, desc, includes, notIncludes, delay }:{
  num: string; title: string; tagline: string; desc: string;
  includes: string[]; notIncludes: string[]; delay: number;
}) {
  return (
    <R delay={delay}>
      <div className="rounded-2xl overflow-hidden h-full flex flex-col"
           style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Header */}
        <div className="p-7 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <span className="text-[#B3985B]/35 text-xs font-mono tracking-widest block mb-3">{num}</span>
          <h3 className="text-white font-bold text-xl mb-2 leading-tight">{title}</h3>
          <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider">{tagline}</p>
        </div>
        {/* Body */}
        <div className="p-7 flex-1 space-y-5">
          <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
          <div>
            <p className="text-white/25 text-[10px] uppercase tracking-widest mb-2">Incluye</p>
            <ul className="space-y-1.5">
              {includes.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-white/55">
                  <span className="mt-0.5 shrink-0" style={{ color: GOLD }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-white/25 text-[10px] uppercase tracking-widest mb-2">No incluye</p>
            <ul className="space-y-1.5">
              {notIncludes.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-white/35">
                  <span className="mt-0.5 shrink-0 text-white/20">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </R>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AlineacionClient() {
  const scrollY = useScrollY();
  const navOpacity = Math.min(0.95, scrollY / 80);
  const [activeNav, setActiveNav] = useState("");

  // Track active section
  useEffect(() => {
    const sections = ["identidad","servicios","mercado","cultura","ejecucion","equipo"];
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => { if (e.isIntersecting) setActiveNav(e.target.id); });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  return (
    <main className="bg-[#060606] text-white overflow-x-hidden"
          style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-ring { 0% { transform:scale(1); opacity:0.3; } 100% { transform:scale(1.5); opacity:0; } }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: rgba(179,152,91,0.35); border-radius: 2px; }
      `}</style>

      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50 transition-all duration-400"
           style={{
             background: `rgba(6,6,6,${navOpacity})`,
             backdropFilter: scrollY > 20 ? "blur(20px)" : "none",
             borderBottom: scrollY > 20 ? "1px solid rgba(255,255,255,0.04)" : "none",
           }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="Mainstage Pro" className="h-5 opacity-90" draggable={false} />
          {/* Nav links — hidden on mobile */}
          <div className="hidden lg:flex items-center gap-6">
            {[
              { id: "identidad", label: "Identidad" },
              { id: "servicios", label: "Servicios" },
              { id: "mercado",   label: "Mercado" },
              { id: "cultura",   label: "Cultura" },
              { id: "ejecucion", label: "Ejecución" },
              { id: "equipo",    label: "Equipo" },
            ].map(({ id, label }) => (
              <a key={id} href={`#${id}`}
                 className="text-[11px] tracking-wide transition-colors duration-200"
                 style={{ color: activeNav === id ? GOLD : "rgba(255,255,255,0.3)" }}>
                {label}
              </a>
            ))}
          </div>
          <div className="text-white/20 text-xs tracking-wider hidden sm:block">
            v1.1 · 2026
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── HERO ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col justify-center px-6 sm:px-12 pt-20 pb-16 overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 pointer-events-none" style={{
          opacity: 0.03,
          backgroundImage: "linear-gradient(rgba(179,152,91,1) 1px, transparent 1px), linear-gradient(90deg, rgba(179,152,91,1) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }} />
        {/* Radial glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 60%, rgba(179,152,91,0.05) 0%, transparent 65%)",
        }} />

        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Tag */}
          <div className="flex items-center gap-3 mb-10"
               style={{ animation: "fadeUp 0.6s ease forwards 0.1s", opacity: 0 }}>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                 style={{ border: "1px solid rgba(179,152,91,0.2)", background: "rgba(179,152,91,0.04)" }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: GOLD }}>
                Alineación Estratégica · Mainstage Pro
              </span>
            </div>
          </div>

          {/* Main headline */}
          <h1 className="font-bold text-white leading-[0.95] mb-8"
              style={{ fontSize: "clamp(3rem,10vw,8rem)", letterSpacing: "-0.04em",
                       animation: "fadeUp 0.8s ease forwards 0.25s", opacity: 0 }}>
            Esto es<br />
            <span style={{ color: GOLD }}>Mainstage</span><br />
            <span className="text-white/30">Pro.</span>
          </h1>

          {/* Subline */}
          <p className="text-white/50 max-w-2xl leading-relaxed mb-12"
             style={{ fontSize: "clamp(1rem,2vw,1.25rem)",
                      animation: "fadeUp 0.8s ease forwards 0.45s", opacity: 0 }}>
            Quiénes somos, qué ofrecemos, a quién servimos, cómo operamos
            y qué se espera de cada persona en este equipo.
          </p>

          {/* Quick nav pills */}
          <div className="flex flex-wrap gap-2"
               style={{ animation: "fadeUp 0.8s ease forwards 0.6s", opacity: 0 }}>
            {[
              { id: "identidad", label: "01 Identidad" },
              { id: "servicios", label: "02 Servicios" },
              { id: "mercado",   label: "03 Mercado" },
              { id: "cultura",   label: "04 Cultura" },
              { id: "ejecucion", label: "05 Ejecución" },
              { id: "equipo",    label: "06 Equipo" },
            ].map(({ id, label }) => (
              <a key={id} href={`#${id}`}
                 className="text-xs px-4 py-2 rounded-full transition-all duration-200 hover:text-white"
                 style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}>
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-25"
             style={{ animation: "fadeUp 0.8s ease forwards 1.2s" }}>
          <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/50 to-transparent" />
          <span className="text-[9px] tracking-[0.22em] uppercase text-white/40">Scroll</span>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── 01 IDENTIDAD ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section id="identidad" className="py-24 px-6 sm:px-12 border-t border-white/[0.04]" style={{ background: "#040404" }}>
        <div className="max-w-5xl mx-auto space-y-20">

          {/* Por qué existimos */}
          <div>
            <R>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>01 — Identidad</p>
              <h2 className="font-bold text-white leading-tight mb-0"
                  style={{ fontSize: "clamp(2rem,5vw,4rem)", letterSpacing: "-0.03em" }}>
                Por qué existimos
              </h2>
            </R>
            <R delay={100}>
              <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl p-8"
                     style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: GOLD }}>El origen</p>
                  <p className="text-white/70 text-sm leading-relaxed">
                    Mainstage Pro existe gracias a la <strong className="text-white">pasión por los eventos en vivo</strong> y por el impacto que un espectáculo bien producido puede generar en las personas. Contribuimos a esa experiencia desde la parte técnica: asegurando que el show funcione, suene, se vea y <strong className="text-white">se viva al nivel que el proyecto merece.</strong>
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="rounded-2xl p-6" style={{ background: "rgba(179,152,91,0.04)", border: "1px solid rgba(179,152,91,0.12)" }}>
                    <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: GOLD }}>Misión</p>
                    <p className="text-white/70 text-sm leading-relaxed">
                      Desarrollar y ejecutar, con creatividad, organización y profesionalismo, la producción técnica de los proyectos de nuestros clientes; aportando claridad, soluciones y una operación confiable para <strong className="text-white">convertir ideas en experiencias reales.</strong>
                    </p>
                  </div>
                  <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: GOLD }}>Visión</p>
                    <p className="text-white/70 text-sm leading-relaxed">
                      Ser un <strong className="text-white">aliado clave</strong> y parte del equipo de producción de marcas, artistas y promotores a nivel nacional, gracias a nuestro involucramiento real en sus proyectos y una ejecución técnica con alta responsabilidad y nivel.
                    </p>
                  </div>
                </div>
              </div>
            </R>
          </div>

          {/* Propuesta de valor + Promesa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <R delay={0}>
              <div className="rounded-2xl p-8 h-full"
                   style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: GOLD }}>Propuesta de valor</p>
                <p className="text-white font-bold text-xl leading-tight mb-4">
                  Descubrimos, dirigimos, planeamos y ejecutamos.
                </p>
                <p className="text-white/50 text-sm leading-relaxed">
                  Entendemos desde adentro los requerimientos y objetivos de cada proyecto. Tres líneas de servicio — renta, producción técnica y dirección técnica integral — para adaptarnos al nivel de acompañamiento que cada cliente necesita.
                </p>
              </div>
            </R>
            <R delay={80}>
              <div className="rounded-2xl p-8 h-full"
                   style={{ background: "rgba(179,152,91,0.04)", border: "1px solid rgba(179,152,91,0.15)" }}>
                <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: GOLD }}>Promesa de servicio</p>
                <p className="text-white font-bold text-xl leading-tight mb-4">
                  Seguridad y control. Sin improvisación.
                </p>
                <p className="text-white/50 text-sm leading-relaxed">
                  Equipos funcionales y respaldados por marcas confiables, procesos eficientes, claridad operativa — qué, quién y cuándo — comunicación honesta y una ejecución consistente.
                </p>
              </div>
            </R>
          </div>

          {/* Diferenciadores */}
          <div>
            <R>
              <p className="text-[10px] uppercase tracking-widest mb-8" style={{ color: GOLD }}>
                Lo que nos hace diferentes
              </p>
            </R>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { n: "D1", title: "Calidad humana y cultura de servicio", body: "Actitud, respeto y profesionalismo bajo presión. En el evento y fuera de él." },
                { n: "D2", title: "Descubrimiento profundo", body: "Entendemos el proyecto y al cliente, no solo el evento. Eso nos permite proponer mejor y ejecutar con precisión." },
                { n: "D3", title: "Dirección técnica integral", body: "Cuando el proyecto lo requiere, centralizamos la operación y asumimos la responsabilidad total." },
                { n: "D4", title: "Inventario propio + red de aliados", body: "Resolvemos necesidades técnicas en Querétaro y en todo México, con equipo propio o aliados verificados." },
                { n: "D5", title: "Ritmo de trabajo y seguimiento", body: "Reuniones, entregables y control de cambios que mantienen orden y personalización en cada proyecto." },
                { n: "D6", title: "Replicabilidad", body: "Convertimos cada proyecto en un modelo repetible con mejora continua para futuras fechas y regiones." },
              ].map((d, i) => (
                <ValueCard key={d.n} {...d} delay={i * 60} />
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── 02 SERVICIOS ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section id="servicios" className="py-24 px-6 sm:px-12 border-t border-white/[0.04]" style={{ background: "#060606" }}>
        <div className="max-w-5xl mx-auto">
          <SH
            tag="02 — Oferta de servicios"
            title={<>Tres líneas.<br />Un estándar.</>}
            sub="Cada línea de servicio existe para adaptarse al nivel de acompañamiento y responsabilidad que el proyecto necesita. No es lo mismo rentar equipo que dirigir técnicamente un proyecto."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
            <ServiceCard
              num="L1"
              title="Renta de equipo"
              tagline="Equipo listo. Sin operación."
              desc="Para clientes que necesitan equipos específicos sin operación técnica. Productoras, músicos, técnicos independientes o clientes finales que ya saben lo que requieren."
              includes={[
                "Cotización de renta",
                "Hoja de entrega/recepción con listado y condiciones",
                "Opción de recolección en bodega o entrega en venue",
                "Equipo revisado y listo para usar",
              ]}
              notIncludes={[
                "Operación técnica o diseño del show",
                "Coordinación integral del evento",
                "Gestión de otros proveedores",
              ]}
              delay={0}
            />
            <ServiceCard
              num="L2"
              title="Producción técnica por evento"
              tagline="Equipo + operadores."
              desc="Renta de equipos más operación técnica. Mainstage Pro lleva el equipo, lo monta, lo opera y lo desmonta. La propuesta se adapta al tamaño del evento."
              includes={[
                "Cotización del servicio completo",
                "Descubrimiento básico para definir alcance",
                "Coordinación interna de tiempos y logística",
                "Montaje, operación y desmontaje",
              ]}
              notIncludes={[
                "Dirección técnica integral del proyecto",
                "Coordinación de proveedores externos (salvo acuerdo)",
              ]}
              delay={80}
            />
            <ServiceCard
              num="L3"
              title="Dirección Técnica Integral"
              tagline="Servicio principal. Alianza total."
              desc="Servicio consultivo tipo alianza. Centralizamos información, asesoramos, planeamos, coordinamos y ejecutamos la producción técnica bajo un solo responsable: Mainstage Pro."
              includes={[
                "Juntas de descubrimiento y alineación",
                "Brief técnico y registro de necesidades",
                "Renders, plots y propuestas con control de cambios",
                "Plan de operación y ejecución técnica completa",
                "Reportes, retroalimentación y mejoras",
                "Riders técnicos, estándares y checklists",
              ]}
              notIncludes={[
                "Rubros fuera del core técnico (carpas, mobiliario, banquete, seguridad)",
              ]}
              delay={160}
            />
          </div>

          {/* Qué NO ofrecemos */}
          <R delay={200}>
            <div className="mt-10 rounded-2xl p-7 flex flex-col sm:flex-row gap-6"
                 style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="shrink-0">
                <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: GOLD }}>Límites del alcance</p>
                <p className="text-white font-bold text-base">Qué NO ofrecemos</p>
              </div>
              <div className="flex-1">
                <p className="text-white/45 text-sm leading-relaxed">
                  <strong className="text-white/70">No ofrecemos rubros fuera del core técnico</strong> — carpas, mobiliario, banquete, seguridad, decoración. Sí podemos <strong className="text-white/70">coordinar e integrar aliados</strong> para planta de luz, pirotecnia, escenario, vallas, entarimados, rigging y similares. Siempre con proveedores del cliente o gestionados por Mainstage Pro, con acuerdo por escrito.
                </p>
              </div>
            </div>
          </R>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── 03 MERCADO ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section id="mercado" className="py-24 px-6 sm:px-12 border-t border-white/[0.04]" style={{ background: "#040404" }}>
        <div className="max-w-5xl mx-auto space-y-16">

          <SH
            tag="03 — Enfoque de mercado"
            title={<>Tres tipos de evento.<br />Un estándar de ejecución.</>}
          />

          {/* Event categories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                label: "Musical",
                enfoque: "Impacto · Potencia · Ejecución sin fallas",
                desc: "Conciertos, showcases y festivales donde el show es el centro. Requieren planeación por rider, operación en vivo y coordinación precisa de tiempos.",
                segmentos: ["Promotores y productoras de conciertos","Venues con música en vivo","Gobiernos / municipios","Marcas que patrocinan shows","Managers, bookers, equipos de artistas"],
                img: "/images/presentacion/m-stage-green.jpg",
                delay: 0,
              },
              {
                label: "Social",
                enfoque: "Ambientación · Emoción · Momentos memorables",
                desc: "Bodas, XV, graduaciones y fiestas privadas. Lo más importante es la experiencia del invitado y la estética del ambiente.",
                segmentos: ["Wedding planners y coordinadores","Salones, jardines, haciendas","Comités de graduaciones","Familias y particulares","Proveedores integrales"],
                img: "/images/presentacion/s-couple-purple.png",
                delay: 80,
              },
              {
                label: "Empresarial",
                enfoque: "Claridad · Formalidad · Experiencia impecable",
                desc: "Conferencias, congresos, lanzamientos y eventos internos donde el objetivo es comunicar un mensaje con imagen profesional.",
                segmentos: ["Empresas (Marketing, RH, Comunicación)","Agencias BTL y de eventos","Hoteles y centros de convenciones","Cámaras y asociaciones","Universidades y seminarios"],
                img: "/images/presentacion/e-corp-screens.jpg",
                delay: 160,
              },
            ].map((ev) => (
              <R key={ev.label} delay={ev.delay}>
                <div className="rounded-2xl overflow-hidden h-full flex flex-col"
                     style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                  {/* Image */}
                  <div className="relative h-40 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ev.img} alt={ev.label} draggable={false}
                         className="w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)" }} />
                    <p className="absolute bottom-3 left-4 text-white font-bold text-lg">{ev.label}</p>
                  </div>
                  {/* Body */}
                  <div className="p-5 flex-1 space-y-4" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: GOLD }}>
                      {ev.enfoque}
                    </p>
                    <p className="text-white/50 text-xs leading-relaxed">{ev.desc}</p>
                    <div>
                      <p className="text-white/20 text-[10px] uppercase tracking-widest mb-2">Segmentos clave</p>
                      <ul className="space-y-1">
                        {ev.segmentos.map((s, i) => (
                          <li key={i} className="text-xs text-white/40 flex items-start gap-2">
                            <span className="shrink-0 mt-0.5" style={{ color: GOLD }}>·</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </R>
            ))}
          </div>

          {/* Cliente ideal vs no ideal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <R delay={0}>
              <div className="rounded-2xl p-7 h-full"
                   style={{ background: "rgba(179,152,91,0.03)", border: "1px solid rgba(179,152,91,0.12)" }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                       style={{ background: "rgba(179,152,91,0.12)", border: "1px solid rgba(179,152,91,0.2)" }}>
                    ✓
                  </div>
                  <p className="text-white font-bold">Cliente ideal</p>
                </div>
                <ul className="space-y-2.5">
                  {[
                    "Comunica presupuesto y toma decisiones con claridad",
                    "Solicita con tiempo y comparte información con anticipación",
                    "Respeta horarios, procesos y espacios",
                    "Está abierto a propuestas técnicas",
                    "Prefiere calidad y confiabilidad sobre precio bajo",
                    "Se comunica de forma clara y colaborativa",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-white/60">
                      <span className="shrink-0 mt-0.5" style={{ color: GOLD }}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </R>
            <R delay={80}>
              <div className="rounded-2xl p-7 h-full"
                   style={{ background: "rgba(255,59,48,0.02)", border: "1px solid rgba(255,59,48,0.08)" }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                       style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.12)" }}>
                    ⚠
                  </div>
                  <p className="text-white font-bold">Alertas — cliente no ideal</p>
                </div>
                <ul className="space-y-2.5">
                  {[
                    "Regatea constantemente y solo busca el precio más bajo",
                    "Cambia la cotización sin control ni criterio",
                    "Todo lo quiere inmediato, genera urgencias artificiales",
                    "No respeta límites ni disponibilidad del equipo",
                    "Pide cosas fuera del alcance del servicio",
                    "Intenta trasladar sus responsabilidades a nosotros",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-white/40">
                      <span className="shrink-0 mt-0.5 text-red-400/60">✕</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 pt-5 border-t" style={{ borderColor: "rgba(255,59,48,0.08)" }}>
                  <p className="text-white/25 text-xs leading-relaxed">
                    <strong className="text-white/40">Cuándo decir NO:</strong> cuando se combinan varias señales de arriba, cuando el proyecto no es viable por presupuesto, tiempos o expectativas, o cuando compromete seguridad, reputación o rentabilidad.
                  </p>
                </div>
              </div>
            </R>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── 04 CULTURA ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section id="cultura" className="py-24 px-6 sm:px-12 border-t border-white/[0.04]" style={{ background: "#060606" }}>
        <div className="max-w-5xl mx-auto space-y-16">

          <SH
            tag="04 — Cultura operable"
            title={<>Los valores que<br />nos rigen.</>}
            sub="No son decoración de pared. Son la razón por la que tomamos decisiones, la forma en que nos comunicamos y el estándar que aplicamos cuando nadie está mirando."
          />

          {/* Values grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { n: "V1", title: "Responsabilidad",               body: "Lo que asumimos, lo cumplimos. O renegociamos con anticipación, nunca con hechos consumados." },
              { n: "V2", title: "Excelencia operativa",          body: "No nos conformamos con que funcione. Queremos que funcione bien, cada vez, sin depender del azar." },
              { n: "V3", title: "Proactividad",                  body: "Ver más allá de la tarea. Anticipar el problema antes de que llegue. Proponer soluciones, no solo reportar." },
              { n: "V4", title: "Honestidad",                    body: "Decimos lo que es, incluso cuando no es conveniente. Con clientes, con el equipo y con nosotros mismos." },
              { n: "V5", title: "Trabajo en equipo",             body: "Especialistas en su rol, pero operamos como uno. La coordinación entre áreas no es opcional." },
              { n: "V6", title: "Respeto",                       body: "Siempre, incluso bajo presión. Con el cliente, con el equipo, con el venue, con los proveedores." },
              { n: "V7", title: "Enfoque en el cliente",         body: "La experiencia del cliente y del público es el objetivo de cada tarea. Eso es lo que le da sentido al trabajo." },
              { n: "V8", title: "Anticipación y resolución",     body: "Prevenir es mejor que resolver. Resolver es mejor que disculparse. No esperamos que los problemas se conviertan en crisis." },
            ].map((v, i) => (
              <ValueCard key={v.n} {...v} delay={i * 50} />
            ))}
          </div>

          {/* Principios rectores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
            <div>
              <R>
                <p className="text-[10px] uppercase tracking-widest mb-6" style={{ color: GOLD }}>Principios rectores</p>
              </R>
              {[
                { title: "Verdad y claridad primero",         body: "Si no está claro, se clarifica antes de ejecutar. No asumimos, no improvisamos sobre lo incierto." },
                { title: "Responsabilidad total",             body: "No culpamos. Resolvemos, aprendemos y mejoramos. El error es información, no pretexto." },
                { title: "Sistema > improvisación",           body: "Procesos y herramientas para operar con consistencia. La improvisación es el enemigo de la calidad repetible." },
                { title: "Calidad y seguridad sobre atajos",  body: "Excelencia repetible y sin riesgos. Un atajo que funciona una vez no es un proceso." },
                { title: "Enfoque en el cliente con límites", body: "Servicio excepcional sin perder rentabilidad, orden ni dignidad. Servir bien no significa servir sin límites." },
              ].map((p, i) => (
                <Principle key={i} n={i + 1} {...p} delay={i * 60} />
              ))}
            </div>
            <div>
              <R>
                <p className="text-[10px] uppercase tracking-widest mb-6" style={{ color: GOLD }}>Reglas de oro</p>
              </R>
              {[
                { title: "Respeto siempre",                        body: "Incluso bajo presión, cansancio o conflicto. El respeto no se negocia en función del estado de ánimo." },
                { title: "Comunicación a tiempo",                  body: "Lo importante se confirma. Lo crítico va por escrito. Lo urgente se comunica de inmediato." },
                { title: "Cumplimos lo prometido",                 body: "O renegociamos con anticipación. Nunca dejamos compromisos sin atender sin aviso previo." },
                { title: "Cuidamos los recursos",                  body: "Tiempo, dinero y equipo. Como si fueran propios. Porque en parte, lo son." },
                { title: "Escalamos a tiempo",                     body: "Cuando el problema supera nuestro alcance, avisamos. No esperamos a que sea demasiado tarde." },
              ].map((p, i) => (
                <Principle key={i} n={i + 6} {...p} delay={i * 60 + 100} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── 05 EJECUCIÓN ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section id="ejecucion" className="py-24 px-6 sm:px-12 border-t border-white/[0.04]" style={{ background: "#040404" }}>
        <div className="max-w-5xl mx-auto space-y-14">

          <SH
            tag="05 — Estándares de ejecución"
            title={<>Cómo operamos<br />en la práctica.</>}
            sub="Los estándares no son ideales aspiracionales. Son la forma concreta en que se espera que funcione el trabajo, todos los días."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: "📋",
                title: "Orden maestro",
                body: "Toda tarea y proyecto se gestiona en la plataforma Mainstage. No hay trabajo fuera del sistema.",
                delay: 0,
              },
              {
                icon: "👔",
                title: "Presentación y orden",
                body: "Imagen y ejecución profesional en todo momento — en el evento, en el taller, en la comunicación con el cliente.",
                delay: 60,
              },
              {
                icon: "🔧",
                title: "Espacios limpios",
                body: "Al cierre de cada jornada, los espacios se dejan limpios y organizados. El orden es un reflejo del nivel.",
                delay: 120,
              },
              {
                icon: "🎯",
                title: "Planeación y anticipación",
                body: "Prevenir fallas antes de que ocurran. Resolver antes de que se conviertan en un problema visible.",
                delay: 180,
              },
              {
                icon: "🔄",
                title: "Excelencia repetible",
                body: "Mejor bien y consistente que brillante una vez. El estándar no depende del día ni del ánimo.",
                delay: 240,
              },
              {
                icon: "📈",
                title: "Mejora continua",
                body: "Todos proponen mejoras, sistemas e iniciativas. No solo se reportan problemas — se proponen soluciones.",
                delay: 300,
              },
            ].map((item) => (
              <R key={item.title} delay={item.delay}>
                <div className="rounded-2xl p-6 h-full"
                     style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="text-2xl mb-4">{item.icon}</div>
                  <h4 className="text-white font-bold text-sm mb-2">{item.title}</h4>
                  <p className="text-white/40 text-xs leading-relaxed">{item.body}</p>
                </div>
              </R>
            ))}
          </div>

          {/* Marco de decisión */}
          <R delay={100}>
            <div className="rounded-2xl p-8" style={{ background: "rgba(179,152,91,0.03)", border: "1px solid rgba(179,152,91,0.1)" }}>
              <p className="text-[10px] uppercase tracking-widest mb-5" style={{ color: GOLD }}>Marco de decisión</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-white font-semibold text-sm mb-2">Si no está definido</p>
                  <p className="text-white/45 text-sm leading-relaxed">→ Se comunica a Dirección antes de decidir. No se asume, no se improvisa.</p>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm mb-2">Si ya está definido</p>
                  <p className="text-white/45 text-sm leading-relaxed">→ Se ejecuta con autonomía y criterio, respetando esta guía. No se pide permiso por cada paso.</p>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm mb-2">La autonomía es obligatoria</p>
                  <p className="text-white/45 text-sm leading-relaxed">→ Cada rol opera con responsabilidad y claridad. La dependencia constante no es profesionalismo.</p>
                </div>
              </div>
            </div>
          </R>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── 06 EQUIPO ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section id="equipo" className="py-24 px-6 sm:px-12 border-t border-white/[0.04]" style={{ background: "#060606" }}>
        <div className="max-w-5xl mx-auto space-y-14">

          <SH
            tag="06 — Equipo y estructura"
            title={<>Lo que se espera<br />de cada uno.</>}
          />

          {/* Expectativa de liderazgo */}
          <R>
            <div className="rounded-2xl p-10 text-center"
                 style={{ background: "rgba(179,152,91,0.04)", border: "1px solid rgba(179,152,91,0.12)" }}>
              <p className="font-bold text-white leading-tight mb-4"
                 style={{ fontSize: "clamp(1.4rem,3vw,2.2rem)", letterSpacing: "-0.02em" }}>
                "Cada persona lidera su puesto<br />
                <span style={{ color: GOLD }}>con mentalidad de dueño."</span>
              </p>
              <p className="text-white/45 text-sm leading-relaxed max-w-xl mx-auto">
                Esperamos iniciativa y criterio: proponer soluciones, impulsar mejoras y ver más allá de la tarea inmediata. El objetivo común es elevar la experiencia del cliente y ejecutar con altura profesional.
              </p>
            </div>
          </R>

          {/* Estructura de crecimiento */}
          <div>
            <R>
              <p className="text-[10px] uppercase tracking-widest mb-8" style={{ color: GOLD }}>
                Escalera de crecimiento
              </p>
            </R>
            <div className="flex flex-col sm:flex-row gap-3">
              {[
                { level: "1", title: "Puestos técnicos",              desc: "Operación y ejecución directa en campo." },
                { level: "2", title: "Coordinación de sub-áreas",    desc: "Supervisión y responsabilidad de área específica." },
                { level: "3", title: "Gerente de área",              desc: "Gestión y resultados de un área completa." },
                { level: "4", title: "Gerente general",              desc: "Coordinación transversal de todas las áreas." },
                { level: "5", title: "Director de operaciones",      desc: "Estrategia operativa y escala del negocio." },
                { level: "6", title: "Director general",             desc: "Visión, dirección y crecimiento de la empresa." },
              ].map((step, i) => (
                <R key={step.level} delay={i * 60} className="flex-1">
                  <div className="rounded-xl p-4 h-full text-center"
                       style={{
                         background: i === 0 ? "rgba(179,152,91,0.08)" : "rgba(255,255,255,0.02)",
                         border: `1px solid ${i === 0 ? "rgba(179,152,91,0.2)" : "rgba(255,255,255,0.05)"}`,
                       }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-3"
                         style={{ background: i === 0 ? GOLD : "rgba(255,255,255,0.06)", color: i === 0 ? "#000" : "rgba(255,255,255,0.3)" }}>
                      {step.level}
                    </div>
                    <p className="text-white text-xs font-semibold leading-tight mb-1">{step.title}</p>
                    <p className="text-white/30 text-[10px] leading-snug">{step.desc}</p>
                  </div>
                </R>
              ))}
            </div>
          </div>

          {/* Especialización y colaboración */}
          <R>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="rounded-2xl p-7"
                   style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: GOLD }}>Especialización</p>
                <p className="text-white font-bold text-base mb-3">Cada quien domina su rol.</p>
                <p className="text-white/50 text-sm leading-relaxed">
                  Buscamos especialistas que sean los mejores en lo que hacen. El nivel técnico individual eleva el estándar de toda la operación.
                </p>
              </div>
              <div className="rounded-2xl p-7"
                   style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: GOLD }}>Colaboración</p>
                <p className="text-white font-bold text-base mb-3">Pero operamos como uno.</p>
                <p className="text-white/50 text-sm leading-relaxed">
                  La coordinación entre áreas, la ayuda mutua y la retroalimentación constante son obligatorias para entregar eventos de alto nivel.
                </p>
              </div>
            </div>
          </R>

          {/* Mensaje del director */}
          <R>
            <div className="rounded-2xl p-10 relative overflow-hidden"
                 style={{ background: "#040404", border: "1px solid rgba(179,152,91,0.15)" }}>
              {/* Decorative rings */}
              <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full pointer-events-none"
                   style={{ border: "1px solid rgba(179,152,91,0.05)" }} />
              <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full pointer-events-none"
                   style={{ border: "1px solid rgba(179,152,91,0.08)" }} />

              <p className="text-[10px] uppercase tracking-widest mb-6" style={{ color: GOLD }}>Mensaje del equipo</p>
              <blockquote className="text-white/80 leading-relaxed text-base max-w-3xl"
                          style={{ fontStyle: "italic" }}>
                "Esto es más que un negocio: es un sueño construido desde la pasión por los eventos. El impacto real es lograr que más personas vivan momentos inolvidables gracias a nuestro trabajo. Para lograrlo, el orden, la estructura, los sistemas y la comunicación son fundamentales.
                <br /><br />
                <strong className="not-italic" style={{ color: "rgba(255,255,255,0.95)" }}>Lo más valioso de Mainstage Pro es su gente.</strong> Energía, responsabilidad y trabajo en equipo. Cada rol y cada tarea tiene un objetivo: elevar la experiencia del cliente y del público."
              </blockquote>
              <p className="mt-6 text-white/30 text-xs">— Guía General de Mainstage Pro, v1.1</p>
            </div>
          </R>
        </div>
      </section>

      {/* ── CIERRE ── */}
      <section className="py-32 px-6 sm:px-12 border-t border-white/[0.04]" style={{ background: "#040404" }}>
        <div className="max-w-4xl mx-auto text-center">
          <R y={20}>
            <div className="relative inline-block mb-10">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="absolute inset-0 rounded-full pointer-events-none"
                     style={{
                       border: `1px solid rgba(179,152,91,0.12)`,
                       animation: `pulse-ring ${2.5 + i * 0.6}s ease-out ${i * 0.8}s infinite`,
                       width: `${100 + i * 60}%`, height: `${100 + i * 60}%`,
                       top: `${-i * 30}%`, left: `${-i * 30}%`,
                     }} />
              ))}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-white.png" alt="Mainstage Pro" className="h-10 relative z-10 opacity-80" draggable={false} />
            </div>

            <h2 className="font-bold text-white leading-[0.95] mb-6"
                style={{ fontSize: "clamp(2.4rem,7vw,6rem)", letterSpacing: "-0.035em" }}>
              Somos el equipo<br />
              <span style={{ color: GOLD }}>que hace que</span><br />
              el show pase.
            </h2>
            <p className="text-white/35 max-w-xl mx-auto leading-relaxed text-sm">
              Cada decisión, cada tarea, cada comunicación debería poder justificarse con esta guía.
              Si no puede, hay que clarificarlo antes de ejecutar.
            </p>
            <p className="mt-8 text-white/15 text-xs tracking-widest uppercase">
              Guía General · v1.1 · Mainstage Pro · 2026
            </p>
          </R>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-6 text-center border-t border-white/[0.04]">
        <p className="text-white/10 text-xs tracking-wide">
          © 2026 Mainstage Pro · Uso interno · mainstagepro.mx
        </p>
      </footer>

    </main>
  );
}
