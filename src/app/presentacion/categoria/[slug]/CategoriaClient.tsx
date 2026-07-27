"use client";

import { useEffect, useMemo, useState } from "react";
import PresentacionNav from "@/components/presentacion/PresentacionNav";
import { WA_URL, useDescubrimiento } from "@/components/presentacion/descubrimiento";
import { R, GOLD, StatCount } from "@/components/presentacion/anim";
import {
  type PresentacionCategoria,
  PRESENTACION_CATEGORIAS,
} from "@/lib/presentacion-categorias";

type EquipoItem = {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  subcategoria: string | null;
  cantidad: number;
  categoria: string;
  cover: string | null;
  fotos: string[];
};

type GrupoData = { label: string; rol: "principal" | "relacionado"; descripcion: string | null; equipos: EquipoItem[] };
type Data = {
  slug: string;
  nombre: string;
  grupos: GrupoData[];
  heroFotos: string[];
  stats: { totalEquipos: number; totalUnidades: number; totalFotos: number; marcas: number };
};

type Lightbox = { fotos: string[]; index: number; titulo: string };

const FONT = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif';
const RELACIONADO_MAX = 6; // "no pongas todos" — se acota el equipo relacionado

function eqNombre(eq: EquipoItem) {
  return [eq.marca, eq.modelo].filter(Boolean).join(" ") || eq.descripcion;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: GOLD }}>
      {children}
    </span>
  );
}

// Slideshow con crossfade para el hero (fotos EXTERNO del inventario).
function HeroSlides({ fotos }: { fotos: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (fotos.length < 2) return;
    const t = setInterval(() => setI((p) => (p + 1) % fotos.length), 5200);
    return () => clearInterval(t);
  }, [fotos.length]);
  return (
    <div className="absolute inset-0 overflow-hidden">
      {fotos.map((src, idx) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: idx === i ? 1 : 0,
            transform: idx === i ? "scale(1.06)" : "scale(1.0)",
            transition: "opacity 1.6s ease, transform 6.5s ease",
          }}
          draggable={false}
        />
      ))}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(6,6,6,0.55) 0%, rgba(6,6,6,0.35) 40%, rgba(6,6,6,0.92) 100%)" }} />
    </div>
  );
}

// Tarjeta de equipo estilo inventario: imagen sobre fondo negro, badge de unidades
// y click para abrir la galería de fotos del equipo.
function EquipoCard({ eq, onOpen }: { eq: EquipoItem; onOpen: (lb: Lightbox) => void }) {
  const [hovered, setHovered] = useState(false);
  const thumb = eq.cover || eq.fotos[0] || null;
  const galeria = eq.fotos.length > 0 ? eq.fotos : eq.cover ? [eq.cover] : [];
  const clickable = galeria.length > 0;
  const nombre = eqNombre(eq);

  return (
    <div
      className="group relative rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-300"
      style={{
        background: hovered ? "rgba(179,152,91,0.04)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${hovered ? GOLD + "40" : "rgba(255,255,255,0.07)"}`,
        boxShadow: hovered ? "0 8px 40px rgba(0,0,0,0.4)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        disabled={!clickable}
        onClick={() => clickable && onOpen({ fotos: galeria, index: 0, titulo: nombre })}
        className="relative flex items-center justify-center p-4 overflow-hidden w-full"
        style={{ height: "150px", background: "#050505", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: clickable ? "zoom-in" : "default" }}
        aria-label={clickable ? `Ver fotos de ${nombre}` : nombre}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={nombre}
            draggable={false}
            loading="lazy"
            className="max-h-full max-w-full object-contain transition-all duration-500"
            style={{ transform: hovered ? "scale(1.07)" : "scale(1)", filter: hovered ? "brightness(1.1)" : "brightness(0.92)" }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logo-icon.png" alt="Mainstage Pro" draggable={false} className="w-14 h-14 object-contain opacity-10" />
        )}

        <div className="absolute top-2.5 right-2.5 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: `${GOLD}20`, color: GOLD, border: `1px solid ${GOLD}50` }}>
          {eq.cantidad}
          <span style={{ fontSize: "8px", fontWeight: 400, opacity: 0.8, marginLeft: "2px" }}>uds</span>
        </div>

        {eq.fotos.length > 0 && (
          <div
            className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-opacity duration-300"
            style={{ background: "rgba(0,0,0,0.55)", color: "white", opacity: hovered ? 1 : 0.55, backdropFilter: "blur(4px)" }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
            {eq.fotos.length} fotos
          </div>
        )}
      </button>

      <div className="p-4 flex-1 flex flex-col">
        <p className="text-white font-semibold text-[13.5px] leading-snug line-clamp-2">{nombre}</p>
        {eq.descripcion && eq.descripcion !== nombre && (
          <p className="text-white/40 text-[12px] leading-snug line-clamp-2 mt-1">{eq.descripcion}</p>
        )}
      </div>
    </div>
  );
}

function GrupoGrid({ equipos, onOpen }: { equipos: EquipoItem[]; onOpen: (lb: Lightbox) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {equipos.map((eq, i) => (
        <R key={eq.id} delay={Math.min(i, 6) * 55}>
          <EquipoCard eq={eq} onOpen={onOpen} />
        </R>
      ))}
    </div>
  );
}

// Carrusel infinito (marquee) de otras categorías.
function CategoriasCarrusel({ items }: { items: PresentacionCategoria[] }) {
  const loop = [...items, ...items];
  const dur = Math.max(18, items.length * 8);
  return (
    <div className="cat-marquee relative overflow-hidden" style={{ maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)", WebkitMaskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)" }}>
      <style>{`@keyframes catmarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}.cat-marquee:hover .cat-track{animation-play-state:paused}`}</style>
      <div className="cat-track flex gap-4 w-max" style={{ animation: `catmarquee ${dur}s linear infinite` }}>
        {loop.map((rc, i) => (
          <a
            key={`${rc.slug}-${i}`}
            href={`/presentacion/categoria/${rc.slug}`}
            className="group shrink-0 w-[280px] sm:w-[320px] rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 transition-all duration-300 hover:border-white/[0.2]"
          >
            <Eyebrow>{rc.eyebrow}</Eyebrow>
            <p className="text-white font-semibold text-[20px] mt-3 group-hover:translate-x-0.5 transition-transform">{rc.nombre}</p>
            <p className="text-white/45 text-[13px] mt-2 leading-relaxed line-clamp-2">{rc.heroSub}</p>
            <span className="inline-flex items-center gap-1.5 mt-5 text-[13px] font-semibold" style={{ color: GOLD }}>
              Ver presentación
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function CategoriaClient({ cfg }: { cfg: PresentacionCategoria }) {
  const [data, setData] = useState<Data | null>(null);
  const [lightbox, setLightbox] = useState<Lightbox | null>(null);
  const { iniciar, loading } = useDescubrimiento();

  useEffect(() => {
    let cancel = false;
    fetch(`/api/presentacion/categoria/${cfg.slug}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (!cancel && !d?.error) setData(d); })
      .catch(() => {});
    return () => { cancel = true; };
  }, [cfg.slug]);

  useEffect(() => {
    document.body.style.overflow = lightbox ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightbox]);

  useEffect(() => {
    if (!lightbox) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox((l) => l && { ...l, index: (l.index + 1) % l.fotos.length });
      if (e.key === "ArrowLeft") setLightbox((l) => l && { ...l, index: (l.index - 1 + l.fotos.length) % l.fotos.length });
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [lightbox]);

  const heroFotos = data?.heroFotos ?? [];
  const principales = data?.grupos.filter((g) => g.rol === "principal" && g.equipos.length > 0) ?? [];
  const relacionados = data?.grupos.filter((g) => g.rol === "relacionado" && g.equipos.length > 0) ?? [];
  const relacionadas = useMemo(
    () => PRESENTACION_CATEGORIAS.filter((c) => c.slug !== cfg.slug),
    [cfg.slug]
  );

  return (
    <div style={{ background: "#060606", color: "white", fontFamily: FONT }} className="min-h-screen antialiased">
      <PresentacionNav />

      {/* HERO */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden text-center">
        {heroFotos.length > 0 ? (
          <HeroSlides fotos={heroFotos} />
        ) : (
          <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 0%, rgba(179,152,91,0.12) 0%, rgba(6,6,6,1) 60%)" }} />
        )}
        <div className="relative max-w-4xl mx-auto px-5 sm:px-8 py-28 w-full flex flex-col items-center">
          {/* Placa central con el nombre específico de la categoría */}
          <div
            className="inline-flex items-center gap-2.5 rounded-full px-5 py-2 mb-8"
            style={{ background: "rgba(179,152,91,0.12)", border: `1px solid ${GOLD}55`, backdropFilter: "blur(6px)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.png" alt="" className="h-4 w-4 object-contain opacity-90" draggable={false} />
            <span className="text-[13px] sm:text-sm font-bold tracking-[0.28em] uppercase" style={{ color: GOLD }}>
              {cfg.nombre}
            </span>
          </div>
          <Eyebrow>{cfg.eyebrow}</Eyebrow>
          <h1 className="mt-4 font-bold text-white leading-[1.02]" style={{ fontSize: "clamp(2.6rem, 7vw, 5.6rem)", letterSpacing: "-0.03em" }}>
            {cfg.heroTitulo}
          </h1>
          <p className="mt-6 text-white/65 max-w-2xl mx-auto" style={{ fontSize: "clamp(1.05rem, 2.2vw, 1.4rem)", lineHeight: 1.5 }}>
            {cfg.heroSub}
          </p>
        </div>
      </section>

      {/* IMPORTANCIA */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <R>
          <Eyebrow>Por qué importa</Eyebrow>
          <h2 className="mt-4 font-bold text-white" style={{ fontSize: "clamp(1.8rem, 4.2vw, 3rem)", letterSpacing: "-0.02em", lineHeight: 1.08 }}>
            {cfg.importanciaTitulo}
          </h2>
        </R>
        <div className="mt-8 grid gap-5 max-w-3xl">
          {cfg.importanciaParrafos.map((p, i) => (
            <R key={i} delay={i * 90}>
              <p className="text-white/60" style={{ fontSize: "clamp(1.02rem, 2vw, 1.2rem)", lineHeight: 1.6 }}>{p}</p>
            </R>
          ))}
        </div>
      </section>

      {/* PUNTOS */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-20 sm:pb-28">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cfg.puntos.map((pt, i) => (
            <R key={i} delay={i * 80}>
              <div className="h-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="w-9 h-9 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(179,152,91,0.14)" }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: GOLD }} />
                </div>
                <p className="text-white font-semibold text-[16px]">{pt.titulo}</p>
                <p className="text-white/50 text-[13.5px] mt-2 leading-relaxed">{pt.texto}</p>
              </div>
            </R>
          ))}
        </div>
      </section>

      {/* STATS */}
      {data && (
        <section className="border-y border-white/[0.06]">
          <div className="max-w-5xl mx-auto px-5 sm:px-8 py-16 grid grid-cols-2 sm:grid-cols-4 gap-8">
            <StatCount target={data.stats.totalEquipos} label="Equipos disponibles" />
            <StatCount target={data.stats.totalUnidades} label="Unidades en inventario" />
            <StatCount target={data.stats.marcas} label="Marcas profesionales" />
            <StatCount target={data.stats.totalFotos} label="Fotos reales del equipo" />
          </div>
        </section>
      )}

      {/* SERVICIOS */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <R>
          <Eyebrow>Cómo trabajamos {cfg.nombre.toLowerCase()}</Eyebrow>
          <h2 className="mt-4 font-bold text-white" style={{ fontSize: "clamp(1.9rem, 4.5vw, 3rem)", letterSpacing: "-0.02em" }}>
            Tres formas de trabajar contigo
          </h2>
        </R>
        <div className="mt-10 grid md:grid-cols-3 gap-4">
          {cfg.servicios.map((s, i) => (
            <R key={i} delay={i * 90}>
              <div className="h-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7">
                <span className="text-[13px] font-semibold tabular-nums" style={{ color: GOLD }}>0{i + 1}</span>
                <p className="text-white font-semibold text-[18px] mt-3">{s.titulo}</p>
                <p className="text-white/50 text-[14px] mt-2 leading-relaxed">{s.texto}</p>
              </div>
            </R>
          ))}
        </div>
      </section>

      {/* CATÁLOGO PRINCIPAL */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-8">
        <R>
          <Eyebrow>El catálogo</Eyebrow>
          <h2 className="mt-4 font-bold text-white" style={{ fontSize: "clamp(1.9rem, 4.5vw, 3rem)", letterSpacing: "-0.02em" }}>
            Nuestro equipo de {cfg.nombre.toLowerCase()}
          </h2>
          <p className="text-white/45 text-sm mt-3">Da clic en cualquier equipo para abrir sus fotos.</p>
        </R>

        {!data && <p className="mt-10 text-white/40 text-sm">Cargando catálogo…</p>}

        <div className="mt-12 space-y-16">
          {principales.map((g) => (
            <div key={g.label}>
              {principales.length > 1 && (
                <R><h3 className="text-white font-semibold mb-6" style={{ fontSize: "clamp(1.2rem, 2.6vw, 1.6rem)" }}>{g.label}</h3></R>
              )}
              <GrupoGrid equipos={g.equipos} onOpen={setLightbox} />
            </div>
          ))}
        </div>
      </section>

      {/* EQUIPOS RELACIONADOS (acotado) */}
      {relacionados.length > 0 && (
        <section className="max-w-6xl mx-auto px-5 sm:px-8 py-16">
          <R>
            <Eyebrow>Equipos relacionados</Eyebrow>
            <h2 className="mt-4 font-bold text-white" style={{ fontSize: "clamp(1.6rem, 3.8vw, 2.4rem)", letterSpacing: "-0.02em" }}>
              Todo lo que complementa tu {cfg.nombre.toLowerCase()}
            </h2>
          </R>
          <div className="mt-10 space-y-12">
            {relacionados.map((g) => {
              const extra = g.equipos.length - RELACIONADO_MAX;
              return (
                <div key={g.label}>
                  <R>
                    <div className="flex items-end justify-between gap-4 border-b border-white/[0.07] pb-3">
                      <div>
                        <h3 className="text-white font-semibold" style={{ fontSize: "clamp(1.15rem, 2.6vw, 1.5rem)" }}>{g.label}</h3>
                        {g.descripcion && <p className="text-white/45 text-[13px] mt-1 max-w-xl">{g.descripcion}</p>}
                      </div>
                    </div>
                  </R>
                  <div className="mt-6">
                    <GrupoGrid equipos={g.equipos.slice(0, RELACIONADO_MAX)} onOpen={setLightbox} />
                  </div>
                  {extra > 0 && (
                    <a href="/presentacion/inventario" className="inline-flex items-center gap-1.5 mt-5 text-[13px] font-semibold hover:opacity-80 transition-opacity" style={{ color: GOLD }}>
                      +{extra} más en el inventario completo
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* CTA INVENTARIO COMPLETO */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-16">
        <R>
          <div className="rounded-3xl border border-white/[0.08] p-10 sm:p-14 text-center" style={{ background: "radial-gradient(120% 120% at 50% 0%, rgba(179,152,91,0.1) 0%, rgba(255,255,255,0.02) 55%)" }}>
            <h3 className="text-white font-bold" style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.4rem)", letterSpacing: "-0.02em" }}>
              ¿Quieres ver todo lo que tenemos?
            </h3>
            <p className="text-white/55 mt-3 max-w-lg mx-auto">Explora el inventario completo de Mainstage Pro: audio, iluminación, video, escenarios y más.</p>
            <a href="/presentacion/inventario" className="inline-flex items-center gap-2 mt-8 px-7 py-3.5 rounded-full font-semibold text-[14px] transition-transform hover:scale-[1.03]" style={{ background: GOLD, color: "#000" }}>
              Ver inventario completo
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
          </div>
        </R>
      </section>

      {/* OTRAS CATEGORÍAS (carrusel) */}
      {relacionadas.length > 0 && (
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <R>
              <Eyebrow>Explora más</Eyebrow>
              <h2 className="mt-4 font-bold text-white" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)", letterSpacing: "-0.02em" }}>
                Otras categorías
              </h2>
            </R>
          </div>
          <div className="mt-10">
            <CategoriasCarrusel items={relacionadas} />
          </div>
        </section>
      )}

      {/* CTA FINAL */}
      <section className="max-w-4xl mx-auto px-5 sm:px-8 py-28 text-center">
        <R>
          <h2 className="font-bold text-white" style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)", letterSpacing: "-0.025em", lineHeight: 1.05 }}>
            {cfg.cierre}
          </h2>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => iniciar()} disabled={loading} className="px-8 py-4 rounded-full font-semibold text-[15px] transition-transform hover:scale-[1.03] disabled:opacity-60" style={{ background: GOLD, color: "#000" }}>
              {loading ? "Abriendo…" : "Iniciar cotización"}
            </button>
            <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="px-8 py-4 rounded-full font-semibold text-[15px] text-white border border-white/15 hover:border-white/35 transition-colors">
              Escríbenos por WhatsApp
            </a>
          </div>
        </R>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="Mainstage Pro" className="h-6 object-contain opacity-80" draggable={false} />
          <p className="text-white/35 text-xs">Producción técnica de eventos · Audio · Iluminación · Video · Escenarios</p>
        </div>
      </footer>

      {/* LIGHTBOX GALERÍA */}
      {lightbox && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(4,4,4,0.94)", backdropFilter: "blur(10px)" }} onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox.fotos[lightbox.index]} alt={lightbox.titulo} className="max-w-full max-h-[85vh] object-contain rounded-xl" draggable={false} onClick={(e) => e.stopPropagation()} />

          <button onClick={() => setLightbox(null)} className="absolute top-5 right-5 w-11 h-11 rounded-full flex items-center justify-center text-white border border-white/20 hover:border-white/50 transition-colors" aria-label="Cerrar">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>

          {lightbox.fotos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox((l) => l && { ...l, index: (l.index - 1 + l.fotos.length) % l.fotos.length }); }}
                className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center text-white border border-white/20 hover:border-white/50 transition-colors"
                aria-label="Anterior"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox((l) => l && { ...l, index: (l.index + 1) % l.fotos.length }); }}
                className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center text-white border border-white/20 hover:border-white/50 transition-colors"
                aria-label="Siguiente"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </>
          )}

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
            <p className="text-white/70 text-sm">{lightbox.titulo}</p>
            {lightbox.fotos.length > 1 && <p className="text-white/35 text-xs mt-1 tabular-nums">{lightbox.index + 1} / {lightbox.fotos.length}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
