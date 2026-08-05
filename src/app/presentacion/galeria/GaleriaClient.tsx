"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Music, Wine, Building2, Sparkles, type LucideIcon } from "lucide-react";
import PresentacionNav from "@/components/presentacion/PresentacionNav";

const GOLD = "#B3985B";
const WA   = "https://wa.me/524461432565?text=Hola%2C%20me%20gustar%C3%ADa%20obtener%20informaci%C3%B3n%20sobre%20producci%C3%B3n%20para%20mi%20evento.";

// ─── Tipos ─────────────────────────────────────────────────────────────────────
type Foto = { src: string; caption: string };
type Categoria = {
  id: string;
  label: string;
  sub: string;
  cover: string;
  icon: LucideIcon;
  fotos: Foto[];
};

// Ícono por slug del tipo de evento (la BD manda el resto del contenido).
function iconoPorSlug(slug: string): LucideIcon {
  if (slug.includes("music")) return Music;
  if (slug.includes("social")) return Wine;
  if (slug.includes("empres")) return Building2;
  return Sparkles;
}

// ─── Fallback (solo si la BD aún no tiene tipos con fotos) ──────────────────────
const FALLBACK: Categoria[] = [
  {
    id: "musicales",
    label: "Eventos Musicales",
    sub: "Conciertos · Festivales · DJ Sets · Shows en vivo",
    cover: "/images/presentacion/musicales/Musicales-076.jpg",
    icon: Music as LucideIcon,
    fotos: [
      { src: "/images/presentacion/musicales/Musicales-016.jpg",                    caption: "Producción completa en vivo" },
      { src: "/images/presentacion/musicales/Musicales-037.jpg",                    caption: "Iluminación · Show en escenario" },
      { src: "/images/presentacion/musicales/Musicales-076.jpg",                    caption: "DJ Set · Equipo profesional" },
      { src: "/images/presentacion/musicales/MAGIC_ROOM_260307_GUANAJUATO_078.jpg", caption: "Festival · Guanajuato" },
      { src: "/images/presentacion/musicales/Musicales-055.jpg",                    caption: "Producción de luz · Efectos especiales" },
      { src: "/images/presentacion/musicales/Afrodise-59.jpg",                      caption: "Stage completo · Noche" },
      { src: "/images/presentacion/musicales/DSC07491.jpg",                         caption: "En vivo · Operación técnica" },
      { src: "/images/presentacion/musicales/Musicales-126.jpg",                    caption: "Show · Producción audiovisual" },
    ],
  },
  {
    id: "sociales",
    label: "Eventos Sociales",
    sub: "Bodas · XV Años · Celebraciones privadas",
    cover: "/images/presentacion/sociales/s-boda-elegante.jpg",
    icon: Wine as LucideIcon,
    fotos: [
      { src: "/images/presentacion/sociales/s-boda-elegante.jpg",   caption: "Boda · Producción exterior elegante" },
      { src: "/images/presentacion/sociales/s-dj-salon.png",        caption: "DJ · Ambiente de salón" },
      { src: "/images/presentacion/sociales/s-hacienda-iluminada.jpg", caption: "Hacienda · Iluminación dramática" },
      { src: "/images/presentacion/sociales/s-boda-colonial.jpg",   caption: "Boda · Venue colonial" },
      { src: "/images/presentacion/sociales/s-piano-pista.jpg",     caption: "Piano · Pista espejada" },
      { src: "/images/presentacion/sociales/s-hacienda-aerea.jpg",  caption: "Vista aérea · Iluminación completa" },
    ],
  },
  {
    id: "empresariales",
    label: "Eventos Empresariales",
    sub: "Conferencias · Lanzamientos · Corporativos",
    cover: "/images/presentacion/empresariales/e-auditorio.jpg",
    icon: Building2 as LucideIcon,
    fotos: [
      { src: "/images/presentacion/empresariales/e-auditorio.jpg",        caption: "Auditorio · Producción completa" },
      { src: "/images/presentacion/empresariales/e-sala-pantallas.jpg",   caption: "Sala · Conferencia profesional" },
      { src: "/images/presentacion/empresariales/e-carpa-led.jpg",        caption: "Carpa · Pantalla LED exterior" },
      { src: "/images/presentacion/empresariales/e-networking.jpg",       caption: "Networking · Ambiente corporativo" },
      { src: "/images/presentacion/empresariales/e-edificio-azul.jpg",    caption: "Inauguración · Iluminación arquitectónica" },
      { src: "/images/presentacion/empresariales/e-proyeccion-mural.jpg", caption: "Proyección artística · Evento exclusivo" },
    ],
  },
];

type CatId = string;


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
    <div ref={ref} className={className} style={{
      transitionDelay: `${delay}ms`,
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(28px)",
      transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)",
    }}>
      {children}
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({
  fotos,
  startIdx,
  onClose,
}: {
  fotos: readonly { src: string; caption: string }[];
  startIdx: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIdx);

  const prev = useCallback(() => setIdx(i => (i - 1 + fotos.length) % fotos.length), [fotos.length]);
  const next = useCallback(() => setIdx(i => (i + 1) % fotos.length), [fotos.length]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape")     onClose();
    };
    window.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", fn); document.body.style.overflow = ""; };
  }, [prev, next, onClose]);

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col"
      style={{ background: "rgba(4,4,4,0.97)", backdropFilter: "blur(12px)" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <p className="text-white/30 text-xs font-mono tracking-widest">
          {String(idx + 1).padStart(2, "0")} / {String(fotos.length).padStart(2, "0")}
        </p>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Photo + arrows */}
      <div className="flex-1 flex items-center justify-center relative min-h-0 px-4 pb-4">
        <button
          onClick={prev}
          className="absolute left-4 z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>

        {/* Image */}
        <div className="w-full h-full flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={fotos[idx].src}
            src={fotos[idx].src}
            alt={fotos[idx].caption}
            draggable={false}
            className="max-w-full max-h-full object-contain rounded-lg"
            style={{
              maxHeight: "calc(100vh - 160px)",
              animation: "lightboxIn 0.3s cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        </div>

        <button
          onClick={next}
          className="absolute right-4 z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Caption + dots */}
      <div className="shrink-0 pb-6 px-6 text-center space-y-3">
        <p className="text-white/50 text-sm">{fotos[idx].caption}</p>
        <div className="flex items-center justify-center gap-2">
          {fotos.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className="rounded-full transition-all duration-300"
              style={{ width: i === idx ? "22px" : "6px", height: "6px", background: i === idx ? GOLD : "rgba(255,255,255,0.2)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Category Card ─────────────────────────────────────────────────────────────
function CatCard({
  cat,
  active,
  onClick,
}: {
  cat: Categoria;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden group cursor-pointer text-left w-full"
      style={{
        height: "60vh",
        minHeight: "360px",
        borderRadius: "20px",
        border: active ? `2px solid ${GOLD}` : "2px solid rgba(255,255,255,0.06)",
        transition: "border-color 0.4s ease, transform 0.4s ease",
        transform: active ? "scale(1.02)" : "scale(1)",
      }}
    >
      {/* Background photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cat.cover}
        alt={cat.label}
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        style={{ transform: active ? "scale(1.05)" : undefined }}
      />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: active
            ? "linear-gradient(to top, rgba(6,6,6,0.85) 0%, rgba(6,6,6,0.4) 50%, rgba(6,6,6,0.2) 100%)"
            : "linear-gradient(to top, rgba(6,6,6,0.88) 0%, rgba(6,6,6,0.5) 55%, rgba(6,6,6,0.25) 100%)",
        }}
      />

      {/* Gold top border line (active) */}
      {active && (
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: GOLD }} />
      )}

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-8">
        <div className="flex items-center gap-3 mb-3">
          <cat.icon strokeWidth={1.75} className="w-7 h-7" style={{ color: active ? GOLD : "rgba(255,255,255,0.85)" }} />
          {active && (
            <span
              className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{ background: GOLD, color: "#000" }}
            >
              Viendo
            </span>
          )}
        </div>
        <h3
          className="font-bold text-white leading-tight mb-2"
          style={{ fontSize: "clamp(1.3rem, 2.5vw, 1.8rem)", letterSpacing: "-0.02em" }}
        >
          {cat.label}
        </h3>
        <p className="text-white/40 text-xs tracking-wide mb-4">{cat.sub}</p>
        <div
          className="inline-flex items-center gap-2 text-xs font-semibold transition-all duration-300"
          style={{ color: active ? GOLD : "rgba(255,255,255,0.4)" }}
        >
          {active ? "← Ver miniaturas abajo" : `Ver ${cat.fotos.length} fotos →`}
        </div>
      </div>
    </button>
  );
}

// ─── Thumbnail Grid ────────────────────────────────────────────────────────────
function ThumbnailGrid({
  fotos,
  onOpen,
}: {
  fotos: readonly { src: string; caption: string }[];
  onOpen: (i: number) => void;
}) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
    >
      {fotos.map((f, i) => (
        <button
          key={f.src}
          onClick={() => onOpen(i)}
          className="relative overflow-hidden group rounded-xl cursor-pointer"
          style={{
            aspectRatio: "4/3",
            border: "1px solid rgba(255,255,255,0.06)",
            animation: `thumbIn 0.45s cubic-bezier(0.16,1,0.3,1) both`,
            animationDelay: `${i * 55}ms`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={f.src}
            alt={f.caption}
            draggable={false}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Hover overlay */}
          <div className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300"
               style={{ background: "linear-gradient(to top, rgba(6,6,6,0.85) 0%, transparent 60%)" }}>
            <div className="p-4">
              <p className="text-white text-xs font-medium leading-snug">{f.caption}</p>
              <p className="text-white/40 text-[10px] mt-1">Click para abrir →</p>
            </div>
          </div>
          {/* Always-visible number */}
          <div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-mono text-white/60"
               style={{ background: "rgba(0,0,0,0.5)" }}>
            {String(i + 1).padStart(2, "0")}
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GaleriaClient() {
  const [active, setActive]   = useState<CatId | null>(null);
  const [lightbox, setLightbox] = useState<{ catId: CatId; idx: number } | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>(FALLBACK);
  const [heroSlides, setHeroSlides] = useState<Foto[]>([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const galleryRef    = useRef<HTMLDivElement>(null);

  // Fuente maestra: los tipos de evento configurados en Comercial. Solo caemos al
  // FALLBACK si la BD todavía no tiene ningún tipo con fotos. El orden de las fotos
  // dentro de cada categoría lo manda `orden` (arrastrar en el admin); la primera
  // es la portada.
  useEffect(() => {
    fetch("/api/tipos-evento/publico")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        const cats: Categoria[] = (d?.tipos ?? [])
          .filter((t: { fotos?: unknown[] }) => (t.fotos?.length ?? 0) > 0)
          .map((t: { slug: string; nombre: string; subtitulo: string | null; fotos: { url: string; caption: string | null; orden: number }[] }): Categoria => {
            const fotos = [...t.fotos].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
            return {
              id: t.slug,
              label: t.nombre,
              sub: t.subtitulo || "",
              cover: fotos[0].url,
              icon: iconoPorSlug(t.slug),
              fotos: fotos.map(f => ({ src: f.url, caption: f.caption || "" })),
            };
          });
        if (cats.length) setCategorias(cats);
      })
      .catch(() => {});
  }, []);

  // Slides del inicio (carrusel del hero). Si no hay, se usa la portada del primer tipo.
  useEffect(() => {
    fetch("/api/galeria-inicio/publico")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        const s: Foto[] = (d?.slides ?? []).map((x: { url: string; caption: string | null }) => ({ src: x.url, caption: x.caption || "" }));
        if (s.length) setHeroSlides(s);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (heroSlides.length < 2) return;
    const t = setInterval(() => setHeroIdx(i => (i + 1) % heroSlides.length), 5000);
    return () => clearInterval(t);
  }, [heroSlides.length]);

  const activeCat = categorias.find(c => c.id === active) ?? null;

  function selectCat(id: CatId) {
    if (active === id) {
      setActive(null);
    } else {
      setActive(id);
      // Scroll to gallery after short delay
      setTimeout(() => {
        galleryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    }
  }

  return (
    <div className="text-white min-h-screen" style={{ backgroundColor: "#080808", fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      <style>{`
        @keyframes kenBurns {
          from { transform: scale(1) translate(0, 0); }
          to   { transform: scale(1.07) translate(-1.2%, -0.6%); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes thumbIn {
          from { opacity: 0; transform: scale(0.93) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes lightboxIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #080808; }
        ::-webkit-scrollbar-thumb { background: rgba(179,152,91,0.35); border-radius: 2px; }
      `}</style>

      {/* ── Lightbox ── */}
      {lightbox && activeCat && (
        <Lightbox
          fotos={activeCat.fotos}
          startIdx={lightbox.idx}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* ── Nav unificada ── */}
      <PresentacionNav />

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden" style={{ height: "55vh", minHeight: "320px" }}>
        <div className="absolute inset-0">
          {heroSlides.length > 0 ? (
            heroSlides.map((s, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={s.src} src={s.src} alt="" draggable={false}
                   className="absolute inset-0 w-full h-full object-cover"
                   style={{
                     opacity: i === heroIdx ? 1 : 0,
                     transition: "opacity 1.2s ease",
                     animation: i === heroIdx ? "kenBurns 6s ease forwards" : undefined,
                   }} />
            ))
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={categorias[0]?.cover ?? "/images/presentacion/musicales/Musicales-076.jpg"}
                 alt="Galería Mainstage Pro" draggable={false}
                 className="w-full h-full object-cover"
                 style={{ animation: "kenBurns 18s ease forwards" }} />
          )}
          <div className="absolute inset-0"
               style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.35) 0%, rgba(8,8,8,0.6) 50%, #080808 100%)" }} />
        </div>
        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
          <p className="text-[#B3985B] text-xs font-medium tracking-[0.4em] uppercase mb-6"
             style={{ animation: "fadeUp 0.8s ease forwards 0.2s", opacity: 0 }}>
            GALERÍA DE EVENTOS
          </p>
          <h1 className="font-bold text-white leading-tight"
              style={{
                fontSize: "clamp(2.4rem, 6vw, 5rem)",
                letterSpacing: "-0.03em",
                animation: "fadeUp 0.95s ease forwards 0.4s",
                opacity: 0,
              }}>
            Nuestro trabajo,<br />
            <span style={{ color: "rgba(255,255,255,0.4)" }}>en imágenes.</span>
          </h1>
          <p className="text-white/40 mt-5 text-sm"
             style={{ animation: "fadeUp 0.95s ease forwards 0.65s", opacity: 0 }}>
            Selecciona el tipo de evento que quieres explorar.
          </p>
        </div>
      </section>

      {/* ── Category selector ── */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <R>
            <p className="text-white/20 text-xs uppercase tracking-widest mb-8 text-center">
              — Elige una categoría —
            </p>
          </R>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {categorias.map((cat, i) => (
              <R key={cat.id} delay={i * 80}>
                <CatCard
                  cat={cat}
                  active={active === cat.id}
                  onClick={() => selectCat(cat.id)}
                />
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gallery grid ── */}
      <div ref={galleryRef} style={{ scrollMarginTop: "80px" }}>
        {activeCat && (
          <section className="pb-24 px-6">
            <div className="max-w-6xl mx-auto">
              {/* Section header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-1 inline-flex items-center gap-1.5"><activeCat.icon strokeWidth={1.75} className="w-3.5 h-3.5" /> {activeCat.id}</p>
                  <h2 className="font-bold text-white text-2xl" style={{ letterSpacing: "-0.02em" }}>
                    {activeCat.label}
                  </h2>
                  <p className="text-white/30 text-xs mt-1">{activeCat.fotos.length} fotos · click para abrir</p>
                </div>
                <button
                  onClick={() => setActive(null)}
                  className="text-white/25 text-xs hover:text-white/60 transition-colors flex items-center gap-1.5"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Cerrar
                </button>
              </div>

              {/* Thumbnails */}
              <ThumbnailGrid
                fotos={activeCat.fotos}
                onOpen={(i) => setLightbox({ catId: activeCat.id, idx: i })}
              />
            </div>
          </section>
        )}
      </div>

      {/* ── CTA contacto ── */}
      <section className="py-28 px-6" style={{ backgroundColor: "#060606" }}>
        <div className="max-w-xl mx-auto text-center">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-4">¿Te gustó lo que viste?</p>
            <h2 className="font-bold text-white mb-4"
                style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>
              Producimos el tuyo.
            </h2>
            <p className="text-white/35 text-sm leading-relaxed mb-10">
              Dinos el tipo de evento, el venue y la fecha.<br/>
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
