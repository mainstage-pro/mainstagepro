"use client";
import { useEffect, useRef, useState } from "react";

const GOLD = "#B3985B";
const DARK = "#080808";
const WA   = "https://wa.me/524461432565?text=Hola%2C%20me%20gustar%C3%ADa%20obtener%20informaci%C3%B3n%20sobre%20producci%C3%B3n%20para%20mi%20evento.";

// ─── Gallery data ──────────────────────────────────────────────────────────────
const MUSICALES = [
  { src: "/images/presentacion/musicales/Musicales-016.jpg",                    caption: "Producción completa en vivo" },
  { src: "/images/presentacion/musicales/Musicales-037.jpg",                    caption: "Iluminación · Show en escenario" },
  { src: "/images/presentacion/musicales/Musicales-076.jpg",                    caption: "DJ Set · Equipo profesional" },
  { src: "/images/presentacion/musicales/MAGIC_ROOM_260307_GUANAJUATO_078.jpg", caption: "Festival · Guanajuato" },
  { src: "/images/presentacion/musicales/Musicales-055.jpg",                    caption: "Producción de luz · Efectos especiales" },
  { src: "/images/presentacion/musicales/Afrodise-59.jpg",                      caption: "Stage completo · Noche" },
  { src: "/images/presentacion/musicales/DSC07491.jpg",                         caption: "En vivo · Operación técnica" },
  { src: "/images/presentacion/musicales/Musicales-126.jpg",                    caption: "Show · Producción audiovisual" },
];

const SOCIALES = [
  { src: "/images/presentacion/sociales/s-boda-elegante.jpg",   caption: "Boda · Producción exterior elegante" },
  { src: "/images/presentacion/sociales/s-dj-salon.png",        caption: "DJ · Ambiente de salón" },
  { src: "/images/presentacion/sociales/s-hacienda-iluminada.jpg", caption: "Hacienda · Iluminación dramática" },
  { src: "/images/presentacion/sociales/s-boda-colonial.jpg",   caption: "Boda · Venue colonial" },
  { src: "/images/presentacion/sociales/s-piano-pista.jpg",     caption: "Piano · Pista espejada" },
  { src: "/images/presentacion/sociales/s-hacienda-aerea.jpg",  caption: "Vista aérea · Iluminación completa" },
];

const EMPRESARIALES = [
  { src: "/images/presentacion/empresariales/e-auditorio.jpg",        caption: "Auditorio · Producción completa" },
  { src: "/images/presentacion/empresariales/e-sala-pantallas.jpg",   caption: "Sala de pantallas · Conferencia" },
  { src: "/images/presentacion/empresariales/e-carpa-led.jpg",        caption: "Carpa · Pantalla LED exterior" },
  { src: "/images/presentacion/empresariales/e-networking.jpg",       caption: "Networking · Ambiente corporativo" },
  { src: "/images/presentacion/empresariales/e-edificio-azul.jpg",    caption: "Inauguración · Iluminación arquitectónica" },
  { src: "/images/presentacion/empresariales/e-proyeccion-mural.jpg", caption: "Proyección artística · Evento exclusivo" },
];

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

function R({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, vis } = useReveal();
  return (
    <div ref={ref} className={className}
         style={{
           transitionDelay: `${delay}ms`,
           opacity: vis ? 1 : 0,
           transform: vis ? "translateY(0)" : "translateY(32px)",
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

  // Suppress unused var warning
  void leaving;

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
      {/* Dots */}
      <div className="absolute top-6 right-8 flex gap-2.5 items-center" style={{ zIndex: 4 }}>
        {photos.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
                  className="rounded-full transition-all duration-300"
                  style={{ width: i === idx ? "22px" : "6px", height: "6px", background: i === idx ? GOLD : "rgba(255,255,255,0.2)" }} />
        ))}
      </div>
      {/* Prev / Next */}
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

// ─── Gallery Section ──────────────────────────────────────────────────────────
function GallerySection({
  id,
  label,
  title,
  photos,
  description,
}: {
  id: string;
  label: string;
  title: string;
  photos: { src: string; caption: string }[];
  description: string;
}) {
  return (
    <section id={id} className="pt-28 pb-0">
      <div className="max-w-6xl mx-auto px-6 pb-12">
        <R>
          <p className="text-[#B3985B] text-xs font-medium tracking-[0.32em] uppercase mb-3">{label}</p>
          <h2 className="font-bold text-white leading-[1.05] mb-4"
              style={{ fontSize: "clamp(1.9rem, 4vw, 3.2rem)", letterSpacing: "-0.025em" }}>
            {title}
          </h2>
          <p className="text-white/35 text-sm max-w-lg leading-relaxed">{description}</p>
        </R>
      </div>
      <CinematicGallery photos={photos} />
    </section>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GaleriaClient() {
  const scrolled = useScrollHeader();

  return (
    <div className="text-white min-h-screen" style={{ backgroundColor: DARK, fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
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

      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 transition-all duration-500"
           style={{
             background:     scrolled ? "rgba(8,8,8,0.96)" : "transparent",
             backdropFilter: scrolled ? "blur(16px)" : "none",
             borderBottom:   scrolled ? "1px solid rgba(255,255,255,0.04)" : "none",
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
          <img src="/images/presentacion/musicales/Musicales-076.jpg"
               alt="Galería de eventos Mainstage Pro" draggable={false}
               className="w-full h-full object-cover"
               style={{ animation: "kenBurns 18s ease forwards" }} />
          <div className="absolute inset-0"
               style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.3) 0%, rgba(8,8,8,0.55) 40%, rgba(8,8,8,0.92) 75%, #080808 100%)" }} />
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <p className="text-[#B3985B] text-xs font-medium tracking-[0.4em] uppercase mb-8"
             style={{ animation: "fadeUp 0.8s ease forwards 0.2s", opacity: 0 }}>
            GALERÍA DE EVENTOS
          </p>
          <h1 className="font-bold text-white leading-[1.02]"
              style={{
                fontSize: "clamp(2.6rem, 7.5vw, 6.5rem)",
                letterSpacing: "-0.03em",
                animation: "fadeUp 0.95s ease forwards 0.4s",
                opacity: 0,
              }}>
            Nuestro trabajo,<br />
            <span style={{ color: "rgba(255,255,255,0.45)" }}>en imágenes.</span>
          </h1>
          <p className="text-white/45 mt-8 leading-relaxed max-w-xl mx-auto"
             style={{ fontSize: "clamp(0.95rem, 1.6vw, 1.1rem)", animation: "fadeUp 0.95s ease forwards 0.65s", opacity: 0 }}>
            Musicales, sociales y empresariales. Cada evento con la producción técnica que merece.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-5"
               style={{ animation: "fadeUp 0.95s ease forwards 0.85s", opacity: 0 }}>
            <a href="#musicales"
               className="px-9 py-4 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105"
               style={{ background: GOLD }}>
              Ver galería
            </a>
            <a href="#contacto" className="text-white/35 text-sm hover:text-white/60 transition-colors">
              Contactar →
            </a>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-20">
          <div className="w-px h-12 bg-gradient-to-b from-white/60 to-transparent mx-auto" />
        </div>
      </section>

      {/* ── Musicales ── */}
      <GallerySection
        id="musicales"
        label="Eventos musicales"
        title="Conciertos, festivales y DJ sets."
        description="Audio, iluminación y video para shows en vivo. Rider cubierto antes de que llegue el artista."
        photos={MUSICALES}
      />

      {/* ── Sociales ── */}
      <GallerySection
        id="sociales"
        label="Eventos sociales"
        title="Bodas, XV años y celebraciones privadas."
        description="La producción técnica que hace memorables los momentos que importan. Discreta, coordinada y perfecta."
        photos={SOCIALES}
      />

      {/* ── Empresariales ── */}
      <GallerySection
        id="empresariales"
        label="Eventos empresariales"
        title="Conferencias, lanzamientos y corporativos."
        description="La técnica invisible que hace ver bien a tu empresa. Audio claro, pantallas que no fallan."
        photos={EMPRESARIALES}
      />

      {/* ── Contacto ── */}
      <section id="contacto" className="py-32 px-6" style={{ backgroundColor: "#060606" }}>
        <div className="max-w-2xl mx-auto text-center">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-4">Cuéntanos tu evento</p>
            <h2 className="font-bold text-white mb-4"
                style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>
              ¿Qué producimos para ti?
            </h2>
            <p className="text-white/35 text-sm leading-relaxed mb-10">
              Dinos el tipo de evento, el venue y la fecha.<br />
              Propuesta técnica en menos de 24 horas.
            </p>
            <a href={WA} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-3 px-10 py-4 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105 hover:opacity-90"
               style={{ background: GOLD }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Hablar por WhatsApp
            </a>
          </R>

          {/* Links de categorías */}
          <R delay={200}>
            <div className="mt-14 pt-10 border-t border-white/[0.05] flex flex-wrap justify-center gap-x-8 gap-y-3">
              {[
                { href: "/presentacion/evento/musical",     label: "Eventos musicales" },
                { href: "/presentacion/evento/social",      label: "Eventos sociales" },
                { href: "/presentacion/evento/empresarial", label: "Eventos empresariales" },
              ].map(l => (
                <a key={l.href} href={l.href}
                   className="text-white/25 text-xs tracking-wide hover:text-white/55 transition-colors">
                  {l.label} →
                </a>
              ))}
            </div>
          </R>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 border-t border-white/[0.04] text-center">
        <p className="text-white/18 text-xs tracking-wide">
          © {new Date().getFullYear()} Mainstage Pro · Producción audiovisual profesional
        </p>
      </footer>
    </div>
  );
}
