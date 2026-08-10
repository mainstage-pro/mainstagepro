"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  Ticket, Radio, Disc3, Guitar, MapPin, Truck,
  Heart, PartyPopper, Landmark, Crown, Church, GraduationCap,
  Building2, Megaphone, CalendarCheck, Building, School, Mic,
  type LucideIcon,
} from "lucide-react";
import type { Proyecto } from "@/lib/proyectos";
import PresentacionNav from "@/components/presentacion/PresentacionNav";
import { usePresentacionEdit, EditableImage } from "@/components/presentacion/editable";
import { useTiposEventoMaterial } from "@/lib/tipos-evento-cliente";

const GOLD = "#B3985B";

type EventoTipo = "musical" | "social" | "empresarial";

const TIPO_EVENTO_MAP: Record<EventoTipo, string> = { musical: "MUSICAL", social: "SOCIAL", empresarial: "EMPRESARIAL" };
const TIPO_NOMBRE:     Record<EventoTipo, string> = { musical: "Eventos Musicales", social: "Eventos Sociales", empresarial: "Eventos Empresariales" };

// Los 3 servicios que ofrecemos, en el orden y jerarquía de la marca.
// La `key` liga cada servicio al formulario de descubrimiento (tipoServicio).
const SERVICIOS = [
  {
    key: "RENTA",
    n: "01",
    title: "Renta de equipo",
    tagline: "El equipo correcto, listo y respaldado.",
    detail: "Line arrays, subwoofers, consolas digitales, cabezas móviles y pantallas LED. Equipo profesional verificado antes de salir de bodega, disponible con o sin operador para completar tu producción o montarla desde cero.",
    incluye: ["Audio: line array, subs y monitoreo", "Iluminación e intelligent lighting", "Video y pantallas LED", "Con o sin operador"],
  },
  {
    key: "PRODUCCION_TECNICA",
    n: "02",
    title: "Producción técnica",
    tagline: "Operadores que montan, prueban y operan tu show.",
    detail: "Llevamos el equipo y a la gente que lo opera. Montaje, prueba de sonido y operación en vivo de audio, iluminación y video durante todo el evento, de principio a fin, con respaldo ante cualquier imprevisto.",
    incluye: ["Montaje y prueba de sonido", "Técnicos de audio, iluminación y video", "Operación en vivo del show", "Respaldo ante imprevistos"],
  },
  {
    key: "DIRECCION_TECNICA",
    n: "03",
    title: "Dirección técnica",
    tagline: "Un solo responsable de que todo llegue junto.",
    detail: "Un director de producción coordina cada área: el rider, los cues de iluminación por escena, la señal de video y la comunicación directa con el artista y su equipo. La cabeza que hace que audio, iluminación y video lleguen al mismo tiempo.",
    incluye: ["Coordinación del rider", "Cues por escena", "Enlace directo con el artista", "Guion técnico del evento"],
  },
] as const;

// Recordatorio breve de los servicios, con el lenguaje adaptado a cada audiencia.
// El detalle técnico completo vive en la home y en /presentacion/servicio/*.
const SERVICIOS_RESUMEN: Record<EventoTipo, { n: string; title: string; linea: string }[]> = {
  musical: [
    { n: "01", title: "Renta de equipo",     linea: "El equipo correcto para tu show, listo y respaldado." },
    { n: "02", title: "Producción técnica",  linea: "Operadores que montan, prueban y operan tu show." },
    { n: "03", title: "Dirección técnica",   linea: "Una sola cabeza que coordina audio, iluminación y video." },
  ],
  social: [
    { n: "01", title: "Renta de equipo",     linea: "El equipo justo para tu celebración, listo y respaldado." },
    { n: "02", title: "Producción técnica",  linea: "Un equipo que monta, prueba y cuida cada momento." },
    { n: "03", title: "Dirección técnica",   linea: "Un solo responsable de que todo salga perfecto." },
  ],
  empresarial: [
    { n: "01", title: "Renta de equipo",     linea: "El equipo indicado para tu evento, listo y respaldado." },
    { n: "02", title: "Producción técnica",  linea: "Técnicos que montan, prueban y operan todo el evento." },
    { n: "03", title: "Dirección técnica",   linea: "Un solo responsable de que todo funcione y llegue a tiempo." },
  ],
};

const CONFIG = {
  musical: {
    label:    "Producción técnica para eventos musicales",
    kicker:   "Eventos musicales",
    hero:     "/images/presentacion/musicales/Musicales-016.jpg",
    headline: "El sonido y la luz\nque encienden al público.",
    sub:      "Del primer acorde al último beat: producción que se siente en el cuerpo y sostiene la energía toda la noche.",
    problema: {
      title: "Por qué importa la producción",
      lead:  "La técnica es lo que enciende al público.",
      body:  "Hacemos que el audio, la iluminación y el video trabajen a favor del artista, para que la energía suba desde el primer acorde y no baje en toda la noche.",
    },
    recomendaciones: [
      "Comparte el rider técnico o referencias del artista lo antes posible.",
      "Define el aforo y si el venue es interior o exterior — cambia el sistema de audio.",
      "Reserva tiempo suficiente de montaje y soundcheck antes de abrir puertas.",
      "Confirma los horarios del lineup para coordinar los cambios entre artistas.",
    ],
    insights: [
      {
        title: "Todo listo antes de que empiece el show",
        body:  "Revisamos el rider y montamos con tiempo. Cuando arranca la prueba de sonido, cada cosa está en su lugar: sin conexiones de último momento ni sorpresas que retrasen el inicio.",
      },
      {
        title: "Sonido claro en todo el lugar",
        body:  "Diseñamos el sistema para que el sonido llegue con la misma fuerza y claridad en cada rincón del venue, con un técnico atento al audio durante todo el show.",
      },
      {
        title: "Iluminación y video al ritmo del show",
        body:  "No perseguimos el show, lo acompañamos. Cambios coordinados con cada momento del set, con un operador dedicado para que audio, iluminación y video lleguen siempre juntos.",
      },
      {
        title: "Nos sumamos como tu evento lo necesite",
        body:  "Si ya tienes parte del equipo, rentamos lo que falta y lo integramos. Si necesitas equipo y operadores, los llevamos juntos. Y si buscas coordinación completa, ponemos un director técnico al frente.",
      },
    ],
    tipos: ["Conciertos", "Festivales", "Música electrónica / Raves", "Presentaciones en vivo", "DJ Sets", "Showcases", "Fiestas privadas"],
    perfiles: [
      { label: "Promotores y productores", linea: "Producción lista a tiempo para que tú te concentres en llenar el lugar.", icon: Ticket },
      { label: "Promotores de música electrónica", linea: "Sistema con la potencia y la presión que un evento electrónico exige.", icon: Radio },
      { label: "DJ's de electrónica", linea: "Sonido potente e iluminación que sigue tu set, montado antes de que llegues a cabina.", icon: Disc3 },
      { label: "Músicos y bandas", linea: "Audio y monitoreo para que el público sienta cada nota.", icon: Guitar },
      { label: "Foros y venues", linea: "El aliado técnico confiable para cada evento que reciben.", icon: MapPin },
      { label: "Empresas de renta y colegas", linea: "Te complementamos con equipo y operadores cuando el evento crece.", icon: Truck },
    ],
    cotizar: [
      "Fecha del evento",
      "Venue o lugar — interior o exterior",
      "Aforo estimado",
      "Lineup o artistas (si aplica)",
      "Horarios: montaje, show y desmontaje",
      "Qué servicio buscas: renta, producción o dirección",
      "Rider técnico o referencias, si ya los tienes",
    ],
    gallery: [
      { src: "/images/presentacion/musicales/Musicales-016.jpg",                    caption: "Producción completa en vivo" },
      { src: "/images/presentacion/musicales/Musicales-037.jpg",                    caption: "Iluminación · Show en escenario" },
      { src: "/images/presentacion/musicales/Musicales-076.jpg",                    caption: "DJ Set · Equipo profesional" },
      { src: "/images/presentacion/musicales/MAGIC_ROOM_260307_GUANAJUATO_078.jpg", caption: "Festival · Guanajuato" },
      { src: "/images/presentacion/musicales/Musicales-055.jpg",                    caption: "Producción de iluminación · Efectos especiales" },
      { src: "/images/presentacion/musicales/Afrodise-59.jpg",                      caption: "Stage completo · Noche" },
      { src: "/images/presentacion/musicales/DSC07491.jpg",                         caption: "En vivo · Operación técnica" },
      { src: "/images/presentacion/musicales/Musicales-126.jpg",                    caption: "Show · Producción audiovisual" },
    ],
    cta:    "Cuéntanos de tu evento",
    ctaSub: "Dinos el artista, el venue y la fecha. Propuesta técnica en menos de 24 horas.",
  },

  social: {
    label:    "Producción técnica para eventos sociales",
    kicker:   "Eventos sociales",
    hero:     "/images/presentacion/sociales/s-boda-elegante.jpg",
    headline: "Que cada momento\nse viva perfecto.",
    sub:      "Primer baile, brindis, pista — el sonido y la luz justos en cada instante, sin que notes que estamos ahí.",
    problema: {
      title: "Por qué importa la producción",
      lead:  "Una celebración se vive una sola vez.",
      body:  "Cuidamos que el sonido y la iluminación acompañen cada momento —la ceremonia, el brindis, la pista— tal como lo imaginaste, dejando siempre el protagonismo a los festejados.",
    },
    recomendaciones: [
      "Comparte el programa: ceremonia, brindis, primer baile y pastel.",
      "Dinos el número de invitados y si el venue es interior o exterior.",
      "Confirma si habrá discursos o participaciones con micrófono.",
      "Coordinemos los horarios de montaje junto con el venue y los demás proveedores.",
    ],
    insights: [
      {
        title: "Coordinamos el programa contigo desde antes",
        body:  "Primer baile, vals, brindis, entrada, pastel — revisamos cada momento con anticipación. El día del evento no hay nada que improvisar: cada transición ya está planeada y el equipo sabe qué viene.",
      },
      {
        title: "El brindis se escucha claro en todo el salón",
        body:  "Micrófonos manejados por un técnico dedicado. Sin ruidos ni volumen disparejo: cada palabra del discurso llega clara a todas las mesas, sin que nadie tenga que repetir.",
      },
      {
        title: "La iluminación acompaña cada momento",
        body:  "De la cena a la pista, las transiciones son graduales y suaves. La iluminación cambia de ambiente en el momento justo, programada con anticipación para que todo fluya.",
      },
      {
        title: "Coordinamos con todos sin estorbar a nadie",
        body:  "Trabajamos alineados con el venue, el fotógrafo y el decorador. Llegamos, montamos con orden y nos hacemos a un lado. El protagonismo es de los festejados, no de la producción.",
      },
    ],
    tipos: ["Bodas", "XV Años", "Cocteles", "Cumpleaños", "Graduaciones", "Aniversarios", "Fiestas privadas"],
    perfiles: [
      { label: "Wedding planners", linea: "El aliado técnico que cuida cada detalle de la boda.", icon: Heart },
      { label: "Organizadores de eventos sociales", linea: "Un solo proveedor técnico confiable para cada evento que produces.", icon: PartyPopper },
      { label: "Salones y haciendas", linea: "Producción a la medida de cada evento en tu espacio.", icon: Landmark },
      { label: "XV años", linea: "El vals, el brindis y la pista, cada momento en su punto.", icon: Crown },
      { label: "Bautizos", linea: "Sonido claro para la ceremonia y el ambiente justo para celebrar.", icon: Church },
      { label: "DJs de eventos sociales", linea: "El equipo que hace que la pista explote toda la noche.", icon: Disc3 },
      { label: "Organizadores de graduaciones", linea: "Audio claro para los discursos e iluminación que da altura al momento.", icon: GraduationCap },
    ],
    cotizar: [
      "Fecha del evento",
      "Venue o lugar — interior o exterior",
      "Número de invitados",
      "Momentos clave: ceremonia, brindis, baile",
      "Horarios: montaje, evento y desmontaje",
      "Qué servicio buscas: renta, producción o dirección",
      "Referencias o inspiración, si ya las tienes",
    ],
    gallery: [
      { src: "/images/presentacion/sociales/s-dj-salon.png",          caption: "El ambiente que recordarán" },
      { src: "/images/presentacion/sociales/s-hacienda-iluminada.jpg", caption: "Hacienda · Iluminación dramática" },
      { src: "/images/presentacion/sociales/s-boda-colonial.jpg",      caption: "Boda · Venue colonial" },
      { src: "/images/presentacion/sociales/s-piano-pista.jpg",        caption: "Piano · Pista espejada" },
      { src: "/images/presentacion/sociales/s-boda-elegante.jpg",      caption: "Boda elegante · Producción exterior" },
      { src: "/images/presentacion/sociales/s-hacienda-aerea.jpg",     caption: "Vista aérea · Iluminación completa" },
    ],
    cta:    "Cuéntanos tu fecha",
    ctaSub: "Venue, número de invitados y lo que tienes en mente. Te respondemos con disponibilidad y propuesta.",
  },

  empresarial: {
    label:    "Producción técnica para eventos corporativos",
    kicker:   "Eventos corporativos",
    hero:     "/images/presentacion/empresariales/e-auditorio.jpg",
    headline: "Cada mensaje,\nclaro y con presencia.",
    sub:      "Audio nítido para cada presentador, pantallas que responden y una producción que refuerza la imagen de tu marca.",
    problema: {
      title: "Por qué importa la producción",
      lead:  "La producción es parte de la imagen de tu marca.",
      body:  "Nos aseguramos de que cada presentador se escuche claro y cada pantalla luzca impecable, para que toda la atención esté en tu mensaje.",
    },
    recomendaciones: [
      "Comparte la sede y el formato: sala, auditorio o exterior.",
      "Dinos el número de asistentes y de presentadores.",
      "Confirma si habrá streaming, grabación o presentaciones remotas.",
      "Facilítanos las presentaciones y equipos de los ponentes para probarlos antes.",
    ],
    insights: [
      {
        title: "Un fallo técnico no es solo un problema técnico",
        body:  "En un evento corporativo, la producción es parte de la imagen de tu empresa. Un micrófono que no abre o una pantalla mal configurada deja una impresión que cuesta. Llegamos antes para verificar cada detalle y evitarlo.",
      },
      {
        title: "Todo probado antes del primer invitado",
        body:  "Audio, video y presentaciones verificados con anticipación. Hacemos las pruebas con calma para que, a la hora del evento, no haya nada que ajustar sobre la marcha.",
      },
      {
        title: "Nos integramos con tu equipo sin complicar las cosas",
        body:  "Si ya tienes coordinador de evento o agencia, nos alineamos con ellos. Un solo punto de contacto para todo lo técnico, sin duplicar comunicaciones ni crear confusión el día del evento.",
      },
      {
        title: "Montaje puntual, presencia discreta",
        body:  "Llegamos antes de tiempo y montamos con orden. Durante el evento operamos en silencio, resolvemos sin llamar la atención y desmontamos de forma ordenada al cierre. Nadie nota que estamos ahí hasta que algo necesita atención.",
      },
    ],
    tipos: ["Conferencias", "Congresos", "Lanzamientos", "Activaciones", "Networking", "Premiaciones", "Inauguraciones"],
    perfiles: [
      { label: "Empresas", linea: "Tu mensaje claro y con presencia, a la altura de tu marca.", icon: Building2 },
      { label: "Agencias de marketing", linea: "El respaldo técnico que hace lucir cada activación que produces.", icon: Megaphone },
      { label: "Agencias de organización de eventos", linea: "Un solo proveedor técnico confiable para cada evento que montas.", icon: CalendarCheck },
      { label: "Desarrolladores inmobiliarios", linea: "Lanzamientos que hacen lucir tu proyecto y lo venden.", icon: Building },
      { label: "Escuelas e instituciones", linea: "Cada ceremonia y festival escolar, a la altura.", icon: School },
      { label: "Conferencistas", linea: "El escenario y el audio que tu mensaje merece.", icon: Mic },
    ],
    cotizar: [
      "Fecha del evento",
      "Espacio o sede — sala, auditorio o exterior",
      "Número de asistentes",
      "Número de presentadores y formato",
      "Horarios: montaje, evento y desmontaje",
      "Qué servicio buscas: renta, producción o dirección",
      "¿Requiere streaming o grabación?",
    ],
    gallery: [
      { src: "/images/presentacion/empresariales/e-sala-pantallas.jpg",   caption: "Experiencias que generan impacto" },
      { src: "/images/presentacion/empresariales/e-auditorio.jpg",        caption: "Auditorio · Producción completa" },
      { src: "/images/presentacion/empresariales/e-carpa-led.jpg",        caption: "Evento exterior · Pantalla LED" },
      { src: "/images/presentacion/empresariales/e-networking.jpg",       caption: "Networking · Ambiente corporativo" },
      { src: "/images/presentacion/empresariales/e-edificio-azul.jpg",    caption: "Inauguración · Iluminación arquitectónica" },
      { src: "/images/presentacion/empresariales/e-proyeccion-mural.jpg", caption: "Proyección artística · Evento exclusivo" },
    ],
    cta:    "Platícanos sobre el evento",
    ctaSub: "Espacio, número de presentadores y tipo de evento. Propuesta técnica a la medida en 24 horas.",
  },
} satisfies Record<EventoTipo, {
  label: string; kicker: string; hero: string; headline: string; sub: string;
  problema: { title: string; lead: string; body: string };
  recomendaciones: string[];
  insights: { title: string; body: string }[];
  tipos: string[];
  perfiles: { label: string; linea: string; icon: LucideIcon }[];
  cotizar: string[];
  gallery: { src: string; caption: string }[];
  cta: string; ctaSub: string;
}>;

type Foto = { id: string | null; url: string; caption: string };

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

// Detecta si quien mira la presentación tiene sesión interna (para editar la galería).
function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    fetch("/api/auth/me").then(r => (r.ok ? r.json() : null)).then(d => { if (d?.user) setIsAdmin(true); }).catch(() => {});
  }, []);
  return isAdmin;
}

// Carga las fotos del tipo de evento desde la BD, con fallback a las imágenes por defecto.
function useGaleria(slug: EventoTipo, fallback: { src: string; caption: string }[]) {
  const [fotos, setFotos]   = useState<Foto[]>(fallback.map(f => ({ id: null, url: f.src, caption: f.caption })));
  const [tipoId, setTipoId] = useState<string | null>(null);
  const cargar = useCallback(() => {
    fetch(`/api/tipos-evento/${slug}/publico`)
      .then(r => r.json())
      .then(d => {
        if (d.tipo) {
          setTipoId(d.tipo.id);
          if (d.tipo.fotos?.length) {
            setFotos(d.tipo.fotos.map((f: { id: string; url: string; caption: string | null }) => ({ id: f.id, url: f.url, caption: f.caption || "" })));
          }
        }
      })
      .catch(() => {});
  }, [slug]);
  useEffect(() => { cargar(); }, [cargar]);
  return { fotos, tipoId, setTipoId, recargar: cargar };
}

// Carga los proyectos publicados para este tipo de evento.
function useProyectos(tipo: EventoTipo) {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  useEffect(() => {
    fetch(`/api/proyectos/publico?tipo=${TIPO_EVENTO_MAP[tipo]}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (Array.isArray(d?.proyectos)) setProyectos(d.proyectos); })
      .catch(() => {});
  }, [tipo]);
  return proyectos;
}

function ProyectosSection({ proyectos, isAdmin, tipo }: { proyectos: Proyecto[]; isAdmin: boolean; tipo: EventoTipo }) {
  const [creando, setCreando] = useState(false);
  if (!proyectos.length && !isAdmin) return null;

  async function crear() {
    setCreando(true);
    try {
      const r = await fetch("/api/presentacion/proyectos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoEvento: TIPO_EVENTO_MAP[tipo], titulo: "Nuevo proyecto" }),
      });
      const d = await r.json();
      if (d.proyecto?.slug) { window.location.href = `/presentacion/proyecto/${d.proyecto.slug}`; return; }
      throw new Error(d.error || "No se pudo crear");
    } catch (err) {
      setCreando(false);
      alert("Error al crear proyecto: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  return (
    <section id="proyectos" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <R>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
            <div>
              <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-5">Proyectos</p>
              <h2 className="font-bold text-white leading-[1.05]" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>
                Eventos que ya resolvimos.
              </h2>
            </div>
            {isAdmin && (
              <button onClick={crear} disabled={creando}
                className="text-xs font-semibold tracking-wide px-5 py-2.5 rounded-full transition-all disabled:opacity-50"
                style={{ background: "rgba(179,152,91,0.12)", border: `1px solid ${GOLD}55`, color: GOLD }}>
                {creando ? "Creando…" : "＋ Nuevo proyecto"}
              </button>
            )}
          </div>
          <p className="text-white/40 text-sm sm:text-base leading-relaxed max-w-2xl mb-14">
            Una muestra de cómo trabajamos, del reto a la ejecución. Cada proyecto con su historia.
          </p>
        </R>

        {proyectos.length === 0 && isAdmin && (
          <p className="text-white/30 text-sm">Aún no hay proyectos de este tipo. Crea el primero con el botón de arriba.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {proyectos.map((p, i) => (
            <R key={p.id} delay={i * 70}>
              <a href={`/presentacion/proyecto/${p.slug}`}
                 className="group block h-full rounded-3xl overflow-hidden transition-all duration-500"
                 style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                <div className="relative aspect-[4/3] overflow-hidden">
                  {p.portada ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={p.portada} alt={p.titulo} draggable={false}
                         className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full" style={{ background: "radial-gradient(circle at 30% 20%, rgba(179,152,91,0.22), #0c0c0c 65%)" }} />
                  )}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(8,8,8,0.75), transparent 55%)" }} />
                </div>
                <div className="p-6">
                  {p.ubicacion && <p className="text-[11px] uppercase tracking-[0.14em] text-white/30 mb-2">{p.ubicacion}{p.fecha ? ` · ${p.fecha}` : ""}</p>}
                  <h3 className="font-semibold text-white leading-snug mb-2" style={{ fontSize: "1.15rem", letterSpacing: "-0.01em" }}>{p.titulo}</h3>
                  {p.resumen && <p className="text-white/45 text-sm leading-relaxed line-clamp-2">{p.resumen}</p>}
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium transition-transform duration-300 group-hover:translate-x-1" style={{ color: GOLD }}>
                    Ver proyecto <span aria-hidden>→</span>
                  </span>
                </div>
              </a>
            </R>
          ))}
        </div>
      </div>
    </section>
  );
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

// ─── Cinematic Gallery (banda destacada) ──────────────────────────────────────
function CinematicGallery({ photos }: { photos: Foto[] }) {
  const [idx, setIdx]           = useState(0);
  const [progress, setProgress] = useState(0);
  const DURATION = 5500;

  useEffect(() => {
    if (photos.length <= 1) return;
    setProgress(0);
    const start = Date.now();
    const iv = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / DURATION);
      setProgress(p);
      if (p >= 1) { clearInterval(iv); setTimeout(() => setIdx(i => (i + 1) % photos.length), 900); }
    }, 40);
    return () => clearInterval(iv);
  }, [idx, photos.length]);

  if (!photos.length) return null;

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "72vh", minHeight: "480px" }}>
      {photos.map((p, i) => {
        const isActive = i === idx;
        return (
          <div key={i} className="absolute inset-0"
               style={{ opacity: isActive ? 1 : 0, transition: isActive ? "opacity 1.6s ease" : "opacity 1s ease", zIndex: isActive ? 2 : 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.caption} draggable={false}
                 className="w-full h-full object-cover"
                 style={{ animation: isActive ? "kenBurns 10s ease forwards" : "none" }} />
          </div>
        );
      })}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: "linear-gradient(to top, rgba(8,8,8,0.7) 0%, rgba(8,8,8,0.1) 40%, transparent 100%)", zIndex: 3 }} />
      <div className="absolute bottom-0 left-0 right-0 px-8 sm:px-16 pb-7" style={{ zIndex: 4 }}>
        <div className="flex items-end justify-between mb-4">
          <p className="text-white/50 text-sm tracking-wide">{photos[idx].caption}</p>
          <p className="text-white/20 text-xs font-mono">{String(idx + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}</p>
        </div>
        <div className="relative h-px w-full bg-white/10">
          <div className="absolute inset-y-0 left-0 bg-[#B3985B]" style={{ width: `${progress * 100}%`, transition: "width 0.08s linear" }} />
        </div>
      </div>
      <div className="absolute top-6 right-8 flex gap-2.5 items-center" style={{ zIndex: 4 }}>
        {photos.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} aria-label={`Foto ${i + 1}`}
                  className="rounded-full transition-all duration-300"
                  style={{ width: i === idx ? "22px" : "6px", height: "6px", background: i === idx ? GOLD : "rgba(255,255,255,0.2)" }} />
        ))}
      </div>
      <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 pointer-events-none" style={{ zIndex: 4 }}>
        <button aria-label="Anterior" className="pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-all"
                style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}
                onClick={() => setIdx(i => (i - 1 + photos.length) % photos.length)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button aria-label="Siguiente" className="pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-all"
                style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}
                onClick={() => setIdx(i => (i + 1) % photos.length)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  );
}

// ─── Galería completa (grid + lightbox + edición inline para admins) ──────────
function GaleriaCompleta({
  slug, fotos, tipoId, setTipoId, isAdmin, recargar,
}: {
  slug: EventoTipo; fotos: Foto[]; tipoId: string | null;
  setTipoId: (id: string) => void; isAdmin: boolean; recargar: () => void;
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState({ hechas: 0, total: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  const cerrar = useCallback(() => setLightbox(null), []);
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
      if (e.key === "ArrowRight") setLightbox(i => (i === null ? 0 : (i + 1) % fotos.length));
      if (e.key === "ArrowLeft")  setLightbox(i => (i === null ? 0 : (i - 1 + fotos.length) % fotos.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, fotos.length, cerrar]);

  async function subir(files: FileList | null) {
    if (!files || !files.length) return;
    setSubiendo(true);
    setProgreso({ hechas: 0, total: files.length });
    try {
      let id = tipoId;
      if (!id) {
        const r = await fetch("/api/tipos-evento/ensure", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, nombre: TIPO_NOMBRE[slug] }),
        });
        const d = await r.json();
        if (!d.id) throw new Error("No se pudo preparar el tipo de evento");
        const nuevoId = d.id as string;
        setTipoId(nuevoId);
        id = nuevoId;
      }
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/tipos-evento/imagenes" });
        await fetch(`/api/tipos-evento/${id}/fotos`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: blob.url, orden: fotos.length + i }),
        });
        setProgreso({ hechas: i + 1, total: files.length });
      }
      recargar();
    } catch (err) {
      alert("No se pudieron subir las fotos: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubiendo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function borrar(fotoId: string | null) {
    if (!fotoId) return;
    if (!confirm("¿Eliminar esta foto de la galería?")) return;
    await fetch(`/api/tipos-evento/fotos/${fotoId}`, { method: "DELETE" });
    recargar();
  }

  return (
    <section id="galeria" className="py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <R>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
            <div>
              <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-4">Galería</p>
              <h2 className="font-bold text-white leading-[1.05]" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>
                Lo que montamos, en fotos reales.
              </h2>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-3">
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                       onChange={e => subir(e.target.files)} />
                <button onClick={() => fileRef.current?.click()} disabled={subiendo}
                        className="text-xs font-semibold tracking-wide px-5 py-2.5 rounded-full transition-all disabled:opacity-50"
                        style={{ background: "rgba(179,152,91,0.12)", border: `1px solid ${GOLD}55`, color: GOLD }}>
                  {subiendo ? `Subiendo ${progreso.hechas}/${progreso.total}…` : "＋ Subir fotos"}
                </button>
              </div>
            )}
          </div>
        </R>

        <div className="columns-2 md:columns-3 gap-3 [column-fill:_balance]">
          {fotos.map((f, i) => (
            <div key={f.id ?? i} className="mb-3 break-inside-avoid relative group cursor-pointer overflow-hidden rounded-xl"
                 onClick={() => setLightbox(i)}
                 style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={f.caption || `Foto ${i + 1}`} draggable={false} loading="lazy"
                   className="w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                   style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent 55%)" }} />
              {f.caption && (
                <p className="absolute bottom-3 left-3 right-3 text-white/85 text-xs opacity-0 group-hover:opacity-100 transition-opacity">{f.caption}</p>
              )}
              {isAdmin && f.id && (
                <button onClick={e => { e.stopPropagation(); borrar(f.id); }}
                        aria-label="Eliminar foto"
                        className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.15)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox !== null && fotos[lightbox] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(4,4,4,0.94)", backdropFilter: "blur(8px)" }}
             onClick={cerrar}>
          <button aria-label="Cerrar" onClick={cerrar}
                  className="absolute top-5 right-5 w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <button aria-label="Anterior" onClick={e => { e.stopPropagation(); setLightbox(i => (i === null ? 0 : (i - 1 + fotos.length) % fotos.length)); }}
                  className="absolute left-4 sm:left-8 w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div className="max-w-5xl max-h-[85vh]" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fotos[lightbox].url} alt={fotos[lightbox].caption} className="max-w-full max-h-[85vh] object-contain rounded-lg" />
            {fotos[lightbox].caption && <p className="text-center text-white/50 text-sm mt-4">{fotos[lightbox].caption}</p>}
          </div>
          <button aria-label="Siguiente" onClick={e => { e.stopPropagation(); setLightbox(i => (i === null ? 0 : (i + 1) % fotos.length)); }}
                  className="absolute right-4 sm:right-8 w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      )}
    </section>
  );
}

// ─── Modal de descubrimiento ──────────────────────────────────────────────────
function DiscoveryModal({
  tipo, servicio, loading, onConfirm, onClose,
}: {
  tipo: EventoTipo; servicio: string | null; loading: boolean;
  onConfirm: () => void; onClose: () => void;
}) {
  const servLabel = SERVICIOS.find(s => s.key === servicio)?.title;
  const eventoLabel = { musical: "musical", social: "social", empresarial: "corporativo" }[tipo];
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" style={{ background: "rgba(4,4,4,0.9)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-8" onClick={e => e.stopPropagation()}
           style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-[#B3985B] text-xs tracking-[0.24em] uppercase mb-4">Formulario de descubrimiento</p>
        <h3 className="text-white font-bold text-2xl leading-tight mb-3" style={{ letterSpacing: "-0.02em" }}>
          Cuéntanos de tu evento {eventoLabel}
        </h3>
        <p className="text-white/45 text-sm leading-relaxed mb-2">
          Te haremos unas preguntas rápidas sobre tu evento{servLabel ? <> y tu interés en <span className="text-white/70">{servLabel.toLowerCase()}</span></> : null}. Toma unos 3 minutos y con eso preparamos tu propuesta técnica.
        </p>
        <p className="text-white/25 text-xs leading-relaxed mb-7">Al continuar, tu información llega directo a nuestro equipo. Te contactamos en menos de 24 horas.</p>
        <button onClick={onConfirm} disabled={loading}
                className="w-full py-4 rounded-full font-semibold text-black text-sm tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                style={{ background: GOLD }}>
          {loading ? "Preparando tu formulario…" : "Continuar →"}
        </button>
        <button onClick={onClose} disabled={loading} className="w-full mt-3 text-white/30 text-xs hover:text-white/55 transition-colors">
          Ahora no
        </button>
      </div>
    </div>
  );
}

// ─── Contact Form (WhatsApp) ──────────────────────────────────────────────────
function ContactForm({ tipo }: { tipo: EventoTipo }) {
  const tipoLabel = { musical: "Musical", social: "Social", empresarial: "Empresarial" }[tipo];
  const [form, setForm] = useState({ nombre: "", fechaEstimada: "", presupuesto: "", mensaje: "" });
  const [sent, setSent] = useState(false);

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lines = [
      `Hola, me interesa una cotización para un evento ${tipoLabel}.`,
      ``,
      `*Nombre:* ${form.nombre}`,
      form.fechaEstimada ? `*Fecha estimada:* ${form.fechaEstimada}` : "",
      form.presupuesto   ? `*Presupuesto aprox:* ${form.presupuesto}` : "",
      form.mensaje       ? `*Detalles:* ${form.mensaje}` : "",
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/524461432565?text=${encodeURIComponent(lines)}`, "_blank");
    setSent(true);
  }

  const inp = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#B3985B]/60 transition-colors";

  if (sent) return (
    <div className="text-center py-12">
      <p className="text-[#B3985B] text-3xl mb-4">✓</p>
      <p className="text-white font-semibold mb-2">WhatsApp abierto</p>
      <p className="text-white/40 text-sm">Respondemos con disponibilidad y propuesta en menos de 24 horas.</p>
      <button onClick={() => setSent(false)} className="mt-6 text-white/25 text-xs hover:text-white/50 transition-colors">Enviar otra consulta</button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-white/35 text-xs mb-1.5 tracking-wide">Nombre *</label>
          <input required className={inp} placeholder="Tu nombre" value={form.nombre} onChange={e => set("nombre", e.target.value)} />
        </div>
        <div>
          <label className="block text-white/35 text-xs mb-1.5 tracking-wide">Tipo de evento</label>
          <input readOnly className={`${inp} opacity-40 cursor-default`} value={`Evento ${tipoLabel}`} />
        </div>
        <div>
          <label className="block text-white/35 text-xs mb-1.5 tracking-wide">Fecha estimada</label>
          <input type="date" className={inp} value={form.fechaEstimada} onChange={e => set("fechaEstimada", e.target.value)} />
        </div>
        <div>
          <label className="block text-white/35 text-xs mb-1.5 tracking-wide">Presupuesto aproximado</label>
          <input className={inp} placeholder="Ej: $50,000 MXN" value={form.presupuesto} onChange={e => set("presupuesto", e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-white/35 text-xs mb-1.5 tracking-wide">Cuéntanos más (opcional)</label>
        <textarea rows={3} className={inp} placeholder="Venue, capacidad, artistas, lo que tienes en mente…" value={form.mensaje} onChange={e => set("mensaje", e.target.value)} />
      </div>
      <button type="submit"
        className="w-full flex items-center justify-center gap-3 py-4 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: GOLD }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Enviar por WhatsApp
      </button>
      <p className="text-white/18 text-xs text-center">Se abrirá WhatsApp con tu mensaje listo para enviar.</p>
    </form>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function EventoClient({ tipo }: { tipo: EventoTipo }) {
  const c = CONFIG[tipo];
  const isAdmin  = useAdmin();
  const edit = usePresentacionEdit();
  const { coverPorSlug } = useTiposEventoMaterial();
  const { fotos, tipoId, setTipoId, recargar } = useGaleria(tipo, c.gallery);
  const proyectos = useProyectos(tipo);

  const [discOpen, setDiscOpen]       = useState(false);
  const [discServicio, setDiscServicio] = useState<string | null>(null);
  const [discLoading, setDiscLoading] = useState(false);

  function abrirDescubrimiento(servicio: string | null = null) {
    setDiscServicio(servicio);
    setDiscOpen(true);
  }

  async function confirmarDescubrimiento() {
    setDiscLoading(true);
    try {
      const r = await fetch("/api/leads/descubrimiento-publico", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoEvento: TIPO_EVENTO_MAP[tipo], tipoServicio: discServicio }),
      });
      const d = await r.json();
      if (d.url) { window.location.href = d.url; return; }
      throw new Error("Sin URL");
    } catch {
      setDiscLoading(false);
      alert("No se pudo abrir el formulario. Intenta de nuevo o contáctanos por WhatsApp.");
    }
  }

  return (
    <div className="bg-[#080808] text-white min-h-screen"
         style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      <style>{`
        @keyframes kenBurns { from { transform: scale(1) translate(0, 0); } to { transform: scale(1.07) translate(-1.2%, -0.6%); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #080808; }
        ::-webkit-scrollbar-thumb { background: rgba(179,152,91,0.35); border-radius: 2px; }
      `}</style>

      {/* Nav unificada */}
      <PresentacionNav />

      {/* ── Hero ── */}
      <section className="relative min-h-[68vh] flex flex-col items-center justify-center overflow-hidden py-20">
        <div className="absolute inset-0">
          <EditableImage
            edit={edit}
            okey={`evento.${tipo}.hero`}
            fallback={coverPorSlug(tipo, c.hero)}
            alt={c.label}
            wrapClassName="relative w-full h-full"
            imgClassName="w-full h-full object-cover"
            imgStyle={{ animation: "kenBurns 18s ease forwards" }}
            prominent
          />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.35) 0%, rgba(8,8,8,0.55) 40%, rgba(8,8,8,0.9) 78%, #080808 100%)" }} />
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <p className="text-[#B3985B] font-semibold tracking-[0.34em] uppercase mb-7"
             style={{ fontSize: "clamp(0.7rem, 1.4vw, 0.85rem)", animation: "fadeUp 0.8s ease forwards 0.2s", opacity: 0 }}>
            {c.kicker}
          </p>
          <h1 className="font-bold text-white leading-[1.04]"
              style={{ fontSize: "clamp(2.1rem, 5.6vw, 4.4rem)", letterSpacing: "-0.03em", whiteSpace: "pre-line", animation: "fadeUp 0.95s ease forwards 0.4s", opacity: 0 }}>
            {c.headline}
          </h1>
          <p className="text-white/50 mt-8 leading-relaxed max-w-xl mx-auto"
             style={{ fontSize: "clamp(0.95rem, 1.6vw, 1.1rem)", animation: "fadeUp 0.95s ease forwards 0.65s", opacity: 0 }}>
            {c.sub}
          </p>

          {/* Tira de tipos de evento — claridad inmediata */}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-2.5 max-w-2xl mx-auto"
               style={{ animation: "fadeUp 0.95s ease forwards 0.8s", opacity: 0 }}>
            {c.tipos.map((t, i) => (
              <span key={i} className="text-xs tracking-wide px-3.5 py-1.5 rounded-full"
                    style={{ color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {t}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
               style={{ animation: "fadeUp 0.95s ease forwards 1s", opacity: 0 }}>
            <button onClick={() => abrirDescubrimiento(null)}
               className="px-9 py-4 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105"
               style={{ background: GOLD }}>
              Iniciar descubrimiento
            </button>
            <a href="#servicios" className="text-white/40 text-sm hover:text-white/70 transition-colors">Ver servicios →</a>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-20">
          <div className="w-px h-12 bg-gradient-to-b from-white/60 to-transparent mx-auto" />
        </div>
      </section>

      {/* ── El problema que resolvemos ── */}
      <section className="py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <R>
            <div className="relative rounded-3xl px-8 py-16 sm:px-16 sm:py-20 overflow-hidden text-center"
                 style={{ background: "linear-gradient(180deg, rgba(179,152,91,0.07) 0%, rgba(255,255,255,0.02) 100%)", border: `1px solid ${GOLD}22` }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
              <p className="text-[#B3985B] text-xs tracking-[0.32em] uppercase mb-8">{c.problema.title}</p>
              <p className="font-bold text-white leading-[1.1] mb-6" style={{ fontSize: "clamp(1.9rem, 4.6vw, 3.1rem)", letterSpacing: "-0.03em" }}>
                {c.problema.lead}
              </p>
              <p className="text-white/55 leading-[1.65] max-w-2xl mx-auto" style={{ fontSize: "clamp(1rem, 1.6vw, 1.15rem)" }}>
                {c.problema.body}
              </p>
            </div>
          </R>
        </div>
      </section>

      {/* ── Recordatorio de servicios (compacto) ── */}
      <section id="servicios" className="py-20 px-6 bg-[#060606]">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-4">Cómo trabajamos contigo</p>
            <h2 className="font-bold text-white leading-[1.05] mb-3" style={{ fontSize: "clamp(1.5rem, 3.2vw, 2.4rem)", letterSpacing: "-0.02em" }}>
              Tres formas de sumarnos a tu evento.
            </h2>
            <p className="text-white/40 text-sm leading-relaxed max-w-2xl mb-10">
              Desde solo el equipo hasta la coordinación completa. Elige el alcance que necesitas — o combínalos.
            </p>
          </R>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SERVICIOS_RESUMEN[tipo].map((s, i) => (
              <R key={s.n} delay={i * 80}>
                <div className="rounded-2xl p-6 h-full flex flex-col"
                     style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="font-mono mb-4" style={{ fontSize: "0.7rem", color: GOLD, letterSpacing: "0.12em" }}>{s.n}</span>
                  <h3 className="font-bold text-white text-lg mb-2 leading-tight">{s.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{s.linea}</p>
                </div>
              </R>
            ))}
          </div>

          <R delay={240}>
            <div className="mt-8">
              <button onClick={() => abrirDescubrimiento(null)}
                      className="text-sm font-semibold tracking-wide px-7 py-3.5 rounded-full transition-all hover:scale-105"
                      style={{ background: "rgba(179,152,91,0.12)", border: `1px solid ${GOLD}55`, color: GOLD }}>
                Cotizar mi evento →
              </button>
            </div>
          </R>
        </div>
      </section>

      {/* ── Clientes que atendemos ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-4">Para quién trabajamos</p>
            <h2 className="font-bold text-white leading-[1.05] mb-3" style={{ fontSize: "clamp(1.5rem, 3.2vw, 2.4rem)", letterSpacing: "-0.02em" }}>
              Clientes que atendemos.
            </h2>
            <p className="text-white/40 text-sm leading-relaxed max-w-2xl mb-10">
              Cada evento es distinto y cada quien nos necesita de forma diferente. Estos son los clientes con los que más trabajamos en este tipo de evento.
            </p>
          </R>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {c.perfiles.map((p, i) => (
              <R key={p.label} delay={i * 70}>
                <div className="flex items-start gap-4 p-6 rounded-2xl h-full"
                     style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl"
                        style={{ background: "rgba(179,152,91,0.12)", border: `1px solid ${GOLD}33` }}>
                    <p.icon strokeWidth={1.75} className="w-5 h-5" style={{ color: GOLD }} />
                  </span>
                  <div>
                    <h3 className="font-semibold text-white mb-1.5 leading-snug" style={{ fontSize: "clamp(0.98rem, 1.4vw, 1.1rem)" }}>{p.label}</h3>
                    <p className="text-white/45 text-sm leading-relaxed">{p.linea}</p>
                  </div>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Propuesta de valor ── */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-5">Por qué confiar en nosotros</p>
            <h2 className="font-bold text-white leading-[1.05] mb-16" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>
              Cuidamos cada detalle.
            </h2>
          </R>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px"
               style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", overflow: "hidden" }}>
            {c.insights.map((ins, i) => (
              <R key={i} delay={i * 80}>
                <div className="p-8 sm:p-10 h-full"
                     style={{ background: "rgba(255,255,255,0.025)", borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.06)" : "none", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                  <p className="font-mono mb-5" style={{ fontSize: "0.6rem", color: GOLD, letterSpacing: "0.12em" }}>{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="font-semibold text-white mb-3 leading-snug" style={{ fontSize: "clamp(0.95rem, 1.4vw, 1.05rem)" }}>{ins.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{ins.body}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Banda cinemática ── */}
      <section>
        <CinematicGallery photos={fotos} />
      </section>

      {/* ── Proyectos ── */}
      <ProyectosSection proyectos={proyectos} isAdmin={isAdmin} tipo={tipo} />

      {/* ── Recomendaciones antes de contratar ── */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-5">Planeación</p>
            <h2 className="font-bold text-white leading-[1.05] mb-5" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>
              Detalles que aseguran una producción impecable.
            </h2>
            <p className="text-white/40 text-sm sm:text-base leading-relaxed max-w-2xl mb-14">
              Definir estos puntos con anticipación nos permite diseñar la propuesta más precisa para tu evento. Si aún no los tienes resueltos, los trabajamos juntos durante el descubrimiento.
            </p>
          </R>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {c.recomendaciones.map((rec, i) => (
              <R key={i} delay={i * 70}>
                <div className="flex items-start gap-5 p-6 rounded-2xl h-full"
                     style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="shrink-0 font-mono text-lg" style={{ color: GOLD, letterSpacing: "0.06em" }}>{String(i + 1).padStart(2, "0")}</span>
                  <p className="text-white/70 text-sm sm:text-base leading-relaxed">{rec}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Qué necesitamos para cotizar ── */}
      <section className="py-32 px-6 bg-[#060606]">
        <div className="max-w-5xl mx-auto grid md:grid-cols-[0.9fr_1.1fr] gap-12 items-start">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-5">Descubrimiento</p>
            <h2 className="font-bold text-white leading-[1.05] mb-5" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>
              El primer paso hacia tu cotización.
            </h2>
            <p className="text-white/40 text-sm leading-relaxed mb-8">
              Todo comienza conociendo tu evento. Con estos datos preparamos una propuesta a la medida; el resto del proceso —cotización, presentación y cierre— lo recorremos contigo paso a paso.
            </p>
            <button onClick={() => abrirDescubrimiento(null)}
                    className="px-8 py-4 rounded-full font-semibold text-black text-sm tracking-wide transition-all hover:scale-105"
                    style={{ background: GOLD }}>
              Iniciar descubrimiento
            </button>
          </R>
          <R delay={120}>
            <ul className="space-y-3">
              {c.cotizar.map((item, i) => (
                <li key={i} className="flex items-start gap-4 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(179,152,91,0.14)", border: `1px solid ${GOLD}55` }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                  <span className="text-white/70 text-sm">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-white/25 text-xs mt-5 text-center">Con esto te devolvemos propuesta técnica en menos de 24 horas.</p>
          </R>
        </div>
      </section>

      {/* ── Galería completa ── */}
      <GaleriaCompleta slug={tipo} fotos={fotos} tipoId={tipoId} setTipoId={setTipoId} isAdmin={isAdmin} recargar={recargar} />

      {/* ── Inventario ── */}
      <section className="px-6 pb-8">
        <div className="max-w-5xl mx-auto">
          <R>
            <a href="/presentacion/inventario"
               className="group block rounded-3xl overflow-hidden relative"
               style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="p-10 sm:p-14 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
                   style={{ background: "linear-gradient(120deg, rgba(179,152,91,0.08), rgba(255,255,255,0.02))" }}>
                <div>
                  <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-4">Inventario</p>
                  <h3 className="font-bold text-white mb-3" style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", letterSpacing: "-0.02em" }}>
                    Explora el equipo con el que trabajamos.
                  </h3>
                  <p className="text-white/45 text-sm max-w-lg leading-relaxed">
                    Audio, iluminación y video profesional — catálogo completo con marcas, disponibilidad y precios de renta.
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold px-6 py-3.5 rounded-full transition-all group-hover:scale-105"
                      style={{ background: GOLD, color: "#000" }}>
                  Ver inventario →
                </span>
              </div>
            </a>
          </R>
        </div>
      </section>

      {/* ── Cierre: descubrimiento + contacto ── */}
      <section id="contacto" className="py-32 px-6">
        <div className="max-w-2xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-4 text-center">El siguiente paso</p>
            <h2 className="font-bold text-white text-center mb-3" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>
              {c.cta}
            </h2>
            <p className="text-white/40 text-center mb-8 text-sm leading-relaxed">{c.ctaSub}</p>
            <div className="flex justify-center mb-12">
              <button onClick={() => abrirDescubrimiento(null)}
                      className="px-9 py-4 rounded-full font-semibold text-black text-sm tracking-wide transition-all hover:scale-105"
                      style={{ background: GOLD }}>
                Iniciar descubrimiento
              </button>
            </div>
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-white/25 text-xs tracking-wide">o escríbenos directo</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
          </R>
          <ContactForm tipo={tipo} />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-white/[0.04] text-center">
        <p className="text-white/18 text-xs tracking-wide">
          © {new Date().getFullYear()} Mainstage Pro · Producción audiovisual profesional
        </p>
      </footer>

      {discOpen && (
        <DiscoveryModal tipo={tipo} servicio={discServicio} loading={discLoading}
                        onConfirm={confirmarDescubrimiento} onClose={() => { if (!discLoading) setDiscOpen(false); }} />
      )}
    </div>
  );
}
