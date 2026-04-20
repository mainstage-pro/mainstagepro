"use client";
import { useEffect, useRef, useState } from "react";

const GOLD = "#B3985B";

function useScrollHeader() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true }); fn();
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return scrolled;
}

function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold });
    obs.observe(el); return () => obs.disconnect();
  }, [threshold]);
  return { ref, vis };
}

function R({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, vis } = useReveal();
  return (
    <div ref={ref} className={className}
         style={{ transitionDelay: `${delay}ms`, opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(32px)", transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)" }}>
      {children}
    </div>
  );
}

function Sec({ id, label, children, dark = false }: { id: string; label: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <section id={id} className="py-24 px-6 border-t border-white/[0.04]" style={{ background: dark ? "#040404" : "#080808" }}>
      <div className="max-w-5xl mx-auto">
        <R><p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-10">{label}</p></R>
        {children}
      </div>
    </section>
  );
}

function SH({ title, sub }: { title: string; sub?: string }) {
  return (
    <R>
      <h2 className="font-bold text-white mb-4" style={{ fontSize: "clamp(1.8rem,3.5vw,2.8rem)", letterSpacing: "-0.025em" }}>{title}</h2>
      {sub && <p className="text-white/40 text-sm mb-12 max-w-xl leading-relaxed">{sub}</p>}
    </R>
  );
}

function Swatch({ hex, name, role, pantone, cmyk }: { hex: string; name: string; role: string; pantone?: string; cmyk?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(hex).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }} className="group text-left w-full">
      <div className="w-full rounded-xl mb-3 transition-transform duration-300 group-hover:scale-[1.02]"
           style={{ height: "88px", background: hex, border: (hex.startsWith("#0") || hex.startsWith("#1") || hex.startsWith("#2") || hex === "#FFFFFF") ? "1px solid rgba(255,255,255,0.07)" : "none" }} />
      <p className="text-white text-sm font-semibold">{name}</p>
      <p className="text-white/40 text-xs mt-0.5 font-mono">{hex}</p>
      {pantone && <p className="text-white/22 text-xs">{pantone}</p>}
      {cmyk && <p className="text-white/18 text-xs">{cmyk}</p>}
      <p className="text-white/25 text-xs">{role}</p>
      {copied && <p className="text-[#B3985B] text-xs mt-1">Copiado ✓</p>}
    </button>
  );
}

// ─── Shirt mockup ────────────────────────────────────────────────────────────
function Shirt({ long = false, label, color = "#1A1A1A" }: { long?: boolean; label: string; color?: string }) {
  const h = long ? 230 : 200;
  const shortPath = "M65,30 C65,30 55,37 43,37 L5,62 L24,82 L50,67 L50,188 L130,188 L130,67 L156,82 L175,62 L137,37 C125,37 115,30 115,30 Q100,43 65,30 Z";
  const longPath  = "M65,30 C65,30 55,37 43,37 L5,78 L24,98 L50,82 L50,188 L130,188 L130,82 L156,98 L175,78 L137,37 C125,37 115,30 115,30 Q100,43 65,30 Z";
  return (
    <div className="flex flex-col items-center gap-3">
      <div style={{ position: "relative", width: 180, height: h }}>
        <svg viewBox={`0 0 180 ${h}`} width={180} height={h} fill="none">
          <path d={long ? longPath : shortPath} fill={color} stroke="#2E2E2E" strokeWidth="1.2" strokeLinejoin="round" />
          <path d={long ? "M65,30 Q90,22 115,30" : "M65,30 Q90,22 115,30"} fill="none" stroke="#333" strokeWidth="1" />
        </svg>
        <div style={{ position: "absolute", top: long ? 95 : 88, left: "50%", transform: "translateX(-50%)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="logo" draggable={false} style={{ height: 15, objectFit: "contain", opacity: 0.85 }} />
        </div>
      </div>
      <p className="text-white/30 text-xs text-center">{label}</p>
    </div>
  );
}

// ─── Business card mockup ────────────────────────────────────────────────────
function BizCard() {
  return (
    <div className="flex flex-col gap-2 items-start">
      {/* Front */}
      <div style={{ width: 320, height: 185, background: "#080808", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, position: "relative", padding: "22px 26px", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: GOLD }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.png" alt="logo" draggable={false} style={{ height: 17, objectFit: "contain", alignSelf: "flex-start" }} />
        <div>
          <p style={{ color: "white", fontWeight: 600, fontSize: 13, letterSpacing: "-0.01em" }}>Nombre Apellido</p>
          <p style={{ color: GOLD, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 3 }}>Director de Operaciones</p>
          <div style={{ marginTop: 11, display: "flex", flexDirection: "column", gap: 2 }}>
            <p style={{ color: "rgba(255,255,255,0.32)", fontSize: 9 }}>+52 446 143 2565</p>
            <p style={{ color: "rgba(255,255,255,0.32)", fontSize: 9 }}>contacto@mainstagepro.com</p>
            <p style={{ color: "rgba(255,255,255,0.32)", fontSize: 9 }}>mainstagepro.com</p>
          </div>
        </div>
      </div>
      {/* Back */}
      <div style={{ width: 320, height: 185, background: "#040404", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: GOLD }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.png" alt="isotipo" draggable={false} style={{ height: 48, objectFit: "contain", opacity: 0.5 }} />
      </div>
      <p className="text-white/30 text-xs">Tarjeta de presentación · Frente / Reverso</p>
    </div>
  );
}

// ─── Letterhead mockup ───────────────────────────────────────────────────────
function Letterhead() {
  return (
    <div className="flex flex-col gap-2 items-start">
      <div style={{ width: 280, background: "#F2EFE9", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ background: "#080808", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="logo" draggable={false} style={{ height: 16, objectFit: "contain" }} />
          <p style={{ color: "rgba(255,255,255,0.28)", fontSize: 7, letterSpacing: "0.14em", textTransform: "uppercase" }}>Producción Técnica</p>
        </div>
        <div style={{ height: 2, background: GOLD }} />
        <div style={{ padding: "18px 20px 14px" }}>
          <p style={{ color: "#999", fontSize: 8, letterSpacing: "0.1em", marginBottom: 10, textTransform: "uppercase" }}>Cotización / Propuesta técnica</p>
          {[100, 100, 65].map((w, i) => <div key={i} style={{ height: 6, background: "#D8D4CC", borderRadius: 3, width: `${w}%`, marginBottom: 5 }} />)}
          <div style={{ marginTop: 12 }}>
            {[85, 92, 78, 88, 70].map((w, i) => <div key={i} style={{ height: 4, background: "#E5E2DC", borderRadius: 2, width: `${w}%`, marginBottom: 4 }} />)}
          </div>
          <div style={{ marginTop: 14, padding: "8px 10px", background: `${GOLD}12`, borderRadius: 6, border: `1px solid ${GOLD}30` }}>
            <p style={{ color: GOLD, fontSize: 8, fontWeight: 600 }}>Total · $ ——,——— MXN</p>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #DDD", padding: "8px 20px", display: "flex", justifyContent: "space-between" }}>
          <p style={{ color: "#BBB", fontSize: 7 }}>Mainstage Pro · mainstagepro.com</p>
          <p style={{ color: "#BBB", fontSize: 7 }}>+52 446 143 2565</p>
        </div>
      </div>
      <p className="text-white/30 text-xs">Hoja membretada · Documentos y cotizaciones</p>
    </div>
  );
}

// ─── Banner mockup ───────────────────────────────────────────────────────────
function Banner() {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div style={{ width: "100%", aspectRatio: "3/1", background: "#080808", borderRadius: 12, position: "relative", border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden", display: "flex", alignItems: "center", padding: "0 40px" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: GOLD }} />
        <div style={{ flex: 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="logo" draggable={false} style={{ height: 20, objectFit: "contain", marginBottom: 14 }} />
          <p style={{ color: "white", fontWeight: 700, fontSize: "clamp(0.85rem,2.2vw,1.35rem)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            Creamos experiencias<br />que generan impacto.
          </p>
        </div>
        <div style={{ textAlign: "right", paddingLeft: 24 }}>
          <p style={{ color: GOLD, fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase" }}>Producción Técnica</p>
          <p style={{ color: "rgba(255,255,255,0.22)", fontSize: 8, marginTop: 6 }}>mainstagepro.com</p>
        </div>
      </div>
      <p className="text-white/30 text-xs">Banner horizontal · Redes sociales / presentaciones</p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function BrandbookClient() {
  const scrolled = useScrollHeader();
  const NAV = [
    { href: "#marca",        label: "La Marca" },
    { href: "#logo",         label: "Logo" },
    { href: "#colores",      label: "Colores" },
    { href: "#tipografia",   label: "Tipografía" },
    { href: "#tono",         label: "Tono de voz" },
    { href: "#fotografia",   label: "Fotografía" },
    { href: "#lookfeel",     label: "Look & Feel" },
    { href: "#aplicaciones", label: "Aplicaciones" },
  ];

  return (
    <div className="bg-[#080808] text-white min-h-screen" style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #080808; }
        ::-webkit-scrollbar-thumb { background: rgba(179,152,91,0.35); border-radius: 2px; }
      `}</style>

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 transition-all duration-500"
           style={{ background: scrolled ? "rgba(8,8,8,0.96)" : "rgba(8,8,8,0.75)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="Mainstage Pro" className="h-6 object-contain shrink-0" draggable={false} />
          <div className="flex items-center gap-5 overflow-x-auto">
            {NAV.map(l => (
              <a key={l.href} href={l.href} className="text-white/35 text-xs tracking-wide hover:text-white/75 transition-colors whitespace-nowrap hidden md:block">{l.label}</a>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-40 pb-28 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#B3985B] text-xs font-semibold tracking-[0.32em] uppercase mb-6" style={{ animation: "fadeUp 0.8s ease forwards 0.2s", opacity: 0 }}>
            Mainstage Pro · Brandbook {new Date().getFullYear()}
          </p>
          <h1 className="font-bold text-white leading-[1.03]"
              style={{ fontSize: "clamp(2.8rem,7vw,6.5rem)", letterSpacing: "-0.04em", animation: "fadeUp 0.9s ease forwards 0.4s", opacity: 0 }}>
            Creamos experiencias<br />
            <span style={{ color: GOLD }}>que generan impacto.</span>
          </h1>
          <p className="text-white/40 mt-8 max-w-xl leading-relaxed"
             style={{ fontSize: "clamp(1rem,1.8vw,1.1rem)", animation: "fadeUp 0.9s ease forwards 0.65s", opacity: 0 }}>
            Guía de identidad visual y comunicación de Mainstage Pro. Define cómo nos presentamos, cómo hablamos y cómo proyectamos nuestra marca en cada punto de contacto.
          </p>
          <div className="mt-10 flex items-center gap-4" style={{ animation: "fadeUp 0.9s ease forwards 0.85s", opacity: 0 }}>
            <div className="h-px flex-1 max-w-xs" style={{ background: `${GOLD}25` }} />
            <p className="text-white/18 text-xs tracking-widest uppercase">Uso interno · Partners autorizados</p>
          </div>
        </div>
      </section>

      {/* ── 01 La Marca ── */}
      <Sec id="marca" label="01 · La marca">
        <SH title="Identidad de marca" sub="La base de todo lo que hacemos y cómo lo comunicamos." />

        {/* Tagline de marca */}
        <R>
          <div className="mb-14 rounded-2xl px-8 py-10" style={{ background: `${GOLD}07`, border: `1px solid ${GOLD}22` }}>
            <p className="text-white/25 text-xs uppercase tracking-widest mb-4">Frase de marca</p>
            <p className="font-bold text-white" style={{ fontSize: "clamp(1.6rem,3.5vw,3rem)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              "Creamos experiencias<br />
              <span style={{ color: GOLD }}>que generan impacto."</span>
            </p>
          </div>
        </R>

        {/* Misión + Visión */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
          <R>
            <div className="rounded-2xl p-6 h-full" style={{ background: `${GOLD}06`, border: `1px solid ${GOLD}22` }}>
              <p className="text-[#B3985B] text-xs font-semibold tracking-widest uppercase mb-3">Misión</p>
              <p className="text-white/60 text-sm leading-relaxed">
                Desarrollar y ejecutar, con creatividad, organización y profesionalismo, la producción técnica de los proyectos de nuestros clientes; aportando claridad, soluciones y una operación confiable para{" "}
                <strong className="text-white">convertir ideas en experiencias reales.</strong>
              </p>
            </div>
          </R>
          <R delay={100}>
            <div className="rounded-2xl p-6 h-full" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[#B3985B] text-xs font-semibold tracking-widest uppercase mb-3">Visión</p>
              <p className="text-white/60 text-sm leading-relaxed">
                Ser un <strong className="text-white">aliado clave</strong> y parte del equipo de producción de marcas, artistas y promotores a nivel nacional, gracias a nuestro involucramiento real en sus proyectos y una ejecución técnica con alta responsabilidad y nivel.
              </p>
            </div>
          </R>
        </div>

        {/* Valores */}
        <R delay={150}>
          <p className="text-white/22 text-xs uppercase tracking-widest mb-5">Valores de marca</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { v: "Precisión técnica",       d: "Hacemos bien lo que hacemos. No improvisamos en campo." },
              { v: "Responsabilidad total",    d: "Una sola fuente de responsabilidad — nosotros." },
              { v: "Puntualidad sin excusas",  d: "El tiempo del cliente es sagrado. Llegamos antes." },
              { v: "Discreción",               d: "Somos parte del evento — no el protagonismo." },
              { v: "Mejora continua",          d: "Cada proyecto deja una lección. La aplicamos." },
              { v: "Trabajo en equipo",        d: "Operamos sincronizados en campo y en oficina." },
            ].map((item, i) => (
              <R key={item.v} delay={i * 55}>
                <div className="rounded-xl p-4 h-full" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-white font-semibold text-xs mb-1.5">{item.v}</p>
                  <p className="text-white/35 text-xs leading-relaxed">{item.d}</p>
                </div>
              </R>
            ))}
          </div>
        </R>
      </Sec>

      {/* ── 02 Logo ── */}
      <Sec id="logo" label="02 · Logo" dark>
        <SH title="Sistema de logo" sub="El logo existe en tres versiones. Cada una responde a un contexto específico. No son intercambiables." />

        {/* 3 versiones */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-14">
          {/* V1: Blanca — fondos oscuros */}
          <R>
            <div className="rounded-2xl flex items-center justify-center p-10 mb-4" style={{ background: "#080808", border: "1px solid rgba(255,255,255,0.07)", minHeight: 160 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-white.png" alt="Logo completo blanco" draggable={false} style={{ maxHeight: 48, objectFit: "contain" }} />
            </div>
            <p className="text-white text-sm font-semibold">Logo completo · Blanco</p>
            <p className="text-[#B3985B] text-xs mt-0.5 mb-2">Uso principal · Fondos oscuros</p>
            <p className="text-white/35 text-xs leading-relaxed">Isotipo + letras en versión blanca. La versión más frecuente — pantallas, presentaciones, redes sociales, uniformes y todos los materiales digitales sobre fondo negro.</p>
          </R>
          {/* V2: Color — fondos claros */}
          <R delay={100}>
            <div className="rounded-2xl flex items-center justify-center p-10 mb-4" style={{ background: "#EDE9E1", minHeight: 160 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Logo completo color" draggable={false} style={{ maxHeight: 48, objectFit: "contain" }} />
            </div>
            <p className="text-white text-sm font-semibold">Logo completo · Color</p>
            <p className="text-[#B3985B] text-xs mt-0.5 mb-2">Documentos · Fondos claros</p>
            <p className="text-white/35 text-xs leading-relaxed">Isotipo + letras en versión de color. Para cotizaciones impresas, contratos, firma de correo, tarjetas sobre papel y materiales de impresión en fondos blancos o neutros.</p>
          </R>
          {/* V3: Isotipo solo */}
          <R delay={200}>
            <div className="rounded-2xl flex items-center justify-center p-10 mb-4" style={{ background: "#080808", border: "1px solid rgba(255,255,255,0.07)", minHeight: 160 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon.png" alt="Isotipo" draggable={false} style={{ maxHeight: 72, objectFit: "contain" }} />
            </div>
            <p className="text-white text-sm font-semibold">Isotipo · Solo símbolo</p>
            <p className="text-[#B3985B] text-xs mt-0.5 mb-2">Espacios reducidos · Sin texto</p>
            <p className="text-white/35 text-xs leading-relaxed">Los dos círculos superpuestos sin texto. Para favicon, foto de perfil en redes, bordado en uniformes, sellos, etiquetas y aplicaciones donde el espacio no permite el logo completo.</p>
          </R>
        </div>

        {/* Zona de respeto */}
        <R delay={150}>
          <p className="text-white/22 text-xs uppercase tracking-widest mb-6">Zona de respeto · Espacio mínimo</p>
          <div className="rounded-2xl flex items-center justify-center mb-6" style={{ background: "rgba(255,255,255,0.015)", border: `1px dashed ${GOLD}30`, minHeight: 200 }}>
            <div style={{ position: "relative", padding: "36px 56px" }}>
              <div style={{ position: "absolute", inset: 0, border: `1.5px dashed ${GOLD}40`, borderRadius: 4 }}>
                <span style={{ position: "absolute", top: -17, left: "50%", transform: "translateX(-50%)", color: `${GOLD}70`, fontSize: 9, whiteSpace: "nowrap" }}>altura de la "M"</span>
                <span style={{ position: "absolute", bottom: -17, left: "50%", transform: "translateX(-50%)", color: `${GOLD}70`, fontSize: 9, whiteSpace: "nowrap" }}>altura de la "M"</span>
                <span style={{ position: "absolute", left: -42, top: "50%", transform: "translateY(-50%) rotate(-90deg)", color: `${GOLD}70`, fontSize: 9, whiteSpace: "nowrap" }}>"M"</span>
                <span style={{ position: "absolute", right: -42, top: "50%", transform: "translateY(-50%) rotate(90deg)", color: `${GOLD}70`, fontSize: 9, whiteSpace: "nowrap" }}>"M"</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-white.png" alt="Logo" draggable={false} style={{ height: 36, objectFit: "contain", display: "block" }} />
            </div>
          </div>
          <p className="text-white/28 text-xs leading-relaxed max-w-lg mb-10">
            Mantener siempre un espacio libre alrededor del logo equivalente a la altura de la letra "M" del logotipo. Ningún elemento — texto, imagen o ícono — debe invadir esta zona.
          </p>
        </R>

        {/* Tamaño mínimo */}
        <R delay={180}>
          <p className="text-white/22 text-xs uppercase tracking-widest mb-4">Tamaño mínimo de uso</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
            {[
              { ctx: "Digital pantalla", min: "120 px" },
              { ctx: "Impresión offset", min: "40 mm" },
              { ctx: "Isotipo digital",  min: "32 px" },
              { ctx: "Bordado uniforme", min: "25 mm" },
            ].map(item => (
              <div key={item.ctx} className="rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-white font-bold text-sm">{item.min}</p>
                <p className="text-white/30 text-xs mt-1">{item.ctx}</p>
              </div>
            ))}
          </div>
        </R>

        {/* Usos correctos / incorrectos */}
        <R delay={200}>
          <div className="rounded-2xl p-6" style={{ background: "#111", border: "1px solid #222" }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div>
                <p className="text-white font-medium mb-3 flex items-center gap-2"><span className="text-green-400">✓</span> Correcto</p>
                <ul className="space-y-1.5 text-white/40 leading-relaxed">
                  <li>Versión blanca sobre fondos oscuros</li>
                  <li>Versión oscura sobre fondos claros o blancos</li>
                  <li>Mantener proporciones originales siempre</li>
                  <li>Respetar la zona de respeto en todos los casos</li>
                  <li>Isotipo solo cuando el espacio es limitado</li>
                  <li>Archivos vectoriales (.svg / .ai) para impresión</li>
                </ul>
              </div>
              <div>
                <p className="text-white font-medium mb-3 flex items-center gap-2"><span className="text-red-400">✗</span> Incorrecto</p>
                <ul className="space-y-1.5 text-white/40 leading-relaxed">
                  <li>Cambiar colores o modificar el logo</li>
                  <li>Logo sobre fondos sin contraste suficiente</li>
                  <li>Distorsionar, estirar o rotar el logo</li>
                  <li>Sombras, efectos de brillo o contornos no autorizados</li>
                  <li>Logo sobre fotografía sin capa de oscurecimiento</li>
                  <li>Recrear el logotipo con otra tipografía</li>
                </ul>
              </div>
            </div>
          </div>
        </R>
      </Sec>

      {/* ── 03 Colores ── */}
      <Sec id="colores" label="03 · Colores">
        <SH title="Paleta de colores" sub="La identidad cromática se construye sobre negro profundo y dorado cálido. El negro comunica precisión y sobriedad. El dorado, valor y distinción. Su poder está en la escasez." />

        {/* Primarios */}
        <R delay={50}>
          <p className="text-white/22 text-xs uppercase tracking-widest mb-5">Colores primarios</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            <Swatch hex="#080808" name="Negro profundo"    role="Fondo principal"    pantone="Pantone Black 6 C"  cmyk="C0 M0 Y0 K97" />
            <Swatch hex="#B3985B" name="Dorado Mainstage" role="Acento · Identidad" pantone="Pantone 7508 C"     cmyk="C0 M15 Y49 K30" />
            <Swatch hex="#FFFFFF" name="Blanco"            role="Texto principal"    pantone="Pantone White"      cmyk="C0 M0 Y0 K0" />
            <Swatch hex="#040404" name="Negro absoluto"    role="Secciones hero"     pantone="Pantone Black C"    cmyk="C0 M0 Y0 K100" />
          </div>
        </R>

        {/* Proporciones */}
        <R delay={80}>
          <p className="text-white/22 text-xs uppercase tracking-widest mb-4">Proporciones de uso recomendadas</p>
          <div className="rounded-xl overflow-hidden flex mb-3" style={{ height: 44 }}>
            <div style={{ flex: 60, background: "#080808", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="text-white/30 text-xs">Negro · 60%</span>
            </div>
            <div style={{ flex: 30, background: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="text-white/30 text-xs">Grises · 30%</span>
            </div>
            <div style={{ flex: 10, background: GOLD, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="text-black/60 text-xs font-bold">10%</span>
            </div>
          </div>
          <p className="text-white/22 text-xs leading-relaxed mb-10">El dorado aplicado en exceso pierde su efecto de distinción. Usarlo con moderación es parte de la identidad.</p>
        </R>

        {/* Grises */}
        <R delay={100}>
          <p className="text-white/22 text-xs uppercase tracking-widest mb-5">Grises de soporte — estructuras y textos</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mb-10">
            <Swatch hex="#111111" name="Carbon"   role="Cards · fondos" />
            <Swatch hex="#1A1A1A" name="Grafito"  role="Fondos secundarios" />
            <Swatch hex="#222222" name="Coque"    role="Bordes principales" />
            <Swatch hex="#444444" name="Pizarra"  role="Bordes activos" />
            <Swatch hex="#888888" name="Ceniza"   role="Texto secundario" />
            <Swatch hex="#AAAAAA" name="Humo"     role="Texto terciario" />
          </div>
        </R>

        {/* Uso del dorado */}
        <R delay={130}>
          <div className="rounded-2xl p-6" style={{ background: "#111", border: "1px solid #222" }}>
            <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider mb-5">Usos autorizados del dorado · {GOLD}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-white/55 text-xs font-medium mb-2">Fondo sólido</p>
                <div className="rounded-lg px-4 py-3 text-black text-xs font-bold" style={{ background: GOLD }}>CTA principal · Botón activo · Badge</div>
                <p className="text-white/22 text-xs mt-2">Solo texto negro sobre dorado sólido.</p>
              </div>
              <div>
                <p className="text-white/55 text-xs font-medium mb-2">Texto / ícono de acento</p>
                <div className="rounded-lg px-4 py-3" style={{ background: "#1a1a1a", border: "1px solid #333" }}>
                  <span style={{ color: GOLD }} className="text-xs">Titulares, íconos activos, links de énfasis</span>
                </div>
                <p className="text-white/22 text-xs mt-2">Uso más frecuente — dorado sobre negro.</p>
              </div>
              <div>
                <p className="text-white/55 text-xs font-medium mb-2">Translúcido</p>
                <div className="rounded-lg px-4 py-3" style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}25` }}>
                  <span style={{ color: GOLD }} className="text-xs">Fondos de chips activos, separadores sutiles</span>
                </div>
                <p className="text-white/22 text-xs mt-2">Para énfasis sin protagonismo visual.</p>
              </div>
            </div>
            <div className="pt-5 border-t border-white/[0.05]">
              <p className="text-red-400/55 text-xs font-semibold uppercase tracking-wider mb-3">Prohibido</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-white/28 leading-relaxed">
                <p>✗ Texto blanco sobre fondo dorado sólido</p>
                <p>✗ Degradado dorado como fondo de pantalla completa</p>
                <p>✗ Dorado en más del 10% de la superficie de un diseño</p>
                <p>✗ Combinar dorado con otros colores de acento o neón</p>
              </div>
            </div>
          </div>
        </R>
      </Sec>

      {/* ── 04 Tipografía ── */}
      <Sec id="tipografia" label="04 · Tipografía" dark>
        <SH title="Sistema tipográfico" sub="Se usa la fuente del sistema operativo (San Francisco en macOS/iOS, Segoe UI en Windows) para máxima compatibilidad. El estilo editorial se logra con tamaño, peso y tracking — no con fuentes decorativas." />

        <div className="space-y-9">
          {[
            { label: "Display / Hero",     size: "clamp(2.8rem,7vw,6.5rem)", weight: "800", tracking: "-0.04em",  sample: "Creamos experiencias." },
            { label: "Titular H1",          size: "clamp(2rem,5vw,4.5rem)",  weight: "700", tracking: "-0.03em",  sample: "Producción técnica profesional." },
            { label: "Titular H2",          size: "clamp(1.6rem,3.5vw,3rem)",weight: "700", tracking: "-0.025em", sample: "Audio · Iluminación · Video · DJ" },
            { label: "Cuerpo de texto",     size: "1rem",                     weight: "400", tracking: "normal",   sample: "Equipo 100% propio, operadores formados internamente y una sola fuente de responsabilidad para que el cliente se enfoque en lo que importa." },
            { label: "Caption / Label",     size: "0.75rem",                  weight: "600", tracking: "0.22em",  sample: "MAINSTAGE PRO · PRODUCCIÓN TÉCNICA" },
          ].map((t, i) => (
            <R key={t.label} delay={i * 75}>
              <div className="border-b border-white/[0.05] pb-8">
                <p className="text-white/25 text-xs mb-3 uppercase tracking-widest">{t.label} · {t.size} · {t.weight} weight</p>
                <p style={{ fontSize: t.size, fontWeight: t.weight, letterSpacing: t.tracking, lineHeight: 1.1 }} className="text-white">{t.sample}</p>
              </div>
            </R>
          ))}
        </div>

        <R delay={400}>
          <div className="mt-12 rounded-2xl p-6" style={{ background: "#111", border: "1px solid #222" }}>
            <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider mb-4">Reglas tipográficas</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-white/35 leading-relaxed">
              <ul className="space-y-1.5">
                <li>✓ Titulares con letter-spacing negativo (–0.03em a –0.04em)</li>
                <li>✓ Cuerpo de texto con interlineado de 1.6–1.7</li>
                <li>✓ Labels y etiquetas en mayúsculas con tracking positivo</li>
                <li>✓ Bold (700–800) solo para títulos y énfasis estratégico</li>
              </ul>
              <ul className="space-y-1.5">
                <li>✗ Texto en cursiva salvo citas o términos técnicos</li>
                <li>✗ Fuentes decorativas o display externas a la marca</li>
                <li>✗ Texto subrayado en materiales de diseño</li>
                <li>✗ Mezclar más de dos pesos en el mismo bloque</li>
              </ul>
            </div>
          </div>
        </R>
      </Sec>

      {/* ── 05 Tono de voz ── */}
      <Sec id="tono" label="05 · Tono de voz">
        <SH title="Cómo hablamos" sub="El tono de Mainstage Pro es directo, técnico y confiable — sin ser frío. Hablamos como expertos que no necesitan exagerar. Sin emojis, sin exclamaciones excesivas, sin promesas vacías." />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-14">
          {[
            { t: "Directos",   b: "Vamos al punto. No rodeamos ni usamos palabras de relleno. Si algo funciona, lo decimos claro. Si hay una limitación, también la decimos." },
            { t: "Técnicos",   b: "Usamos términos del sector sin miedo — rider, cue, line array, headroom. Nuestros clientes respetan que sabemos de lo que hablamos." },
            { t: "Confiables", b: "Nunca prometemos lo que no podemos cumplir. Ponemos expectativas reales. Preferimos sorprender bien que defraudar." },
            { t: "Cercanos",   b: "No somos fríos ni corporativos. Hablamos en primera persona del plural, sin tuteos forzados ni formalidades innecesarias." },
          ].map((item, i) => (
            <R key={item.t} delay={i * 80}>
              <div>
                <div className="w-6 h-0.5 mb-3 rounded-full" style={{ background: GOLD }} />
                <h4 className="text-white font-semibold mb-2">{item.t}</h4>
                <p className="text-white/42 text-sm leading-relaxed">{item.b}</p>
              </div>
            </R>
          ))}
        </div>

        <R delay={200}>
          <p className="text-white/22 text-xs uppercase tracking-widest mb-5">Ejemplos de voz</p>
          <div className="space-y-3">
            {[
              { no: "¡Tenemos el mejor equipo de audio del mercado! ¡No te decepciones!", si: "Line arrays y subwoofers calibrados para el espacio. La frecuencia llega uniforme de frente a fondo — sin puntos muertos." },
              { no: "Somos super profesionales y nos encanta lo que hacemos 🎉🎶", si: "Llevamos audio, iluminación, video y operadores en un solo servicio. Todo lo técnico queda con nosotros." },
              { no: "¡Contáctanos y con mucho gusto te cotizamos lo mejor del mercado! 😊", si: "Cuéntanos sobre el evento y el venue. Te preparamos una propuesta en menos de 24 horas." },
            ].map((ex, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl p-4" style={{ background: "rgba(153,27,27,0.12)", border: "1px solid rgba(153,27,27,0.25)" }}>
                  <p className="text-red-400/55 text-xs font-semibold uppercase tracking-wider mb-2">No</p>
                  <p className="text-red-300/65 text-sm leading-relaxed">{ex.no}</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: "rgba(20,83,45,0.15)", border: "1px solid rgba(20,83,45,0.3)" }}>
                  <p className="text-green-400/55 text-xs font-semibold uppercase tracking-wider mb-2">Sí</p>
                  <p className="text-green-300/65 text-sm leading-relaxed">{ex.si}</p>
                </div>
              </div>
            ))}
          </div>
        </R>
      </Sec>

      {/* ── 06 Fotografía ── */}
      <Sec id="fotografia" label="06 · Fotografía" dark>
        <SH title="Criterios de fotografía" sub="La fotografía de Mainstage Pro muestra producción real en escala. No renders, no stock, no imágenes de equipo aislado. Las fotos deben comunicar profesionalismo, escala y atmósfera." />

        <R delay={50}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
            {[
              { t: "Producción en escala",   d: "Shows o eventos con equipo visible, crowd y atmósfera real." },
              { t: "Alta calidad técnica",    d: "Bien iluminadas, enfocadas, sin ruido digital ni distorsión." },
              { t: "Ambientes oscuros",       d: "Paleta oscura con luz de producción como elemento principal." },
              { t: "Sin sobre-edición",       d: "Sin filtros Instagram. Procesado sobrio, colores reales." },
            ].map((item, i) => (
              <R key={item.t} delay={i * 60}>
                <div className="rounded-xl p-4 h-full" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="w-5 h-0.5 mb-3 rounded-full" style={{ background: GOLD }} />
                  <p className="text-white text-xs font-semibold mb-1.5">{item.t}</p>
                  <p className="text-white/32 text-xs leading-relaxed">{item.d}</p>
                </div>
              </R>
            ))}
          </div>
        </R>

        {/* Photo references */}
        <R delay={100}>
          <p className="text-white/22 text-xs uppercase tracking-widest mb-5">Fotos de referencia aprobadas</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
            {[
              { src: "/images/presentacion/ev-m-hero.jpg",  cap: "Festival · Producción completa" },
              { src: "/images/presentacion/ev-s-hero.jpg",  cap: "Boda · Venue elegante" },
              { src: "/images/presentacion/ev-e-hero.jpg",  cap: "Congreso · AV corporativo" },
              { src: "/images/presentacion/ev-m-02.jpg",    cap: "Show · Lasers y producción" },
              { src: "/images/presentacion/ev-s-01.jpg",    cap: "Hacienda · Iluminación ambiente" },
              { src: "/images/presentacion/ev-e-01.jpg",    cap: "Conferencia · Iluminación corp." },
            ].map(p => (
              <div key={p.src} className="relative rounded-xl overflow-hidden group" style={{ aspectRatio: "4/3" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt={p.cap} draggable={false} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(8,8,8,0.75) 0%, transparent 55%)" }} />
                <p className="absolute bottom-3 left-3 right-3 text-white/55 text-xs leading-tight">{p.cap}</p>
              </div>
            ))}
          </div>
        </R>

        {/* Photo prohibitions */}
        <R delay={150}>
          <div className="rounded-2xl p-6" style={{ background: "#111", border: "1px solid #222" }}>
            <p className="text-red-400/55 text-xs font-semibold uppercase tracking-wider mb-3">Fotografía no autorizada</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-white/30 leading-relaxed">
              <p>✗ Fotos de banco de imágenes / stock photography</p>
              <p>✗ Renders o imágenes CGI de equipo audiovisual</p>
              <p>✗ Fotos con filtros de color saturados o VSCO excesivo</p>
              <p>✗ Imágenes borrosas, con ruido digital o mal encuadradas</p>
              <p>✗ Fotos con logos o marca de agua de otros proveedores</p>
              <p>✗ Imágenes con personas en primer plano sin autorización</p>
            </div>
          </div>
        </R>
      </Sec>

      {/* ── 07 Look & Feel ── */}
      <Sec id="lookfeel" label="07 · Look & Feel">
        <SH title="Principios de diseño" sub="Cada pieza de comunicación de Mainstage Pro respeta estos cuatro principios. No son opcionales — son parte de la identidad." />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-14">
          {[
            { t: "Sobrio",       d: "Sin ruido visual. Sin adornos innecesarios. Cada elemento en el diseño tiene una razón de ser. Lo que no agrega, sobra." },
            { t: "Minimalista",  d: "Espacio en blanco como elemento activo. Jerarquía clara. Un punto de atención por pieza. Menos es más — siempre." },
            { t: "Simétrico",    d: "Composiciones equilibradas y alineadas. Grids de 12 columnas. Márgenes consistentes. La simetría comunica orden y precisión." },
            { t: "Equilibrado",  d: "Balance visual entre texto, imagen y espacio. El dorado como único punto de tensión. El negro como base estable que todo lo sostiene." },
          ].map((item, i) => (
            <R key={item.t} delay={i * 80}>
              <div className="rounded-2xl p-6 h-full" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="font-bold text-white mb-2" style={{ fontSize: "clamp(1.1rem,2vw,1.4rem)", letterSpacing: "-0.02em" }}>{item.t}</p>
                <p className="text-white/40 text-sm leading-relaxed">{item.d}</p>
              </div>
            </R>
          ))}
        </div>

        {/* Composition demo */}
        <R delay={200}>
          <p className="text-white/22 text-xs uppercase tracking-widest mb-5">Composición tipo — uso de espacio y jerarquía</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card tipo 1: hero */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#040404", border: "1px solid rgba(255,255,255,0.06)", aspectRatio: "3/4", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 24, position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, #040404 0%, transparent 60%)` }} />
              <div style={{ position: "absolute", top: 20, left: 24 }}>
                <div style={{ width: 32, height: 2, background: GOLD, borderRadius: 1 }} />
              </div>
              <div style={{ position: "relative", zIndex: 1 }}>
                <p style={{ color: GOLD, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Eventos Musicales</p>
                <p style={{ color: "white", fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em", lineHeight: 1.2 }}>El show bien producido no se nota.</p>
              </div>
            </div>
            {/* Card tipo 2: dato */}
            <div className="rounded-2xl" style={{ background: "#111", border: `1px solid ${GOLD}20`, padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between", aspectRatio: "3/4" }}>
              <div style={{ width: 24, height: 2, background: GOLD, borderRadius: 1 }} />
              <div>
                <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>Tiempo de respuesta</p>
                <p style={{ color: GOLD, fontWeight: 800, fontSize: 40, letterSpacing: "-0.04em", lineHeight: 1 }}>{"<24h"}</p>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>Desde que recibes tu propuesta técnica.</p>
              </div>
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-white.png" alt="logo" draggable={false} style={{ height: 14, objectFit: "contain", opacity: 0.2 }} />
              </div>
            </div>
            {/* Card tipo 3: texto */}
            <div className="rounded-2xl" style={{ background: "#080808", border: "1px solid rgba(255,255,255,0.06)", padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between", aspectRatio: "3/4" }}>
              <p style={{ color: GOLD, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase" }}>Por qué elegirnos</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {["Equipo 100% propio", "Operadores formados internamente", "Una sola fuente de responsabilidad", "Montaje con margen — sin carreras"].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: GOLD, flexShrink: 0 }} />
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, lineHeight: 1.4 }}>{item}</p>
                  </div>
                ))}
              </div>
              <div style={{ height: 1, background: `${GOLD}20` }} />
            </div>
          </div>
        </R>
      </Sec>

      {/* ── 08 Aplicaciones ── */}
      <Sec id="aplicaciones" label="08 · Aplicaciones" dark>
        <SH title="La marca en uso" sub="Ejemplos de cómo se ve y se siente Mainstage Pro en sus puntos de contacto." />

        {/* Banner */}
        <R>
          <p className="text-white/22 text-xs uppercase tracking-widest mb-4">Banner digital</p>
          <Banner />
        </R>

        {/* Tarjeta + Membretada */}
        <R delay={100}>
          <p className="text-white/22 text-xs uppercase tracking-widest mb-6 mt-14">Papelería</p>
          <div className="flex flex-col sm:flex-row gap-10 flex-wrap">
            <BizCard />
            <Letterhead />
          </div>
        </R>

        {/* Redes sociales */}
        <R delay={130}>
          <p className="text-white/22 text-xs uppercase tracking-widest mb-5 mt-14">Post para redes sociales</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* Square post */}
            <div style={{ aspectRatio: "1/1", background: "#080808", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 20, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: GOLD }} />
              <p style={{ color: GOLD, fontSize: 8, letterSpacing: "0.22em", textTransform: "uppercase" }}>Producción Técnica</p>
              <p style={{ color: "white", fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em", lineHeight: 1.2 }}>Audio. Luz. Video.<br />Un solo equipo.</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-white.png" alt="logo" draggable={false} style={{ height: 14, objectFit: "contain", alignSelf: "flex-start", opacity: 0.55 }} />
            </div>
            {/* Story vertical */}
            <div style={{ aspectRatio: "9/16", background: "#040404", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 20, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: GOLD }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-white.png" alt="logo" draggable={false} style={{ height: 13, objectFit: "contain", alignSelf: "flex-start" }} />
              <div>
                <p style={{ color: GOLD, fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Mainstage Pro</p>
                <p style={{ color: "white", fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em", lineHeight: 1.2 }}>Creamos experiencias que generan impacto.</p>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, marginTop: 10 }}>mainstagepro.com</p>
              </div>
            </div>
            {/* Banner wide */}
            <div style={{ aspectRatio: "1/1", background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 20, overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase" }}>@mainstagepro</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-icon.png" alt="icon" draggable={false} style={{ height: 20, objectFit: "contain", opacity: 0.6 }} />
              </div>
              <div>
                {[95, 80, 60].map((w, i) => <div key={i} style={{ height: 5, background: i === 0 ? GOLD : "rgba(255,255,255,0.1)", borderRadius: 2, width: `${w}%`, marginBottom: 5 }} />)}
              </div>
            </div>
          </div>
          <p className="text-white/22 text-xs mt-3">Post cuadrado · Story vertical · Contenido orgánico</p>
        </R>

        {/* Uniformes */}
        <R delay={160}>
          <p className="text-white/22 text-xs uppercase tracking-widest mb-6 mt-14">Uniformes operativos</p>
          <div className="flex flex-wrap gap-10 items-end">
            <Shirt label="Polo / Camiseta manga corta · Negro" />
            <Shirt long label="Camisa manga larga · Negro" />
            <Shirt color="#1C1C1A" label="Camiseta técnica · Negro grafito" />
            <Shirt long color="#0D0D0D" label="Sudadera / Hoodie · Negro absoluto" />
          </div>
          <div className="mt-6 rounded-2xl p-5" style={{ background: "#111", border: "1px solid #222", maxWidth: 520 }}>
            <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider mb-3">Lineamientos de uniforme</p>
            <ul className="space-y-1.5 text-xs text-white/35 leading-relaxed">
              <li>✓ Logo bordado en pecho — versión blanca, máx. 60mm de ancho</li>
              <li>✓ Isotipo bordado en manga izquierda — máx. 30mm</li>
              <li>✓ Colores autorizados: negro (#080808), negro grafito (#1C1C1A)</li>
              <li>✓ Tela técnica o algodón peinado — sin brillos ni texturas llamativas</li>
              <li>✗ Logos de otras marcas visibles en el uniforme</li>
              <li>✗ Colores distintos a los de la paleta de marca</li>
            </ul>
          </div>
        </R>

        {/* Firma de correo */}
        <R delay={200}>
          <p className="text-white/22 text-xs uppercase tracking-widest mb-5 mt-14">Firma de correo electrónico</p>
          <div className="rounded-2xl overflow-hidden" style={{ maxWidth: 400, background: "#F5F2EC", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ borderTop: `3px solid ${GOLD}`, padding: "18px 20px 14px" }}>
              <p style={{ color: "#111", fontWeight: 600, fontSize: 13 }}>Nombre Apellido</p>
              <p style={{ color: GOLD, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", marginTop: 2, marginBottom: 10 }}>Director de Operaciones · Mainstage Pro</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <p style={{ color: "#666", fontSize: 9 }}>+52 446 143 2565</p>
                <p style={{ color: "#666", fontSize: 9 }}>contacto@mainstagepro.com</p>
                <p style={{ color: "#666", fontSize: 9 }}>mainstagepro.com</p>
              </div>
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #e0ddd7" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="logo" draggable={false} style={{ height: 16, objectFit: "contain" }} />
              </div>
            </div>
          </div>
          <p className="text-white/22 text-xs mt-3">Firma de correo · Fondo claro con logo oscuro</p>
        </R>
      </Sec>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/[0.04] text-center" style={{ background: "#040404" }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="Mainstage Pro" className="h-6 object-contain opacity-35" draggable={false} />
          <p className="text-white/18 text-xs tracking-wide">Brandbook Mainstage Pro · © {new Date().getFullYear()} · Uso interno y partners autorizados</p>
          <a href="/presentacion/servicios" className="text-white/22 text-xs hover:text-[#B3985B] transition-colors">Ver presentación →</a>
        </div>
      </footer>
    </div>
  );
}
