"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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

// ─── Equipment Image Mapping ──────────────────────────────────────────────────
// By brand (marca lowercase) → image path
const MARCA_IMAGES: Record<string, string> = {
  // Audio
  "rcf":             "/images/presentacion/rcf-hdl30a.png",
  "electro voice":   "/images/presentacion/ev-ekx12p.png",
  "electro-voice":   "/images/presentacion/ev-ekx12p.png",
  "ev":              "/images/presentacion/ev-ekx12p.png",
  "allen & heath":   "/images/presentacion/allen-heath-dlive.png",
  "allen&heath":     "/images/presentacion/allen-heath-dlive.png",
  "midas":           "/images/presentacion/midas-m32.png",
  "shure":           "/images/presentacion/shure-axient.png",
  "sennheiser":      "/images/presentacion/sennheiser-iem.png",
  "rode":            "/images/presentacion/rode-m5.png",
  // DJ
  "pioneer":         "/images/presentacion/pioneer-cdj3000.png",
  "pioneer dj":      "/images/presentacion/pioneer-cdj3000.png",
  // Iluminación
  "grand ma":        "/images/presentacion/grandma-ma3.png",
  "grandma":         "/images/presentacion/grandma-ma3.png",
  "ma":              "/images/presentacion/grandma-ma3.png",
  "ma lighting":     "/images/presentacion/grandma-ma3.png",
  "astera":          "/images/presentacion/astera-ax1.png",
  "chauvet":         "/images/presentacion/chauvet-spot260.png",
  "lite tek":        "/images/presentacion/lite-tek-beam280.png",
  "litetek":         "/images/presentacion/lite-tek-beam280.png",
  "lumos":           "/images/presentacion/lumos-l7.png",
  "sun star":        "/images/presentacion/sunstar-kaleidos.png",
  "sunstar":         "/images/presentacion/sunstar-kaleidos.png",
  "steel pro":       "/images/presentacion/steel-pro-razor.png",
  // Video
  "blackmagic":      "/images/presentacion/blackmagic-atem.png",
  // Eléctrico
  "predator":        "/images/presentacion/predator-9500.png",
  "wacker":          "/images/presentacion/wacker-g120.png",
};

// By exact model → image path (takes priority over marca)
const MODELO_IMAGES: Record<string, string> = {
  // Pioneer DJ mixers
  "DJM A9":          "/images/presentacion/pioneer-djmv10.png",
  "DJM V10":         "/images/presentacion/pioneer-djmv10.png",
  "DJM-V10":         "/images/presentacion/pioneer-djmv10.png",
  "DJM 900 NXS2":    "/images/presentacion/pioneer-djmv10.png",
  "DJM S11":         "/images/presentacion/pioneer-djmv10.png",
  // Audio
  "EKX 18P":         "/images/presentacion/ev-ekx18p.png",
  "EKX 12P":         "/images/presentacion/ev-ekx12p.png",
  "HDL 30A":         "/images/presentacion/rcf-hdl30a.png",
  "HDL 6A":          "/images/presentacion/rcf-hdl30a.png",
  "SUB 8006 AS":     "/images/presentacion/rcf-sub8006.png",
  "SQ5":             "/images/presentacion/allen-heath-sq5.png",
  "AR24/12":         "/images/presentacion/allen-heath-dlive.png",
  "SLXD B58":        "/images/presentacion/shure-slxd.png",
  "BLX24 SM58":      "/images/presentacion/shure-slxd.png",
  "AXIENT B58/SM58": "/images/presentacion/shure-axient.png",
  "IEM G4":          "/images/presentacion/sennheiser-iem.png",
  "EK IEM G4":       "/images/presentacion/sennheiser-iem.png",
  "PSM1000":         "/images/presentacion/shure-axient.png",
  // Iluminación Lite Tek
  "BAR 824i":        "/images/presentacion/lite-tek-bar824i.png",
  "BEAM 280":        "/images/presentacion/lite-tek-beam280.png",
  "BLINDER 200":     "/images/presentacion/lite-tek-blinder200.png",
  "FLASHER 200":     "/images/presentacion/lite-tek-flasher200.png",
  "18X10 Ambar":     "/images/presentacion/lite-tek-par.png",
  "Fazer 1500":      "/images/presentacion/lite-tek-fazer1500.png",
  // Iluminación Chauvet
  "Int SPOT 260":    "/images/presentacion/chauvet-spot260.png",
  "Slimpar Q12 BT":  "/images/presentacion/chauvet-slimpar.png",
  "Pinspot Bar":     "/images/presentacion/chauvet-pinspot-bar.png",
  // Sun Star
  "KALEIDOS":        "/images/presentacion/sunstar-kaleidos.png",
  // Lumos
  "L7":              "/images/presentacion/lumos-l7.png",
  // Video
  "Atem Mini Pro":   "/images/presentacion/blackmagic-atem.png",
  // Rigging
  "Truss":           "/images/presentacion/truss.png",
};

function getEquipoImage(linea: Linea): string | null {
  if (linea.modelo && MODELO_IMAGES[linea.modelo]) return MODELO_IMAGES[linea.modelo];
  const marca = (linea.marca ?? "").toLowerCase().trim();
  for (const key of Object.keys(MARCA_IMAGES)) {
    if (marca.includes(key) || key.includes(marca)) return MARCA_IMAGES[key];
  }
  return null;
}

// ─── Gallery Data ─────────────────────────────────────────────────────────────
const GALLERY_MUSICAL = [
  { src: "/images/presentacion/hero-festival.png",  caption: "Festival · Producción completa" },
  { src: "/images/presentacion/m-dj-blue.jpg",      caption: "Performance DJ · Azul" },
  { src: "/images/presentacion/m-laser-red.jpg",    caption: "Lasers · Rooftop" },
  { src: "/images/presentacion/m-smoke-pink.jpg",   caption: "Producción · Humo y luces" },
  { src: "/images/presentacion/m-arch-neon.jpg",    caption: "DJ Booth · Arco neón" },
  { src: "/images/presentacion/m-crowd-pink.jpg",   caption: "Crowd · Disco ball" },
  { src: "/images/presentacion/m-stage-green.jpg",  caption: "Stage · Beams" },
];
const GALLERY_SOCIAL = [
  { src: "/images/presentacion/s-couple-purple.png", caption: "Evento social · Iluminación especial" },
  { src: "/images/presentacion/s-dinner-sunset.png", caption: "Cena · Sunset" },
  { src: "/images/presentacion/s-stage-full.png",    caption: "Escenario · Producción completa" },
  { src: "/images/presentacion/s-vocalist.png",      caption: "En vivo · Vocals" },
  { src: "/images/presentacion/m-arch-neon.jpg",     caption: "DJ Booth · Ambiente" },
  { src: "/images/presentacion/m-dj-blue.jpg",       caption: "Producción · Música en vivo" },
];
const GALLERY_CORP = [
  { src: "/images/presentacion/e-corp-screens.jpg",  caption: "Corporativo · Video walls" },
  { src: "/images/presentacion/e-corp-outdoor.jpg",  caption: "Evento exterior · Pantalla LED" },
  { src: "/images/presentacion/equip-speaker.jpg",   caption: "Sistema de audio · Rooftop" },
  { src: "/images/presentacion/m-dj-blue.jpg",       caption: "Producción · Montaje" },
  { src: "/images/presentacion/s-stage-full.png",    caption: "Escenario · Producción completa" },
  { src: "/images/presentacion/m-arch-neon.jpg",     caption: "Iluminación · Impacto visual" },
];

// ─── Copy by tipoServicio ─────────────────────────────────────────────────────
type SvcCfg = { heroTagline: string; heroSub: string; stmt1: string; stmt2: string; stmtSub: string; ctaLine: string };
const SERVICIO_CONFIG: Record<string, SvcCfg> = {
  RENTA: {
    heroTagline: "El equipo que tu evento necesita.",
    heroSub: "Tecnología de primer nivel, disponible en el momento exacto.",
    stmt1: "No es renta.",
    stmt2: "Es acceso a lo\nque los pros usan.",
    stmtSub: "Cada equipo seleccionado por su desempeño en escenario real. Sin mediocridades, sin sorpresas.",
    ctaLine: "El equipo está listo. La fecha también puede estarlo.",
  },
  PRODUCCION_TECNICA: {
    heroTagline: "Producción técnica de élite.",
    heroSub: "Audio de referencia, iluminación de categoría mundial y operadores de élite. Todo en un solo acuerdo.",
    stmt1: "No es producción técnica.",
    stmt2: "Es la ingeniería\ndel asombro.",
    stmtSub: "Cada speaker colocado con precisión milimétrica. Cada cue de luz programada para el instante exacto. Eso es Mainstage Pro.",
    ctaLine: "La producción que tu evento merece está a un paso.",
  },
  DIRECCION_TECNICA: {
    heroTagline: "Dirección técnica de categoría mundial.",
    heroSub: "Visión global, coordinación total. Cero improvisación en el día de tu evento.",
    stmt1: "No es supervisión.",
    stmt2: "Es el arte\nde lo invisible.",
    stmtSub: "Un director técnico de Mainstage Pro es el cerebro detrás de cada instante perfecto. Lo que el público no ve — nosotros lo hacemos posible.",
    ctaLine: "Tu evento listo para ser dirigido con maestría.",
  },
};
const DEFAULT_SVC: SvcCfg = {
  heroTagline: "Una experiencia que no se olvida.",
  heroSub: "Tecnología de primer nivel. Operadores de élite. Cada detalle afinado.",
  stmt1: "No es producción técnica.",
  stmt2: "Es la ingeniería\ndel asombro.",
  stmtSub: "Cada speaker colocado con precisión milimétrica. Cada cue de luz programada para el instante exacto. Eso es Mainstage Pro.",
  ctaLine: "Listos para crear algo extraordinario.",
};

// ─── Section bg images by tipoEvento ─────────────────────────────────────────
function sectionBg(tipoEvento: string, musical: string, social: string, corp: string) {
  if (tipoEvento === "SOCIAL")      return social;
  if (tipoEvento === "EMPRESARIAL") return corp;
  return musical;
}

// ─── Category constants ───────────────────────────────────────────────────────
const AUDIO_CATS = ["Equipo de Audio","Sistemas de Microfonía","Monitoreo In-Ear","Consolas de Audio"];
const ILUM_CATS  = ["Equipo de Iluminación","Consolas de Iluminación"];
const DJ_CATS    = ["Consolas/Equipo para DJ","DJ Booths","Entarimado"];
const VIDEO_CATS = ["Pantalla / Video"];

// ─── Utils ────────────────────────────────────────────────────────────────────
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

// ─── Reusable UI ──────────────────────────────────────────────────────────────
function R({ children, delay = 0, y = 48, className = "" }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  const { ref, vis } = useReveal();
  return (
    <div ref={ref}
         style={{ transitionDelay: `${delay}ms`, opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : `translateY(${y}px)`, transition: "opacity 0.85s ease, transform 0.85s ease" }}
         className={className}>
      {children}
    </div>
  );
}

function GoldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-[0.22em] mb-5">{children}</p>;
}

function Heading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`text-white font-bold leading-[1.04] ${className}`}
        style={{ fontSize: "clamp(2rem,4.5vw,3.6rem)", letterSpacing: "-0.022em" }}>
      {children}
    </h2>
  );
}

// ─── Draggable Gallery ────────────────────────────────────────────────────────
function DragGallery({ photos }: { photos: { src: string; caption: string }[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const startX   = useRef(0);
  const scrollL  = useRef(0);
  const dragging = useRef(false);

  const onDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startX.current   = e.pageX - (trackRef.current?.offsetLeft ?? 0);
    scrollL.current  = trackRef.current?.scrollLeft ?? 0;
    if (trackRef.current) trackRef.current.style.cursor = "grabbing";
  }, []);
  const onUp   = useCallback(() => {
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
    <div ref={trackRef}
         className="flex gap-3 overflow-x-auto select-none pb-4"
         style={{ scrollSnapType: "x mandatory", cursor: "grab", scrollbarWidth: "none", msOverflowStyle: "none" }}
         onMouseDown={onDown} onMouseUp={onUp} onMouseLeave={onUp} onMouseMove={onMove}>
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

// ─── Equipment photo card ─────────────────────────────────────────────────────
function EquipoPhotoCard({ linea, delay = 0 }: { linea: Linea; delay?: number }) {
  const img = getEquipoImage(linea);
  return (
    <R delay={delay}>
      <div className="bg-white/[0.025] border border-white/8 rounded-xl overflow-hidden hover:border-[#B3985B]/30 hover:bg-white/[0.04] transition-all duration-300 group h-full">
        <div className="h-28 sm:h-32 bg-[#080808] flex items-center justify-center p-4">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={linea.modelo ?? linea.descripcion} draggable={false}
                 className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-[#B3985B]/10 border border-[#B3985B]/20 flex items-center justify-center">
              <span className="text-[#B3985B]/70 text-base font-bold">
                {(linea.marca ?? linea.descripcion).charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className="p-3 border-t border-white/5">
          {linea.marca && (
            <p className="text-[#B3985B] text-[9px] font-semibold uppercase tracking-widest mb-0.5 truncate">{linea.marca}</p>
          )}
          <p className="text-white text-xs font-semibold leading-tight truncate">{linea.modelo ?? linea.descripcion}</p>
          {linea.modelo && linea.descripcion && (
            <p className="text-white/25 text-[10px] mt-0.5 truncate leading-tight">{linea.descripcion}</p>
          )}
          {linea.cantidad > 1 && (
            <p className="text-[#B3985B]/60 text-[9px] mt-1.5 font-semibold">×{linea.cantidad}</p>
          )}
        </div>
      </div>
    </R>
  );
}

// ─── Equipment grid section ───────────────────────────────────────────────────
function EquipoGrid({ lineas }: { lineas: Linea[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {lineas.map((l, i) => <EquipoPhotoCard key={l.id} linea={l} delay={i * 40} />)}
    </div>
  );
}

// ─── Contract text ────────────────────────────────────────────────────────────
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function PresentacionClient({ cotizacion }: { cotizacion: Cotizacion }) {
  const [scrollY, setScrollY]       = useState(0);
  const [contractOpen, setContract] = useState(false);

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const { audio, ilum, dj, video, staff } = groupLineas(cotizacion.lineas);
  const tipoEvento  = cotizacion.trato?.tipoEvento ?? cotizacion.tipoEvento ?? "";
  const tipoServicio = cotizacion.tipoServicio ?? "";
  const evento = cotizacion.nombreEvento ?? tipoEvento ?? "Tu Evento";
  const fecha  = fmtDate(cotizacion.fechaEvento);
  const tel    = cotizacion.cliente.telefono?.replace(/\D/g, "");
  const waMsg  = encodeURIComponent(`Hola! Vi la propuesta de Mainstage Pro para ${evento} y quiero confirmar.`);
  const waUrl  = tel ? `https://wa.me/52${tel}?text=${waMsg}` : null;

  const svc = SERVICIO_CONFIG[tipoServicio] ?? DEFAULT_SVC;

  const heroImg =
    tipoEvento === "MUSICAL"     ? "/images/presentacion/hero-festival.png" :
    tipoEvento === "SOCIAL"      ? "/images/presentacion/s-couple-purple.png" :
    tipoEvento === "EMPRESARIAL" ? "/images/presentacion/e-corp-screens.jpg" :
                                   "/images/presentacion/hero-festival.png";

  const gallery =
    tipoEvento === "SOCIAL"      ? GALLERY_SOCIAL :
    tipoEvento === "EMPRESARIAL" ? GALLERY_CORP :
                                   GALLERY_MUSICAL;

  // Counters (always called in same order — constant array)
  /* eslint-disable react-hooks/rules-of-hooks */
  const stats = [
    { hook: useCounter(200),   suffix: "+", label: "Producciones" },
    { hook: useCounter(50000), suffix: "+", label: "Asistentes cubiertos" },
    { hook: useCounter(6),     suffix: "+", label: "Años de experiencia" },
    { hook: useCounter(100),   suffix: "%", label: "Satisfacción de clientes" },
  ];
  /* eslint-enable react-hooks/rules-of-hooks */

  const heroOpacity = Math.max(0, 1 - scrollY / 600);
  const heroY       = scrollY * 0.38;

  return (
    <main className="bg-black text-white overflow-x-hidden"
          style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>

      <style>{`
        @keyframes kenBurns { from { transform:scale(1) translate(0,0); } to { transform:scale(1.08) translate(-1.5%,-1%); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        .animate-fadeUp { animation: fadeUp 0.9s ease forwards; opacity:0; }
      `}</style>

      {/* ── STICKY NAV ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 sm:px-10 h-14"
           style={{
             background: `rgba(0,0,0,${Math.min(0.92, scrollY / 100)})`,
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

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImg} alt="" draggable={false}
             className="absolute inset-0 w-full h-full object-cover pointer-events-none"
             style={{ animation: "kenBurns 14s ease-in-out infinite alternate", transformOrigin: "center center" }} />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto"
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
            {svc.heroTagline}
          </p>
          <p className="text-white/40 animate-fadeUp mb-10"
             style={{ fontSize: "clamp(0.9rem,1.8vw,1.15rem)", animationDelay: "0.3s" }}>
            {svc.heroSub}
          </p>
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

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
             style={{ opacity: Math.max(0, 1 - scrollY / 200) }}>
          <span className="text-white/20 text-[10px] uppercase tracking-[0.2em]">Descubrir</span>
          <div className="w-px h-8 bg-gradient-to-b from-white/25 to-transparent" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#B3985B]/60 animate-bounce" />
        </div>
      </section>

      {/* ── STATEMENT ───────────────────────────────────────────────────────── */}
      <section className="bg-[#040404] py-28 sm:py-36 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <R>
            <p className="text-white/20 text-xs uppercase tracking-[0.22em] mb-8">La diferencia</p>
            <Heading className="mb-8">
              {svc.stmt1}
              <br /><span className="text-white/40">{svc.stmt2.split("\n").join(" ")}</span>
            </Heading>
          </R>
          <R delay={180}>
            <p className="text-white/40 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto">
              {svc.stmtSub}
            </p>
          </R>
        </div>
      </section>

      {/* ── GALLERY ─────────────────────────────────────────────────────────── */}
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

      {/* ── AUDIO ───────────────────────────────────────────────────────────── */}
      {audio.length > 0 && (
        <section className="bg-[#040404] grid lg:grid-cols-2 min-h-[70vh]">
          {/* Photo half */}
          <div className="relative overflow-hidden min-h-[50vw] lg:min-h-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sectionBg(tipoEvento,
                   "/images/presentacion/equip-speaker.jpg",
                   "/images/presentacion/s-stage-full.png",
                   "/images/presentacion/equip-speaker.jpg")}
                 alt="" draggable={false}
                 className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent lg:to-[#040404] to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#040404] to-transparent lg:hidden" />
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
                {tipoServicio === "RENTA"
                  ? "Equipo de audio profesional disponible para tu evento. Line arrays, consolas y microfonía de primer nivel."
                  : "Line arrays con cobertura milimétrica, consolas digitales de referencia y micrófonos de clase mundial. El mismo sonido en la primera fila que en la última."}
              </p>
            </R>
            <R delay={220}>
              <EquipoGrid lineas={audio} />
            </R>
          </div>
        </section>
      )}

      {/* ── ILUMINACIÓN ─────────────────────────────────────────────────────── */}
      {ilum.length > 0 && (
        <section className="relative min-h-[80vh] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sectionBg(tipoEvento,
                 "/images/presentacion/m-laser-red.jpg",
                 "/images/presentacion/m-arch-neon.jpg",
                 "/images/presentacion/e-corp-screens.jpg")}
               alt="" draggable={false}
               className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />

          <div className="relative z-10 min-h-[80vh] grid lg:grid-cols-2 items-center px-8 sm:px-12 lg:px-20 py-24 gap-12">
            <div>
              <R>
                <GoldLabel>Diseño de Iluminación</GoldLabel>
                <Heading className="mb-6">
                  {tipoEvento === "EMPRESARIAL"
                    ? "Luz que refuerza\ntu mensaje."
                    : tipoEvento === "SOCIAL"
                    ? "La luz que\ncrea el ambiente."
                    : "La luz que\ntransforma espacios\nen mundos."}
                </Heading>
              </R>
              <R delay={140}>
                <p className="text-white/50 text-base sm:text-lg leading-relaxed mb-10 max-w-md">
                  {tipoServicio === "RENTA"
                    ? "Cabezas móviles, efectos LED y accesorios de iluminación profesional para tu evento."
                    : "Cabezas móviles, sistemas beam, efectos pixel y control total. Cada cue programado para el momento exacto."}
                </p>
              </R>
              <R delay={220}>
                <EquipoGrid lineas={ilum} />
              </R>
            </div>
          </div>
        </section>
      )}

      {/* ── DJ ──────────────────────────────────────────────────────────────── */}
      {dj.length > 0 && (
        <section className="relative min-h-[75vh] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sectionBg(tipoEvento,
                 "/images/presentacion/m-smoke-pink.jpg",
                 "/images/presentacion/m-dj-blue.jpg",
                 "/images/presentacion/m-dj-blue.jpg")}
               alt="" draggable={false}
               className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/65" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

          <div className="relative z-10 px-8 sm:px-12 lg:px-20 py-24 min-h-[75vh] flex flex-col justify-end">
            <R>
              <GoldLabel>Setup DJ</GoldLabel>
              <Heading className="mb-5">
                {tipoEvento === "SOCIAL"
                  ? "El setup que\npone a bailar\na todos."
                  : "El mismo setup\nque los mejores\nDJs del mundo."}
              </Heading>
            </R>
            <R delay={140}>
              <p className="text-white/45 text-lg leading-relaxed mb-10 max-w-xl">
                {tipoServicio === "RENTA"
                  ? "Equipo DJ de primer nivel. La cadena técnica que encontrarás en los mejores venues y festivales."
                  : "Pioneer, Rane, Denon — la cadena técnica exacta que encontrarás en los clubs y festivales más exigentes del planeta."}
              </p>
            </R>
            <R delay={200}>
              <EquipoGrid lineas={dj} />
            </R>
          </div>
        </section>
      )}

      {/* ── VIDEO ───────────────────────────────────────────────────────────── */}
      {video.length > 0 && (
        <section className="bg-[#040404] py-24 px-8 sm:px-12 lg:px-20">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <R>
                <GoldLabel>Producción de Video</GoldLabel>
                <Heading className="mb-5">Visual que<br />impacta.</Heading>
              </R>
              <R delay={140}>
                <p className="text-white/40 text-lg leading-relaxed mb-8">
                  {tipoEvento === "EMPRESARIAL"
                    ? "Pantallas LED de alta densidad, switchers de producción y señal impecable. Imagen que refuerza cada mensaje de marca."
                    : "Pantallas LED de alta densidad, switchers Blackmagic y producción de contenido. Imagen que complementa cada beat."}
                </p>
              </R>
            </div>
            <R delay={100} y={40}>
              <EquipoGrid lineas={video} />
            </R>
          </div>
        </section>
      )}

      {/* ── PERSONAL TÉCNICO ────────────────────────────────────────────────── */}
      {staff.length > 0 && (
        <section className="bg-black border-t border-white/5 py-20 px-8 sm:px-12 lg:px-20">
          <div className="max-w-4xl mx-auto">
            <R>
              <GoldLabel>Personal Técnico</GoldLabel>
              <Heading className="mb-8">El equipo humano<br /><span className="text-white/40">detrás del resultado.</span></Heading>
            </R>
            <R delay={120}>
              <div className="grid sm:grid-cols-2 gap-3">
                {staff.map((l, i) => (
                  <R key={l.id} delay={i * 50}>
                    <div className="flex items-center gap-4 py-4 px-5 rounded-xl border border-white/6 bg-white/[0.02] hover:border-white/10 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-[#B3985B]/10 border border-[#B3985B]/20 flex items-center justify-center shrink-0">
                        <span className="text-[#B3985B]/70 text-xs font-bold">◆</span>
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold leading-tight">{l.descripcion}</p>
                        {l.cantidad > 1 && <p className="text-white/25 text-xs mt-0.5">×{l.cantidad}</p>}
                      </div>
                    </div>
                  </R>
                ))}
              </div>
            </R>
          </div>
        </section>
      )}

      {/* ── STATS ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#040404] border-y border-white/5 py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {stats.map(({ hook: { count, ref }, suffix, label }) => (
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

      {/* ── POR QUÉ MAINSTAGE ───────────────────────────────────────────────── */}
      <section className="bg-black py-28 sm:py-36 px-6">
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
              { icon: "★", title: "Equipo de primer nivel",   body: "Las marcas que usan los mejores productores del planeta — ahora al servicio de tu evento." },
              { icon: "◆", title: "Técnicos certificados",    body: "Ingenieros de audio con oído clínico, programadores de luz con años en escenario. Cada operador, un profesional de élite." },
              { icon: "◎", title: "Zero estrés en el día",    body: "Llegamos, montamos, verificamos y operamos. Tú llegas a tu evento con todo listo. Sin improvisación, sin sorpresas." },
              { icon: "✦", title: "Compromiso garantizado",   body: "Tu fecha está reservada, tu equipo confirmado, tu producción asegurada. Un trato con Mainstage Pro es un trato con la certeza." },
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

      {/* ── TU INVERSIÓN ────────────────────────────────────────────────────── */}
      <section className="relative bg-[#040404] py-32 px-6 text-center overflow-hidden">
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

      {/* ── DOCUMENTOS ──────────────────────────────────────────────────────── */}
      <section className="bg-black py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <R className="text-center mb-14">
            <GoldLabel>Documentos</GoldLabel>
            <Heading>Todo por escrito.<br /><span className="text-white/40">Sin sorpresas.</span></Heading>
          </R>
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImg} alt="" draggable={false}
             className="absolute inset-0 w-full h-full object-cover opacity-15" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#040404] via-[#040404]/80 to-[#040404]" />

        <div className="relative z-10 py-32 px-6 text-center max-w-3xl mx-auto">
          <R>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-white.png" alt="Mainstage Pro" className="h-7 mx-auto mb-14 opacity-50" draggable={false} />
            <Heading className="mb-5">
              Listos para crear<br />algo extraordinario.
            </Heading>
          </R>
          <R delay={120}>
            <p className="text-white/35 text-lg leading-relaxed mb-12">{svc.ctaLine}</p>
          </R>
          {waUrl && (
            <R delay={200}>
              <a href={waUrl} target="_blank" rel="noreferrer"
                 className="inline-flex items-center gap-3 bg-[#B3985B] hover:bg-[#c9a960] text-black font-bold px-8 py-4 rounded-full text-base transition-colors shadow-[0_0_40px_rgba(179,152,91,0.25)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Confirmar por WhatsApp
              </a>
            </R>
          )}
          <R delay={280}>
            <p className="text-white/15 text-xs mt-10">
              {cotizacion.cliente.correo && <>{cotizacion.cliente.correo} · </>}
              Mainstage Pro · {cotizacion.numeroCotizacion}
            </p>
          </R>
        </div>
      </section>

    </main>
  );
}
