"use client";
import { Speaker, Lightbulb, MonitorPlay, Disc3, Frame, Cable, type LucideIcon } from "lucide-react";
import type { ServicioDetalle } from "@/lib/presentacion-servicios";
import { SERVICIOS_DETALLE } from "@/lib/presentacion-servicios";
import PresentacionNav from "@/components/presentacion/PresentacionNav";
import { R, GOLD } from "@/components/presentacion/anim";
import { WA_URL, useDescubrimiento } from "@/components/presentacion/descubrimiento";
import { usePresentacionEdit, EditableImage } from "@/components/presentacion/editable";
import { Masonry } from "@/components/presentacion/galeria-ui";
import type { GaleriaFoto } from "@/lib/galeria-shared";

// Categorías del inventario para el servicio de Renta (con icono representativo).
const RENTA_CATEGORIAS: { label: string; Icon: LucideIcon }[] = [
  { label: "Audio profesional", Icon: Speaker },
  { label: "Iluminación", Icon: Lightbulb },
  { label: "Video y pantallas LED", Icon: MonitorPlay },
  { label: "DJ y backline", Icon: Disc3 },
  { label: "Estructura y truss", Icon: Frame },
  { label: "Cableado y energía", Icon: Cable },
];

export default function ServicioClient({
  servicio,
  initialOverrides = {},
  fotos = [],
  portada = null,
}: {
  servicio: ServicioDetalle;
  initialOverrides?: Record<string, string>;
  fotos?: GaleriaFoto[];
  portada?: string | null;
}) {
  const { iniciar, loading } = useDescubrimiento();
  const edit = usePresentacionEdit(initialOverrides);
  const otros = SERVICIOS_DETALLE.filter((s) => s.slug !== servicio.slug);
  const esRenta = servicio.slug === "renta";

  return (
    <div className="bg-[#080808] text-white min-h-screen" style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: rgba(179,152,91,0.35); border-radius: 2px; }
      `}</style>

      <PresentacionNav />

      {/* ── Hero ── */}
      <section className="relative min-h-[78vh] flex flex-col justify-end overflow-hidden">
        <EditableImage
          edit={edit}
          okey={`servicio.${servicio.slug}.hero`}
          fallback={portada || servicio.hero}
          alt={servicio.title}
          wrapClassName="absolute inset-0"
          imgClassName="w-full h-full object-cover"
          imgStyle={{ transform: "scale(1.04)" }}
        />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.5) 0%, rgba(8,8,8,0.4) 40%, rgba(8,8,8,0.9) 85%, #080808 100%)" }} />
        <div className="relative z-10 max-w-5xl mx-auto w-full px-6 pb-16">
          <p className="text-[#B3985B] text-xs font-semibold tracking-[0.24em] uppercase mb-4" style={{ animation: "fadeUp 0.8s ease forwards 0.15s", opacity: 0 }}>
            Servicio {servicio.n} · Mainstage Pro
          </p>
          <h1 className="font-bold text-white leading-[1.0] mb-5" style={{ fontSize: "clamp(2.4rem,6.5vw,5rem)", letterSpacing: "-0.03em", animation: "fadeUp 0.9s ease forwards 0.3s", opacity: 0 }}>
            {servicio.title}
          </h1>
          <p className="text-white/65 max-w-xl" style={{ fontSize: "clamp(1rem,2vw,1.25rem)", animation: "fadeUp 0.9s ease forwards 0.5s", opacity: 0 }}>
            {servicio.tagline}
          </p>
        </div>
      </section>

      {/* ── Resumen + para quién ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-12">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-5">En qué consiste</p>
            <p className="text-white/70 leading-relaxed" style={{ fontSize: "clamp(1.05rem,2vw,1.3rem)" }}>{servicio.resumen}</p>
          </R>
          <R delay={120}>
            <div className="rounded-2xl p-7 h-full" style={{ background: "rgba(179,152,91,0.06)", border: `1px solid ${GOLD}22` }}>
              <p className="text-[#B3985B] text-xs tracking-[0.2em] uppercase mb-3">Para quién es</p>
              <p className="text-white/70 text-sm leading-relaxed">{servicio.para}</p>
            </div>
          </R>
        </div>
      </section>

      {/* ── Qué incluye / Inventario (renta) ── */}
      {esRenta ? (
        <section className="py-20 px-6 bg-[#060606] border-y border-white/[0.04]">
          <div className="max-w-5xl mx-auto">
            <R>
              <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Inventario de equipos</p>
              <h2 className="font-bold text-white leading-tight mb-3" style={{ fontSize: "clamp(1.7rem,3.5vw,2.6rem)", letterSpacing: "-0.02em" }}>
                Todo el equipo, por categoría.
              </h2>
              <p className="text-white/45 text-sm sm:text-base leading-relaxed max-w-2xl mb-10">
                Explora nuestro catálogo completo con lista de precios y cotizador en línea. Selecciona lo que necesitas y arma tu presupuesto al instante.
              </p>
            </R>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
              {RENTA_CATEGORIAS.map(({ label, Icon }, i) => (
                <R key={label} delay={i * 60}>
                  <a href="/presentacion/inventario" className="group flex flex-col items-start gap-4 rounded-2xl px-6 py-7 h-full transition-all duration-300"
                     style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
                     onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${GOLD}40`; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>
                    <Icon size={28} strokeWidth={1.4} style={{ color: GOLD }} />
                    <span className="text-white/80 text-sm font-medium leading-snug">{label}</span>
                  </a>
                </R>
              ))}
            </div>
            <R delay={120}>
              <a href="/presentacion/inventario" className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105" style={{ background: GOLD }}>
                Ver inventario y cotizador
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </a>
            </R>
          </div>
        </section>
      ) : (
        <section className="py-20 px-6 bg-[#060606] border-y border-white/[0.04]">
          <div className="max-w-5xl mx-auto">
            <R>
              <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Qué incluye</p>
              <h2 className="font-bold text-white leading-tight mb-10" style={{ fontSize: "clamp(1.7rem,3.5vw,2.6rem)", letterSpacing: "-0.02em" }}>
                Todo lo que necesitas, cubierto.
              </h2>
            </R>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {servicio.incluye.map((it, i) => (
                <R key={it} delay={i * 60}>
                  <div className="flex items-center gap-3 rounded-xl px-5 py-4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.2" className="shrink-0"><path d="M20 6L9 17l-5-5" /></svg>
                    <span className="text-white/75 text-sm">{it}</span>
                  </div>
                </R>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Entregables ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Cómo lo entregamos</p>
            <h2 className="font-bold text-white leading-tight mb-12" style={{ fontSize: "clamp(1.7rem,3.5vw,2.6rem)", letterSpacing: "-0.02em" }}>
              Lo que puedes esperar
            </h2>
          </R>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {servicio.entregables.map((e, i) => (
              <R key={e.title} delay={i * 100}>
                <div className="rounded-2xl p-8 h-full" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="font-mono mb-5" style={{ fontSize: "0.6rem", color: GOLD, letterSpacing: "0.12em" }}>{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="font-semibold text-white mb-3 leading-snug text-lg">{e.title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{e.body}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Galería (fotos del catálogo, ligadas al tipo de servicio) ── */}
      {fotos.length > 0 && (
        <section className="py-20 px-6 bg-[#060606] border-y border-white/[0.04]">
          <div className="max-w-6xl mx-auto">
            <R>
              <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Galería</p>
              <h2 className="font-bold text-white leading-tight mb-3" style={{ fontSize: "clamp(1.7rem,3.5vw,2.6rem)", letterSpacing: "-0.02em" }}>
                Nuestro trabajo, en fotos reales.
              </h2>
              <p className="text-white/45 text-sm sm:text-base leading-relaxed max-w-2xl mb-10">
                Una muestra de {servicio.title.toLowerCase()} en eventos reales que hemos producido.
              </p>
            </R>
            <Masonry fotos={fotos} />
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="py-24 px-6" style={{ background: "#040404" }}>
        <div className="max-w-3xl mx-auto text-center">
          <R>
            <h2 className="font-bold text-white leading-tight mb-6" style={{ fontSize: "clamp(1.8rem,5vw,3.2rem)", letterSpacing: "-0.025em" }}>
              ¿Te interesa <span style={{ color: GOLD }}>{servicio.title.toLowerCase()}</span>?
            </h2>
            <p className="text-white/45 mb-10">Cuéntanos de tu evento y prepara tu cotización. Respondemos en menos de 24 horas.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => iniciar({ tipoServicio: servicio.tipoServicio })} disabled={loading} className="inline-flex items-center gap-3 px-10 py-5 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105 disabled:opacity-60" style={{ background: GOLD }}>
                {loading ? "Abriendo…" : "Cotizar este servicio"}
              </button>
              <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-10 py-5 rounded-full font-semibold text-white/80 text-sm tracking-wide border border-white/15 hover:border-white/30 transition-all duration-300">
                WhatsApp
              </a>
            </div>
          </R>
        </div>
      </section>

      {/* ── Otros servicios ── */}
      <section className="py-20 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-8">Otros servicios</p>
          </R>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {otros.map((s, i) => (
              <R key={s.slug} delay={i * 100}>
                <a href={`/presentacion/servicio/${s.slug}`} className="group flex items-center justify-between rounded-2xl p-7 transition-all duration-300" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
                   onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${GOLD}40`; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>
                  <div>
                    <span className="text-[#B3985B]/40 text-xs font-mono tracking-widest">{s.n}</span>
                    <h3 className="font-bold text-white text-xl mt-2">{s.title}</h3>
                    <p className="text-white/45 text-sm mt-1">{s.tagline}</p>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" className="shrink-0 transition-transform group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </a>
              </R>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-10 px-6 border-t border-white/[0.04] text-center">
        <p className="text-white/20 text-xs tracking-wide">© {new Date().getFullYear()} Mainstage Pro · Producción técnica de eventos</p>
      </footer>
    </div>
  );
}
