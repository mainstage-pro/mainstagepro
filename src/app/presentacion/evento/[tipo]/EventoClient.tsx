"use client";
import { useEffect, useRef, useState } from "react";

const GOLD = "#B3985B";
const WA   = "https://wa.me/524461432565?text=Hola%2C%20me%20gustar%C3%ADa%20obtener%20informaci%C3%B3n%20sobre%20producci%C3%B3n%20para%20mi%20evento.";

type EventoTipo = "musical" | "social" | "empresarial";

const CONFIG = {
  musical: {
    label:    "Producción para eventos musicales",
    hero:     "/images/presentacion/musicales/Musicales-016.jpg",
    headline: "El show en punto.\nDesde el soundcheck.",
    sub:      "Rider cubierto, operadores con experiencia en vivo, producción que no interrumpe.",
    insights: [
      {
        title: "Antes de que llegue el artista",
        body:  "Rider verificado, líneas de señal probadas, booth calibrado. El soundcheck empieza cuando el artista baja, no cuando nosotros terminamos de conectar cables.",
      },
      {
        title: "Audio que llega a todo el venue",
        body:  "Cobertura uniforme de frente a fondo — sin puntos muertos, sin distorsión, con el nivel correcto en monitores de tarima.",
      },
      {
        title: "Luz y video que siguen al show",
        body:  "Cues programadas por escena. Cada cambio coordinado con el ritmo del set, no reaccionando a él.",
      },
      {
        title: "Operadores que conocen el escenario",
        body:  "Gente que ha estado en tarima, que entiende cómo fluye un show en vivo y que resuelve en silencio cuando algo cambia.",
      },
    ],
    servicios: [
      { cat: "Audio",        detail: "Line arrays, subwoofers, monitores de tarima. Consola operada en vivo durante todo el show." },
      { cat: "Iluminación",  detail: "Cabezas móviles, beams, strobes y efectos especiales. Programados y ejecutados desde consola." },
      { cat: "DJ Setup",     detail: "CDJs, mezcladora profesional, booth de referencia. El rider cubierto antes del soundcheck." },
      { cat: "Video / LED",  detail: "Pantallas bien posicionadas, procesador de señal, resolución calibrada al venue." },
    ],
    tipos:   "Festivales · Conciertos · DJ Sets · Showcases · Presentaciones en vivo · Raves · Fiestas privadas",
    gallery: [
      { src: "/images/presentacion/musicales/Musicales-016.jpg",                    caption: "Producción completa en vivo" },
      { src: "/images/presentacion/musicales/Musicales-037.jpg",                    caption: "Iluminación · Show en escenario" },
      { src: "/images/presentacion/musicales/Musicales-076.jpg",                    caption: "DJ Set · Equipo profesional" },
      { src: "/images/presentacion/musicales/MAGIC_ROOM_260307_GUANAJUATO_078.jpg", caption: "Festival · Guanajuato" },
      { src: "/images/presentacion/musicales/Musicales-055.jpg",                    caption: "Producción de luz · Efectos especiales" },
      { src: "/images/presentacion/musicales/Afrodise-59.jpg",                      caption: "Stage completo · Noche" },
      { src: "/images/presentacion/musicales/DSC07491.jpg",                         caption: "En vivo · Operación técnica" },
      { src: "/images/presentacion/musicales/Musicales-126.jpg",                    caption: "Show · Producción audiovisual" },
    ],
    cta:    "Cuéntanos sobre el artista y el venue.",
    ctaSub: "Propuesta técnica en menos de 24 horas.",
  },

  social: {
    label:    "Producción para eventos sociales",
    hero:     "/images/presentacion/sociales/s-boda-elegante.jpg",
    headline: "Los momentos que importan,\ncon la atmósfera que merecen.",
    sub:      "Brindis, primer baile, pista — cada instante en su punto.",
    insights: [
      {
        title: "Llegamos preparados para cada momento",
        body:  "Primer baile, vals, brindis, pastel — revisamos el programa contigo. No hay cues que improvisar el día del evento.",
      },
      {
        title: "El brindis se escucha en cada mesa",
        body:  "Micrófonos inalámbricos operados por un técnico dedicado. Sin retroalimentación, con volumen uniforme en todo el salón.",
      },
      {
        title: "Luz que transita sin romper el ambiente",
        body:  "De la cena a la pista, los cambios son graduales y naturales. Programados con anticipación, ejecutados en el momento exacto.",
      },
      {
        title: "En segundo plano, siempre",
        body:  "Coordinamos con venue, decoración y fotógrafo. El protagonismo es de los festejados — no de la producción.",
      },
    ],
    servicios: [
      { cat: "Audio",             detail: "Micrófonos inalámbricos, sistema de pista y operación técnica durante todo el evento." },
      { cat: "Iluminación",       detail: "Pares LED, cabezas móviles y efectos programados para cada momento de la noche." },
      { cat: "DJ Setup",          detail: "Tornamesas, mezcladora y señal verificados antes de los primeros invitados." },
      { cat: "Pantallas y video", detail: "Para ceremonia, galería de fotos en vivo o contenido especial del evento." },
    ],
    tipos:   "Bodas · XV Años · Cocteles · Cumpleaños · Graduaciones · Aniversarios · Fiestas privadas",
    gallery: [
      { src: "/images/presentacion/sociales/s-dj-salon.png",          caption: "El ambiente que recordarán" },
      { src: "/images/presentacion/sociales/s-hacienda-iluminada.jpg", caption: "Hacienda · Iluminación dramática" },
      { src: "/images/presentacion/sociales/s-boda-colonial.jpg",      caption: "Boda · Venue colonial" },
      { src: "/images/presentacion/sociales/s-piano-pista.jpg",        caption: "Piano · Pista espejada" },
      { src: "/images/presentacion/sociales/s-boda-elegante.jpg",      caption: "Boda elegante · Producción exterior" },
      { src: "/images/presentacion/sociales/s-hacienda-aerea.jpg",     caption: "Vista aérea · Iluminación completa" },
    ],
    cta:    "Cuéntanos sobre tu evento.",
    ctaSub: "Fecha, venue y lo que tienes en mente. Respondemos rápido.",
  },

  empresarial: {
    label:    "Producción para eventos empresariales",
    hero:     "/images/presentacion/empresariales/e-auditorio.jpg",
    headline: "La técnica que no falla\nes parte del mensaje.",
    sub:      "Audio claro, pantallas en punto, producción sin interrupciones.",
    insights: [
      {
        title: "Un fallo técnico no es solo un problema técnico",
        body:  "En un evento corporativo, la producción forma parte de la imagen de tu empresa. Operamos con verificación previa y respaldo para que no haya imprevistos visibles.",
      },
      {
        title: "La laptop del presentador ya la probamos",
        body:  "Conexiones verificadas, resolución calibrada, señal de video estabilizada antes del evento. Probamos con el equipo real de quien presenta.",
      },
      {
        title: "Integrados con tu coordinador o agencia",
        body:  "Si ya tienes equipo de producción, nos alineamos. Sin duplicar trabajo, un solo punto de contacto para todo lo técnico.",
      },
      {
        title: "Presencia discreta, montaje puntual",
        body:  "Llegamos antes de tiempo, montamos con orden. Durante el evento somos parte del equipo, no del escenario.",
      },
    ],
    servicios: [
      { cat: "Audio y micrófonos",  detail: "Solapa, headset o de mano — operados en consola durante toda la conferencia." },
      { cat: "Iluminación",         detail: "Ambiente profesional para conferencias, lanzamientos, cenas y premiaciones." },
      { cat: "Pantallas y video",   detail: "HDMI, streaming, content display — probado con el presentador antes del evento." },
      { cat: "Networking y cierre", detail: "Música de ambiente o DJ para el cierre. Misma calidad técnica, mismo nivel de atención." },
    ],
    tipos:   "Conferencias · Congresos · Lanzamientos · Activaciones · Networking · Inauguraciones · Fiestas corporativas",
    gallery: [
      { src: "/images/presentacion/empresariales/e-sala-pantallas.jpg",   caption: "Experiencias que generan impacto" },
      { src: "/images/presentacion/empresariales/e-auditorio.jpg",        caption: "Auditorio · Producción completa" },
      { src: "/images/presentacion/empresariales/e-carpa-led.jpg",        caption: "Evento exterior · Pantalla LED" },
      { src: "/images/presentacion/empresariales/e-networking.jpg",       caption: "Networking · Ambiente corporativo" },
      { src: "/images/presentacion/empresariales/e-edificio-azul.jpg",    caption: "Inauguración · Iluminación arquitectónica" },
      { src: "/images/presentacion/empresariales/e-proyeccion-mural.jpg", caption: "Proyección artística · Evento exclusivo" },
    ],
    cta:    "Cuéntanos sobre el evento y el espacio.",
    ctaSub: "Propuesta técnica a la medida en 24 horas.",
  },
} satisfies Record<EventoTipo, {
  label: string; hero: string; headline: string; sub: string;
  insights: { title: string; body: string }[];
  servicios: { cat: string; detail: string }[];
  tipos: string;
  gallery: { src: string; caption: string }[];
  cta: string; ctaSub: string;
}>;

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
      if (p >= 1) {
        clearInterval(iv);
        setLeaving(true);
        setTimeout(() => setIdx(i => (i + 1) % photos.length), 900);
      }
    }, 40);
    return () => clearInterval(iv);
  }, [idx, photos.length]);

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "72vh", minHeight: "480px" }}>
      {photos.map((p, i) => {
        const isActive = i === idx;
        return (
          <div key={i} className="absolute inset-0"
               style={{ opacity: isActive ? 1 : 0, transition: isActive ? "opacity 1.6s ease" : "opacity 1s ease", zIndex: isActive ? 2 : 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.src} alt={p.caption} draggable={false}
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
          <div className="absolute inset-y-0 left-0 bg-[#B3985B]"
               style={{ width: `${progress * 100}%`, transition: "width 0.08s linear" }} />
        </div>
      </div>
      <div className="absolute top-6 right-8 flex gap-2.5 items-center" style={{ zIndex: 4 }}>
        {photos.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
                  className="rounded-full transition-all duration-300"
                  style={{ width: i === idx ? "22px" : "6px", height: "6px", background: i === idx ? GOLD : "rgba(255,255,255,0.2)" }} />
        ))}
      </div>
      <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 pointer-events-none" style={{ zIndex: 4 }}>
        <button className="pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-all"
                style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}
                onClick={() => setIdx(i => (i - 1 + photos.length) % photos.length)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button className="pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-all"
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

      {/* ── Hero ── */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.hero} alt={c.label} draggable={false}
               className="w-full h-full object-cover"
               style={{ animation: "kenBurns 18s ease forwards" }} />
          <div className="absolute inset-0"
               style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.25) 0%, rgba(8,8,8,0.5) 40%, rgba(8,8,8,0.9) 75%, #080808 100%)" }} />
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <p className="text-[#B3985B] text-xs font-medium tracking-[0.32em] uppercase mb-8"
             style={{ animation: "fadeUp 0.8s ease forwards 0.2s", opacity: 0 }}>
            {c.label}
          </p>
          <h1 className="font-bold text-white leading-[1.02]"
              style={{
                fontSize: "clamp(2.6rem, 7.5vw, 6.5rem)",
                letterSpacing: "-0.03em",
                whiteSpace: "pre-line",
                animation: "fadeUp 0.95s ease forwards 0.4s",
                opacity: 0,
              }}>
            {c.headline}
          </h1>
          <p className="text-white/45 mt-8 leading-relaxed max-w-xl mx-auto"
             style={{ fontSize: "clamp(0.95rem, 1.6vw, 1.1rem)", animation: "fadeUp 0.95s ease forwards 0.65s", opacity: 0 }}>
            {c.sub}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
               style={{ animation: "fadeUp 0.95s ease forwards 0.85s", opacity: 0 }}>
            <a href="#contacto"
               className="px-9 py-4 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105"
               style={{ background: GOLD }}>
              Solicitar propuesta
            </a>
            <a href="#galeria" className="text-white/35 text-sm hover:text-white/60 transition-colors">
              Ver galería →
            </a>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-20">
          <div className="w-px h-12 bg-gradient-to-b from-white/60 to-transparent mx-auto" />
        </div>
      </section>

      {/* ── Lo que sabemos de tu evento ── */}
      <section className="py-32 px-6 bg-[#060606]">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-5">Lo que sabemos de tu evento</p>
            <h2 className="font-bold text-white leading-[1.05] mb-16"
                style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>
              Conocemos cada detalle.
            </h2>
          </R>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px"
               style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", overflow: "hidden" }}>
            {c.insights.map((ins, i) => (
              <R key={i} delay={i * 80}>
                <div className="p-8 sm:p-10 h-full"
                     style={{ background: "rgba(255,255,255,0.025)", borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.06)" : "none", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                  <p className="font-mono mb-5"
                     style={{ fontSize: "0.6rem", color: GOLD, letterSpacing: "0.12em" }}>
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="font-semibold text-white mb-3 leading-snug"
                      style={{ fontSize: "clamp(0.95rem, 1.4vw, 1.05rem)" }}>
                    {ins.title}
                  </h3>
                  <p className="text-white/40 text-sm leading-relaxed">{ins.body}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Lo que cubrimos ── */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-5">Lo que llevamos a tu evento</p>
            <h2 className="font-bold text-white leading-[1.05] mb-16"
                style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>
              Un solo equipo.<br />
              <span style={{ color: "rgba(255,255,255,0.3)" }}>Audio, iluminación, video y operadores.</span>
            </h2>
          </R>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {c.servicios.map((s, i) => (
              <R key={i} delay={i * 70}>
                <div className="flex items-start gap-5 p-7 rounded-2xl"
                     style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full mt-2" style={{ background: GOLD }} />
                  <div>
                    <p className="font-semibold text-white mb-1.5" style={{ fontSize: "0.95rem" }}>{s.cat}</p>
                    <p className="text-white/40 text-sm leading-relaxed">{s.detail}</p>
                  </div>
                </div>
              </R>
            ))}
          </div>

          <R delay={350}>
            <p className="text-white/20 text-xs tracking-[0.18em] uppercase mt-12 pt-8"
               style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              {c.tipos}
            </p>
          </R>
        </div>
      </section>

      {/* ── Gallery ── */}
      <section id="galeria" className="pb-0">
        <CinematicGallery photos={c.gallery} />
      </section>

      {/* ── Contacto ── */}
      <section id="contacto" className="py-28 px-6 bg-[#060606]">
        <div className="max-w-2xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-4 text-center">Cuéntanos tu evento</p>
            <h2 className="font-bold text-white text-center mb-3"
                style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>
              {c.cta}
            </h2>
            <p className="text-white/35 text-center mb-10 text-sm leading-relaxed">{c.ctaSub}</p>
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
    </div>
  );
}
