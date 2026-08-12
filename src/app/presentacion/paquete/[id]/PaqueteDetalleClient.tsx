"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PresentacionNav from "@/components/presentacion/PresentacionNav";

const GOLD = "#B3985B";
const WA_BASE = "https://wa.me/524461432565?text=";
function wa(msg: string) { return WA_BASE + encodeURIComponent(msg); }

type Imagen = { url: string; tipo: string };
type Item = {
  tipo: string; cantidad: number;
  equipo: { descripcion: string | null; marca: string | null; modelo: string | null } | null;
  producto: { nombre: string } | null;
};
type Concepto = { tipo: string; descripcion: string };
type Paquete = {
  id: string; nombre: string; tipoEvento: string; rangoPersonas: string | null;
  subtiposEvento: string | null; resumen: string | null; descripcion: string | null;
  propuestaValor: string | null; imagenes: Imagen[]; items: Item[]; conceptos: Concepto[];
};
type Foto = { src: string; caption: string };

const TIPO_LABEL: Record<string, string> = { SOCIAL: "Evento social", MUSICAL: "Evento musical", EMPRESARIAL: "Evento empresarial" };

function parseJSON(s: string | null): string[] {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}
function itemLabel(it: Item): string {
  if (it.tipo === "PRODUCTO" && it.producto) return it.producto.nombre;
  if (it.equipo) return it.equipo.descripcion || [it.equipo.marca, it.equipo.modelo].filter(Boolean).join(" ") || "Equipo";
  return "Equipo";
}

function useReveal(threshold = 0.14) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, vis };
}
function R({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, vis } = useReveal();
  return (
    <div ref={ref} className={className}
      style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(24px)", transition: `opacity 0.7s ${delay}ms ease, transform 0.7s ${delay}ms ease` }}>
      {children}
    </div>
  );
}

export default function PaqueteDetalleClient({ paquete: p, galeria }: { paquete: Paquete; galeria: Foto[] }) {
  const renders = p.imagenes.filter((im) => im.tipo === "RENDER");
  const refs = p.imagenes.filter((im) => im.tipo !== "RENDER");
  // Orden de la galería del paquete: renders primero (protagonistas), luego fotos.
  const media = [...renders, ...refs];
  const [activa, setActiva] = useState(0);
  const principal = media[activa] ?? media[0] ?? null;

  const subtipos = parseJSON(p.subtiposEvento);
  const equipos = p.items.map((it) => `${it.cantidad > 1 ? it.cantidad + "× " : ""}${itemLabel(it)}`).filter(Boolean);
  const servicios = p.conceptos.map((c) => c.descripcion).filter(Boolean);

  return (
    <div className="min-h-screen bg-[#080808] text-white" style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      <style>{`
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #080808; }
        ::-webkit-scrollbar-thumb { background: rgba(179,152,91,0.35); border-radius: 2px; }
      `}</style>

      <PresentacionNav />

      {/* Hero + media */}
      <section className="mx-auto max-w-6xl px-6 pt-28 pb-12 sm:pt-36">
        <Link href="/presentacion/paquetes" className="inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white transition-colors mb-8">
          ← Paquetes
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* Media */}
          <R>
            <div className="rounded-3xl overflow-hidden aspect-[4/3] relative" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
              {principal ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={principal.url} alt={p.nombre} draggable={false} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{ background: "radial-gradient(circle at 30% 20%, rgba(179,152,91,0.22), #0c0c0c 65%)" }} />
              )}
              {principal?.tipo === "RENDER" && (
                <span className="absolute top-4 left-4 text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ background: GOLD, color: "#000" }}>
                  Render 3D
                </span>
              )}
            </div>
            {media.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2.5">
                {media.map((im, i) => (
                  <button key={i} onClick={() => setActiva(i)}
                    className="relative aspect-square rounded-xl overflow-hidden transition-all"
                    style={{ border: `1px solid ${i === activa ? GOLD : "rgba(255,255,255,0.08)"}`, opacity: i === activa ? 1 : 0.6 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={im.url} alt="" draggable={false} className="w-full h-full object-cover" />
                    {im.tipo === "RENDER" && (
                      <span className="absolute bottom-0.5 left-0.5 text-[7px] font-bold px-1 py-0.5 rounded" style={{ background: GOLD, color: "#000" }}>3D</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </R>

          {/* Info */}
          <R delay={80}>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: GOLD }}>{TIPO_LABEL[p.tipoEvento] ?? "Paquete"}</span>
              {p.rangoPersonas && (
                <span className="text-[11px] font-medium px-3 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)" }}>
                  {p.rangoPersonas} personas
                </span>
              )}
            </div>
            <h1 className="font-bold leading-[1.05] tracking-tight mb-4" style={{ fontSize: "clamp(2rem, 4.5vw, 3.2rem)" }}>{p.nombre}</h1>
            {p.resumen && <p className="text-white/55 text-base sm:text-lg leading-relaxed mb-5">{p.resumen}</p>}

            {subtipos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-7">
                {subtipos.map((s, i) => (
                  <span key={i} className="text-[12px] text-white/60 px-3 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>{s}</span>
                ))}
              </div>
            )}

            <a href={wa(`Hola, me interesa el paquete "${p.nombre}". ¿Me pueden dar más información y cotización?`)} target="_blank" rel="noopener noreferrer"
              className="inline-block text-sm font-semibold px-8 py-4 rounded-full transition-all hover:scale-105" style={{ background: GOLD, color: "#000" }}>
              Solicitar este paquete
            </a>
          </R>
        </div>
      </section>

      {/* Descripción y propuesta de valor */}
      {(p.descripcion || p.propuestaValor) && (
        <section className="mx-auto max-w-6xl px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {p.descripcion && (
              <R>
                <div className="rounded-3xl p-7 h-full" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/30 mb-3">La experiencia</p>
                  <p className="text-white/70 text-[15px] leading-relaxed whitespace-pre-line">{p.descripcion}</p>
                </div>
              </R>
            )}
            {p.propuestaValor && (
              <R delay={80}>
                <div className="rounded-3xl p-7 h-full" style={{ border: `1px solid ${GOLD}33`, background: "rgba(179,152,91,0.05)" }}>
                  <p className="text-[11px] uppercase tracking-[0.14em] mb-3" style={{ color: GOLD }}>Por qué elegirlo</p>
                  <p className="text-white/75 text-[15px] leading-relaxed whitespace-pre-line">{p.propuestaValor}</p>
                </div>
              </R>
            )}
          </div>
        </section>
      )}

      {/* Qué incluye */}
      {(equipos.length > 0 || servicios.length > 0) && (
        <section className="mx-auto max-w-6xl px-6 py-14">
          <R>
            <p className="text-[11px] uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>Contenido del paquete</p>
            <h2 className="font-bold text-white leading-[1.05] mb-10" style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)", letterSpacing: "-0.025em" }}>
              Qué incluye.
            </h2>
          </R>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            {equipos.length > 0 && (
              <R>
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/30 mb-4">Equipo y montaje</p>
                <ul className="space-y-2.5">
                  {equipos.map((t, i) => (
                    <li key={i} className="flex items-start gap-3 text-[15px] text-white/70">
                      <span className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
                      {t}
                    </li>
                  ))}
                </ul>
              </R>
            )}
            {servicios.length > 0 && (
              <R delay={80}>
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/30 mb-4">Servicios y operación</p>
                <ul className="space-y-2.5">
                  {servicios.map((t, i) => (
                    <li key={i} className="flex items-start gap-3 text-[15px] text-white/70">
                      <span className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
                      {t}
                    </li>
                  ))}
                </ul>
              </R>
            )}
          </div>
        </section>
      )}

      {/* Galería de eventos */}
      {galeria.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-14">
          <R>
            <p className="text-[11px] uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>Nuestro trabajo</p>
            <h2 className="font-bold text-white leading-[1.05] mb-3" style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)", letterSpacing: "-0.025em" }}>
              {TIPO_LABEL[p.tipoEvento]?.replace("Evento", "Eventos") ?? "Eventos"} que hemos producido.
            </h2>
            <p className="text-white/40 text-sm sm:text-base leading-relaxed max-w-2xl mb-10">
              Así se ve la producción de Mainstage Pro en montajes reales.
            </p>
          </R>
          <div className="columns-2 sm:columns-3 gap-3 [column-fill:_balance]">
            {galeria.map((f, i) => (
              <R key={i} delay={(i % 6) * 40} className="mb-3 break-inside-avoid">
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.src} alt={f.caption} loading="lazy" draggable={false} className="w-full object-cover" />
                </div>
              </R>
            ))}
          </div>
          <div className="mt-10">
            <Link href="/presentacion/galeria" className="text-sm font-medium transition-colors hover:text-white" style={{ color: GOLD }}>
              Ver galería completa →
            </Link>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <R>
            <h2 className="font-bold text-white leading-[1.08] mb-5" style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)", letterSpacing: "-0.025em" }}>
              ¿Listo para tu evento?
            </h2>
            <p className="text-white/45 text-sm sm:text-base leading-relaxed mb-9 max-w-xl mx-auto">
              Cuéntanos la fecha y el lugar. Ajustamos este paquete a tu evento y te enviamos una cotización.
            </p>
            <a href={wa(`Hola, me interesa el paquete "${p.nombre}". ¿Me pueden dar más información y cotización?`)} target="_blank" rel="noopener noreferrer"
              className="inline-block text-sm font-semibold px-9 py-4 rounded-full transition-all hover:scale-105" style={{ background: GOLD, color: "#000" }}>
              Solicitar cotización
            </a>
          </R>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-6 py-10">
        <div className="max-w-6xl mx-auto text-center text-xs text-white/30">
          Mainstage Pro · Producción técnica de eventos
        </div>
      </footer>
    </div>
  );
}
