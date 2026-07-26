"use client";

import { useEffect, useMemo, useState } from "react";
import PresentacionNav from "@/components/presentacion/PresentacionNav";
import { WA_URL, useDescubrimiento } from "@/components/presentacion/descubrimiento";
import { R, GOLD, StatCount } from "@/components/presentacion/anim";
import {
  type PresentacionCategoria,
  getPresentacionCategoria,
} from "@/lib/presentacion-categorias";

type EquipoItem = {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  subcategoria: string | null;
  cantidad: number;
  categoria: string;
  fotos: string[];
};

type GrupoData = { label: string; descripcion: string | null; equipos: EquipoItem[] };
type Data = {
  slug: string;
  nombre: string;
  grupos: GrupoData[];
  heroFotos: string[];
  stats: { totalEquipos: number; totalUnidades: number; totalFotos: number; marcas: number };
};

const FONT = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif';

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

function EquipoCard({ eq, onFoto }: { eq: EquipoItem; onFoto: (src: string) => void }) {
  const foto = eq.fotos[0];
  const titulo = [eq.marca, eq.modelo].filter(Boolean).join(" ") || eq.descripcion;
  return (
    <div
      className="group relative rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02] transition-all duration-500 hover:border-white/[0.16]"
      style={{ backdropFilter: "blur(6px)" }}
    >
      {foto ? (
        <button
          onClick={() => onFoto(foto)}
          className="block w-full aspect-[4/3] overflow-hidden bg-black/40"
          aria-label={`Ver ${titulo}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={foto}
            alt={titulo}
            className="w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
            loading="lazy"
            draggable={false}
          />
        </button>
      ) : (
        <div className="w-full aspect-[4/3] flex items-center justify-center bg-gradient-to-br from-white/[0.05] to-transparent">
          <span className="text-5xl font-bold" style={{ color: "rgba(179,152,91,0.35)" }}>
            {(eq.marca || eq.descripcion || "·").charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <div className="p-4">
        <p className="text-white font-semibold text-[15px] leading-snug">{titulo}</p>
        {eq.descripcion && eq.descripcion !== titulo && (
          <p className="text-white/45 text-[12.5px] mt-1 line-clamp-2">{eq.descripcion}</p>
        )}
      </div>
    </div>
  );
}

export default function CategoriaClient({ cfg }: { cfg: PresentacionCategoria }) {
  const [data, setData] = useState<Data | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
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

  const heroFotos = data?.heroFotos ?? [];
  const relacionadas = useMemo(
    () => cfg.relacionadas.map((s) => getPresentacionCategoria(s)).filter(Boolean) as PresentacionCategoria[],
    [cfg.relacionadas]
  );

  return (
    <div style={{ background: "#060606", color: "white", fontFamily: FONT }} className="min-h-screen antialiased">
      <PresentacionNav />

      {/* HERO */}
      <section className="relative min-h-[92vh] flex items-end overflow-hidden">
        {heroFotos.length > 0 ? (
          <HeroSlides fotos={heroFotos} />
        ) : (
          <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 0%, rgba(179,152,91,0.12) 0%, rgba(6,6,6,1) 60%)" }} />
        )}
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pb-20 sm:pb-28 w-full">
          <div style={{ opacity: 1 }}>
            <Eyebrow>{cfg.eyebrow}</Eyebrow>
            <h1
              className="mt-4 font-bold text-white leading-[1.02]"
              style={{ fontSize: "clamp(2.6rem, 7vw, 5.6rem)", letterSpacing: "-0.03em" }}
            >
              {cfg.heroTitulo}
            </h1>
            <p className="mt-6 text-white/65 max-w-2xl" style={{ fontSize: "clamp(1.05rem, 2.2vw, 1.4rem)", lineHeight: 1.5 }}>
              {cfg.heroSub}
            </p>
          </div>
        </div>
      </section>

      {/* IMPORTANCIA */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-24 sm:py-32">
        <R>
          <Eyebrow>Por qué importa</Eyebrow>
          <h2 className="mt-4 font-bold text-white" style={{ fontSize: "clamp(1.9rem, 4.5vw, 3.2rem)", letterSpacing: "-0.02em", lineHeight: 1.08 }}>
            {cfg.importanciaTitulo}
          </h2>
        </R>
        <div className="mt-10 grid gap-6 max-w-3xl">
          {cfg.importanciaParrafos.map((p, i) => (
            <R key={i} delay={i * 90}>
              <p className="text-white/60" style={{ fontSize: "clamp(1.02rem, 2vw, 1.22rem)", lineHeight: 1.65 }}>{p}</p>
            </R>
          ))}
        </div>
      </section>

      {/* PUNTOS */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-24 sm:pb-32">
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
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-24 sm:py-32">
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

      {/* CATÁLOGO POR GRUPO */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-8">
        <R>
          <Eyebrow>El catálogo</Eyebrow>
          <h2 className="mt-4 font-bold text-white" style={{ fontSize: "clamp(1.9rem, 4.5vw, 3rem)", letterSpacing: "-0.02em" }}>
            Nuestro equipo de {cfg.nombre.toLowerCase()}
          </h2>
        </R>

        {!data && (
          <p className="mt-10 text-white/40 text-sm">Cargando catálogo…</p>
        )}

        <div className="mt-14 space-y-20">
          {data?.grupos.filter((g) => g.equipos.length > 0).map((g) => (
            <div key={g.label}>
              <R>
                <div className="flex items-end justify-between gap-4 border-b border-white/[0.07] pb-4">
                  <div>
                    <h3 className="text-white font-semibold" style={{ fontSize: "clamp(1.3rem, 3vw, 1.9rem)", letterSpacing: "-0.015em" }}>{g.label}</h3>
                    {g.descripcion && <p className="text-white/45 text-[13.5px] mt-1 max-w-xl">{g.descripcion}</p>}
                  </div>
                  <span className="text-white/35 text-xs tabular-nums shrink-0">{g.equipos.length} equipos</span>
                </div>
              </R>
              <div className="mt-7 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {g.equipos.map((eq, i) => (
                  <R key={eq.id} delay={Math.min(i, 6) * 60}>
                    <EquipoCard eq={eq} onFoto={setLightbox} />
                  </R>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA INVENTARIO COMPLETO */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-20">
        <R>
          <div className="rounded-3xl border border-white/[0.08] p-10 sm:p-14 text-center" style={{ background: "radial-gradient(120% 120% at 50% 0%, rgba(179,152,91,0.1) 0%, rgba(255,255,255,0.02) 55%)" }}>
            <h3 className="text-white font-bold" style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.4rem)", letterSpacing: "-0.02em" }}>
              ¿Quieres ver todo lo que tenemos?
            </h3>
            <p className="text-white/55 mt-3 max-w-lg mx-auto">Explora el inventario completo de Mainstage Pro: audio, iluminación, video, escenarios y más.</p>
            <a
              href="/presentacion/inventario"
              className="inline-flex items-center gap-2 mt-8 px-7 py-3.5 rounded-full font-semibold text-[14px] transition-transform hover:scale-[1.03]"
              style={{ background: GOLD, color: "#000" }}
            >
              Ver inventario completo
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
          </div>
        </R>
      </section>

      {/* CATEGORÍAS RELACIONADAS */}
      {relacionadas.length > 0 && (
        <section className="max-w-6xl mx-auto px-5 sm:px-8 py-16">
          <R>
            <Eyebrow>Completa tu producción</Eyebrow>
            <h2 className="mt-4 font-bold text-white" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)", letterSpacing: "-0.02em" }}>
              Categorías relacionadas
            </h2>
          </R>
          <div className="mt-10 grid sm:grid-cols-3 gap-4">
            {relacionadas.map((rc, i) => (
              <R key={rc.slug} delay={i * 80}>
                <a
                  href={`/presentacion/categoria/${rc.slug}`}
                  className="group block h-full rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 transition-all duration-400 hover:border-white/[0.2]"
                >
                  <Eyebrow>{rc.eyebrow}</Eyebrow>
                  <p className="text-white font-semibold text-[20px] mt-3 group-hover:translate-x-0.5 transition-transform">{rc.nombre}</p>
                  <p className="text-white/45 text-[13.5px] mt-2 leading-relaxed line-clamp-2">{rc.heroSub}</p>
                  <span className="inline-flex items-center gap-1.5 mt-5 text-[13px] font-semibold" style={{ color: GOLD }}>
                    Ver presentación
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </span>
                </a>
              </R>
            ))}
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
            <button
              onClick={() => iniciar()}
              disabled={loading}
              className="px-8 py-4 rounded-full font-semibold text-[15px] transition-transform hover:scale-[1.03] disabled:opacity-60"
              style={{ background: GOLD, color: "#000" }}
            >
              {loading ? "Abriendo…" : "Iniciar cotización"}
            </button>
            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 rounded-full font-semibold text-[15px] text-white border border-white/15 hover:border-white/35 transition-colors"
            >
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

      {/* LIGHTBOX */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(4,4,4,0.94)", backdropFilter: "blur(8px)" }}
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-xl" draggable={false} />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-5 right-5 w-11 h-11 rounded-full flex items-center justify-center text-white border border-white/20 hover:border-white/50 transition-colors"
            aria-label="Cerrar"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
