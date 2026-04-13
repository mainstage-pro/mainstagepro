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
const MARCA_IMAGES: Record<string, string> = {
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
  "pioneer":         "/images/presentacion/pioneer-cdj3000.png",
  "pioneer dj":      "/images/presentacion/pioneer-cdj3000.png",
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
  "sunstar":         "/images/presentacion/sunstar-soul-rgbw.png",
  "steel pro":       "/images/presentacion/steel-pro-razor.png",
  "blackmagic":      "/images/presentacion/blackmagic-atem.png",
  "predator":        "/images/presentacion/predator-9500.png",
  "wacker":          "/images/presentacion/wacker-g120.png",
};

const MODELO_IMAGES: Record<string, string> = {
  "DJM A9":          "/images/presentacion/pioneer-djmv10.png",
  "DJM V10":         "/images/presentacion/pioneer-djmv10.png",
  "DJM-V10":         "/images/presentacion/pioneer-djmv10.png",
  "DJM 900 NXS2":    "/images/presentacion/pioneer-djmv10.png",
  "DJM S11":         "/images/presentacion/pioneer-djmv10.png",
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
  "BAR 824i":        "/images/presentacion/lite-tek-bar824i.png",
  "BEAM 280":        "/images/presentacion/lite-tek-beam280.png",
  "BLINDER 200":     "/images/presentacion/lite-tek-blinder200.png",
  "FLASHER 200":     "/images/presentacion/lite-tek-flasher200.png",
  "18X10 Ambar":     "/images/presentacion/lite-tek-par.png",
  "Fazer 1500":      "/images/presentacion/lite-tek-fazer1500.png",
  "Int SPOT 260":    "/images/presentacion/chauvet-spot260.png",
  "Slimpar Q12 BT":  "/images/presentacion/chauvet-slimpar.png",
  "Pinspot Bar":     "/images/presentacion/chauvet-pinspot-bar.png",
  "KALEIDOS":        "/images/presentacion/sunstar-kaleidos.png",
  "SM58":            "/images/presentacion/shure-sm58.png",
  "SM57":            "/images/presentacion/shure-sm58.png",
  "SM31":            "/images/presentacion/shure-sm58.png",
  "SM81":            "/images/presentacion/shure-sm58.png",
  "BETA 52A":        "/images/presentacion/shure-beta52a.png",
  "BETA91A":         "/images/presentacion/shure-beta52a.png",
  "Command Wing":    "/images/presentacion/ma-command-wing.png",
  "MA3 Compact XT":  "/images/presentacion/grandma-ma3.png",
  "L7":              "/images/presentacion/lumos-l7.png",
  "L1 Retro":        "/images/presentacion/lumos-l1-retro.png",
  "Maple Lamp":      "/images/presentacion/lumos-maple-lamp.png",
  "Sixaline":        "/images/presentacion/lumos-sixaline.png",
  "SOUL RGBW":       "/images/presentacion/sunstar-soul-rgbw.png",
  "Atem Mini Pro":   "/images/presentacion/blackmagic-atem.png",
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
  { src: "/images/presentacion/m-laser-red.jpg",    caption: "Show · Lasers y producción" },
  { src: "/images/presentacion/m-crowd-pink.jpg",   caption: "Crowd · Disco ball" },
  { src: "/images/presentacion/m-stage-green.jpg",  caption: "Escenario · Beams y color" },
  { src: "/images/presentacion/m-dj-blue.jpg",      caption: "Performance DJ · Full production" },
  { src: "/images/presentacion/m-smoke-pink.jpg",   caption: "Producción · Humo y efectos" },
  { src: "/images/presentacion/m-arch-neon.jpg",    caption: "DJ Booth · Arco neón" },
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

// ─── Copy por tipoServicio (solo hero tagline) ────────────────────────────────
type SvcCfg = { heroTagline: string; heroSub: string };
const SERVICIO_CONFIG: Record<string, SvcCfg> = {
  RENTA: {
    heroTagline: "El equipo que necesitas, disponible para tu fecha.",
    heroSub: "Inventario propio, sin intermediarios. Listo a tiempo.",
  },
  PRODUCCION_TECNICA: {
    heroTagline: "Producción técnica completa para tu evento.",
    heroSub: "Equipo, operadores y coordinación en un solo servicio.",
  },
  DIRECCION_TECNICA: {
    heroTagline: "Dirección técnica de principio a fin.",
    heroSub: "Coordinación total del área técnica. Sin improvisaciones.",
  },
};
const DEFAULT_SVC: SvcCfg = {
  heroTagline: "Producción técnica profesional.",
  heroSub: "Equipo en condiciones y operadores con experiencia.",
};

// ─── Copy completo por tipoEvento ─────────────────────────────────────────────
type EventoCfg = {
  stmt1: string; stmt2: string; stmtSub: string;
  audioHeadline: string; audioBody: string;
  ilumHeadline: string;  ilumBody: string;
  djHeadline: string;    djBody: string;
  videoHeadline: string; videoBody: string;
  whyTitle: string;
  whyPoints: { icon: string; title: string; body: string }[];
  ctaLine: string;
};
const EVENTO_CONFIG: Record<string, EventoCfg> = {
  MUSICAL: {
    stmt1: "No es técnica.",
    stmt2: "Es el escenario\nque el show necesita.",
    stmtSub: "Un evento musical bien producido no se nota — simplemente se siente. Cada decisión técnica existe para servir a la música y al artista sobre el escenario.",
    audioHeadline: "Sonido limpio en cada rincón del venue, sin puntos muertos.",
    audioBody: "Line arrays, subwoofers y monitores calibrados para la acústica del espacio. La frecuencia llega uniforme desde el frente hasta el fondo — sin distorsión, sin retroalimentación.",
    ilumHeadline: "Beams, colores y efectos que construyen la atmósfera del show.",
    ilumBody: "Cabezas móviles, luces beam, strobes y efectos de pixel controlados desde consola. Cada cue programado para el momento exacto del set.",
    djHeadline: "Tornamesas, mixer y booth listos antes de que llegue el DJ.",
    djBody: "CDJs, mezcladora y booth de referencia — la misma cadena de señal que los DJs exigen en su rider. Verificado y en punto antes del soundcheck.",
    videoHeadline: "Pantallas y señal de video estables durante todo el evento.",
    videoBody: "Pantallas LED bien posicionadas, procesador de video y señal sin cortes. Resolución y brillo correctos para el espacio, de día o de noche.",
    whyTitle: "Por qué Mainstage Pro",
    whyPoints: [
      { icon: "star",   title: "Conocemos los escenarios",        body: "Hemos trabajado en conciertos de distintos formatos. Sabemos qué funciona, qué falla y cómo anticiparnos antes de que el público llegue." },
      { icon: "people", title: "Setup limpio, a tiempo",           body: "El equipo llega con margen para montar, calibrar y hacer prueba de sonido. Sin carreras de último minuto." },
      { icon: "clock",  title: "Operadores enfocados en el show",  body: "Desde el primer cue hasta el final, nuestros operadores están en su posición. No improvisamos en vivo." },
      { icon: "check",  title: "Revisamos el rider con anticipación", body: "Si hay requerimientos específicos, los revisamos antes del día. Preferimos aclarar cualquier duda con días de margen." },
    ],
    ctaLine: "La producción está lista. Solo falta confirmar la fecha.",
  },
  SOCIAL: {
    stmt1: "No es producción.",
    stmt2: "Es el fondo perfecto\npara los momentos\nque más importan.",
    stmtSub: "Los eventos sociales se recuerdan por cómo se sintieron. La música, la luz, el sonido del brindis — todo eso es técnica. Y la técnica bien hecha no se nota.",
    audioHeadline: "Sonido que se escucha bien en cada mesa, sin esfuerzo.",
    audioBody: "Micrófonos inalámbricos para el brindis, la ceremonia y el discurso — sin retroalimentación. La música suena a buen volumen en la pista y se escucha a la distancia correcta en las mesas.",
    ilumHeadline: "Iluminación cálida para la cena, vibrante para la pista.",
    ilumBody: "Pares LED, cabezas móviles y efectos programados para cada momento de la noche. El ambiente cambia de forma suave y natural — sin cortes bruscos entre la cena y el baile.",
    djHeadline: "Tornamesas y mixer calibrados antes de que llegue el primer invitado.",
    djBody: "Equipo verificado y con señal lista antes del inicio del evento. El DJ llega y puede empezar — sin tiempo perdido en configuraciones.",
    videoHeadline: "Pantallas para la ceremonia, el video y las presentaciones.",
    videoBody: "Pantallas bien posicionadas para que todos los invitados vean el contenido sin esfuerzo. Señal estable para fotos en vivo, videos del evento o presentaciones especiales.",
    whyTitle: "Por qué Mainstage Pro",
    whyPoints: [
      { icon: "star",   title: "Discretos durante el evento",          body: "Llegamos, montamos y nos quedamos en segundo plano. El protagonismo es del evento y los festejados, no del equipo técnico." },
      { icon: "people", title: "Coordinación con otros proveedores",    body: "Nos alineamos con decoración, venue y fotografía para que todo conviva sin fricciones el día del evento." },
      { icon: "clock",  title: "Conocemos el programa del evento",      body: "Brindis, primer baile, vals, pastel — revisamos el programa contigo antes para estar listos en cada momento clave." },
      { icon: "check",  title: "Comunicación clara desde el inicio",    body: "Revisamos cada detalle antes del evento. Si hay cambios de último minuto, nos adaptamos. Siempre con buena disposición." },
    ],
    ctaLine: "Asegura la fecha. El resto lo coordinamos nosotros.",
  },
  EMPRESARIAL: {
    stmt1: "No es logística.",
    stmt2: "Es la imagen de\ntu empresa en\ncada detalle técnico.",
    stmtSub: "En un evento corporativo, la técnica es parte del mensaje. Un audio que falla distrae. Una pantalla mal ubicada resta. Cuando todo funciona bien, tu empresa se ve bien.",
    audioHeadline: "El orador se escucha claro desde cualquier punto del salón.",
    audioBody: "Micrófonos de solapa, headset o de mano — sin retroalimentación, sin cortes. La consola es operada durante toda la conferencia para que el volumen y la calidad de audio sean consistentes.",
    ilumHeadline: "Iluminación profesional acorde al tono del evento.",
    ilumBody: "Luz cálida y uniforme para las presentaciones, dinámica para los lanzamientos, elegante para las cenas. El ambiente refuerza el mensaje de tu empresa sin distraer la atención.",
    djHeadline: "Música ambiental o DJ profesional para el cierre.",
    djBody: "Señal de audio limpia para reproducción de música en contexto corporativo, o equipo completo de DJ para el networking y el cierre del evento.",
    videoHeadline: "Tu presentación en pantalla, sin fallas técnicas.",
    videoBody: "Pantallas bien posicionadas, procesador de señal y resolución adecuada al espacio. Compatible con laptops, señal HDMI, transmisiones en vivo y contenido de tu agencia.",
    whyTitle: "Por qué Mainstage Pro",
    whyPoints: [
      { icon: "star",   title: "Entendemos el contexto corporativo",      body: "Eventos con directivos, clientes y medios. Operamos sabiendo que el margen de error es mínimo y que la imagen de tu empresa está en juego." },
      { icon: "people", title: "Puntuales y presentables",                 body: "Llegamos antes de tiempo, montamos con orden y nos mantenemos profesionales durante todo el evento. Somos parte de tu equipo ese día." },
      { icon: "clock",  title: "Trabajamos con tu agencia o coordinador", body: "Si ya tienes coordinador de evento o agencia creativa, nos alineamos con ellos. Sin fricciones, sin egos." },
      { icon: "check",  title: "Todo confirmado por escrito",             body: "Propuesta, lista de equipo, horarios y condiciones — todo queda acordado antes del evento. Sin interpretaciones de último momento." },
    ],
    ctaLine: "Confirmemos los detalles técnicos con tiempo suficiente.",
  },
};
const DEFAULT_EVENTO: EventoCfg = EVENTO_CONFIG.MUSICAL;

// ─── Section bg por tipo de evento ────────────────────────────────────────────
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

function useParallax(factor = 0.15) {
  const ref = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const fn = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      setOffset((rect.top + rect.height / 2 - window.innerHeight / 2) * factor);
    };
    window.addEventListener("scroll", fn, { passive: true });
    fn();
    return () => window.removeEventListener("scroll", fn);
  }, [factor]);
  return { ref, offset };
}

// ─── Reusable UI ──────────────────────────────────────────────────────────────
function R({ children, delay = 0, y = 48, className = "" }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  const { ref, vis } = useReveal();
  return (
    <div ref={ref}
         style={{
           transitionDelay: `${delay}ms`,
           opacity: vis ? 1 : 0,
           transform: vis ? "translateY(0) scale(1) rotate(0deg)" : `translateY(${y}px) scale(0.94) rotate(${y > 0 ? "-0.8deg" : "0deg"})`,
           transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)",
         }}
         className={className}>
      {children}
    </div>
  );
}

function GoldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-[0.22em] mb-3">{children}</p>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-white font-bold mb-6 leading-tight"
        style={{ fontSize: "clamp(1.6rem,3.5vw,2.6rem)", letterSpacing: "-0.02em" }}>
      {children}
    </h3>
  );
}

function Heading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`text-white font-bold leading-[1.04] ${className}`}
        style={{ fontSize: "clamp(2rem,4.5vw,3.6rem)", letterSpacing: "-0.022em" }}>
      {children}
    </h2>
  );
}

// ─── Why icon ─────────────────────────────────────────────────────────────────
function WhyIcon({ type }: { type: string }) {
  const cls = "text-[#B3985B]";
  if (type === "star") return (
    <svg className={cls} width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
  if (type === "people") return (
    <svg className={cls} width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
  if (type === "clock") return (
    <svg className={cls} width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
  // check
  return (
    <svg className={cls} width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
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
function EquipoPhotoCard({ linea, delay = 0, index = 0 }: { linea: Linea; delay?: number; index?: number }) {
  const img = getEquipoImage(linea);
  const floatDelay = (index % 4) * 0.5;
  return (
    <R delay={delay} y={30}>
      <div className="bg-white/[0.025] border border-white/8 rounded-xl overflow-hidden transition-all duration-300 group h-full"
           style={{ animation: `float 4s ease-in-out ${floatDelay}s infinite` }}
           onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 1px rgba(179,152,91,0.5), 0 8px 32px rgba(179,152,91,0.08)"; }}
           onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}>
        <div className="h-36 sm:h-40 bg-[#080808] flex items-center justify-center p-4">
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
        <div className="px-3 py-2.5 border-t border-white/5">
          <p className="text-white text-xs font-semibold leading-tight truncate text-center">
            {linea.modelo ?? linea.descripcion}
          </p>
        </div>
      </div>
    </R>
  );
}

function EquipoGrid({ lineas }: { lineas: Linea[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {lineas.map((l, i) => <EquipoPhotoCard key={l.id} linea={l} delay={Math.min(i * 40, 400)} index={i} />)}
    </div>
  );
}

// ─── Equipment spec list — cantidad + nombre + ubicación ─────────────────────
function EquipoSpecList({ lineas }: { lineas: Linea[] }) {
  return (
    <div className="mt-2">
      {lineas.map((l, i) => (
        <R key={l.id} delay={180 + i * 30}>
          <div className="flex items-center gap-4 py-3 border-t border-white/6">
            <p className="text-[#B3985B] text-xs font-bold shrink-0 w-7 text-right">×{l.cantidad}</p>
            <div className="flex-1 min-w-0">
              <p className="text-white/90 text-sm font-semibold leading-tight truncate">
                {l.modelo ?? l.descripcion}
              </p>
              {l.modelo && l.descripcion && (
                <p className="text-white/30 text-xs mt-0.5 leading-tight truncate">{l.descripcion}</p>
              )}
            </div>
          </div>
        </R>
      ))}
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
  const [heroIdx, setHeroIdx]       = useState(0);

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const { audio, ilum, dj, video, staff } = groupLineas(cotizacion.lineas);
  const tipoEvento   = cotizacion.trato?.tipoEvento ?? cotizacion.tipoEvento ?? "";
  const tipoServicio = cotizacion.tipoServicio ?? "";
  const evento = cotizacion.nombreEvento ?? tipoEvento ?? "Tu Evento";
  const fecha  = fmtDate(cotizacion.fechaEvento);
  const tel    = cotizacion.cliente.telefono?.replace(/\D/g, "");
  const waMsg  = encodeURIComponent(`Hola! Vi la propuesta de Mainstage Pro para ${evento} y quiero confirmar.`);
  const waUrl  = tel ? `https://wa.me/52${tel}?text=${waMsg}` : null;

  const svc = SERVICIO_CONFIG[tipoServicio] ?? DEFAULT_SVC;
  const ev  = EVENTO_CONFIG[tipoEvento] ?? DEFAULT_EVENTO;

  const gallery =
    tipoEvento === "SOCIAL"      ? GALLERY_SOCIAL :
    tipoEvento === "EMPRESARIAL" ? GALLERY_CORP :
                                   GALLERY_MUSICAL;

  useEffect(() => {
    const t = setInterval(() => setHeroIdx(i => (i + 1) % gallery.length), 5000);
    return () => clearInterval(t);
  }, [gallery.length]);

  /* eslint-disable react-hooks/rules-of-hooks */
  const stats = [
    { hook: useCounter(200),   suffix: "+", label: "Producciones" },
    { hook: useCounter(50000), suffix: "+", label: "Asistentes cubiertos" },
    { hook: useCounter(6),     suffix: "+", label: "Años de experiencia" },
    { hook: useCounter(100),   suffix: "%", label: "Satisfacción de clientes" },
  ];
  const parallaxAudio = useParallax(0.15);
  const parallaxIlum  = useParallax(0.15);
  const parallaxDj    = useParallax(0.15);
  const parallaxVideo = useParallax(0.15);
  /* eslint-enable react-hooks/rules-of-hooks */

  const heroOpacity = Math.max(0, 1 - scrollY / 900);
  const heroY       = scrollY * 0.38;

  return (
    <main className="bg-black text-white overflow-x-hidden"
          style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>

      <style>{`
        @keyframes kenBurns { from { transform:scale(1) translate(0,0); } to { transform:scale(1.08) translate(-1.5%,-1%); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        .animate-fadeUp { animation: fadeUp 0.9s ease forwards; opacity:0; }
        @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes float { 0%,100% { transform: translateY(0px) } 50% { transform: translateY(-7px) } }
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
        {gallery.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={p.src} alt="" draggable={false}
               className="absolute inset-0 w-full h-full object-cover pointer-events-none"
               style={{ opacity: i === heroIdx ? 1 : 0, transition: "opacity 1.2s ease" }} />
        ))}
        {/* Subtle gold glow overlay */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: "radial-gradient(ellipse 70% 50% at 50% 60%, rgba(179,152,91,0.06) 0%, transparent 70%)" }} />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto"
             style={{ opacity: heroOpacity, transform: `translateY(${heroY}px)` }}>
          <p className="text-[#B3985B] text-[10px] sm:text-xs font-semibold uppercase tracking-[0.28em] mb-7 animate-fadeUp">
            Mainstage Pro · Propuesta Exclusiva
          </p>
          <h1 className="font-bold text-white leading-[1.03] mb-5 animate-fadeUp"
              style={{ fontSize: "clamp(3rem,10vw,8rem)", letterSpacing: "-0.025em", animationDelay: "0.1s" }}>
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
              Para {cotizacion.cliente.empresa ? `${cotizacion.cliente.empresa} · ${cotizacion.cliente.nombre}` : cotizacion.cliente.nombre}
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

      {/* ── MARQUEE ─────────────────────────────────────────────────────────── */}
      <div className="bg-[#0a0a0a] border-y border-white/5 py-3.5 overflow-hidden select-none">
        <div style={{ display: "flex", width: "max-content", animation: "marquee 20s linear infinite" }}>
          {[0, 1].map(copy => (
            <span key={copy} className="text-white/20 text-[11px] font-semibold uppercase tracking-[0.2em] whitespace-nowrap px-8">
              Producción técnica · Audio profesional · Iluminación · DJ Setup · Video · Operadores con experiencia · Puntualidad · Confiabilidad · Mainstage Pro ·&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* ── STATEMENT ───────────────────────────────────────────────────────── */}
      <section className="bg-[#040404] py-28 sm:py-36 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <R>
            <p className="text-white/20 text-xs uppercase tracking-[0.22em] mb-8">La diferencia</p>
            <Heading className="mb-8">
              {ev.stmt1}
              <br /><span className="text-white/40">{ev.stmt2.split("\n").join(" ")}</span>
            </Heading>
          </R>
          <R delay={180}>
            <p className="text-white/40 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto">
              {ev.stmtSub}
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
        <section ref={parallaxAudio.ref as React.RefObject<HTMLElement>}
                 className="relative overflow-hidden py-24 px-6 sm:px-12 lg:px-20">
          <div className="absolute inset-[-20%] pointer-events-none"
               style={{ transform: `translateY(${parallaxAudio.offset}px)` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sectionBg(tipoEvento,
                   "/images/presentacion/m-crowd-pink.jpg",
                   "/images/presentacion/s-stage-full.png",
                   "/images/presentacion/e-corp-outdoor.jpg")}
                 alt="" draggable={false} className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-black/82" />

          <div className="relative z-10 max-w-6xl mx-auto">
            <R>
              <SectionTitle>Sistema de Audio</SectionTitle>
            </R>
            <div className="grid lg:grid-cols-[1fr,2fr] gap-12 items-start">
              <div>
                <R delay={60}>
                  <p className="text-white/45 text-base italic mb-4 leading-snug">{ev.audioHeadline}</p>
                </R>
                <R delay={140}>
                  <p className="text-white/50 text-base sm:text-lg leading-relaxed mb-2">
                    {ev.audioBody}
                  </p>
                </R>
                <EquipoSpecList lineas={audio} />
              </div>
              <R delay={100} y={30}>
                <EquipoGrid lineas={audio} />
              </R>
            </div>
          </div>
        </section>
      )}

      {/* ── ILUMINACIÓN ─────────────────────────────────────────────────────── */}
      {ilum.length > 0 && (
        <section ref={parallaxIlum.ref as React.RefObject<HTMLElement>}
                 className="relative overflow-hidden py-24 px-6 sm:px-12 lg:px-20">
          <div className="absolute inset-[-20%] pointer-events-none"
               style={{ transform: `translateY(${parallaxIlum.offset}px)` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sectionBg(tipoEvento,
                   "/images/presentacion/m-laser-red.jpg",
                   "/images/presentacion/s-dinner-sunset.png",
                   "/images/presentacion/e-corp-screens.jpg")}
                 alt="" draggable={false} className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-black/82" />

          <div className="relative z-10 max-w-6xl mx-auto">
            <R><SectionTitle>Diseño de Iluminación</SectionTitle></R>
            <div className="grid lg:grid-cols-[1fr,2fr] gap-12 items-start">
              <div>
                <R delay={60}>
                  <p className="text-white/45 text-base italic mb-4 leading-snug">{ev.ilumHeadline}</p>
                </R>
                <R delay={140}>
                  <p className="text-white/50 text-base sm:text-lg leading-relaxed mb-2">
                    {ev.ilumBody}
                  </p>
                </R>
                <EquipoSpecList lineas={ilum} />
              </div>
              <R delay={100} y={30}>
                <EquipoGrid lineas={ilum} />
              </R>
            </div>
          </div>
        </section>
      )}

      {/* ── DJ ──────────────────────────────────────────────────────────────── */}
      {dj.length > 0 && (
        <section ref={parallaxDj.ref as React.RefObject<HTMLElement>}
                 className="relative overflow-hidden py-24 px-6 sm:px-12 lg:px-20">
          <div className="absolute inset-[-20%] pointer-events-none"
               style={{ transform: `translateY(${parallaxDj.offset}px)` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sectionBg(tipoEvento,
                   "/images/presentacion/m-smoke-pink.jpg",
                   "/images/presentacion/s-vocalist.png",
                   "/images/presentacion/e-corp-outdoor.jpg")}
                 alt="" draggable={false} className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-black/82" />

          <div className="relative z-10 max-w-6xl mx-auto">
            <R><SectionTitle>Setup DJ</SectionTitle></R>
            <div className="grid lg:grid-cols-[1fr,2fr] gap-12 items-start">
              <div>
                <R delay={60}>
                  <p className="text-white/45 text-base italic mb-4 leading-snug">{ev.djHeadline}</p>
                </R>
                <R delay={140}>
                  <p className="text-white/50 text-base sm:text-lg leading-relaxed mb-2">
                    {ev.djBody}
                  </p>
                </R>
                <EquipoSpecList lineas={dj} />
              </div>
              <R delay={100} y={30}>
                <EquipoGrid lineas={dj} />
              </R>
            </div>
          </div>
        </section>
      )}

      {/* ── VIDEO ───────────────────────────────────────────────────────────── */}
      {video.length > 0 && (
        <section ref={parallaxVideo.ref as React.RefObject<HTMLElement>}
                 className="relative overflow-hidden py-24 px-6 sm:px-12 lg:px-20">
          <div className="absolute inset-[-20%] pointer-events-none"
               style={{ transform: `translateY(${parallaxVideo.offset}px)` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sectionBg(tipoEvento,
                   "/images/presentacion/m-arch-neon.jpg",
                   "/images/presentacion/s-couple-purple.png",
                   "/images/presentacion/e-corp-outdoor.jpg")}
                 alt="" draggable={false} className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-black/82" />

          <div className="relative z-10 max-w-6xl mx-auto">
            <R><SectionTitle>Producción de Video</SectionTitle></R>
            <div className="grid lg:grid-cols-[1fr,2fr] gap-12 items-start">
              <div>
                <R delay={60}>
                  <p className="text-white/45 text-base italic mb-4 leading-snug">{ev.videoHeadline}</p>
                </R>
                <R delay={140}>
                  <p className="text-white/50 text-base sm:text-lg leading-relaxed mb-2">
                    {ev.videoBody}
                  </p>
                </R>
                <EquipoSpecList lineas={video} />
              </div>
              <R delay={100} y={30}>
                <EquipoGrid lineas={video} />
              </R>
            </div>
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
            <GoldLabel>{ev.whyTitle}</GoldLabel>
            <Heading>
              No producimos eventos,<br /><span className="text-white/35">creamos experiencias<br />que generan impacto.</span>
            </Heading>
            <p className="text-white/30 text-base mt-5 max-w-lg mx-auto">
              Cuatro compromisos que hacemos realidad en cada producción.
            </p>
          </R>
          <div className="grid sm:grid-cols-2 gap-px bg-white/5 rounded-3xl overflow-hidden">
            {ev.whyPoints.map((item, i) => (
              <R key={i} delay={i * 80}>
                <div className="bg-[#060606] p-10 lg:p-14">
                  <div className="mb-5"><WhyIcon type={item.icon} /></div>
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
        <img src={gallery[0].src} alt="" draggable={false}
             className="absolute inset-0 w-full h-full object-cover opacity-12" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#040404] via-[#040404]/80 to-[#040404]" />

        <div className="relative z-10 py-32 px-6 text-center max-w-3xl mx-auto">
          <R>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-white.png" alt="Mainstage Pro" className="h-7 mx-auto mb-14 opacity-50" draggable={false} />
            <Heading className="mb-5">
              Listos para hacer de<br /><span className="text-white/60">{evento}</span><br />algo que se recuerde.
            </Heading>
          </R>
          <R delay={120}>
            <p className="text-white/35 text-lg leading-relaxed mb-12">{ev.ctaLine}</p>
          </R>
          <R delay={200}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {waUrl && (
                <a href={waUrl} target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-3 bg-[#B3985B] hover:bg-[#c9a960] text-black font-bold px-8 py-4 rounded-full text-base transition-colors shadow-[0_0_40px_rgba(179,152,91,0.25)]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Confirmar por WhatsApp
                </a>
              )}
              {cotizacion.cliente.correo && (
                <a href={`mailto:${cotizacion.cliente.correo}`}
                   className="inline-flex items-center gap-3 border border-white/15 hover:border-white/30 text-white/70 hover:text-white font-semibold px-8 py-4 rounded-full text-base transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                  Escribir por correo
                </a>
              )}
            </div>
          </R>
          <R delay={280}>
            <p className="text-white/15 text-xs mt-10">
              {cotizacion.cliente.correo && <>{cotizacion.cliente.correo} · </>}
              Mainstage Pro · {cotizacion.numeroCotizacion}
            </p>
          </R>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="Mainstage Pro" className="h-4 opacity-25" draggable={false} />
          <p className="text-white/20 text-xs text-center">
            Cotización {cotizacion.numeroCotizacion} · Propuesta para {cotizacion.cliente.nombre}
          </p>
          <p className="text-white/20 text-xs">Querétaro, México</p>
        </div>
      </footer>

    </main>
  );
}
