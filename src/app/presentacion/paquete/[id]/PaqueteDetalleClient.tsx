"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PresentacionNav from "@/components/presentacion/PresentacionNav";
import { usePresentacionEdit, EditableText } from "@/components/presentacion/editable";

const GOLD = "#B3985B";
const WA_BASE = "https://wa.me/524461432565?text=";
function wa(msg: string) { return WA_BASE + encodeURIComponent(msg); }

type Imagen = { url: string; tipo: string };
type ProductoEquipo = { cantidad: number; descripcion: string | null; marca: string | null; modelo: string | null; imagenUrl: string | null; categoria: string | null };
type Item = {
  tipo: string; cantidad: number;
  equipo: { descripcion: string | null; marca: string | null; modelo: string | null; imagenUrl: string | null; categoria: string | null } | null;
  producto: { nombre: string; imagenUrl: string | null; categoria: string | null; equipos: ProductoEquipo[] } | null;
};
type Concepto = { tipo: string; descripcion: string };
type ItemVista = { label: string; cantidad: number; imagenUrl: string | null };

// Frase emocional por defecto según el tipo de evento (editable en vivo).
const FRASE_EMOCIONAL: Record<string, string> = {
  SOCIAL: "Una boda ocurre una sola vez. Nuestro trabajo es que cada momento —la entrada, el primer baile, el último brindis— se escuche y se sienta tal como lo soñaron.",
  MUSICAL: "El escenario se recuerda por lo que se siente. Cuidamos cada detalle para que tu presentación suene y se vea a la altura del momento.",
  EMPRESARIAL: "Una marca también se vive en vivo. Producimos cada detalle para que tu mensaje llegue con claridad, fuerza y presencia.",
};
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
function equipoLabel(e: { descripcion: string | null; marca: string | null; modelo: string | null }): string {
  return e.descripcion || [e.marca, e.modelo].filter(Boolean).join(" ") || "Equipo";
}
// Aplana los items del paquete a nivel de equipo: los productos se expanden en
// sus equipos principales (sin accesorios), para que las miniaturas muestren el
// equipo real que compone el paquete.
function equiposDePaquete(items: Item[]): { categoria: string; label: string; cantidad: number; imagenUrl: string | null }[] {
  const out: { categoria: string; label: string; cantidad: number; imagenUrl: string | null }[] = [];
  for (const it of items) {
    if (it.tipo === "PRODUCTO" && it.producto) {
      for (const pe of it.producto.equipos) {
        out.push({
          categoria: pe.categoria || "Equipo técnico",
          label: equipoLabel(pe),
          cantidad: Math.max(1, it.cantidad) * Math.max(1, pe.cantidad),
          imagenUrl: pe.imagenUrl,
        });
      }
    } else if (it.equipo) {
      out.push({
        categoria: it.equipo.categoria || "Equipo técnico",
        label: equipoLabel(it.equipo),
        cantidad: Math.max(1, it.cantidad),
        imagenUrl: it.equipo.imagenUrl,
      });
    }
  }
  return out;
}
// Agrupa por categoría y fusiona equipos repetidos (suma cantidades),
// preservando el orden de aparición.
function agruparPorCategoria(items: Item[]): { categoria: string; items: ItemVista[] }[] {
  const orden: string[] = [];
  const mapa = new Map<string, Map<string, ItemVista>>();
  for (const e of equiposDePaquete(items)) {
    if (!mapa.has(e.categoria)) { mapa.set(e.categoria, new Map()); orden.push(e.categoria); }
    const sub = mapa.get(e.categoria)!;
    const prev = sub.get(e.label);
    if (prev) prev.cantidad += e.cantidad;
    else sub.set(e.label, { label: e.label, cantidad: e.cantidad, imagenUrl: e.imagenUrl });
  }
  return orden.map((categoria) => ({ categoria, items: Array.from(mapa.get(categoria)!.values()) }));
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

export default function PaqueteDetalleClient({
  paquete: p, galeria, descCategorias, overrides,
}: {
  paquete: Paquete; galeria: Foto[]; descCategorias: Record<string, string>; overrides: Record<string, string>;
}) {
  const edit = usePresentacionEdit(overrides);
  const renders = p.imagenes.filter((im) => im.tipo === "RENDER");
  const refs = p.imagenes.filter((im) => im.tipo !== "RENDER");
  // Orden de la galería del paquete: renders primero (protagonistas), luego fotos.
  const media = [...renders, ...refs];
  const [activa, setActiva] = useState(0);
  const principal = media[activa] ?? media[0] ?? null;

  const subtipos = parseJSON(p.subtiposEvento);
  const gruposEquipo = agruparPorCategoria(p.items);
  // Ocultamos "1 comida por persona" (se confirma aparte, no es parte del show técnico).
  const servicios = p.conceptos.map((c) => c.descripcion).filter((d) => d && !/comida\s*por\s*persona/i.test(d));
  const confirmarMsg = `Hola, quiero confirmar el paquete "${p.nombre}" para mi evento. ¿Cómo continuamos?`;
  const fraseFallback = FRASE_EMOCIONAL[p.tipoEvento] ?? FRASE_EMOCIONAL.SOCIAL;

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

            {p.descripcion && (
              <div className="mb-6">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/30 mb-3">La experiencia</p>
                <p className="text-white/70 text-[15px] leading-relaxed whitespace-pre-line">{p.descripcion}</p>
              </div>
            )}

            {p.propuestaValor && (
              <div className="rounded-2xl p-6 mb-8" style={{ border: `1px solid ${GOLD}33`, background: "rgba(179,152,91,0.05)" }}>
                <p className="text-[11px] uppercase tracking-[0.14em] mb-2.5" style={{ color: GOLD }}>Por qué elegirlo</p>
                <p className="text-white/75 text-[15px] leading-relaxed whitespace-pre-line">{p.propuestaValor}</p>
              </div>
            )}

            <a href={wa(confirmarMsg)} target="_blank" rel="noopener noreferrer"
              className="inline-block text-sm font-semibold px-8 py-4 rounded-full transition-all hover:scale-105" style={{ background: GOLD, color: "#000" }}>
              Confirmar paquete
            </a>
          </R>
        </div>
      </section>

      {/* Frase emocional (editable en vivo) */}
      <section className="mx-auto max-w-4xl px-6 py-10 sm:py-14">
        <R>
          <div className="relative text-center">
            <span aria-hidden className="block font-serif leading-none mb-2 select-none" style={{ fontSize: "3.5rem", color: `${GOLD}55` }}>“</span>
            <EditableText
              edit={edit}
              okey={`paquete:${p.id}:fraseEmocional`}
              fallback={fraseFallback}
              as="p"
              multiline
              className="text-white/85 leading-relaxed"
              style={{ fontSize: "clamp(1.15rem, 2.4vw, 1.7rem)", fontWeight: 300, letterSpacing: "-0.01em" }}
            />
            <div className="mx-auto mt-6 h-px w-16" style={{ background: `${GOLD}66` }} />
          </div>
        </R>
      </section>

      {/* Qué incluye — miniaturas por categoría */}
      {(gruposEquipo.length > 0 || servicios.length > 0) && (
        <section className="mx-auto max-w-6xl px-6 py-14">
          <R>
            <p className="text-[11px] uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>Contenido del paquete</p>
            <h2 className="font-bold text-white leading-[1.05] mb-10" style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)", letterSpacing: "-0.025em" }}>
              Qué incluye.
            </h2>
          </R>

          {gruposEquipo.map((grupo, gi) => {
            const descKey = `paquete:${p.id}:catdesc:${grupo.categoria}`;
            const descBase = descCategorias[grupo.categoria] ?? "";
            const mostrarDesc = descBase || edit.isAdmin;
            return (
            <R key={grupo.categoria} delay={gi * 60} className="mb-12">
              <p className="text-[11px] uppercase tracking-[0.14em] mb-2" style={{ color: GOLD }}>{grupo.categoria}</p>
              {mostrarDesc && (
                <EditableText
                  edit={edit}
                  okey={descKey}
                  fallback={descBase}
                  as="p"
                  multiline
                  className="text-white/55 text-[14.5px] leading-relaxed max-w-3xl mb-5"
                />
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {grupo.items.map((it, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden group" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                    <div className="relative aspect-square overflow-hidden">
                      {it.imagenUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={it.imagenUrl} alt={it.label} loading="lazy" draggable={false}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: "radial-gradient(circle at 35% 25%, rgba(179,152,91,0.18), #0c0c0c 70%)" }}>
                          <span className="text-2xl font-bold text-white/15">{it.label.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      {it.cantidad > 1 && (
                        <span className="absolute top-2 right-2 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: GOLD, color: "#000" }}>
                          ×{it.cantidad}
                        </span>
                      )}
                    </div>
                    <p className="text-[12.5px] leading-snug text-white/70 px-3 py-2.5">{it.label}</p>
                  </div>
                ))}
              </div>
            </R>
            );
          })}

          {servicios.length > 0 && (
            <R delay={80} className="mt-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/35 mb-4">Servicios y operación</p>
              <div className="flex flex-wrap gap-2.5">
                {servicios.map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-2 text-[14px] text-white/70 px-4 py-2 rounded-full" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
                    {t}
                  </span>
                ))}
              </div>
            </R>
          )}
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
              Cuéntanos la fecha y el lugar. Confirmamos este paquete y lo ajustamos a tu evento.
            </p>
            <a href={wa(confirmarMsg)} target="_blank" rel="noopener noreferrer"
              className="inline-block text-sm font-semibold px-9 py-4 rounded-full transition-all hover:scale-105" style={{ background: GOLD, color: "#000" }}>
              Confirmar paquete
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
