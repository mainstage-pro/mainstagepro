"use client";

import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Linea {
  id: string; tipo: string; descripcion: string; marca: string | null; modelo: string | null;
  cantidad: number; subtotal: number; esIncluido: boolean; notas: string | null;
  equipo?: { categoria: { nombre: string } | null; imagenUrl?: string | null } | null;
}
interface Cotizacion {
  id: string; numeroCotizacion: string; nombreEvento: string | null; tipoEvento: string | null;
  tipoServicio: string | null; fechaEvento: string | null; lugarEvento: string | null;
  horasOperacion: number | null; granTotal: number; total: number; aplicaIva: boolean;
  montoIva: number; montoDescuento: number; subtotalEquiposBruto: number;
  descuentoB2bPct: number; descuentoVolumenPct: number; descuentoMultidiaPct: number;
  descuentoFamilyFriendsPct: number; descuentoEspecialPct: number; descuentoPatrocinioPct: number;
  descuentoPatrocinioNota: string | null; mainstageTradeData: string | null; tradeToken: string | null;
  observaciones: string | null; terminosComerciales: string | null;
  cliente: { nombre: string; empresa: string | null; telefono: string | null; correo: string | null };
  trato: { tipoEvento: string } | null; lineas: Linea[];
}

// ─── Equipment Image Mapping ──────────────────────────────────────────────────
const MARCA_POOL: Record<string, string[]> = {
  "rcf":           ["/images/presentacion/rcf-hdl30a.png", "/images/presentacion/rcf-sub8006.png"],
  "electro voice": ["/images/presentacion/ev-ekx12p.png", "/images/presentacion/ev-ekx18p.png"],
  "electro-voice": ["/images/presentacion/ev-ekx12p.png", "/images/presentacion/ev-ekx18p.png"],
  "ev":            ["/images/presentacion/ev-ekx12p.png", "/images/presentacion/ev-ekx18p.png"],
  "allen & heath": ["/images/presentacion/allen-heath-dlive.png", "/images/presentacion/allen-heath-sq5.png"],
  "allen&heath":   ["/images/presentacion/allen-heath-dlive.png", "/images/presentacion/allen-heath-sq5.png"],
  "shure":         ["/images/presentacion/shure-axient.png", "/images/presentacion/shure-slxd.png", "/images/presentacion/shure-sm58.png", "/images/presentacion/shure-beta52a.png"],
  "pioneer":       ["/images/presentacion/pioneer-cdj3000.png", "/images/presentacion/pioneer-djmv10.png"],
  "pioneer dj":    ["/images/presentacion/pioneer-cdj3000.png", "/images/presentacion/pioneer-djmv10.png"],
  "grand ma":      ["/images/presentacion/grandma-ma3.png", "/images/presentacion/ma-command-wing.png"],
  "grandma":       ["/images/presentacion/grandma-ma3.png", "/images/presentacion/ma-command-wing.png"],
  "ma":            ["/images/presentacion/grandma-ma3.png", "/images/presentacion/ma-command-wing.png"],
  "ma lighting":   ["/images/presentacion/grandma-ma3.png", "/images/presentacion/ma-command-wing.png"],
  "chauvet":       ["/images/presentacion/chauvet-spot260.png", "/images/presentacion/chauvet-slimpar.png", "/images/presentacion/chauvet-pinspot-bar.png"],
  "lite tek":      ["/images/presentacion/lite-tek-beam280.png", "/images/presentacion/lite-tek-bar824i.png", "/images/presentacion/lite-tek-blinder200.png", "/images/presentacion/lite-tek-flasher200.png", "/images/presentacion/lite-tek-par.png"],
  "litetek":       ["/images/presentacion/lite-tek-beam280.png", "/images/presentacion/lite-tek-bar824i.png", "/images/presentacion/lite-tek-blinder200.png", "/images/presentacion/lite-tek-par.png"],
  "lumos":         ["/images/presentacion/lumos-l7.png", "/images/presentacion/lumos-l1-retro.png", "/images/presentacion/lumos-maple-lamp.png", "/images/presentacion/lumos-sixaline.png"],
  "sunstar":       ["/images/presentacion/sunstar-kaleidos.png", "/images/presentacion/sunstar-soul-rgbw.png"],
  "sun star":      ["/images/presentacion/sunstar-kaleidos.png", "/images/presentacion/sunstar-soul-rgbw.png"],
};
const MARCA_IMAGES: Record<string, string> = {
  "midas": "/images/presentacion/midas-m32.png", "sennheiser": "/images/presentacion/sennheiser-iem.png",
  "rode": "/images/presentacion/rode-m5.png", "astera": "/images/presentacion/astera-ax1.png",
  "steel pro": "/images/presentacion/steel-pro-razor.png", "blackmagic": "/images/presentacion/blackmagic-atem.png",
  "predator": "/images/presentacion/predator-9500.png", "wacker": "/images/presentacion/wacker-g120.png",
};
function idHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const MODELO_IMAGES: Record<string, string> = {
  "DJM A9": "/images/presentacion/pioneer-djmv10.png", "DJM V10": "/images/presentacion/pioneer-djmv10.png",
  "DJM-V10": "/images/presentacion/pioneer-djmv10.png", "DJM 900 NXS2": "/images/presentacion/pioneer-djmv10.png",
  "DJM S11": "/images/presentacion/pioneer-djmv10.png", "EKX 18P": "/images/presentacion/ev-ekx18p.png",
  "EKX 12P": "/images/presentacion/ev-ekx12p.png", "HDL 30A": "/images/presentacion/rcf-hdl30a.png",
  "HDL 6A": "/images/presentacion/rcf-hdl30a.png", "SUB 8006 AS": "/images/presentacion/rcf-sub8006.png",
  "SQ5": "/images/presentacion/allen-heath-sq5.png", "AR24/12": "/images/presentacion/allen-heath-dlive.png",
  "SLXD B58": "/images/presentacion/shure-slxd.png", "BLX24 SM58": "/images/presentacion/shure-slxd.png",
  "AXIENT B58/SM58": "/images/presentacion/shure-axient.png", "IEM G4": "/images/presentacion/sennheiser-iem.png",
  "EK IEM G4": "/images/presentacion/sennheiser-iem.png", "PSM1000": "/images/presentacion/shure-axient.png",
  "BAR 824i": "/images/presentacion/lite-tek-bar824i.png", "BEAM 280": "/images/presentacion/lite-tek-beam280.png",
  "BLINDER 200": "/images/presentacion/lite-tek-blinder200.png", "FLASHER 200": "/images/presentacion/lite-tek-flasher200.png",
  "18X10 Ambar": "/images/presentacion/lite-tek-par.png", "Fazer 1500": "/images/presentacion/lite-tek-fazer1500.png",
  "Int SPOT 260": "/images/presentacion/chauvet-spot260.png", "Slimpar Q12 BT": "/images/presentacion/chauvet-slimpar.png",
  "Pinspot Bar": "/images/presentacion/chauvet-pinspot-bar.png", "KALEIDOS": "/images/presentacion/sunstar-kaleidos.png",
  "SM58": "/images/presentacion/shure-sm58.png", "SM57": "/images/presentacion/shure-sm58.png",
  "SM31": "/images/presentacion/shure-sm58.png", "SM81": "/images/presentacion/shure-sm58.png",
  "BETA 52A": "/images/presentacion/shure-beta52a.png", "BETA91A": "/images/presentacion/shure-beta52a.png",
  "Command Wing": "/images/presentacion/ma-command-wing.png", "MA3 Compact XT": "/images/presentacion/grandma-ma3.png",
  "L7": "/images/presentacion/lumos-l7.png", "L1 Retro": "/images/presentacion/lumos-l1-retro.png",
  "Maple Lamp": "/images/presentacion/lumos-maple-lamp.png", "Sixaline": "/images/presentacion/lumos-sixaline.png",
  "SOUL RGBW": "/images/presentacion/sunstar-soul-rgbw.png", "Atem Mini Pro": "/images/presentacion/blackmagic-atem.png",
  "Truss": "/images/presentacion/truss.png",
};
function getEquipoImage(linea: Linea): string | null {
  if (linea.equipo?.imagenUrl) return linea.equipo.imagenUrl;
  if (linea.modelo && MODELO_IMAGES[linea.modelo]) return MODELO_IMAGES[linea.modelo];
  const marca = (linea.marca ?? "").toLowerCase().trim();
  for (const key of Object.keys(MARCA_POOL)) {
    if (marca.includes(key) || key.includes(marca)) {
      const pool = MARCA_POOL[key];
      return pool[idHash(linea.id) % pool.length];
    }
  }
  for (const key of Object.keys(MARCA_IMAGES)) {
    if (marca.includes(key) || key.includes(marca)) return MARCA_IMAGES[key];
  }
  return null;
}

// ─── Gallery Data ─────────────────────────────────────────────────────────────
const GALLERY_MUSICAL = [
  { src: "/images/presentacion/musicales/Musicales-194.jpg",                    caption: "Show · Producción completa" },
  { src: "/images/presentacion/musicales/Musicales-037.jpg",                    caption: "Lasers · Show de iluminación" },
  { src: "/images/presentacion/musicales/Musicales-154.jpg",                    caption: "Club · Disco ball y efectos" },
  { src: "/images/presentacion/musicales/Musicales-016.jpg",                    caption: "Festival · Escenario outdoor" },
  { src: "/images/presentacion/musicales/Musicales-076.jpg",                    caption: "DJ · Performance con humo" },
  { src: "/images/presentacion/musicales/Musicales-055.jpg",                    caption: "En vivo · Artista y video wall" },
  { src: "/images/presentacion/musicales/MAGIC_ROOM_260307_GUANAJUATO_078.jpg", caption: "DJ Booth · Vista del crowd" },
];
const GALLERY_SOCIAL = [
  { src: "/images/presentacion/s-couple-purple.png", caption: "Boda · Iluminación especial" },
  { src: "/images/presentacion/s-dinner-sunset.png", caption: "Cena · Luz de ambiente" },
  { src: "/images/presentacion/s-vocalist.png",      caption: "En vivo · Vocals" },
  { src: "/images/presentacion/s-stage-full.png",    caption: "Escenario · Producción social" },
];
const GALLERY_CORP = [
  { src: "/images/presentacion/e-corp-screens.jpg",  caption: "Corporativo · Video walls" },
  { src: "/images/presentacion/e-corp-outdoor.jpg",  caption: "Evento exterior · Producción" },
];

// ─── Copy por tipoServicio ────────────────────────────────────────────────────
const SERVICIO_CONFIG: Record<string, { heroTagline: string }> = {
  RENTA:             { heroTagline: "El equipo que necesitas, disponible para tu fecha." },
  PRODUCCION_TECNICA:{ heroTagline: "Producción técnica en un solo servicio." },
  DIRECCION_TECNICA: { heroTagline: "Dirección técnica integral — de principio a fin." },
};
const DEFAULT_SVC = { heroTagline: "Producción técnica profesional." };

// ─── Copy por tipoEvento ──────────────────────────────────────────────────────
type EventoCfg = {
  stmt: string;
  audioHeadline: string; ilumHeadline: string; djHeadline: string; videoHeadline: string;
  whyPoints: { icon: string; title: string; body: string }[];
  ctaLine: string;
};
const EVENTO_CONFIG: Record<string, EventoCfg> = {
  MUSICAL: {
    stmt: "La técnica bien hecha no se nota.\nSolo se siente.",
    audioHeadline: "Sonido limpio en cada rincón del venue, sin puntos muertos ni retroalimentación.",
    ilumHeadline: "Beams, colores y efectos que construyen la atmósfera del show — programados al detalle.",
    djHeadline: "CDJs, mixer y booth listos antes del soundcheck — la misma cadena que los DJs exigen en su rider.",
    videoHeadline: "Pantallas posicionadas correctamente, señal estable y brillo adecuado para el espacio.",
    whyPoints: [
      { icon: "star",   title: "Equipo 100% propio", body: "Todo el inventario es nuestro. Nada rentado, nada subcontratado. Control total sobre lo que te entregamos." },
      { icon: "people", title: "Operadores con experiencia real", body: "Nuestros ingenieros conocen el equipo porque lo usan en cada evento. No improvisamos en vivo." },
      { icon: "clock",  title: "Setup a tiempo, sin carreras", body: "Llegamos con margen para montar, calibrar y resolver antes de que llegue el público." },
      { icon: "check",  title: "Una sola fuente de responsabilidad", body: "Audio, luz, video y operadores — un solo contrato. Cualquier cosa que pase, la resolvemos nosotros." },
    ],
    ctaLine: "La producción está lista. Solo falta confirmar la fecha.",
  },
  SOCIAL: {
    stmt: "Los momentos que importan\nmerecen técnica impecable.",
    audioHeadline: "Micrófonos inalámbricos para el brindis y la ceremonia — sin retroalimentación, sin cortes.",
    ilumHeadline: "Luz cálida para la cena, vibrante para la pista — ambiente que cambia con el momento.",
    djHeadline: "Equipo verificado y con señal lista antes del primer invitado.",
    videoHeadline: "Pantallas para que todos vean la ceremonia, el video y las presentaciones sin esfuerzo.",
    whyPoints: [
      { icon: "star",   title: "Equipo 100% propio", body: "Llegamos con lo que confirmamos — sin sorpresas el día del evento." },
      { icon: "people", title: "Discretos y coordinados", body: "Nos alineamos con decoración, venue y fotografía. El protagonismo es de los festejados, no nuestro." },
      { icon: "clock",  title: "Conocemos el programa", body: "Brindis, primer baile, vals, pastel — revisamos el programa contigo para estar listos en cada momento clave." },
      { icon: "check",  title: "Una sola fuente de responsabilidad", body: "Audio, luz, video y operadores — un solo contrato. Sin coordinar piezas sueltas." },
    ],
    ctaLine: "Asegura la fecha. El resto lo coordinamos nosotros.",
  },
  EMPRESARIAL: {
    stmt: "Cuando la técnica funciona bien,\ntu empresa se ve bien.",
    audioHeadline: "El orador se escucha claro desde cualquier punto del salón — sin cortes ni retroalimentación.",
    ilumHeadline: "Iluminación profesional acorde al tono del evento — presentaciones, lanzamientos o cenas.",
    djHeadline: "Señal de audio limpia para música ambiental o equipo completo de DJ para el cierre.",
    videoHeadline: "Tu presentación en pantalla sin fallas técnicas — compatible con HDMI, transmisiones en vivo y contenido de agencia.",
    whyPoints: [
      { icon: "star",   title: "Equipo 100% propio", body: "Control total sobre calidad y tiempos — crítico cuando la imagen de tu empresa está en juego." },
      { icon: "people", title: "Puntuales y profesionales", body: "Llegamos antes de tiempo, montamos con orden y nos mantenemos en segundo plano durante el evento." },
      { icon: "clock",  title: "Trabajamos con tu agencia", body: "Si ya tienes coordinador o agencia creativa, nos alineamos con ellos desde la planeación. Sin fricciones." },
      { icon: "check",  title: "Una sola fuente de responsabilidad", body: "Audio, luz, video y operadores — un solo contrato. No cinco proveedores sin coordinación entre sí." },
    ],
    ctaLine: "Confirmemos los detalles técnicos con tiempo suficiente.",
  },
};
const DEFAULT_EVENTO: EventoCfg = EVENTO_CONFIG.MUSICAL;

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

// ─── UI Components ────────────────────────────────────────────────────────────
function R({ children, delay = 0, y = 40, className = "" }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  const { ref, vis } = useReveal();
  return (
    <div ref={ref} className={className}
         style={{ transitionDelay: `${delay}ms`, opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : `translateY(${y}px)`, transition: "opacity 0.75s cubic-bezier(0.16,1,0.3,1), transform 0.75s cubic-bezier(0.16,1,0.3,1)" }}>
      {children}
    </div>
  );
}
function GoldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[#B3985B] text-[11px] font-semibold uppercase tracking-[0.22em] mb-3">{children}</p>;
}
function Heading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`text-white font-bold leading-[1.04] ${className}`}
        style={{ fontSize: "clamp(2rem,4.5vw,3.5rem)", letterSpacing: "-0.024em" }}>
      {children}
    </h2>
  );
}
function WhyIcon({ type }: { type: string }) {
  const cls = "text-[#B3985B]";
  if (type === "star") return <svg className={cls} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
  if (type === "people") return <svg className={cls} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if (type === "clock") return <svg className={cls} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
  return <svg className={cls} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}

// ─── Cinematic Gallery ────────────────────────────────────────────────────────
function CinematicGallery({ photos }: { photos: { src: string; caption: string }[] }) {
  const [idx, setIdx]           = useState(0);
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving]   = useState(false);
  const DURATION = 5500;
  useEffect(() => {
    setProgress(0); setLeaving(false);
    const start = Date.now();
    const iv = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / DURATION);
      setProgress(p);
      if (p >= 1) { clearInterval(iv); setLeaving(true); setTimeout(() => setIdx(i => (i + 1) % photos.length), 900); }
    }, 40);
    return () => clearInterval(iv);
  }, [idx, photos.length]);
  return (
    <div className="relative w-full overflow-hidden" style={{ height: "70vh", minHeight: "480px" }}>
      {photos.map((p, i) => {
        const isActive = i === idx;
        const isPrev   = leaving && i === (idx - 1 + photos.length) % photos.length;
        return (
          <div key={i} className="absolute inset-0"
               style={{ opacity: isActive ? 1 : isPrev ? 0 : 0, transition: isActive ? "opacity 1.4s ease" : "opacity 0.9s ease", zIndex: isActive ? 2 : isPrev ? 1 : 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.src} alt={p.caption} draggable={false} className="w-full h-full object-cover"
                 style={{ animation: isActive ? "kenBurns 9s ease forwards" : "none" }} />
          </div>
        );
      })}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" style={{ zIndex: 3 }} />
      <div className="absolute bottom-0 left-0 right-0 px-8 sm:px-16 pb-7" style={{ zIndex: 4 }}>
        <div className="flex items-end justify-between mb-3">
          <p className="text-white/60 text-sm tracking-wide">{photos[idx].caption}</p>
          <p className="text-white/20 text-xs font-mono">{String(idx + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}</p>
        </div>
        <div className="relative h-px w-full bg-white/10">
          <div className="absolute inset-y-0 left-0 bg-[#B3985B]" style={{ width: `${progress * 100}%`, transition: "width 0.08s linear" }} />
        </div>
      </div>
      <div className="absolute top-5 right-7 flex gap-1.5" style={{ zIndex: 4 }}>
        {photos.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} className="rounded-full transition-all duration-300"
                  style={{ width: i === idx ? "18px" : "5px", height: "5px", background: i === idx ? "#B3985B" : "rgba(255,255,255,0.2)" }} />
        ))}
      </div>
    </div>
  );
}

// ─── Equipment card ───────────────────────────────────────────────────────────
function EquipoCard({ linea, delay = 0 }: { linea: Linea; delay?: number }) {
  const img = getEquipoImage(linea);
  return (
    <R delay={delay} y={24}>
      <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden hover:border-[#B3985B]/30 transition-all duration-300 group">
        <div className="h-40 bg-[#070707] flex items-center justify-center p-4">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={linea.modelo ?? linea.descripcion} draggable={false}
                 className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#B3985B]/10 border border-[#B3985B]/20 flex items-center justify-center">
              <span className="text-[#B3985B]/60 text-sm font-bold">{(linea.marca ?? linea.descripcion).charAt(0).toUpperCase()}</span>
            </div>
          )}
        </div>
        <div className="px-3 py-2.5 border-t border-white/5 flex items-center justify-between gap-2">
          <p className="text-white/80 text-xs font-medium truncate">{linea.modelo ?? linea.descripcion}</p>
          <span className="text-[#B3985B] text-[10px] font-bold shrink-0">×{linea.cantidad}</span>
        </div>
      </div>
    </R>
  );
}

// ─── Contract default ─────────────────────────────────────────────────────────
const DEFAULT_CONTRATO = `TÉRMINOS Y CONDICIONES DE SERVICIO

1. VIGENCIA DE LA PROPUESTA
La presente propuesta tiene una vigencia de 30 días naturales a partir de su fecha de emisión.

2. CONDICIONES DE PAGO
• 50% del monto total para confirmar y reservar la fecha.
• 50% restante liquidado 72 horas antes del evento.
• Formas de pago aceptadas: transferencia bancaria, depósito o SPEI.

3. CANCELACIÓN Y REPROGRAMACIÓN
• Cancelación con más de 30 días: reembolso del 80% del anticipo.
• Cancelación entre 15 y 30 días: reembolso del 50% del anticipo.
• Cancelación con menos de 15 días: el anticipo no es reembolsable.
• Reprogramaciones sujeto a disponibilidad, sin penalización con aviso mínimo de 30 días.

4. RESPONSABILIDADES
Mainstage Pro garantiza la operación correcta del equipo descrito. No se hace responsable por condiciones del venue, fuerza mayor, o modificaciones en el programa no comunicadas con al menos 48 horas de anticipación.`;

// ─── Main component ───────────────────────────────────────────────────────────
export default function PresentacionClient({ cotizacion }: { cotizacion: Cotizacion }) {
  const [scrollY, setScrollY]       = useState(0);
  const [contractOpen, setContract] = useState(false);
  const [heroIdx, setHeroIdx]       = useState(0);

  let tradeData: { pct?: number; nivelSeleccionado?: number | null; nivelAplicado?: number | null; activo?: boolean } = {};
  try { if (cotizacion.mainstageTradeData) tradeData = JSON.parse(cotizacion.mainstageTradeData); } catch { /* noop */ }
  const tradePct      = tradeData.pct ?? 0;
  const tradeElegido  = (tradeData.nivelSeleccionado ?? 0) > 0;
  const tradeAplicado = tradeElegido && tradeData.activo;
  const NIVEL_LABEL: Record<number, string> = { 1: "Base", 2: "Estratégico", 3: "Premium" };

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const { audio, ilum, dj, video, staff } = groupLineas(cotizacion.lineas);
  const tipoEvento   = cotizacion.trato?.tipoEvento ?? cotizacion.tipoEvento ?? "";
  const tipoServicio = cotizacion.tipoServicio ?? "";
  const evento       = cotizacion.nombreEvento ?? tipoEvento ?? "Tu Evento";
  const fecha        = fmtDate(cotizacion.fechaEvento);
  const tel          = cotizacion.cliente.telefono?.replace(/\D/g, "");
  const waMsg        = encodeURIComponent(`Hola! Vi la propuesta de Mainstage Pro para ${evento} y quiero confirmar.`);
  const waUrl        = tel ? `https://wa.me/52${tel}?text=${waMsg}` : null;

  const svc = SERVICIO_CONFIG[tipoServicio] ?? DEFAULT_SVC;
  const ev  = EVENTO_CONFIG[tipoEvento] ?? DEFAULT_EVENTO;

  const gallery =
    tipoEvento === "SOCIAL"      ? GALLERY_SOCIAL :
    tipoEvento === "EMPRESARIAL" ? GALLERY_CORP :
                                   GALLERY_MUSICAL;

  useEffect(() => {
    const t = setInterval(() => setHeroIdx(i => (i + 1) % gallery.length), 5500);
    return () => clearInterval(t);
  }, [gallery.length]);

  /* eslint-disable react-hooks/rules-of-hooks */
  const stats = [
    { hook: useCounter(200),   suffix: "+", label: "Producciones" },
    { hook: useCounter(50000), suffix: "+", label: "Asistentes cubiertos" },
    { hook: useCounter(6),     suffix: "+", label: "Años de experiencia" },
    { hook: useCounter(100),   suffix: "%", label: "Satisfacción de clientes" },
  ];
  /* eslint-enable react-hooks/rules-of-hooks */

  const heroOpacity = Math.max(0, 1 - scrollY / 800);
  const heroY       = scrollY * 0.3;

  const equipoCats = [
    { key: "audio", lineas: audio, titulo: "Sistema de Audio",        headline: ev.audioHeadline },
    { key: "ilum",  lineas: ilum,  titulo: "Diseño de Iluminación",   headline: ev.ilumHeadline  },
    { key: "dj",    lineas: dj,    titulo: "Setup DJ",                headline: ev.djHeadline    },
    { key: "video", lineas: video, titulo: "Producción de Video",     headline: ev.videoHeadline },
  ].filter(c => c.lineas.length > 0);

  const stmtLines = ev.stmt.split("\n");

  return (
    <main className="bg-black text-white overflow-x-hidden"
          style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>

      <style>{`
        @keyframes kenBurns { from{transform:scale(1) translate(0,0)} to{transform:scale(1.07) translate(-1%,-0.8%)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .animate-fadeUp { animation:fadeUp 1s cubic-bezier(0.16,1,0.3,1) forwards; opacity:0; }
        @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        html { scroll-behavior:smooth; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-track { background:#000; }
        ::-webkit-scrollbar-thumb { background:rgba(179,152,91,0.3); border-radius:2px; }
      `}</style>

      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 sm:px-10 h-14"
           style={{ background: `rgba(0,0,0,${Math.min(0.9, scrollY / 80)})`, backdropFilter: scrollY > 20 ? "blur(20px) saturate(180%)" : "none", borderBottom: scrollY > 20 ? "1px solid rgba(255,255,255,0.06)" : "none", transition: "background 0.3s,border-color 0.3s" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.png" alt="Mainstage Pro" className="h-5 opacity-90" draggable={false} />
        <span className="text-white/25 text-xs hidden sm:block tracking-wide">
          Propuesta · {cotizacion.cliente.empresa ?? cotizacion.cliente.nombre}
        </span>
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noreferrer"
             className="text-[11px] font-semibold px-3.5 py-1.5 rounded-full border border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B]/10 transition-colors hidden sm:flex items-center gap-1.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Contactar
          </a>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
        {gallery.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={p.src} alt="" draggable={false}
               className="absolute inset-0 w-full h-full object-cover pointer-events-none"
               style={{ opacity: i === heroIdx ? 1 : 0, transition: "opacity 1.4s ease" }} />
        ))}
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-black/35" />

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto"
             style={{ opacity: heroOpacity, transform: `translateY(${heroY}px)` }}>
          <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-[0.3em] mb-6 animate-fadeUp">
            Mainstage Pro · Propuesta Exclusiva
          </p>
          <h1 className="font-bold text-white leading-[1.02] mb-4 animate-fadeUp"
              style={{ fontSize: "clamp(2.6rem,7.5vw,6rem)", letterSpacing: "-0.03em", animationDelay: "0.12s" }}>
            {evento}
          </h1>
          <p className="text-white/55 font-light animate-fadeUp mb-8"
             style={{ fontSize: "clamp(1.1rem,2.5vw,1.75rem)", letterSpacing: "-0.01em", animationDelay: "0.22s" }}>
            {svc.heroTagline}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 animate-fadeUp" style={{ animationDelay: "0.34s" }}>
            {fecha && (
              <span className="flex items-center gap-2 text-white/40 text-sm border border-white/10 rounded-full px-4 py-1.5 bg-white/[0.04] backdrop-blur-sm">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span className="capitalize">{fecha}</span>
              </span>
            )}
            {cotizacion.lugarEvento && (
              <span className="flex items-center gap-2 text-white/40 text-sm border border-white/10 rounded-full px-4 py-1.5 bg-white/[0.04] backdrop-blur-sm">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                {cotizacion.lugarEvento}
              </span>
            )}
            <span className="text-white/40 text-sm border border-white/10 rounded-full px-4 py-1.5 bg-white/[0.04] backdrop-blur-sm">
              Para {cotizacion.cliente.empresa ? `${cotizacion.cliente.empresa} · ${cotizacion.cliente.nombre}` : cotizacion.cliente.nombre}
            </span>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" style={{ opacity: Math.max(0, 1 - scrollY / 180) }}>
          <span className="text-white/15 text-[10px] uppercase tracking-[0.2em]">Ver propuesta</span>
          <div className="w-px h-7 bg-gradient-to-b from-white/20 to-transparent" />
          <div className="w-1 h-1 rounded-full bg-[#B3985B]/50 animate-bounce" />
        </div>
      </section>

      {/* ── INCLUYE STRIP ── */}
      <section className="bg-[#050505] border-b border-white/[0.05] py-5 px-6 overflow-x-auto">
        <div className="max-w-5xl mx-auto flex items-center gap-2 whitespace-nowrap">
          <p className="text-white/20 text-[10px] uppercase tracking-widest shrink-0 mr-1">Esta propuesta incluye</p>
          {audio.length > 0 && <span className="text-[11px] px-3 py-1 rounded-full border border-white/10 text-white/45">Audio</span>}
          {ilum.length > 0  && <span className="text-[11px] px-3 py-1 rounded-full border border-white/10 text-white/45">Iluminación</span>}
          {dj.length > 0    && <span className="text-[11px] px-3 py-1 rounded-full border border-white/10 text-white/45">Setup DJ</span>}
          {video.length > 0 && <span className="text-[11px] px-3 py-1 rounded-full border border-white/10 text-white/45">Video</span>}
          {staff.length > 0 && <span className="text-[11px] px-3 py-1 rounded-full border border-white/10 text-white/45">Personal técnico</span>}
          <span className="text-[11px] px-3 py-1 rounded-full border border-[#B3985B]/25 text-[#B3985B]/60">Equipo 100% propio</span>
          <span className="text-[11px] px-3 py-1 rounded-full border border-[#B3985B]/25 text-[#B3985B]/60">Sin intermediarios</span>
        </div>
      </section>

      {/* ── STATEMENT ── */}
      <section className="bg-[#040404] py-28 sm:py-36 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <R>
            <p className="text-white/15 text-xs uppercase tracking-[0.22em] mb-6">Lo que hacemos</p>
            <h2 className="font-bold text-white leading-[1.08]"
                style={{ fontSize: "clamp(2.2rem,5.5vw,4.5rem)", letterSpacing: "-0.028em" }}>
              {stmtLines[0]}
              {stmtLines[1] && <><br /><span className="text-white/30">{stmtLines[1]}</span></>}
            </h2>
          </R>
        </div>
      </section>

      {/* ── TU PROPUESTA (equipamiento) ── */}
      {equipoCats.length > 0 && (
        <section className="bg-[#040404] pb-28 px-6 sm:px-12 lg:px-20">
          <div className="max-w-6xl mx-auto">
            <R className="mb-16">
              <GoldLabel>Tu propuesta</GoldLabel>
              <Heading>Lo que está confirmado<br /><span className="text-white/30">para tu evento.</span></Heading>
            </R>

            <div className="space-y-16">
              {equipoCats.map((cat, ci) => (
                <div key={cat.key}>
                  {/* Divider between categories */}
                  {ci > 0 && <div className="h-px bg-white/[0.05] mb-16" />}
                  <R className="mb-7">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-0.5 h-5 bg-[#B3985B] rounded-full shrink-0" />
                      <h3 className="text-white font-semibold" style={{ fontSize: "clamp(1.15rem,2.2vw,1.6rem)", letterSpacing: "-0.02em" }}>
                        {cat.titulo}
                      </h3>
                    </div>
                    <p className="text-white/35 text-sm leading-relaxed pl-4">{cat.headline}</p>
                  </R>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
                    {cat.lineas.map((l, i) => <EquipoCard key={l.id} linea={l} delay={Math.min(i * 35, 300)} />)}
                  </div>
                  <R delay={100}>
                    <div className="border-t border-white/[0.05] pt-4">
                      {cat.lineas.map(l => (
                        <div key={l.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                          <span className="text-[#B3985B] text-xs font-bold w-6 text-right shrink-0">×{l.cantidad}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-white/70 text-sm">{l.modelo ?? l.descripcion}</span>
                            {l.modelo && l.descripcion && <span className="text-white/25 text-xs ml-2">{l.descripcion}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </R>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── PERSONAL TÉCNICO ── */}
      {staff.length > 0 && (
        <section className="bg-[#060606] border-t border-white/[0.05] py-20 px-6 sm:px-12 lg:px-20">
          <div className="max-w-5xl mx-auto">
            <R className="mb-10">
              <GoldLabel>Personal Técnico</GoldLabel>
              <Heading>El equipo humano<br /><span className="text-white/30">detrás del resultado.</span></Heading>
            </R>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {staff.map((l, i) => (
                <R key={l.id} delay={i * 45}>
                  <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-white/6 bg-white/[0.02] hover:border-white/10 transition-colors">
                    <span className="text-[#B3985B] text-xs shrink-0">◆</span>
                    <p className="text-white/75 text-sm font-medium flex-1">{l.descripcion}</p>
                    {l.cantidad > 1 && <span className="text-white/25 text-xs shrink-0">×{l.cantidad}</span>}
                  </div>
                </R>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── GALLERY ── */}
      <section className="bg-black">
        <div className="px-6 sm:px-12 lg:px-20 pt-24 pb-10">
          <R>
            <GoldLabel>Nuestro trabajo</GoldLabel>
            <Heading>Así se ve<br /><span className="text-white/30">una producción Mainstage Pro.</span></Heading>
          </R>
        </div>
        <CinematicGallery photos={gallery} />
      </section>

      {/* ── POR QUÉ MAINSTAGE ── */}
      <section className="bg-[#040404] py-24 sm:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <R className="text-center mb-16">
            <GoldLabel>Por qué Mainstage Pro</GoldLabel>
            <Heading>Cuatro compromisos.<br /><span className="text-white/30">Cada evento, sin excepción.</span></Heading>
          </R>
          <div className="grid sm:grid-cols-2 gap-px bg-white/[0.04] rounded-2xl overflow-hidden">
            {ev.whyPoints.map((item, i) => (
              <R key={i} delay={i * 65}>
                <div className="bg-[#060606] p-8 sm:p-10 lg:p-12">
                  <div className="mb-5"><WhyIcon type={item.icon} /></div>
                  <p className="text-white font-semibold text-lg mb-3 leading-snug">{item.title}</p>
                  <p className="text-white/35 text-sm leading-relaxed">{item.body}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-black border-y border-white/[0.05] py-14 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {stats.map(({ hook: { count, ref }, suffix, label }) => (
            <div key={label} ref={ref}>
              <p className="text-white font-bold leading-none mb-2"
                 style={{ fontSize: "clamp(2.4rem,5.5vw,3.8rem)", letterSpacing: "-0.03em" }}>
                {count.toLocaleString("es-MX")}<span className="text-[#B3985B]">{suffix}</span>
              </p>
              <p className="text-white/25 text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── INVERSIÓN ── */}
      <section className="relative bg-[#040404] py-32 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(179,152,91,0.05) 0%, transparent 70%)" }} />
        <div className="max-w-3xl mx-auto relative">
          <R>
            <div className="w-10 h-px bg-[#B3985B]/30 mx-auto mb-10" />
            <GoldLabel>Tu inversión</GoldLabel>
            {cotizacion.montoDescuento > 0 && (
              <p className="text-white/25 text-xl line-through mb-1" style={{ letterSpacing: "-0.02em" }}>
                {fmt(cotizacion.granTotal + cotizacion.montoDescuento)}
              </p>
            )}
            <p className="text-white font-bold leading-none mb-5"
               style={{ fontSize: "clamp(3.5rem,13vw,8rem)", letterSpacing: "-0.038em" }}>
              {fmt(cotizacion.granTotal)}
            </p>
            {cotizacion.montoDescuento > 0 && (() => {
              const sb = cotizacion.subtotalEquiposBruto;
              const items: { label: string; monto: number }[] = [];
              if ((cotizacion.descuentoB2bPct ?? 0) > 0)
                items.push({ label: `Descuento B2B (${Math.round(cotizacion.descuentoB2bPct * 100)}%)`, monto: sb * cotizacion.descuentoB2bPct });
              if ((cotizacion.descuentoVolumenPct ?? 0) > 0)
                items.push({ label: `Descuento por volumen (${Math.round(cotizacion.descuentoVolumenPct * 100)}%)`, monto: sb * cotizacion.descuentoVolumenPct });
              if ((cotizacion.descuentoMultidiaPct ?? 0) > 0)
                items.push({ label: `Descuento multi-día (${Math.round(cotizacion.descuentoMultidiaPct * 100)}%)`, monto: sb * cotizacion.descuentoMultidiaPct });
              if ((cotizacion.descuentoFamilyFriendsPct ?? 0) > 0)
                items.push({ label: `Descuento especial (${Math.round(cotizacion.descuentoFamilyFriendsPct * 100)}%)`, monto: sb * cotizacion.descuentoFamilyFriendsPct });
              if (tradeAplicado)
                items.push({ label: `Mainstage Trade (${tradePct}%)`, monto: sb * (tradePct / 100) });
              return items.length > 0 ? (
                <div className="flex flex-col items-center gap-1 mb-4">
                  {items.map(it => (
                    <p key={it.label} className="text-[#B3985B] text-sm font-medium">{it.label} — {fmt(it.monto)}</p>
                  ))}
                </div>
              ) : (
                <p className="text-[#B3985B] text-base font-medium mb-4">Ahorras {fmt(cotizacion.montoDescuento)}</p>
              );
            })()}
            {cotizacion.aplicaIva && (
              <p className="text-white/20 text-sm mt-2">Incluye IVA ({fmt(cotizacion.montoIva)})</p>
            )}
            <p className="text-white/15 text-xs mt-1.5">Incluye equipo, operación, montaje y traslado</p>
          </R>
          {cotizacion.observaciones && (
            <R delay={100}>
              <div className="border border-white/8 rounded-2xl p-6 text-left bg-white/[0.02] mt-10">
                <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-3">Notas de la propuesta</p>
                <p className="text-white/45 text-sm leading-relaxed whitespace-pre-line">{cotizacion.observaciones}</p>
              </div>
            </R>
          )}
        </div>
      </section>

      {/* ── MAINSTAGE TRADE ── */}
      <section className="relative overflow-hidden py-28 px-6"
               style={{ background: "linear-gradient(180deg,#050505 0%,#080808 55%,#050505 100%)" }}>
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(179,152,91,0.06) 0%, transparent 70%)" }} />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#B3985B]/25 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#B3985B]/15 to-transparent" />

        <div className="max-w-3xl mx-auto relative">
          <R className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-5">
              <div className="h-px w-6 bg-[#B3985B]/40" />
              <GoldLabel>Mainstage Trade</GoldLabel>
              <div className="h-px w-6 bg-[#B3985B]/40" />
            </div>
            <h2 className="text-white font-bold leading-tight mb-4"
                style={{ fontSize: "clamp(1.8rem,4.5vw,3.2rem)", letterSpacing: "-0.025em" }}>
              {tradeAplicado ? (
                <>Colaboración activada.<br /><span className="text-[#B3985B]">Tu descuento ya está incluido.</span></>
              ) : (
                <>Colabora y ahorra.<br /><span className="text-[#B3985B]">Tú ahorras. Nosotros crecemos.</span></>
              )}
            </h2>
            <p className="text-white/30 text-base leading-relaxed max-w-xl mx-auto">
              A cambio de visibilidad de marca y contenido en tu evento, ofrecemos un descuento directo en la propuesta.
            </p>
          </R>

          {tradeAplicado ? (
            <R delay={70} className="flex justify-center">
              <div className="grid grid-cols-3 gap-4 w-full max-w-xl">
                {[
                  { label: "Nivel elegido",       value: NIVEL_LABEL[tradeData.nivelSeleccionado ?? 1] ?? "—" },
                  { label: "Descuento aplicado",  value: `${tradePct}%` },
                  { label: "Tu ahorro",           value: fmt(cotizacion.montoDescuento) },
                ].map(k => (
                  <div key={k.label} className="text-center bg-white/[0.03] border border-[#B3985B]/20 rounded-2xl py-5 px-3">
                    <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-2">{k.label}</p>
                    <p className="text-white font-black text-2xl">{k.value}</p>
                  </div>
                ))}
              </div>
            </R>
          ) : (
            <R delay={70} className="flex justify-center">
              <div className="text-center max-w-sm w-full">
                <div className="grid grid-cols-3 gap-2.5 mb-8">
                  {[{ nivel:1, nombre:"Base", pct:5 }, { nivel:2, nombre:"Estratégico", pct:10 }, { nivel:3, nombre:"Premium", pct:12 }].map(n => (
                    <div key={n.nivel} className="bg-white/[0.03] border border-white/8 rounded-xl py-4 text-center">
                      <p className="text-white/35 text-[10px] uppercase tracking-wider mb-1">{n.nombre}</p>
                      <p className="text-[#B3985B] text-3xl font-black">{n.pct}%</p>
                      <p className="text-white/20 text-[10px] mt-1">descuento</p>
                    </div>
                  ))}
                </div>
                {cotizacion.tradeToken ? (
                  <>
                    <a href={`/trade/${cotizacion.tradeToken}`}
                       className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full bg-[#B3985B] hover:bg-[#c9a96a] text-black font-bold text-sm transition-all hover:scale-[1.02] active:scale-95">
                      <span>Elegir mi nivel de colaboración</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </a>
                    <p className="text-white/15 text-xs mt-4">Sin compromiso · Elige el nivel que mejor se adapte</p>
                  </>
                ) : (
                  <p className="text-white/20 text-sm">¿Te interesa colaborar? Pregúntanos sobre Mainstage Trade.</p>
                )}
              </div>
            </R>
          )}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative bg-[#040404] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={gallery[0].src} alt="" draggable={false}
             className="absolute inset-0 w-full h-full object-cover opacity-[0.07]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#040404] via-[#040404]/90 to-[#040404]" />

        <div className="relative z-10 py-32 px-6 text-center max-w-3xl mx-auto">
          <R>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-white.png" alt="Mainstage Pro" className="h-6 mx-auto mb-12 opacity-35" draggable={false} />
            <Heading className="mb-4">
              Listos para {evento}.<br />
              <span className="text-white/30">Solo falta confirmar.</span>
            </Heading>
          </R>
          <R delay={100}>
            <p className="text-white/30 text-base leading-relaxed mb-10">{ev.ctaLine}</p>
          </R>
          <R delay={180}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              {waUrl && (
                <a href={waUrl} target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-2.5 bg-[#B3985B] hover:bg-[#c9a960] text-black font-bold px-7 py-3.5 rounded-full text-sm transition-colors shadow-[0_0_40px_rgba(179,152,91,0.2)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Confirmar por WhatsApp
                </a>
              )}
              {cotizacion.cliente.correo && (
                <a href={`mailto:${cotizacion.cliente.correo}`}
                   className="inline-flex items-center gap-2.5 border border-white/12 hover:border-white/25 text-white/55 hover:text-white font-medium px-7 py-3.5 rounded-full text-sm transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  Escribir por correo
                </a>
              )}
            </div>
          </R>

          <R delay={260}>
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href={`/api/cotizaciones/${cotizacion.id}/pdf`} target="_blank" rel="noreferrer"
                 className="flex items-center gap-2 text-white/25 hover:text-white/50 text-xs transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Descargar cotización PDF · {cotizacion.numeroCotizacion}
              </a>
              <span className="text-white/10 hidden sm:block">·</span>
              <button onClick={() => setContract(o => !o)}
                      className="flex items-center gap-2 text-white/25 hover:text-white/50 text-xs transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                {contractOpen ? "Ocultar términos" : "Ver términos y condiciones"}
              </button>
            </div>
          </R>

          <div className={`overflow-hidden transition-all duration-500 ${contractOpen ? "max-h-[1600px] opacity-100 mt-8" : "max-h-0 opacity-0 mt-0"}`}>
            <div className="border border-white/8 rounded-2xl p-6 text-left bg-white/[0.02]">
              <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-4">Términos y Condiciones · Borrador</p>
              <pre className="text-white/35 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                {cotizacion.terminosComerciales || DEFAULT_CONTRATO}
              </pre>
              <p className="text-white/12 text-xs mt-5 border-t border-white/5 pt-4">
                Este es un borrador de referencia. El contrato final será formalizado entre las partes previo al inicio del servicio.
              </p>
            </div>
          </div>

          <R delay={300}>
            <p className="text-white/12 text-[11px] mt-10">
              {cotizacion.numeroCotizacion} · Mainstage Pro · Querétaro, México
            </p>
          </R>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.05] py-8 px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="Mainstage Pro" className="h-4 opacity-20" draggable={false} />
          <p className="text-white/15 text-xs text-center">
            Propuesta para {cotizacion.cliente.nombre} · {cotizacion.numeroCotizacion}
          </p>
          <p className="text-white/15 text-xs">Querétaro, México</p>
        </div>
      </footer>

    </main>
  );
}
