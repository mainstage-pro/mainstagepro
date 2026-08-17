"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import PresentacionNav from "@/components/presentacion/PresentacionNav";
import { usePresentacionEdit, EditableText } from "@/components/presentacion/editable";
import { desglosePaquete, money, type GrupoDesglose } from "@/lib/paquete-precio";

const GOLD = "#B3985B";
const WA_BASE = "https://wa.me/524461432565?text=";
function wa(msg: string) { return WA_BASE + encodeURIComponent(msg); }

type Imagen = { url: string; tipo: string };
type Foto = { src: string; caption: string };
type ProductoEquipo = { cantidad: number; descripcion: string | null; marca: string | null; modelo: string | null; imagenUrl: string | null; categoria: string | null; galeria: Foto[] };
type Item = {
  tipo: string; cantidad: number;
  equipo: { descripcion: string | null; marca: string | null; modelo: string | null; precioRenta: number; imagenUrl: string | null; categoria: string | null; galeria: Foto[] } | null;
  producto: { nombre: string; precioFinal: number; imagenUrl: string | null; categoria: string | null; equipos: ProductoEquipo[] } | null;
};
type Concepto = { tipo: string; descripcion: string; cantidad: number; dias: number; precioUnitario: number };
type AdicionalElemento = { nombre: string; cantidad: number };
type Adicional = { id: string; nombre: string; descripcion: string | null; imagenUrl: string | null; disciplina: string | null; elementos: AdicionalElemento[] };
type ItemVista = { titulo: string; descripcion: string; cantidad: number; imagenUrl: string | null; galeria: Foto[] };

// Frase emocional por defecto según el tipo de evento (editable en vivo).
// Se mantienen breves para que caigan en ~2 líneas centradas.
const FRASE_EMOCIONAL: Record<string, string> = {
  SOCIAL: "Una boda ocurre una sola vez. Hacemos que cada momento se escuche y se sienta tal como lo soñaron.",
  MUSICAL: "El escenario se recuerda por lo que se siente. Cuidamos cada detalle para estar a la altura del show.",
  EMPRESARIAL: "Tu marca también se vive en vivo. Producimos cada detalle para que tu mensaje llegue con fuerza.",
};
type Paquete = {
  id: string; nombre: string; tipoEvento: string; rangoPersonas: string | null;
  subtiposEvento: string | null; resumen: string | null; descripcion: string | null;
  propuestaValor: string | null; imagenes: Imagen[]; items: Item[]; conceptos: Concepto[];
  adicionales: Adicional[];
};

const TIPO_LABEL: Record<string, string> = { SOCIAL: "Evento social", MUSICAL: "Evento musical", EMPRESARIAL: "Evento empresarial" };

function parseJSON(s: string | null): string[] {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}
type EquipoBase = { descripcion: string | null; marca: string | null; modelo: string | null };
// Título de la miniatura = marca + modelo del equipo (lo que el cliente reconoce).
function equipoTitulo(e: EquipoBase): string {
  const modelo = [e.marca, e.modelo].filter(Boolean).join(" ").trim();
  return modelo || (e.descripcion || "").trim() || "Equipo";
}
// Descripción simple debajo del modelo. Solo se muestra si aporta algo distinto
// al título (evita repetir el modelo cuando el equipo no tiene marca/modelo).
function equipoDesc(e: EquipoBase): string {
  const titulo = equipoTitulo(e);
  const desc = (e.descripcion || "").trim();
  return desc && desc !== titulo ? desc : "";
}
// Aplana los items del paquete a nivel de equipo: los productos se expanden en
// sus equipos principales (sin accesorios), para que las miniaturas muestren el
// equipo real que compone el paquete.
function equiposDePaquete(items: Item[]): (ItemVista & { categoria: string })[] {
  const out: (ItemVista & { categoria: string })[] = [];
  for (const it of items) {
    if (it.tipo === "PRODUCTO" && it.producto) {
      for (const pe of it.producto.equipos) {
        out.push({
          categoria: pe.categoria || "Equipo técnico",
          titulo: equipoTitulo(pe),
          descripcion: equipoDesc(pe),
          cantidad: Math.max(1, it.cantidad) * Math.max(1, pe.cantidad),
          imagenUrl: pe.imagenUrl,
          galeria: pe.galeria ?? [],
        });
      }
    } else if (it.equipo) {
      out.push({
        categoria: it.equipo.categoria || "Equipo técnico",
        titulo: equipoTitulo(it.equipo),
        descripcion: equipoDesc(it.equipo),
        cantidad: Math.max(1, it.cantidad),
        imagenUrl: it.equipo.imagenUrl,
        galeria: it.equipo.galeria ?? [],
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
    const prev = sub.get(e.titulo);
    if (prev) { prev.cantidad += e.cantidad; if (prev.galeria.length === 0 && e.galeria.length > 0) prev.galeria = e.galeria; }
    else sub.set(e.titulo, { titulo: e.titulo, descripcion: e.descripcion, cantidad: e.cantidad, imagenUrl: e.imagenUrl, galeria: e.galeria });
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

// Trazo por familia técnica: cuando el adicional no tiene foto, un ícono de su
// disciplina comunica más que la inicial del nombre.
const ICONO_DISCIPLINA: Record<string, string> = {
  AUDIO: "M4 10v4m4-7v10m4-13v16m4-13v10m4-7v4",
  ILUMINACION: "M9 3h6l2 6H7l2-6Zm-2 6-3 12h16L17 9M12 13v4",
  VIDEO: "M3 5.5h18v11H3v-11Zm5.5 15h7M12 16.5v4",
  DJ: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
  ESTRUCTURA: "M4 20V5m16 15V5M4 5h16M4 20h16M4 5l16 15M20 5 4 20",
  GENERICO: "M12 4v16m-8-8h16",
};

function IconoDisciplina({ disciplina }: { disciplina: string | null }) {
  const d = (disciplina && ICONO_DISCIPLINA[disciplina]) || ICONO_DISCIPLINA.GENERICO;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round"
      className="w-7 h-7" style={{ opacity: 0.5 }} aria-hidden>
      <path d={d} />
    </svg>
  );
}

// Tarjeta compacta de adicional: miniatura + nombre y, al abrir, el contenido real
// desplegado en la misma página. Los admins pueden subir la foto desde aquí.
function AdicionalCard({ a, isAdmin }: { a: Adicional; isAdmin: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [imagen, setImagen] = useState(a.imagenUrl);
  const [subiendo, setSubiendo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const n = a.elementos.length;

  async function subir(files: FileList | null) {
    if (!files || !files.length) return;
    setSubiendo(true);
    try {
      // Ruta única: /api/upload/token no agrega sufijo aleatorio y dos fotos con el
      // mismo nombre chocarían.
      const path = `adicionales/${a.id}-${Date.now()}-${files[0].name}`;
      const blob = await upload(path, files[0], { access: "public", handleUploadUrl: "/api/upload/token" });
      const res = await fetch(`/api/catalogo/adicionales/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagenUrl: blob.url }),
      });
      if (!res.ok) throw new Error(`error ${res.status}`);
      setImagen(blob.url);
    } catch (err) {
      alert("No se pudo guardar la imagen: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubiendo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
      <button
        type="button"
        onClick={() => n > 0 && setAbierto((v) => !v)}
        aria-expanded={n > 0 ? abierto : undefined}
        className="w-full flex items-center gap-4 p-3.5 text-left"
        style={{ cursor: n > 0 ? "pointer" : "default" }}
      >
        <div className="relative w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0">
          {imagen ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={imagen} alt={a.nombre} loading="lazy" draggable={false} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: "radial-gradient(circle at 35% 25%, rgba(179,152,91,0.14), #0c0c0c 75%)" }}>
              <IconoDisciplina disciplina={a.disciplina} />
            </div>
          )}
          {isAdmin && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); } }}
              className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold opacity-0 hover:opacity-100 transition-opacity"
              style={{ background: "rgba(0,0,0,0.6)", color: GOLD }}
            >
              {subiendo ? "…" : "⤢ Foto"}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-white/90 leading-snug">{a.nombre}</p>
          {a.descripcion && <p className="text-[13px] text-white/45 leading-relaxed mt-1 line-clamp-2">{a.descripcion}</p>}
          {n > 0 && (
            <span className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-medium" style={{ color: GOLD }}>
              {abierto ? "Ocultar opciones" : n === 1 ? "Ver la opción" : `Ver las ${n} opciones`}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                className="w-3.5 h-3.5 transition-transform" style={{ transform: abierto ? "rotate(180deg)" : "none" }} aria-hidden>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          )}
        </div>
      </button>

      {n > 0 && (
        <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: abierto ? "1fr" : "0fr" }}>
          <div className="overflow-hidden">
            <ul className="px-3.5 pb-3.5 pt-1 space-y-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {a.elementos.map((e, i) => (
                <li key={`${e.nombre}-${i}`} className="flex items-baseline gap-2.5 text-[13px] pt-1.5">
                  <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: GOLD }} />
                  <span className="text-white/65 leading-snug">
                    {e.cantidad > 1 && <span className="font-semibold tabular-nums" style={{ color: GOLD }}>{e.cantidad}× </span>}
                    {e.nombre}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {isAdmin && <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => subir(e.target.files)} />}
    </div>
  );
}

// Desglose de precio del paquete, desplegable en la misma página. Va pegado al total
// porque es ahí donde el cliente se pregunta qué está pagando; dejarlo cerrado por
// defecto mantiene el precio como protagonista.
function DesglosePrecio({ grupos, total }: { grupos: GrupoDesglose[]; total: number }) {
  const [abierto, setAbierto] = useState(false);
  const piezas = grupos.reduce((s, g) => s + g.lineas.length, 0);

  return (
    <div className="mt-4 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.02)" }}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03] active:bg-white/[0.05]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0" aria-hidden>
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] sm:text-sm font-semibold text-white/85">Lista de equipos y precios</span>
          <span className="block text-[11px] text-white/40 mt-0.5">{piezas} conceptos · desglose completo</span>
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
          className="w-4 h-4 shrink-0 transition-transform duration-300" style={{ transform: abierto ? "rotate(180deg)" : "none" }} aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: abierto ? "1fr" : "0fr" }}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            {grupos.map((g) => (
              <div key={g.titulo} className="pt-3.5">
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: GOLD }}>{g.titulo}</span>
                  <span className="text-[11px] text-white/35 tabular-nums shrink-0">{money(g.subtotal)}</span>
                </div>
                <ul className="space-y-1.5">
                  {g.lineas.map((l, i) => (
                    <li key={`${l.descripcion}-${i}`} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 flex-1">
                        <span className="text-[13px] text-white/70 leading-snug">
                          <span className="font-semibold tabular-nums" style={{ color: GOLD }}>{l.cantidad}× </span>
                          {l.descripcion}
                        </span>
                        <span className="block text-[10.5px] text-white/30 tabular-nums mt-0.5">
                          {money(l.precioUnitario)} c/u{l.dias > 1 ? ` · ${l.dias} días` : ""}
                        </span>
                      </span>
                      <span className="text-[13px] text-white/75 tabular-nums shrink-0">{money(l.subtotal)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-3 mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.09)" }}>
              <span className="text-[11px] uppercase tracking-[0.14em] text-white/50">Total</span>
              <span className="text-[15px] font-bold tabular-nums" style={{ color: GOLD }}>{money(total)}</span>
            </div>
            <p className="text-[10.5px] text-white/25 leading-relaxed mt-2.5">Precios de lista antes de IVA. La logística y el montaje se ajustan a tu sede.</p>
          </div>
        </div>
      </div>
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

  // Lightbox de fotos por equipo (cómo se ve en evento). Abre/cierra fácil,
  // pensado sobre todo para móvil: tap fuera o la X cierra, flechas/swipe navegan.
  const [lightbox, setLightbox] = useState<{ fotos: Foto[]; titulo: string; i: number } | null>(null);
  const touchX = useRef<number | null>(null);
  const irLightbox = (d: number) =>
    setLightbox((s) => (s ? { ...s, i: (s.i + d + s.fotos.length) % s.fotos.length } : s));
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setLightbox(null);
      else if (ev.key === "ArrowRight") irLightbox(1);
      else if (ev.key === "ArrowLeft") irLightbox(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [lightbox]);

  const subtipos = parseJSON(p.subtiposEvento);
  const gruposEquipo = agruparPorCategoria(p.items);
  // Ocultamos "1 comida por persona" (se confirma aparte, no es parte del show técnico).
  const servicios = p.conceptos.map((c) => c.descripcion).filter((d) => d && !/comida\s*por\s*persona/i.test(d));
  const { grupos: gruposPrecio, total } = desglosePaquete(p.items, p.conceptos);
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
              <div className="rounded-2xl p-6" style={{ border: `1px solid ${GOLD}33`, background: "rgba(179,152,91,0.05)" }}>
                <p className="text-[11px] uppercase tracking-[0.14em] mb-2.5" style={{ color: GOLD }}>Por qué elegirlo</p>
                <p className="text-white/75 text-[15px] leading-relaxed whitespace-pre-line">{p.propuestaValor}</p>
              </div>
            )}

            {total > 0 && (
              <div className="mt-6">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-white/40">Total del paquete</span>
                  <span className="font-bold leading-none" style={{ fontSize: "clamp(1.8rem, 3.6vw, 2.4rem)", color: GOLD, letterSpacing: "-0.02em" }}>{money(total)}</span>
                </div>
                <DesglosePrecio grupos={gruposPrecio} total={total} />
              </div>
            )}
          </R>
        </div>
      </section>

      {/* Frase emocional (editable en vivo) */}
      <section className="mx-auto max-w-2xl px-6 py-10 sm:py-14">
        <R>
          <div className="relative text-center">
            <span aria-hidden className="block font-serif leading-none mb-1 select-none" style={{ fontSize: "3rem", color: `${GOLD}55` }}>“</span>
            <EditableText
              edit={edit}
              okey={`paquete:${p.id}:fraseEmocional`}
              fallback={fraseFallback}
              as="p"
              multiline
              className="text-white/85 leading-snug mx-auto"
              style={{ fontSize: "clamp(1.2rem, 2.6vw, 1.65rem)", fontWeight: 300, letterSpacing: "-0.01em", textWrap: "balance", maxWidth: "34rem" }}
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
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 sm:gap-3">
                {grupo.items.map((it, i) => {
                  const tieneGaleria = it.galeria.length > 0;
                  return (
                  <div key={i} className="rounded-xl overflow-hidden group" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                    <div className="relative aspect-square overflow-hidden">
                      {it.imagenUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={it.imagenUrl} alt={it.titulo} loading="lazy" draggable={false}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: "radial-gradient(circle at 35% 25%, rgba(179,152,91,0.18), #0c0c0c 70%)" }}>
                          <span className="text-2xl font-bold text-white/15">{it.titulo.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      {it.cantidad > 1 && (
                        <span className="absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: GOLD, color: "#000" }}>
                          ×{it.cantidad}
                        </span>
                      )}
                      {tieneGaleria && (
                        <button
                          type="button"
                          onClick={() => setLightbox({ fotos: it.galeria, titulo: it.titulo, i: 0 })}
                          className="absolute inset-0 flex items-end justify-start p-1.5 transition-colors hover:bg-black/20 active:bg-black/30"
                          aria-label={`Ver fotos de ${it.titulo} en evento`}
                        >
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full backdrop-blur-md" style={{ background: "rgba(0,0,0,0.55)", color: "#fff", border: `1px solid ${GOLD}66` }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                            {it.galeria.length}
                          </span>
                        </button>
                      )}
                    </div>
                    <div className="px-2.5 py-2">
                      <p className="text-[12px] font-medium leading-snug text-white/90">{it.titulo}</p>
                      {it.descripcion && (
                        <p className="text-[11px] leading-snug text-white/45 mt-0.5">{it.descripcion}</p>
                      )}
                    </div>
                  </div>
                  );
                })}
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

          {total > 0 && (
            <R delay={120} className="mt-12">
              <div className="rounded-2xl p-6 sm:p-7 flex flex-wrap items-center justify-between gap-4"
                style={{ border: `1px solid ${GOLD}33`, background: "linear-gradient(120deg, rgba(179,152,91,0.08), rgba(179,152,91,0.02))" }}>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] mb-1.5" style={{ color: GOLD }}>Todo esto incluido</p>
                  <p className="text-white/55 text-sm leading-relaxed max-w-md">Equipo, servicios y operación técnica del paquete, en un solo total.</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/40 mb-1">Total del paquete</p>
                  <p className="font-bold leading-none" style={{ fontSize: "clamp(1.9rem, 4vw, 2.6rem)", color: GOLD, letterSpacing: "-0.02em" }}>{money(total)}</p>
                </div>
              </div>
            </R>
          )}
        </section>
      )}

      {/* Adicionales sugeridos — complementos opcionales del paquete */}
      {p.adicionales.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-14">
          <R>
            <p className="text-[11px] uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>Lleva tu evento más allá</p>
            <h2 className="font-bold text-white leading-[1.05] mb-3" style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)", letterSpacing: "-0.025em" }}>
              Adicionales sugeridos.
            </h2>
            <p className="text-white/40 text-sm sm:text-base leading-relaxed max-w-2xl mb-10">
              Complementos opcionales que elevan la producción. Agrégalos al confirmar tu paquete.
            </p>
          </R>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {p.adicionales.map((a, i) => (
              <R key={a.id} delay={(i % 2) * 60}>
                <AdicionalCard a={a} isAdmin={edit.isAdmin} />
              </R>
            ))}
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

      {/* Lightbox: fotos del equipo en evento */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex flex-col"
          style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}
          onClick={() => setLightbox(null)}
        >
          <div className="flex items-center justify-between px-5 py-4 shrink-0">
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{lightbox.titulo}</p>
              <p className="text-white/45 text-xs">{lightbox.i + 1} / {lightbox.fotos.length} · en evento</p>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-white/80 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.08)" }} aria-label="Cerrar galería">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center px-4 pb-4 min-h-0 relative"
            onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              if (touchX.current == null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              if (Math.abs(dx) > 40) irLightbox(dx < 0 ? 1 : -1);
              touchX.current = null;
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.fotos[lightbox.i].src} alt={lightbox.fotos[lightbox.i].caption}
              draggable={false} onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-full object-contain rounded-xl" />

            {lightbox.fotos.length > 1 && (
              <>
                <button type="button" onClick={(e) => { e.stopPropagation(); irLightbox(-1); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 hidden sm:flex items-center justify-center rounded-full text-white/85 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.1)" }} aria-label="Foto anterior">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); irLightbox(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 hidden sm:flex items-center justify-center rounded-full text-white/85 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.1)" }} aria-label="Foto siguiente">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              </>
            )}
          </div>

          {lightbox.fotos.length > 1 && (
            <div className="shrink-0 px-4 pb-6 pt-1 flex gap-2 overflow-x-auto justify-start sm:justify-center" onClick={(e) => e.stopPropagation()}>
              {lightbox.fotos.map((f, i) => (
                <button key={i} type="button" onClick={() => setLightbox((s) => (s ? { ...s, i } : s))}
                  className="shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all"
                  style={{ border: `1px solid ${i === lightbox.i ? GOLD : "rgba(255,255,255,0.12)"}`, opacity: i === lightbox.i ? 1 : 0.5 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.src} alt="" draggable={false} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
