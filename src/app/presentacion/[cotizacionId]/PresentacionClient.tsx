"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Linea {
  id: string;
  tipo: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  cantidad: number;
  subtotal: number;
  esIncluido: boolean;
  notas: string | null;
  equipo?: { categoria: { nombre: string } | null } | null;
}
interface Cotizacion {
  id: string;
  numeroCotizacion: string;
  nombreEvento: string | null;
  tipoEvento: string | null;
  tipoServicio: string | null;
  fechaEvento: string | null;
  lugarEvento: string | null;
  horasOperacion: number | null;
  granTotal: number;
  total: number;
  aplicaIva: boolean;
  montoIva: number;
  observaciones: string | null;
  terminosComerciales: string | null;
  cliente: { nombre: string; empresa: string | null; telefono: string | null; correo: string | null };
  trato: { tipoEvento: string } | null;
  lineas: Linea[];
}

// ─── Image Gallery Data ───────────────────────────────────────────────────────
const GALLERY_MUSICAL = [
  { src: "/images/presentacion/m-dj-blue.jpg",      caption: "Performance DJ · Azul" },
  { src: "/images/presentacion/m-laser-red.jpg",    caption: "Lasers · Rooftop" },
  { src: "/images/presentacion/m-smoke-pink.jpg",   caption: "Producción · Humo y luces" },
  { src: "/images/presentacion/m-arch-neon.jpg",    caption: "DJ Booth · Arco neón" },
  { src: "/images/presentacion/m-crowd-pink.jpg",   caption: "Crowd · Disco ball" },
  { src: "/images/presentacion/m-stage-green.jpg",  caption: "Stage · Beams" },
  { src: "/images/presentacion/hero-festival.png",  caption: "Festival · Producción completa" },
];
const GALLERY_SOCIAL = [
  { src: "/images/presentacion/s-couple-purple.png", caption: "Evento social · Iluminación especial" },
  { src: "/images/presentacion/s-dinner-sunset.png", caption: "Cena · Sunset" },
  { src: "/images/presentacion/s-stage-full.png",    caption: "Escenario · Producción completa" },
  { src: "/images/presentacion/s-vocalist.png",      caption: "En vivo · Vocals" },
];
const GALLERY_CORP = [
  { src: "/images/presentacion/e-corp-screens.jpg",  caption: "Corporativo · Video walls" },
  { src: "/images/presentacion/e-corp-outdoor.jpg",  caption: "Evento exterior · Pantalla LED" },
  { src: "/images/presentacion/equip-speaker.jpg",   caption: "Sistema de audio · Rooftop" },
];

// ─── Constants ────────────────────────────────────────────────────────────────
const AUDIO_CATS  = ["Equipo de Audio","Sistemas de Microfonía","Monitoreo In-Ear","Consolas de Audio"];
const ILUM_CATS   = ["Equipo de Iluminación","Consolas de Iluminación"];
const DJ_CATS     = ["Consolas/Equipo para DJ","DJ Booths","Entarimado"];
const VIDEO_CATS  = ["Pantalla / Video"];

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",minimumFractionDigits:0,maximumFractionDigits:0}).format(n);
}
function fmtDate(s: string | null) {
  if (!s) return null;
  return new Date(s).toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
}
function groupLineas(lineas: Linea[]) {
  const isEquipo = (l: Linea) => l.tipo === "EQUIPO_PROPIO" || l.tipo === "EQUIPO_EXTERNO";
  const cat = (l: Linea) => l.equipo?.categoria?.nombre ?? "";
  return {
    audio: lineas.filter(l => isEquipo(l) && AUDIO_CATS.includes(cat(l))),
    ilum:  lineas.filter(l => isEquipo(l) && ILUM_CATS.includes(cat(l))),
    dj:    lineas.filter(l => l.tipo === "DJ" || (isEquipo(l) && DJ_CATS.includes(cat(l)))),
    video: lineas.filter(l => isEquipo(l) && VIDEO_CATS.includes(cat(l))),
    staff: lineas.filter(l => l.tipo === "OPERACION_TECNICA"),
  };
}

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
  const [count, setCount] = useState(0);
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

// ─── Reveal wrapper ───────────────────────────────────────────────────────────
function R({ children, delay = 0, y = 48, className = "" }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  const { ref, vis } = useReveal();
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms`, opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : `translateY(${y}px)`, transition: "opacity 0.85s ease, transform 0.85s ease" }} className={className}>
      {children}
    </div>
  );
}

// ─── Gold label ───────────────────────────────────────────────────────────────
function GoldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-[0.22em] mb-5">{children}</p>;
}

// ─── Section heading ──────────────────────────────────────────────────────────
function Heading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`text-white font-bold leading-[1.04] ${className}`}
        style={{ fontSize: "clamp(2rem,4.5vw,3.6rem)", letterSpacing: "-0.022em" }}>
      {children}
    </h2>
  );
}

// ─── Horizontal Draggable Gallery ─────────────────────────────────────────────
function DragGallery({ photos }: { photos: { src: string; caption: string }[] }) {
  const trackRef  = useRef<HTMLDivElement>(null);
  const startX    = useRef(0);
  const scrollL   = useRef(0);
  const dragging  = useRef(false);

  const onDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startX.current   = e.pageX - (trackRef.current?.offsetLeft ?? 0);
    scrollL.current  = trackRef.current?.scrollLeft ?? 0;
    if (trackRef.current) trackRef.current.style.cursor = "grabbing";
  }, []);
  const onUp = useCallback(() => {
    dragging.current = false;
    if (trackRef.current) trackRef.current.style.cursor = "grab";
  }, []);
  const onMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current || !trackRef.current) return;
    e.preventDefault();
    const x    = e.pageX - trackRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.8;
    trackRef.current.scrollLeft = scrollL.current - walk;
  }, []);

  return (
    <div
      ref={trackRef}
      className="flex gap-3 overflow-x-auto select-none pb-4"
      style={{ scrollSnapType: "x mandatory", cursor: "grab", scrollbarWidth: "none", msOverflowStyle: "none" }}
      onMouseDown={onDown} onMouseUp={onUp} onMouseLeave={onUp} onMouseMove={onMove}
    >
      {photos.map((p, i) => (
        <div key={i} className="shrink-0 relative rounded-2xl overflow-hidden group"
             style={{ width: "clamp(220px,32vw,340px)", height: "clamp(320px,48vw,500px)", scrollSnapAlign: "start" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.src} alt={p.caption} draggable={false}
               className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <p className="absolute bottom-4 left-4 text-white/50 text-xs tracking-wide">{p.caption}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Equipment chip ───────────────────────────────────────────────────────────
function EqChip({ linea }: { linea: Linea }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/6">
      <div className="w-1 h-1 rounded-full bg-[#B3985B] shrink-0" />
      <div>
        {linea.marca && <span className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mr-2">{linea.marca}</span>}
        <span className="text-white/80 text-sm font-medium">{linea.modelo ?? linea.descripcion}</span>
        {linea.modelo && <span className="text-white/30 text-xs ml-2">· {linea.descripcion}</span>}
        {linea.cantidad > 1 && <span className="text-white/20 text-xs ml-2">×{linea.cantidad}</span>}
      </div>
    </div>
  );
}

// ─── Contract Section ─────────────────────────────────────────────────────────
const DEFAULT_CONTRATO = `TÉRMINOS Y CONDICIONES DE SERVICIO

1. VIGENCIA DE LA PROPUESTA
La presente propuesta tiene una vigencia de 30 días naturales a partir de su fecha de emisión. Pasado este plazo, los precios y disponibilidad quedan sujetos a actualización.

2. CONDICIONES DE PAGO
• 50% del monto total para confirmar y reservar la fecha.
• 50% restante liquidado 72 horas antes del evento.
• Formas de pago aceptadas: transferencia bancaria, depósito o SPEI.

3. ALCANCE DEL SERVICIO
El servicio incluye todo el equipo y personal técnico descrito en esta propuesta. Cualquier requerimiento adicional no contemplado deberá cotizarse por separado y autorizado previamente por escrito.

4. CANCELACIÓN Y REPROGRAMACIÓN
• Cancelación con más de 30 días de anticipación: reembolso del 80% del anticipo.
• Cancelación entre 15 y 30 días: reembolso del 50% del anticipo.
• Cancelación con menos de 15 días: el anticipo no es reembolsable.
• Reprogramaciones (sujeto a disponibilidad) se analizarán sin penalización con aviso mínimo de 30 días.

5. RESPONSABILIDADES
Mainstage Pro garantiza la operación correcta del equipo descrito. No se hace responsable por condiciones del venue, fuerza mayor, o modificaciones en el programa del evento no comunicadas con al menos 48 horas de anticipación.

6. PROPIEDAD DEL EQUIPO
Todo el equipo listado en esta propuesta es propiedad de Mainstage Pro o de sus proveedores autorizados. El cliente no asume responsabilidad de resguardo salvo acuerdo específico por escrito.`;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PresentacionClient({ cotizacion }: { cotizacion: Cotizacion }) {
  const [scrollY, setScrollY]         = useState(0);
  const [contractOpen, setContract]   = useState(false);
  const heroContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const { audio, ilum, dj, video, staff } = groupLineas(cotizacion.lineas);
  const tipo    = cotizacion.trato?.tipoEvento ?? cotizacion.tipoEvento ?? "";
  const evento  = cotizacion.nombreEvento ?? tipo ?? "Tu Evento";
  const fecha   = fmtDate(cotizacion.fechaEvento);
  const tel     = cotizacion.cliente.telefono?.replace(/\D/g,"");
  const waUrl   = tel ? `https://wa.me/52${tel}?text=${encodeURIComponent(`Hola! Vi la propuesta de Mainstage Pro para ${evento} y quiero confirmar.`)}` : null;

  // Per-type hero config
  const heroImg =
    tipo === "MUSICAL"    ? "/images/presentacion/hero-festival.png" :
    tipo === "SOCIAL"     ? "/images/presentacion/s-couple-purple.png" :
    tipo === "EMPRESARIAL"? "/images/presentacion/e-corp-screens.jpg" :
                            "/images/presentacion/hero-festival.png";

  const heroTagline =
    tipo === "MUSICAL"    ? "Sonido que mueve multitudes." :
    tipo === "SOCIAL"     ? "La noche que todos recordarán." :
    tipo === "EMPRESARIAL"? "Tecnología que impresiona." :
                            "Una experiencia que no se olvida.";

  const heroSub =
    tipo === "MUSICAL"    ? "Audio de referencia, iluminación de categoría mundial, operadores de élite." :
    tipo === "SOCIAL"     ? "Cada detalle técnico afinado para que tú solo disfrutes el momento." :
    tipo === "EMPRESARIAL"? "Producción profesional al servicio de tu marca y tu mensaje." :
                            "Tecnología de primer nivel. Operadores de élite.";

  // Gallery selection based on type
  const gallery =
    tipo === "SOCIAL"     ? [...GALLERY_SOCIAL, ...GALLERY_MUSICAL.slice(0,3)] :
    tipo === "EMPRESARIAL"? [...GALLERY_CORP,   ...GALLERY_MUSICAL.slice(0,3)] :
                            GALLERY_MUSICAL;

  // Animated counters
  const c1 = useCounter(200);
  const c2 = useCounter(50000);
  const c3 = useCounter(6);
  const c4 = useCounter(100);

  // Hero parallax + fade
  const heroOpacity = Math.max(0, 1 - scrollY / 600);
  const heroY       = scrollY * 0.38;

  return (
    <main className="bg-black text-white overflow-x-hidden"
          style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>

      {/* ── STICKY NAV ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 sm:px-10 h-14"
           style={{
             background: `rgba(0,0,0,${Math.min(0.92, scrollY/100)})`,
             backdropFilter: scrollY > 30 ? "blur(24px) saturate(180%)" : "none",
             borderBottom: scrollY > 30 ? "1px solid rgba(255,255,255,0.06)" : "none",
             transition: "background 0.4s,border-color 0.4s",
           }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.png" alt="Mainstage Pro" className="h-5 opacity-90" draggable={false} />
        <span className="text-white/30 text-xs hidden sm:block tracking-wide">
          Propuesta · {cotizacion.cliente.empresa ?? cotizacion.cliente.nombre}
        </span>
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noreferrer"
             className="text-[11px] font-semibold px-3.5 py-1.5 rounded-full border border-[#B3985B]/50 text-[#B3985B] hover:bg-[#B3985B]/10 transition-colors hidden sm:flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Contactar
          </a>
        )}
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* BG with Ken Burns */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImg} alt="" draggable={false}
             className="absolute inset-0 w-full h-full object-cover pointer-events-none"
             style={{ animation: "kenBurns 14s ease-in-out infinite alternate", transformOrigin: "center center" }} />
        {/* Layered overlays for depth */}
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />

        {/* Content */}
        <div ref={heroContentRef}
             className="relative z-10 text-center px-6 max-w-5xl mx-auto"
             style={{ opacity: heroOpacity, transform: `translateY(${heroY}px)` }}>
          <p className="text-[#B3985B] text-[10px] sm:text-xs font-semibold uppercase tracking-[0.28em] mb-7 animate-fadeUp">
            Mainstage Pro · Propuesta Exclusiva
          </p>
          <h1 className="font-bold text-white leading-[1.03] mb-5 animate-fadeUp"
              style={{ fontSize: "clamp(2.6rem,9vw,7rem)", letterSpacing: "-0.025em", animationDelay: "0.1s" }}>
            {evento}
          </h1>
          <p className="text-white/75 font-light animate-fadeUp mb-3"
             style={{ fontSize: "clamp(1.2rem,3vw,2.1rem)", letterSpacing: "-0.01em", animationDelay: "0.2s" }}>
            {heroTagline}
          </p>
          <p className="text-white/40 animate-fadeUp mb-10"
             style={{ fontSize: "clamp(0.9rem,1.8vw,1.15rem)", animationDelay: "0.3s" }}>
            {heroSub}
          </p>
          {/* Meta chips */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-white/35 text-sm animate-fadeUp"
               style={{ animationDelay: "0.4s" }}>
            {fecha && (
              <span className="flex items-center gap-2 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-sm bg-white/5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span className="capitalize">{fecha}</span>
              </span>
            )}
            {cotizacion.lugarEvento && (
              <span className="flex items-center gap-2 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-sm bg-white/5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                {cotizacion.lugarEvento}
              </span>
            )}
            <span className="flex items-center gap-2 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-sm bg-white/5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Para {cotizacion.cliente.empresa ?? cotizacion.cliente.nombre}
            </span>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
             style={{ opacity: Math.max(0, 1 - scrollY / 200) }}>
          <span className="text-white/20 text-[10px] uppercase tracking-[0.2em]">Descubrir</span>
          <div className="w-px h-8 bg-gradient-to-b from-white/25 to-transparent" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#B3985B]/60 animate-bounce" />
        </div>
      </section>

      {/* ── STATEMENT ──────────────────────────────────────────────────────── */}
      <section className="bg-[#040404] py-28 sm:py-36 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <R>
            <p className="text-white/20 text-xs uppercase tracking-[0.22em] mb-8">La diferencia</p>
            <Heading className="mb-8">
              No es producción técnica.
              <br /><span className="text-white/40">Es la ingeniería</span>
              <br />del asombro.
            </Heading>
          </R>
          <R delay={180}>
            <p className="text-white/40 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto">
              Cada speaker colocado con precisión milimétrica. Cada cue de luz programada para el
              instante exacto. Cada detalle invisible para el público — y esencial para la experiencia.
              Eso es Mainstage Pro.
            </p>
          </R>
        </div>
      </section>

      {/* ── GALLERY ────────────────────────────────────────────────────────── */}
      <section className="bg-black py-20 overflow-hidden">
        <R className="px-6 sm:px-12 lg:px-20 mb-10">
          <GoldLabel>Nuestro trabajo</GoldLabel>
          <Heading>Producción que<br />habla por sí sola.</Heading>
          <p className="text-white/35 text-sm mt-3">Arrastra para explorar ·</p>
        </R>
        <div className="px-6 sm:px-12 lg:px-20">
          <DragGallery photos={gallery} />
        </div>
      </section>

      {/* ── AUDIO ──────────────────────────────────────────────────────────── */}
      {audio.length > 0 && (
        <section className="bg-[#040404] grid lg:grid-cols-2 min-h-[75vh]">
          {/* Photo half */}
          <div className="relative overflow-hidden min-h-[50vw] lg:min-h-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/presentacion/equip-speaker.jpg" alt="Sistema de audio Mainstage Pro"
                 className="absolute inset-0 w-full h-full object-cover" draggable={false} />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent lg:to-[#040404] to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#040404] to-transparent lg:hidden" />
            {/* Floating RCF render */}
            <div className="absolute bottom-6 right-6 lg:bottom-10 lg:right-10 opacity-90">
              <div className="bg-black/70 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-2xl">
                <Image src="/images/presentacion/rcf-hdl30a.jpg" alt="RCF HDL 30A"
                       width={140} height={140} className="object-contain" />
                <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest text-center mt-2">RCF HDL 30A</p>
                <p className="text-white/40 text-[9px] text-center">Line Array</p>
              </div>
            </div>
          </div>
          {/* Content half */}
          <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-16 lg:py-24">
            <R>
              <GoldLabel>Sistema de Audio</GoldLabel>
              <Heading className="mb-6">
                Cada nota,<br />donde tiene<br />que estar.
              </Heading>
            </R>
            <R delay={140}>
              <p className="text-white/40 text-base sm:text-lg leading-relaxed mb-10">
                Line arrays con cobertura milimétrica, consolas digitales de referencia y micrófonos
                de clase mundial. El mismo sonido en la primera fila que en la última.
              </p>
            </R>
            <R delay={220}>
              <div className="grid sm:grid-cols-2 gap-x-6">
                {/* Allen & Heath card */}
                <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 flex items-center gap-4 mb-3">
                  <Image src="/images/presentacion/allen-heath-dlive.jpg" alt="Allen & Heath dLive"
                         width={56} height={56} className="object-contain rounded-lg bg-white/5" />
                  <div>
                    <p className="text-[#B3985B] text-[10px] font-semibold tracking-widest">ALLEN & HEATH</p>
                    <p className="text-white text-sm font-semibold">dLive CTI 1500</p>
                    <p className="text-white/30 text-xs">Consola digital</p>
                  </div>
                </div>
                {/* Shure Axient card */}
                <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 flex items-center gap-4 mb-3">
                  <Image src="/images/presentacion/shure-axient.png" alt="Shure Axient"
                         width={40} height={56} className="object-contain" />
                  <div>
                    <p className="text-[#B3985B] text-[10px] font-semibold tracking-widest">SHURE</p>
                    <p className="text-white text-sm font-semibold">AXIENT Digital</p>
                    <p className="text-white/30 text-xs">Micrófono inalámbrico</p>
                  </div>
                </div>
              </div>
            </R>
            <R delay={300}>
              <div className="mt-2 border-t border-white/6 pt-6 space-y-0.5">
                {audio.slice(0, 8).map(l => <EqChip key={l.id} linea={l} />)}
                {audio.length > 8 && (
                  <p className="text-white/20 text-xs pt-3">+ {audio.length - 8} equipos más en la propuesta</p>
                )}
              </div>
            </R>
          </div>
        </section>
      )}

      {/* ── ILUMINACIÓN ────────────────────────────────────────────────────── */}
      {ilum.length > 0 && (
        <section className="relative min-h-[80vh] overflow-hidden">
          {/* Full-bleed background */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/presentacion/m-laser-red.jpg" alt="" draggable={false}
               className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/65" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />

          <div className="relative z-10 min-h-[80vh] grid lg:grid-cols-2 items-center px-8 sm:px-12 lg:px-20 py-24">
            <div>
              <R>
                <GoldLabel>Diseño de Iluminación</GoldLabel>
                <Heading className="mb-6">
                  La luz que<br />transforma<br />espacios en mundos.
                </Heading>
              </R>
              <R delay={140}>
                <p className="text-white/50 text-base sm:text-lg leading-relaxed mb-10 max-w-md">
                  Cabezas móviles, sistemas beam, efectos pixel y control total desde Grand MA.
                  Cada cue programado para el momento exacto.
                </p>
              </R>
              {/* Grand MA card */}
              <R delay={220}>
                <div className="inline-flex items-center gap-4 bg-black/60 backdrop-blur-md border border-white/12 rounded-2xl p-4 mb-8">
                  <Image src="/images/presentacion/grandma-ma3.png" alt="Grand MA3"
                         width={90} height={54} className="object-contain" />
                  <div>
                    <p className="text-[#B3985B] text-[10px] font-semibold tracking-widest">GRAND MA</p>
                    <p className="text-white font-semibold">MA3 Compact XT</p>
                    <p className="text-white/40 text-xs">Consola de iluminación</p>
                  </div>
                </div>
              </R>
              <R delay={300}>
                <div className="space-y-0.5 max-w-sm">
                  {ilum.slice(0, 7).map(l => <EqChip key={l.id} linea={l} />)}
                  {ilum.length > 7 && (
                    <p className="text-white/20 text-xs pt-3">+ {ilum.length - 7} equipos más</p>
                  )}
                </div>
              </R>
            </div>
            {/* Right: Astera card */}
            <div className="hidden lg:flex justify-end items-center">
              <R delay={100} y={30}>
                <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
                  <Image src="/images/presentacion/astera-ax1.png" alt="Astera AX1"
                         width={60} height={200} className="object-contain mx-auto mb-5" />
                  <p className="text-[#B3985B] text-[10px] font-semibold tracking-widest mb-1">ASTERA</p>
                  <p className="text-white font-semibold text-lg">AX1 Pixel Tube</p>
                  <p className="text-white/35 text-sm">LED inalámbrico de precisión</p>
                </div>
              </R>
            </div>
          </div>
        </section>
      )}

      {/* ── DJ ─────────────────────────────────────────────────────────────── */}
      {dj.length > 0 && (
        <section className="relative min-h-[75vh] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/presentacion/m-smoke-pink.jpg" alt="" draggable={false}
               className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

          <div className="relative z-10 px-8 sm:px-12 lg:px-20 py-24 min-h-[75vh] flex flex-col justify-end">
            <R>
              <GoldLabel>Setup DJ</GoldLabel>
              <Heading className="mb-5">
                El mismo setup<br />que los mejores<br />DJs del mundo.
              </Heading>
            </R>
            <R delay={140}>
              <p className="text-white/45 text-lg leading-relaxed mb-10 max-w-xl">
                Pioneer CDJ 3000 y DJM de referencia. La cadena técnica exacta que encontrarás
                en los clubs y festivales más exigentes del planeta.
              </p>
            </R>
            {/* Pioneer floating renders */}
            <R delay={200}>
              <div className="flex flex-wrap gap-4 mb-10">
                <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex items-center gap-4">
                  <Image src="/images/presentacion/pioneer-cdj3000.webp" alt="CDJ 3000"
                         width={90} height={70} className="object-contain" />
                  <div>
                    <p className="text-[#B3985B] text-[10px] font-semibold tracking-widest">PIONEER DJ</p>
                    <p className="text-white font-semibold">CDJ-3000</p>
                    <p className="text-white/35 text-xs">Media Player</p>
                  </div>
                </div>
                <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex items-center gap-4">
                  <Image src="/images/presentacion/pioneer-djmv10.png" alt="DJM V10"
                         width={70} height={70} className="object-contain" />
                  <div>
                    <p className="text-[#B3985B] text-[10px] font-semibold tracking-widest">PIONEER DJ</p>
                    <p className="text-white font-semibold">DJM-V10</p>
                    <p className="text-white/35 text-xs">Mezcladora profesional</p>
                  </div>
                </div>
              </div>
            </R>
            <R delay={280}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 max-w-2xl space-y-0.5">
                {dj.slice(0, 6).map(l => <EqChip key={l.id} linea={l} />)}
              </div>
            </R>
          </div>
        </section>
      )}

      {/* ── VIDEO ──────────────────────────────────────────────────────────── */}
      {video.length > 0 && (
        <section className="bg-[#040404] py-24 px-8 sm:px-12 lg:px-20">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <R><GoldLabel>Producción de Video</GoldLabel><Heading className="mb-5">Visual que<br />impacta.</Heading></R>
              <R delay={140}><p className="text-white/40 text-lg leading-relaxed mb-8">Pantallas LED de alta densidad, switchers Blackmagic y producción de contenido. Imagen que complementa cada beat y refuerza cada mensaje.</p></R>
              <R delay={220}><div className="space-y-0.5">{video.map(l => <EqChip key={l.id} linea={l} />)}</div></R>
            </div>
            <R delay={100} y={60}>
              <div className="relative h-64 lg:h-80 rounded-2xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/presentacion/e-corp-outdoor.jpg" alt="Pantalla LED" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
            </R>
          </div>
        </section>
      )}

      {/* ── STATS ──────────────────────────────────────────────────────────── */}
      <section className="bg-black border-y border-white/5 py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {[
            { hook: useCounter(200), suffix: "+", label: "Producciones" },
            { hook: useCounter(50000), suffix: "+", label: "Asistentes cubiertos" },
            { hook: useCounter(6),   suffix: "+", label: "Años de experiencia" },
            { hook: useCounter(100),  suffix: "%", label: "Satisfacción de clientes" },
          ].map(({ hook: { count, ref }, suffix, label }) => (
            <div key={label} ref={ref}>
              <p className="text-white font-bold leading-none mb-2"
                 style={{ fontSize: "clamp(2.5rem,6vw,4rem)", letterSpacing: "-0.03em" }}>
                {count.toLocaleString("es-MX")}<span className="text-[#B3985B]">{suffix}</span>
              </p>
              <p className="text-white/30 text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── POR QUÉ MAINSTAGE ──────────────────────────────────────────────── */}
      <section className="bg-[#040404] py-28 sm:py-36 px-6">
        <div className="max-w-5xl mx-auto">
          <R className="text-center mb-20">
            <GoldLabel>Por qué Mainstage Pro</GoldLabel>
            <Heading>
              No producimos eventos.
              <br /><span className="text-white/35">Creamos momentos.</span>
            </Heading>
          </R>
          <div className="grid sm:grid-cols-2 gap-px bg-white/5 rounded-3xl overflow-hidden">
            {[
              { icon:"★", title:"Equipo de primer nivel", body:"RCF, Allen & Heath, Pioneer, Grand MA, Shure. Las marcas que usan los mejores productores del planeta — ahora al servicio de tu evento." },
              { icon:"◆", title:"Técnicos certificados", body:"Ingenieros de audio con oído clínico, programadores de luz con años en escenario. Cada operador, un profesional de élite." },
              { icon:"◎", title:"Zero estrés en el día", body:"Llegamos, montamos, verificamos y operamos. Tú llegas a tu evento con todo listo. Sin improvisación, sin sorpresas de último minuto." },
              { icon:"✦", title:"Compromiso garantizado", body:"Tu fecha está reservada, tu equipo confirmado, tu producción asegurada. Un trato con Mainstage Pro es un trato con la certeza." },
            ].map((item, i) => (
              <R key={i} delay={i * 80}>
                <div className="bg-[#060606] p-10 lg:p-14">
                  <p className="text-[#B3985B] text-2xl mb-5">{item.icon}</p>
                  <p className="text-white font-semibold text-xl mb-4">{item.title}</p>
                  <p className="text-white/35 text-base leading-relaxed">{item.body}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── TIPOS DE EVENTO showcase ────────────────────────────────────────── */}
      <section className="bg-black py-20">
        <R className="text-center px-6 mb-12">
          <GoldLabel>Nuestra especialidad</GoldLabel>
          <Heading>Cualquier evento.<br /><span className="text-white/40">El mismo estándar.</span></Heading>
        </R>
        <div className="grid sm:grid-cols-3 gap-px bg-white/5">
          {[
            { label:"Musicales", sub:"Conciertos · Festivales · DJ sets", img:"/images/presentacion/m-arch-neon.jpg" },
            { label:"Sociales",  sub:"Bodas · Quince años · Galas",       img:"/images/presentacion/s-couple-purple.png" },
            { label:"Empresariales", sub:"Corporativos · Lanzamientos · Congresos", img:"/images/presentacion/e-corp-screens.jpg" },
          ].map((t, i) => (
            <R key={i} delay={i * 100} y={30}>
              <div className="relative overflow-hidden group" style={{ height: "clamp(260px,35vw,420px)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.img} alt={t.label} draggable={false}
                     className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                  <p className="text-white font-bold text-xl sm:text-2xl mb-1">{t.label}</p>
                  <p className="text-white/45 text-sm">{t.sub}</p>
                </div>
              </div>
            </R>
          ))}
        </div>
      </section>

      {/* ── TU INVERSIÓN ───────────────────────────────────────────────────── */}
      <section className="relative bg-[#040404] py-32 px-6 text-center overflow-hidden">
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(179,152,91,0.06) 0%, transparent 70%)" }} />
        <div className="max-w-3xl mx-auto relative">
          <R>
            <div className="w-16 h-px bg-[#B3985B]/30 mx-auto mb-12" />
            <GoldLabel>Tu inversión</GoldLabel>
            <p className="text-white font-bold leading-none mb-4"
               style={{ fontSize: "clamp(3.5rem,13vw,8rem)", letterSpacing: "-0.035em" }}>
              {fmt(cotizacion.granTotal)}
            </p>
          </R>
          <R delay={100}>
            {cotizacion.aplicaIva && (
              <p className="text-white/25 text-base mb-2">Incluye IVA ({fmt(cotizacion.montoIva)})</p>
            )}
            <p className="text-white/20 text-sm mb-14">Incluye equipo, operación, montaje y traslado</p>
          </R>
          {cotizacion.observaciones && (
            <R delay={160}>
              <div className="border border-white/8 rounded-2xl p-7 text-left bg-white/[0.02] mb-6">
                <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-3">Notas de la propuesta</p>
                <p className="text-white/45 text-sm leading-relaxed whitespace-pre-line">{cotizacion.observaciones}</p>
              </div>
            </R>
          )}
        </div>
      </section>

      {/* ── DOCUMENTOS ─────────────────────────────────────────────────────── */}
      <section className="bg-black py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <R className="text-center mb-14">
            <GoldLabel>Documentos</GoldLabel>
            <Heading>Todo por escrito.<br /><span className="text-white/40">Sin sorpresas.</span></Heading>
          </R>
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {/* PDF Cotización */}
            <R delay={60}>
              <a href={`/api/cotizaciones/${cotizacion.id}/pdf`} target="_blank" rel="noreferrer"
                 className="group flex items-center gap-5 p-6 rounded-2xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#B3985B]/30 transition-all">
                <div className="w-12 h-12 rounded-xl bg-[#B3985B]/10 border border-[#B3985B]/20 flex items-center justify-center shrink-0 group-hover:bg-[#B3985B]/20 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="1.8">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold mb-0.5">Cotización desglosada</p>
                  <p className="text-white/35 text-sm">PDF · {cotizacion.numeroCotizacion}</p>
                </div>
                <svg className="ml-auto text-white/20 group-hover:text-[#B3985B]/60 transition-colors shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            </R>
            {/* Contrato */}
            <R delay={120}>
              <button onClick={() => setContract(o => !o)}
                      className="group w-full flex items-center gap-5 p-6 rounded-2xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15 transition-all text-left">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/8 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold mb-0.5">Borrador de contrato</p>
                  <p className="text-white/35 text-sm">{contractOpen ? "Ocultar términos" : "Ver términos y condiciones"}</p>
                </div>
                <svg className={`ml-auto text-white/20 shrink-0 transition-transform duration-300 ${contractOpen ? "rotate-90" : ""}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </R>
          </div>
          {/* Contract expand */}
          <div className={`overflow-hidden transition-all duration-700 ease-in-out ${contractOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="border border-white/8 rounded-2xl p-7 bg-white/[0.02]">
              <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-5">Términos y Condiciones · Borrador</p>
              <pre className="text-white/40 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {cotizacion.terminosComerciales || DEFAULT_CONTRATO}
              </pre>
              <p className="text-white/15 text-xs mt-6 border-t border-white/5 pt-4">
                Este es un borrador de referencia. El contrato final será formalizado entre las partes previo al inicio del servicio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="relative bg-[#040404] overflow-hidden">
        {/* Background: festival photo with heavy overlay */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/presentacion/hero-festival.png" alt="" draggable={false}
             className="absolute inset-0 w-full h-full object-cover opacity-15" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#040404] via-[#040404]/80 to-[#040404]" />

        <div className="relative z-10 py-32 px-6 text-center max-w-3xl mx-auto">
          <R>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-white.png" alt="Mainstage Pro" className="h-7 mx-auto mb-14 opacity-50" draggable={false} />
            <Heading className="mb-5">
              Listos para crear
              <br />algo extraordinario.
            </Heading>
          </R>
          <R delay={140}>
            <p className="text-white/35 text-lg leading-relaxed mb-14">
              Esta propuesta fue diseñada específicamente para <span className="text-white/60">{cotizacion.cliente.empresa ?? cotizacion.cliente.nombre}</span>.
              Cuando estés listo para dar el siguiente paso, estamos aquí.
            </p>
          </R>
          <R delay={240}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {waUrl && (
                <a href={waUrl} target="_blank" rel="noreferrer"
                   className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-[#B3985B] text-black font-bold text-base hover:bg-[#c9a96a] active:scale-95 transition-all shadow-lg shadow-[#B3985B]/20">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Confirmar por WhatsApp
                </a>
              )}
              {cotizacion.cliente.correo && (
                <a href={`mailto:${cotizacion.cliente.correo}?subject=Propuesta ${cotizacion.numeroCotizacion} - ${evento}`}
                   className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-full border border-white/15 text-white/60 font-semibold text-base hover:border-white/30 hover:text-white active:scale-95 transition-all">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                  Responder por correo
                </a>
              )}
            </div>
          </R>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="bg-black border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="Mainstage Pro" className="h-4 opacity-25" draggable={false} />
          <p className="text-white/15 text-xs text-center">
            {cotizacion.numeroCotizacion} · Propuesta para {cotizacion.cliente.nombre} · Mainstage Pro
          </p>
          <p className="text-white/15 text-xs">Querétaro, México</p>
        </div>
      </footer>

      {/* ── GLOBAL STYLES ───────────────────────────────────────────────────── */}
      <style>{`
        @keyframes kenBurns {
          0%   { transform: scale(1.0) translate(0px, 0px); }
          33%  { transform: scale(1.08) translate(-8px, -5px); }
          66%  { transform: scale(1.12) translate(6px, -8px); }
          100% { transform: scale(1.06) translate(-4px, 4px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeUp {
          animation: fadeUp 1s ease both;
        }
        ::-webkit-scrollbar { display: none; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </main>
  );
}
