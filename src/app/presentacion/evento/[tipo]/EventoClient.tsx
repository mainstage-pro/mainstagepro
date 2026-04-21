"use client";
import { useEffect, useRef, useState } from "react";

const GOLD = "#B3985B";
const WA   = "https://wa.me/524461432565?text=Hola%2C%20me%20gustar%C3%ADa%20obtener%20informaci%C3%B3n%20sobre%20producci%C3%B3n%20para%20mi%20evento.";

// ─── Config por tipo de evento ────────────────────────────────────────────────
type EventoTipo = "musical" | "social" | "empresarial";

const CONFIG = {
  musical: {
    label:        "Eventos Musicales",
    hero:         "/images/presentacion/ev-m-hero.jpg",
    heroAlt:      "Festival producido por Mainstage Pro",
    heroTagline:  "El show bien producido\nno se nota. Solo se siente.",
    heroSub:      "Rider cubierto, soundcheck sin carreras, operadores con experiencia en vivo. Así trabaja Mainstage Pro.",
    stmt1:        "No es técnica.",
    stmt2:        "Es el escenario que\nel show necesita.",
    stmtBody:     "Un show bien producido no se nota — simplemente sucede. Audio, iluminación y video en un solo servicio, operado por gente que conoce el equipo.",
    tipos:        "Festivales · Conciertos · DJ Sets · Showcases · Presentaciones en vivo · Raves · Fiestas privadas",
    caps: [
      {
        icon: "◎", title: "Audio en vivo", img: "/images/presentacion/ev-m-01.jpg",
        headline: "Sonido uniforme de frente a fondo, sin puntos muertos.",
        body: "Line arrays calibrados para el espacio, subwoofers bien ubicados, monitores en tarima. La frecuencia llega igual en la primera fila y en el fondo del venue — sin distorsión, sin retroalimentación.",
      },
      {
        icon: "◈", title: "Iluminación", img: "/images/presentacion/ev-m-05.jpg",
        headline: "Producción de luz construida para el mood del show.",
        body: "Cabezas móviles, beams, strobes y efectos especiales operados en vivo desde consola. Cada escena programada antes del evento para llegar con el cue listo en cada momento del set.",
      },
      {
        icon: "⬡", title: "DJ Setup", img: "/images/presentacion/ev-m-04.jpg",
        headline: "El rider cubierto antes de que llegue el artista.",
        body: "CDJs, mezcladora y booth de referencia — la cadena de señal que los DJs exigen en su rider. Verificado, calibrado y en punto antes del soundcheck, sin depender de que el artista llegue a resolver.",
      },
      {
        icon: "▣", title: "Video y LED", img: "/images/presentacion/ev-m-06.jpg",
        headline: "Pantallas, señal de video y contenido estable durante todo el show.",
        body: "Pantallas LED bien posicionadas, procesador de video y señal sin cortes. Resolución y brillo correctos para el espacio. Compatible con el contenido visual del artista o del booking.",
      },
    ],
    gallery: [
      { src: "/images/presentacion/musicales/Musicales-016.jpg",                      caption: "Producción completa en vivo" },
      { src: "/images/presentacion/musicales/Musicales-037.jpg",                      caption: "Iluminación · Show en escenario" },
      { src: "/images/presentacion/musicales/Musicales-076.jpg",                      caption: "DJ Set · Equipo profesional" },
      { src: "/images/presentacion/musicales/MAGIC_ROOM_260307_GUANAJUATO_078.jpg",   caption: "Festival · Guanajuato" },
      { src: "/images/presentacion/musicales/Musicales-055.jpg",                      caption: "Producción de luz · Efectos especiales" },
      { src: "/images/presentacion/musicales/Afrodise-59.jpg",                        caption: "Stage completo · Noche" },
      { src: "/images/presentacion/musicales/DSC07491.jpg",                           caption: "En vivo · Operación técnica" },
      { src: "/images/presentacion/musicales/Musicales-126.jpg",                      caption: "Show · Producción audiovisual" },
    ],
    why: [
      { icon: "star",   title: "Equipo 100% propio — sin intermediarios",   body: "Todo lo que aparece en tu rider o propuesta es nuestro. No subcontratamos ni rentamos de terceros. Eso nos da control total sobre lo que entregamos — en calidad y en tiempos." },
      { icon: "people", title: "Operadores formados en eventos en vivo",      body: "Nuestros ingenieros conocen el equipo porque lo usan en cada show. Cada cue está pensado de antemano. No improvisamos en vivo cuando hay artista en tarima." },
      { icon: "clock",  title: "Montaje con margen — sin carreras de último minuto", body: "Llegamos con tiempo suficiente para montar, calibrar y hacer soundcheck antes de que llegue el público. Si algo no funciona bien, lo resolvemos antes del show — no durante." },
      { icon: "check",  title: "Una sola fuente de responsabilidad",          body: "No coordinas a audio, luces y video por separado. Nosotros llevamos todo y lo operamos. Cualquier decisión técnica en el evento pasa por nosotros." },
      { icon: "map",    title: "Visitamos el venue cuando el proyecto lo requiere", body: "Para shows con mayor escala técnica, levantamos un reporte del espacio antes de cotizar — instalación eléctrica, acústica y accesos. La propuesta que recibes está basada en condiciones reales." },
    ],
    cta: "La producción está lista. Solo falta confirmar la fecha.",
    ctaSub: "Cuéntanos sobre el artista y el venue — te respondemos en menos de 24 horas.",
  },
  social: {
    label:       "Eventos Sociales",
    hero:        "/images/presentacion/ev-s-hero.jpg",
    heroAlt:     "Boda producida por Mainstage Pro",
    heroTagline: "Los momentos que importan\ncon la producción que merecen.",
    heroSub:     "Brindis, primer baile, entrada — cada instante con su atmósfera. Cuando la técnica funciona, los invitados solo disfrutan.",
    stmt1:       "No es producción.",
    stmt2:       "Es el ambiente que hace\nque los momentos se recuerden.",
    stmtBody:    "Los eventos sociales se recuerdan por cómo se sintieron. Audio claro, luz bien pensada, DJ con todo en punto — los invitados simplemente disfrutan.",
    tipos:       "Bodas · XV Años · Cocteles · Cumpleaños · Graduaciones · Aniversarios · Fiestas privadas",
    caps: [
      {
        icon: "◎", title: "Audio", img: "/images/presentacion/ev-s-04.jpg",
        headline: "Se escucha bien en cada mesa, sin esfuerzo ni distorsión.",
        body: "Micrófonos inalámbricos para el brindis, la ceremonia y los discursos — sin retroalimentación. La música suena a buen volumen en la pista y a la distancia correcta en las mesas. Todo calibrado antes del primer invitado.",
      },
      {
        icon: "◈", title: "Iluminación", img: "/images/presentacion/ev-s-01.jpg",
        headline: "Ambiente cálido para la cena, vibrante para la pista.",
        body: "Pares LED, cabezas móviles y efectos programados para cada momento de la noche. La luz cambia de forma gradual y natural — del ambiente de cena a la energía de la pista — sin cortes bruscos ni improvisaciones.",
      },
      {
        icon: "⬡", title: "Setup DJ", img: "/images/presentacion/ev-s-02.jpg",
        headline: "El DJ llega y empieza — sin perder tiempo en configuraciones.",
        body: "Tornamesas, mezcladora y señal verificados antes del inicio del evento. El equipo está calibrado y listo para que el DJ pueda empezar sin contratiempos desde el primer momento.",
      },
      {
        icon: "▣", title: "Pantallas y video", img: "/images/presentacion/ev-s-03.jpg",
        headline: "Para la ceremonia, el video y los momentos especiales.",
        body: "Pantallas bien posicionadas para que todos los invitados vean sin esfuerzo. Señal estable para fotos en vivo, video del evento o contenido especial. Compatible con lo que tu fotógrafo o videógrafo necesiten.",
      },
    ],
    gallery: [
      { src: "/images/presentacion/sociales/s-dj-salon.png",          caption: "El ambiente que recordarán" },
      { src: "/images/presentacion/sociales/s-hacienda-iluminada.jpg", caption: "Hacienda · Iluminación dramática" },
      { src: "/images/presentacion/sociales/s-boda-colonial.jpg",      caption: "Boda · Venue colonial · DJ booth mármol" },
      { src: "/images/presentacion/sociales/s-piano-pista.jpg",        caption: "Piano · Pista espejada · Jardín nocturno" },
      { src: "/images/presentacion/sociales/s-boda-elegante.jpg",      caption: "Boda elegante · Producción exterior" },
      { src: "/images/presentacion/sociales/s-hacienda-aerea.jpg",     caption: "Vista aérea · Iluminación completa" },
    ],
    why: [
      { icon: "star",   title: "Equipo propio — llegamos con lo que confirmamos",  body: "No subcontratamos ni rentamos de terceros. Todo lo que ves en la propuesta es nuestro. Llegamos con lo que se confirmó, sin sorpresas de último momento." },
      { icon: "people", title: "Nos alineamos con tu equipo desde antes del evento", body: "Coordinamos con decoración, venue, fotógrafo y videógrafo para que todo conviva sin fricciones. El protagonismo es del evento y de los festejados — no nuestro." },
      { icon: "clock",  title: "Conocemos el programa al detalle",                  body: "Brindis, primer baile, vals, corte de pastel — revisamos el programa contigo con anticipación. Llegamos preparados para cada momento clave de la noche." },
      { icon: "check",  title: "Una sola fuente de responsabilidad",                body: "Audio, luz, video y operadores en un solo servicio. No coordinas a cinco proveedores. Si algo pasa durante el evento, nosotros lo resolvemos." },
      { icon: "map",    title: "Visitamos el venue cuando el proyecto lo requiere",  body: "Para eventos en espacios no convencionales o con requerimientos técnicos específicos, levantamos un reporte antes de cotizar — instalación eléctrica, acústica y accesos. Nada de sorpresas." },
    ],
    cta: "Asegura la fecha. El resto lo coordinamos nosotros.",
    ctaSub: "Cuéntanos sobre tu evento — fecha, venue y lo que tienes en mente. Te respondemos rápido.",
  },
  empresarial: {
    label:       "Eventos Empresariales",
    hero:        "/images/presentacion/ev-e-hero.jpg",
    heroAlt:     "Evento corporativo producido por Mainstage Pro",
    heroTagline: "La técnica que no falla\nes parte del mensaje.",
    heroSub:     "Audio desde el primer orador, pantallas bien ubicadas, señal estable. Cuando la producción funciona, tu empresa se ve bien.",
    stmt1:       "No es logística.",
    stmt2:       "Es la imagen de tu empresa\nen cada detalle técnico.",
    stmtBody:    "Un audio que falla distrae. Una pantalla mal ubicada resta. En un evento corporativo, la técnica forma parte del mensaje — y eso es responsabilidad nuestra.",
    tipos:       "Conferencias · Congresos · Lanzamientos · Activaciones · Networking · Inauguraciones · Fiestas corporativas",
    caps: [
      {
        icon: "◎", title: "Audio y micrófonos", img: "/images/presentacion/ev-e-01.jpg",
        headline: "El orador se escucha claro desde cualquier punto del salón.",
        body: "Micrófonos de solapa, headset o de mano — sin retroalimentación, sin cortes. La consola es operada durante toda la conferencia para que el volumen sea consistente y profesional en todo momento.",
      },
      {
        icon: "◈", title: "Iluminación", img: "/images/presentacion/ev-e-05.jpg",
        headline: "Ambiente profesional acorde al tono de tu empresa.",
        body: "Luz cálida y uniforme para las presentaciones, dinámica para los lanzamientos, elegante para las cenas y premiaciones. La iluminación refuerza el mensaje — no lo distrae.",
      },
      {
        icon: "⬡", title: "Pantallas y video", img: "/images/presentacion/ev-e-02.jpg",
        headline: "Tu presentación en pantalla, sin fallas técnicas.",
        body: "Pantallas bien posicionadas, procesador de señal y resolución adecuada al espacio. Compatible con laptops, HDMI, transmisiones en vivo y contenido de tu agencia. Probado antes de que lleguen los asistentes.",
      },
      {
        icon: "▣", title: "Cierre y networking", img: "/images/presentacion/ev-e-04.jpg",
        headline: "Música de ambiente o DJ para el cierre del evento.",
        body: "Señal de audio limpia para reproducción en contexto corporativo, o equipo completo de DJ para el networking y la celebración del cierre. Misma calidad técnica, mismo nivel de atención.",
      },
    ],
    gallery: [
      { src: "/images/presentacion/empresariales/e-sala-pantallas.jpg",    caption: "Experiencias que generan impacto" },
      { src: "/images/presentacion/empresariales/e-auditorio.jpg",         caption: "Auditorio · Producción completa" },
      { src: "/images/presentacion/empresariales/e-carpa-led.jpg",         caption: "Evento exterior · Pantalla LED" },
      { src: "/images/presentacion/empresariales/e-networking.jpg",        caption: "Networking · Ambiente corporativo" },
      { src: "/images/presentacion/empresariales/e-edificio-azul.jpg",     caption: "Inauguración · Iluminación arquitectónica" },
      { src: "/images/presentacion/empresariales/e-proyeccion-mural.jpg",  caption: "Proyección artística · Evento exclusivo" },
    ],
    why: [
      { icon: "star",   title: "Equipo propio — control total sobre lo que entregamos", body: "No subcontratamos ni rentamos de terceros. Eso significa que controlamos la calidad, los tiempos y la respuesta ante cualquier imprevisto — crítico cuando la imagen de tu empresa está en juego." },
      { icon: "people", title: "Puntuales, ordenados y en segundo plano",               body: "Llegamos antes de tiempo, montamos con orden y nos mantenemos discretos durante el evento. Somos parte de tu equipo ese día — sin protagonismo, sin fricciones." },
      { icon: "clock",  title: "Trabajamos con tu coordinador o agencia",               body: "Si ya tienes coordinador de evento o agencia creativa, nos alineamos con ellos desde la planeación. Sin egos, sin duplicar trabajo, sin sorpresas el día del evento." },
      { icon: "check",  title: "Un solo proveedor para todo lo técnico",                body: "Audio, luz, video y operadores en un solo contrato. Cualquier decisión técnica pasa por nosotros — no por cinco proveedores que no se coordinan entre sí." },
      { icon: "map",    title: "Visitamos el venue cuando el proyecto lo requiere",      body: "Para eventos en espacios no convencionales, hacemos un levantamiento técnico antes de cotizar — instalación eléctrica, acústica del espacio y accesos de logística. La propuesta que recibes refleja condiciones reales." },
    ],
    cta: "Confirmemos los detalles técnicos con tiempo suficiente.",
    ctaSub: "Cuéntanos sobre el evento y el espacio. Preparamos una propuesta técnica a la medida.",
  },
} satisfies Record<EventoTipo, {
  label: string; hero: string; heroAlt: string; heroTagline: string; heroSub: string;
  stmt1: string; stmt2: string; stmtBody: string; tipos: string;
  caps: { icon: string; title: string; img: string; headline: string; body: string }[];
  gallery: { src: string; caption: string }[];
  why: { icon: string; title: string; body: string }[];
  cta: string; ctaSub: string;
}>;

// ─── Extra config: problemas, stats, beneficios, proceso ──────────────────────
const EXTRA = {
  musical: {
    propuestaValor: "El show técnicamente perfecto — sin que tú tengas que resolver nada.",
    propuestaDetalle: "Mainstage Pro entrega el escenario completo: audio calibrado, luces programadas y video en punto — para que el artista suba a un stage listo y tú puedas estar en otra cosa.",
    stats: [
      { num: "100%", label: "Equipo propio, cero intermediarios" },
      { num: "24h", label: "Propuesta técnica garantizada" },
      { num: "1", label: "Solo contacto para todo lo técnico" },
    ],
    problemas: [
      {
        titulo: "El proveedor llega y el equipo no es el que confirmaron",
        desc: "Con Mainstage Pro, lo que está en la propuesta es lo que llega. Todo es equipo propio — no rentamos, no subcontratamos. Sin sorpresas.",
      },
      {
        titulo: "El soundcheck se alarga y el show arranca tarde",
        desc: "Llegamos con margen suficiente para montar, calibrar y resolver antes del artista. El soundcheck empieza cuando el técnico del artista llega, no cuando nosotros terminamos de conectar cables.",
      },
      {
        titulo: "Audio, luces y video no se coordinan entre sí",
        desc: "Un solo equipo opera todo. Las cues de audio, luz y video están programadas en conjunto — el show fluye como una producción, no como tres proveedores sueltos.",
      },
    ],
    proceso: [
      { paso: "01", titulo: "Briefing técnico", desc: "Nos compartes el rider del artista, el venue y la fecha. En 24 horas tienes una propuesta técnica punto por punto." },
      { paso: "02", titulo: "Propuesta y confirmación", desc: "Revisamos el rider juntos, ajustamos lo necesario y confirmamos. Un solo contrato cubre todo." },
      { paso: "03", titulo: "Levantamiento técnico", desc: "Para shows de mayor escala, visitamos el venue — eléctrica, acústica, accesos y montaje. La producción no improvisa." },
      { paso: "04", titulo: "Montaje con margen", desc: "Llegamos con tiempo. Montamos, calibramos y verificamos antes del soundcheck — sin carreras, sin cables sueltos." },
      { paso: "05", titulo: "Operación en vivo", desc: "Operadores en consola durante todo el show. Cada cue en el momento correcto. Cualquier imprevisto lo resolvemos nosotros." },
    ],
  },
  social: {
    propuestaValor: "La atmósfera que hace que los momentos se recuerden — sin que tú te preocupes por la técnica.",
    propuestaDetalle: "En un evento social, los detalles técnicos no deberían ser tu problema. Mainstage Pro coordina con venue, decoración y fotógrafo para que todo conviva sin fricción — tú disfruta.",
    stats: [
      { num: "100%", label: "Equipo propio, sin improviso" },
      { num: "24h", label: "Propuesta personalizada" },
      { num: "1", label: "Un solo coordinador para todo" },
    ],
    problemas: [
      {
        titulo: "El audio del brindis se retroalimenta o se escucha mal en las mesas",
        desc: "Micrófonos inalámbricos operados por un técnico dedicado — calibrados para el venue, sin feedback, con volumen uniforme en todo el salón.",
      },
      {
        titulo: "La luz cambia de golpe y rompe el ambiente de la cena",
        desc: "Cada transición de luz está programada con anticipación — de la cena al vals, del vals a la pista. Los cambios son graduales y naturales.",
      },
      {
        titulo: "El DJ llega y pierde tiempo configurando equipo",
        desc: "Setup listo antes de que el DJ llegue. CDJs, mezcladora y booth verificados — el DJ conecta y empieza sin contratiempos.",
      },
    ],
    proceso: [
      { paso: "01", titulo: "Cotización en 24 horas", desc: "Compártenos la fecha, el venue y lo que tienes en mente. Propuesta personalizada en menos de un día." },
      { paso: "02", titulo: "Revisión del programa", desc: "Revisamos juntos cada momento clave — brindis, primer baile, vals, pastel. Llegamos preparados para cada uno." },
      { paso: "03", titulo: "Coordinación con proveedores", desc: "Nos alineamos con decoración, venue, fotógrafo y videógrafo. Todo convive sin fricciones el día del evento." },
      { paso: "04", titulo: "Montaje antes del evento", desc: "Llegamos con tiempo suficiente para instalar y calibrar antes de los primeros invitados. Sin carreras." },
      { paso: "05", titulo: "Operación discreta", desc: "Técnicos en cabina durante todo el evento. El protagonismo es de los festejados — no de nosotros." },
    ],
  },
  empresarial: {
    propuestaValor: "Producción técnica que no falla — porque la imagen de tu empresa no puede fallar.",
    propuestaDetalle: "Un audio que se corta o una pantalla mal ubicada no es un problema técnico: es un problema de imagen. Mainstage Pro garantiza que lo técnico sea invisible para tu audiencia.",
    stats: [
      { num: "100%", label: "Equipo propio, control total" },
      { num: "24h", label: "Propuesta técnica a la medida" },
      { num: "1", label: "Proveedor para todo lo AV" },
    ],
    problemas: [
      {
        titulo: "El audio falla en mitad de la presentación del CEO",
        desc: "Técnico dedicado en consola durante toda la conferencia — micrófonos operados, volumen consistente y backup listo para cualquier imprevisto.",
      },
      {
        titulo: "La presentación no carga o la señal de video se congela",
        desc: "Conexión verificada antes del evento, procesador de señal estabilizado y prueba con la laptop del presentador. Llegamos con tiempo para resolver — no durante.",
      },
      {
        titulo: "Cinco proveedores técnicos que no se coordinan entre sí",
        desc: "Audio, iluminación, video y operadores en un solo contrato. Un punto de contacto. Una responsabilidad. Sin fricciones.",
      },
    ],
    proceso: [
      { paso: "01", titulo: "Brief técnico del evento", desc: "Compártenos el programa, el espacio y los objetivos. Propuesta técnica y económica en 24 horas." },
      { paso: "02", titulo: "Alineación con tu equipo", desc: "Coordinamos con tu coordinador, agencia creativa y venue desde la planeación. Sin duplicar trabajo." },
      { paso: "03", titulo: "Levantamiento del venue", desc: "Para espacios no convencionales, visitamos antes — eléctrica, acústica, accesos. La propuesta refleja condiciones reales." },
      { paso: "04", titulo: "Montaje puntual y ordenado", desc: "Llegamos antes del tiempo. Montaje limpio, sin obstruir el espacio. Discretos y profesionales en todo momento." },
      { paso: "05", titulo: "Operación sin interrupciones", desc: "Técnicos en posición durante toda la conferencia o evento. Cualquier ajuste técnico se resuelve sin que tu audiencia lo note." },
    ],
  },
};

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

function useScrollHeader() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true }); fn();
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return scrolled;
}

function R({ children, delay = 0, y = 40, className = "" }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
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

function WhyIcon({ type }: { type: string }) {
  const cls = "text-[#B3985B]";
  if (type === "star") return <svg className={cls} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
  if (type === "people") return <svg className={cls} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if (type === "clock") return <svg className={cls} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
  if (type === "map") return <svg className={cls} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
  return <svg className={cls} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}

// ─── Cinematic Gallery ───────────────────────────────────────────────────────
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
      if (p >= 1) {
        clearInterval(iv);
        setLeaving(true);
        setTimeout(() => setIdx(i => (i + 1) % photos.length), 900);
      }
    }, 40);
    return () => clearInterval(iv);
  }, [idx, photos.length]);

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "78vh", minHeight: "520px" }}>
      {photos.map((p, i) => {
        const isActive  = i === idx;
        const isLeaving = leaving && i === (idx - 1 + photos.length) % photos.length;
        return (
          <div key={i} className="absolute inset-0"
               style={{
                 opacity: isActive ? 1 : isLeaving ? 0 : 0,
                 transition: isActive ? "opacity 1.6s ease" : "opacity 1s ease",
                 zIndex: isActive ? 2 : 0,
               }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.src} alt={p.caption} draggable={false}
                 className="w-full h-full object-cover"
                 style={{ animation: isActive ? "kenBurns 10s ease forwards" : "none" }} />
          </div>
        );
      })}

      {/* Bottom gradient */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: "linear-gradient(to top, rgba(8,8,8,0.85) 0%, rgba(8,8,8,0.2) 40%, transparent 100%)", zIndex: 3 }} />

      {/* Caption + progress */}
      <div className="absolute bottom-0 left-0 right-0 px-8 sm:px-16 pb-8" style={{ zIndex: 4 }}>
        <div className="flex items-end justify-between mb-4">
          <p className="text-white/60 text-sm tracking-wide">{photos[idx].caption}</p>
          <p className="text-white/25 text-xs font-mono">{String(idx + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}</p>
        </div>
        <div className="relative h-px w-full bg-white/10">
          <div className="absolute inset-y-0 left-0 bg-[#B3985B]"
               style={{ width: `${progress * 100}%`, transition: "width 0.08s linear" }} />
        </div>
      </div>

      {/* Dot nav */}
      <div className="absolute top-6 right-8 flex gap-2.5 items-center" style={{ zIndex: 4 }}>
        {photos.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width:   i === idx ? "22px" : "6px",
                    height:  "6px",
                    background: i === idx ? GOLD : "rgba(255,255,255,0.2)",
                  }} />
        ))}
      </div>

      {/* Arrow nav */}
      <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 pointer-events-none" style={{ zIndex: 4 }}>
        <button className="pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}
                onClick={() => setIdx(i => (i - 1 + photos.length) % photos.length)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button className="pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}
                onClick={() => setIdx(i => (i + 1) % photos.length)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  );
}

// ─── Contact Form ─────────────────────────────────────────────────────────────
function ContactForm({ tipo }: { tipo: EventoTipo }) {
  const tipoLabel = { musical: "Musical", social: "Social", empresarial: "Empresarial" }[tipo];
  const [form, setForm] = useState({ nombre: "", telefono: "", fechaEstimada: "", presupuesto: "", mensaje: "" });
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
    const url = `https://wa.me/524461432565?text=${encodeURIComponent(lines)}`;
    window.open(url, "_blank");
    setSent(true);
  }

  const inputCls = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#B3985B]/60 transition-colors";

  if (sent) return (
    <div className="text-center py-12">
      <p className="text-[#B3985B] text-3xl mb-4">✓</p>
      <p className="text-white font-semibold mb-2">Listo — WhatsApp abierto</p>
      <p className="text-white/40 text-sm">Te responderemos a la brevedad con disponibilidad y costos.</p>
      <button onClick={() => setSent(false)} className="mt-6 text-white/30 text-xs hover:text-white/60 transition-colors">
        Enviar otra consulta
      </button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-white/40 text-xs mb-1.5 tracking-wide">Nombre *</label>
          <input required className={inputCls} placeholder="Tu nombre" value={form.nombre} onChange={e => set("nombre", e.target.value)} />
        </div>
        <div>
          <label className="block text-white/40 text-xs mb-1.5 tracking-wide">Tipo de evento</label>
          <input readOnly className={`${inputCls} opacity-50 cursor-default`} value={`Evento ${tipoLabel}`} />
        </div>
        <div>
          <label className="block text-white/40 text-xs mb-1.5 tracking-wide">Fecha estimada</label>
          <input type="date" className={inputCls} value={form.fechaEstimada} onChange={e => set("fechaEstimada", e.target.value)} />
        </div>
        <div>
          <label className="block text-white/40 text-xs mb-1.5 tracking-wide">Presupuesto aproximado</label>
          <input className={inputCls} placeholder="Ej: $50,000 MXN" value={form.presupuesto} onChange={e => set("presupuesto", e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-white/40 text-xs mb-1.5 tracking-wide">Cuéntanos más (opcional)</label>
        <textarea rows={3} className={inputCls} placeholder="Venue, capacidad, tipo de servicio que necesitas…" value={form.mensaje} onChange={e => set("mensaje", e.target.value)} />
      </div>
      <button type="submit"
        className="w-full flex items-center justify-center gap-3 py-4 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: GOLD }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Enviar por WhatsApp
      </button>
      <p className="text-white/20 text-xs text-center">Al enviar se abrirá WhatsApp con tu mensaje listo para mandar.</p>
    </form>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function EventoClient({ tipo }: { tipo: EventoTipo }) {
  const c = CONFIG[tipo];
  const x = EXTRA[tipo];
  const scrolled = useScrollHeader();

  return (
    <div className="bg-[#080808] text-white min-h-screen"
         style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      <style>{`
        @keyframes kenBurns {
          from { transform: scale(1) translate(0, 0); }
          to   { transform: scale(1.07) translate(-1.2%, -0.6%); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #080808; }
        ::-webkit-scrollbar-thumb { background: rgba(179,152,91,0.35); border-radius: 2px; }
      `}</style>

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 transition-all duration-500"
           style={{
             background:    scrolled ? "rgba(8,8,8,0.96)" : "transparent",
             backdropFilter: scrolled ? "blur(16px)" : "none",
             borderBottom:  scrolled ? "1px solid rgba(255,255,255,0.04)" : "none",
           }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
          <a href="/presentacion/servicios">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-white.png" alt="Mainstage Pro" className="h-7 object-contain" draggable={false} />
          </a>
          <div className="flex items-center gap-6">
            <a href="/presentacion/inventario"
               className="text-white/35 text-xs tracking-wide hidden sm:block hover:text-white/60 transition-colors">
              Inventario
            </a>
            <a href={WA} target="_blank" rel="noopener noreferrer"
               className="text-xs font-semibold tracking-[0.14em] uppercase px-5 py-2.5 rounded-full transition-all duration-300 hover:opacity-85"
               style={{ background: GOLD, color: "#000" }}>
              Contactar
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.hero} alt={c.heroAlt} draggable={false}
               className="w-full h-full object-cover"
               style={{ animation: "kenBurns 16s ease forwards" }} />
          <div className="absolute inset-0"
               style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.2) 0%, rgba(8,8,8,0.45) 40%, rgba(8,8,8,0.88) 75%, #080808 100%)" }} />
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <p className="text-[#B3985B] text-xs font-semibold tracking-[0.3em] uppercase mb-7"
             style={{ animation: "fadeUp 0.8s ease forwards 0.2s", opacity: 0 }}>
            Mainstage Pro · {c.label}
          </p>
          <h1 className="font-bold text-white leading-[1.02]"
              style={{
                fontSize: "clamp(2.8rem,8vw,7rem)",
                letterSpacing: "-0.03em",
                whiteSpace: "pre-line",
                animation: "fadeUp 0.95s ease forwards 0.4s",
                opacity: 0,
              }}>
            {c.heroTagline}
          </h1>
          <p className="text-white/50 mt-9 leading-relaxed max-w-2xl mx-auto"
             style={{ fontSize: "clamp(1rem, 1.8vw, 1.15rem)", animation: "fadeUp 0.95s ease forwards 0.65s", opacity: 0 }}>
            {c.heroSub}
          </p>
          <div className="mt-11 flex flex-col sm:flex-row items-center justify-center gap-4"
               style={{ animation: "fadeUp 0.95s ease forwards 0.88s", opacity: 0 }}>
            <a href={WA} target="_blank" rel="noopener noreferrer"
               className="px-9 py-4 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-lg"
               style={{ background: GOLD }}>
              {c.cta}
            </a>
            <a href="#galeria" className="text-white/40 text-sm hover:text-white/70 transition-colors">
              Ver galería →
            </a>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-25">
          <div className="w-px h-12 bg-gradient-to-b from-white/50 to-transparent" />
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-0 px-6 bg-[#060606]">
        <div className="max-w-5xl mx-auto border-b border-white/[0.04]">
          <div className="grid grid-cols-3 divide-x divide-white/[0.04] py-10">
            {x.stats.map((s, i) => (
              <R key={i} delay={i * 120}>
                <div className="text-center px-6">
                  <p className="font-bold text-white leading-none mb-2"
                     style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.03em", color: GOLD }}>{s.num}</p>
                  <p className="text-white/35 text-xs leading-snug">{s.label}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* Propuesta de valor */}
      <section className="py-28 px-6 bg-[#060606]">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.24em] uppercase mb-5">Propuesta de valor</p>
            <h2 className="font-bold text-white leading-[1.04] mb-7"
                style={{ fontSize: "clamp(2rem,5vw,4rem)", letterSpacing: "-0.025em" }}>
              {x.propuestaValor}
            </h2>
            <p className="text-white/45 max-w-2xl leading-relaxed"
               style={{ fontSize: "clamp(0.95rem, 1.6vw, 1.1rem)" }}>
              {x.propuestaDetalle}
            </p>
          </R>
        </div>
      </section>

      {/* Problemas que resolvemos */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.24em] uppercase mb-5">Problemas que resolvemos</p>
            <h2 className="font-bold text-white leading-tight mb-16"
                style={{ fontSize: "clamp(2rem,5vw,4rem)", letterSpacing: "-0.025em" }}>
              Lo que otros dejan<br />
              <span style={{ color: GOLD }}>sin resolver.</span>
            </h2>
          </R>
          <div className="space-y-5">
            {x.problemas.map((p, i) => (
              <R key={i} delay={i * 100}>
                <div className="rounded-2xl p-7 flex gap-6"
                     style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
                       style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}25` }}>
                    <span style={{ color: GOLD, fontSize: "0.65rem", fontWeight: 700 }}>{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-2 leading-snug"
                        style={{ fontSize: "clamp(0.95rem, 1.5vw, 1.05rem)" }}>
                      ❝ {p.titulo}
                    </h4>
                    <p className="text-white/45 text-sm leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* Statement */}
      <section className="py-36 px-6">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B]/55 text-2xl font-light mb-3 italic">{c.stmt1}</p>
            <h2 className="font-bold text-white leading-[1.04]"
                style={{ fontSize: "clamp(2rem,5vw,4rem)", letterSpacing: "-0.025em", whiteSpace: "pre-line" }}>
              {c.stmt2}
            </h2>
            <p className="text-white/45 mt-9 max-w-2xl leading-relaxed"
               style={{ fontSize: "clamp(1rem, 1.8vw, 1.15rem)" }}>
              {c.stmtBody}
            </p>
          </R>
          <R delay={200}>
            <p className="text-white/20 text-xs tracking-[0.18em] uppercase mt-12 border-t border-white/[0.05] pt-6">
              {c.tipos}
            </p>
          </R>
        </div>
      </section>

      {/* Capacidades */}
      <section className="py-24 px-6 bg-[#060606]">
        <div className="max-w-6xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.24em] uppercase mb-5">Lo que llevamos a tu evento</p>
            <h2 className="font-bold text-white leading-tight mb-16"
                style={{ fontSize: "clamp(2rem,5vw,4rem)", letterSpacing: "-0.025em" }}>
              Audio, iluminación,{" "}
              <span style={{ color: GOLD }}>DJ y video —</span>
              <br />en un solo servicio.
            </h2>
          </R>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {c.caps.map((cap, i) => (
              <R key={cap.title} delay={i * 90}>
                <div className="group rounded-2xl overflow-hidden h-full flex flex-col cursor-default"
                     style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", transition: "border-color 0.3s" }}
                     onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${GOLD}30`; }}
                     onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)"; }}>
                  {/* Photo */}
                  <div className="relative overflow-hidden" style={{ height: "220px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cap.img} alt={cap.title} draggable={false}
                         className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-black/10" />
                    <div className="absolute bottom-4 left-5 flex items-center gap-2.5">
                      <span className="text-[#B3985B] text-base font-light">{cap.icon}</span>
                      <span className="text-white font-semibold text-sm tracking-wide">{cap.title}</span>
                    </div>
                  </div>
                  {/* Text */}
                  <div className="p-6 flex-1">
                    <h4 className="font-semibold text-white mb-3 leading-snug" style={{ fontSize: "0.95rem" }}>{cap.headline}</h4>
                    <p className="text-white/40 text-sm leading-relaxed">{cap.body}</p>
                  </div>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section id="galeria" className="pt-0 pb-0">
        <CinematicGallery photos={c.gallery} />
      </section>

      {/* Proceso de trabajo */}
      <section className="py-32 px-6 bg-[#060606]">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.24em] uppercase mb-5">Proceso de trabajo</p>
            <h2 className="font-bold text-white leading-tight mb-16"
                style={{ fontSize: "clamp(2rem,5vw,4rem)", letterSpacing: "-0.025em" }}>
              Cómo trabajamos<br />
              <span style={{ color: GOLD }}>desde el primer contacto.</span>
            </h2>
          </R>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-px hidden sm:block"
                 style={{ background: "linear-gradient(to bottom, transparent, rgba(179,152,91,0.2), transparent)" }} />
            <div className="space-y-8">
              {x.proceso.map((paso, i) => (
                <R key={i} delay={i * 80}>
                  <div className="flex gap-6 sm:gap-8 items-start relative">
                    <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center z-10"
                         style={{ background: "#080808", border: `1px solid ${GOLD}30` }}>
                      <span style={{ color: GOLD, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.05em" }}>{paso.paso}</span>
                    </div>
                    <div className="flex-1 pb-2">
                      <h4 className="font-semibold text-white mb-1.5" style={{ fontSize: "0.95rem" }}>{paso.titulo}</h4>
                      <p className="text-white/40 text-sm leading-relaxed">{paso.desc}</p>
                    </div>
                  </div>
                </R>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Por qué nosotros */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.24em] uppercase mb-5">Por qué Mainstage Pro</p>
            <h2 className="font-bold text-white leading-tight mb-16"
                style={{ fontSize: "clamp(2rem,5vw,4rem)", letterSpacing: "-0.025em" }}>
              Lo que nos diferencia<br />
              <span style={{ color: GOLD }}>de otros proveedores.</span>
            </h2>
          </R>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
            {c.why.map((w, i) => (
              <R key={w.title} delay={i * 90}>
                <div className="flex gap-5">
                  <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                       style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}20` }}>
                    <WhyIcon type={w.icon} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-2 leading-snug">{w.title}</h4>
                    <p className="text-white/40 text-sm leading-relaxed">{w.body}</p>
                  </div>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* Formulario de contacto */}
      <section className="py-24 px-6 bg-[#080808]">
        <div className="max-w-2xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-4 text-center">Cuéntanos tu evento</p>
            <h2 className="font-bold text-white text-center mb-3"
                style={{ fontSize: "clamp(2rem,5vw,4rem)", letterSpacing: "-0.025em" }}>
              Solicita una cotización
            </h2>
            <p className="text-white/35 text-center mb-10 text-sm leading-relaxed">
              Compártenos los detalles y te respondemos por WhatsApp con disponibilidad y números.
            </p>
          </R>
          <ContactForm tipo={tipo} />
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 bg-[#040404]">
        <div className="max-w-3xl mx-auto text-center">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-6">Siguiente paso</p>
            <h2 className="font-bold text-white leading-tight mb-5"
                style={{ fontSize: "clamp(2rem,5vw,4rem)", letterSpacing: "-0.025em" }}>
              {c.cta}
            </h2>
            <p className="text-white/35 mb-12 leading-relaxed" style={{ fontSize: "clamp(0.9rem, 1.5vw, 1.05rem)" }}>
              {c.ctaSub}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <a href={WA} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-3 px-10 py-4 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105"
                 style={{ background: GOLD }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Agendar conversación
              </a>
              <a href="/presentacion/inventario"
                 className="text-white/40 text-sm hover:text-[#B3985B] transition-colors tracking-wide">
                Ver inventario de equipo →
              </a>
            </div>
          </R>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-white/[0.04] text-center">
        <p className="text-white/18 text-xs tracking-wide">
          © {new Date().getFullYear()} Mainstage Pro · Producción audiovisual profesional
        </p>
      </footer>
    </div>
  );
}
