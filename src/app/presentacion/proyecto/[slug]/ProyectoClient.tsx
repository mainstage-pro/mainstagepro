"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import type { Proyecto } from "@/lib/proyectos";

const GOLD = "#B3985B";
const WA = "https://wa.me/524461432565?text=Hola%2C%20vi%20un%20proyecto%20en%20su%20presentaci%C3%B3n%20y%20me%20gustar%C3%ADa%20informaci%C3%B3n%20para%20mi%20evento.";

const TIPO_LABEL: Record<string, string> = {
  MUSICAL: "Evento musical",
  SOCIAL: "Evento social",
  EMPRESARIAL: "Evento empresarial",
};
const TIPO_HREF: Record<string, string> = {
  MUSICAL: "/presentacion/evento/musical",
  SOCIAL: "/presentacion/evento/social",
  EMPRESARIAL: "/presentacion/evento/empresarial",
};

function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, vis };
}

function R({ children, delay = 0, y = 28, className = "" }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  const { ref, vis } = useReveal();
  return (
    <div ref={ref} className={className}
      style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : `translateY(${y}px)`, transition: `opacity 0.7s ${delay}ms ease, transform 0.7s ${delay}ms ease` }}>
      {children}
    </div>
  );
}

function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    fetch("/api/auth/me").then(r => (r.ok ? r.json() : null)).then(d => { if (d?.user) setIsAdmin(true); }).catch(() => {});
  }, []);
  return isAdmin;
}

const TIPOS = [
  { key: "MUSICAL", label: "Musical" },
  { key: "SOCIAL", label: "Social" },
  { key: "EMPRESARIAL", label: "Empresarial" },
];

// ─── Editor solo-admin ─────────────────────────────────────────────────────────
function Editor({ p, onSaved, onDeleted }: { p: Proyecto; onSaved: (p: Proyecto) => void; onDeleted: () => void }) {
  const [f, setF] = useState({
    titulo: p.titulo, tipoEvento: p.tipoEvento, cliente: p.cliente ?? "", ubicacion: p.ubicacion ?? "",
    fecha: p.fecha ?? "", resumen: p.resumen ?? "", reto: p.reto ?? "", solucion: p.solucion ?? "",
    resultado: p.resultado ?? "", asistentes: p.asistentes?.toString() ?? "",
    servicios: p.servicios.join(", "), esBorrador: p.esBorrador, destacado: p.destacado,
  });
  const [imagenes, setImagenes] = useState(p.imagenes);
  const [portada, setPortada] = useState(p.portada ?? "");
  const [saving, setSaving] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) { setF(prev => ({ ...prev, [k]: v })); }

  async function guardar() {
    setSaving(true);
    try {
      const body = {
        titulo: f.titulo.trim() || "Nuevo proyecto",
        tipoEvento: f.tipoEvento,
        cliente: f.cliente.trim() || null,
        ubicacion: f.ubicacion.trim() || null,
        fecha: f.fecha.trim() || null,
        resumen: f.resumen.trim() || null,
        reto: f.reto.trim() || null,
        solucion: f.solucion.trim() || null,
        resultado: f.resultado.trim() || null,
        asistentes: f.asistentes.trim() ? parseInt(f.asistentes, 10) : null,
        servicios: f.servicios.split(",").map(s => s.trim()).filter(Boolean),
        portada: portada || null,
        esBorrador: f.esBorrador,
        destacado: f.destacado,
      };
      const r = await fetch(`/api/presentacion/proyectos/${p.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok || !d.proyecto) throw new Error(d.error || "No se pudo guardar");
      onSaved(d.proyecto as Proyecto);
    } catch (err) {
      alert("Error al guardar: " + (err instanceof Error ? err.message : String(err)));
    } finally { setSaving(false); }
  }

  async function subirImagenes(files: FileList | null) {
    if (!files || !files.length) return;
    setSubiendo(true);
    try {
      const nuevas = [...imagenes];
      for (const file of Array.from(files)) {
        const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/tipos-evento/imagenes" });
        const r = await fetch(`/api/presentacion/proyectos/${p.id}/imagenes`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: blob.url }),
        });
        const d = await r.json();
        if (d.imagen) nuevas.push(d.imagen);
        if (!portada) setPortada(blob.url);
      }
      setImagenes(nuevas);
    } catch (err) {
      alert("Error al subir: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubiendo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function borrarImagen(imgId: string) {
    if (!confirm("¿Eliminar esta foto?")) return;
    await fetch(`/api/presentacion/proyectos/imagenes/${imgId}`, { method: "DELETE" });
    setImagenes(prev => prev.filter(i => i.id !== imgId));
  }

  async function borrarProyecto() {
    if (!confirm("¿Eliminar este proyecto por completo? Esta acción no se puede deshacer.")) return;
    await fetch(`/api/presentacion/proyectos/${p.id}`, { method: "DELETE" });
    onDeleted();
  }

  const inputCls = "w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/25";
  const labelCls = "block text-[11px] uppercase tracking-[0.14em] text-white/35 mb-1.5";

  return (
    <div className="rounded-2xl p-6 sm:p-8 mb-8" style={{ background: "rgba(179,152,91,0.05)", border: `1px solid ${GOLD}33` }}>
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs font-semibold tracking-[0.18em] uppercase" style={{ color: GOLD }}>Modo edición</p>
        <div className="flex items-center gap-2">
          <button onClick={borrarProyecto} className="text-xs px-4 py-2 rounded-full transition-all hover:opacity-80"
            style={{ background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.35)", color: "#ff8080" }}>
            Eliminar
          </button>
          <button onClick={guardar} disabled={saving} className="text-xs font-semibold px-5 py-2 rounded-full transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: GOLD, color: "#000" }}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Título</label>
          <input className={inputCls} value={f.titulo} onChange={e => set("titulo", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Tipo de evento</label>
          <select className={inputCls} value={f.tipoEvento} onChange={e => set("tipoEvento", e.target.value)}>
            {TIPOS.map(t => <option key={t.key} value={t.key} className="bg-[#111]">{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Cliente</label>
          <input className={inputCls} value={f.cliente} onChange={e => set("cliente", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Ubicación</label>
          <input className={inputCls} value={f.ubicacion} onChange={e => set("ubicacion", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Fecha (texto)</label>
          <input className={inputCls} value={f.fecha} onChange={e => set("fecha", e.target.value)} placeholder="Marzo 2024" />
        </div>
        <div>
          <label className={labelCls}>Asistentes</label>
          <input className={inputCls} type="number" value={f.asistentes} onChange={e => set("asistentes", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Servicios (separados por coma)</label>
          <input className={inputCls} value={f.servicios} onChange={e => set("servicios", e.target.value)} placeholder="Audio, Iluminación" />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Resumen (una línea)</label>
          <input className={inputCls} value={f.resumen} onChange={e => set("resumen", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>El reto</label>
          <textarea className={inputCls} rows={3} value={f.reto} onChange={e => set("reto", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Lo que hicimos</label>
          <textarea className={inputCls} rows={3} value={f.solucion} onChange={e => set("solucion", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>El resultado</label>
          <textarea className={inputCls} rows={3} value={f.resultado} onChange={e => set("resultado", e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-5 mt-5">
        <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
          <input type="checkbox" checked={f.esBorrador} onChange={e => set("esBorrador", e.target.checked)} /> Borrador
        </label>
        <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
          <input type="checkbox" checked={f.destacado} onChange={e => set("destacado", e.target.checked)} /> Destacado
        </label>
      </div>

      {/* Fotos */}
      <div className="mt-7">
        <div className="flex items-center justify-between mb-3">
          <label className={labelCls} style={{ marginBottom: 0 }}>Fotos</label>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => subirImagenes(e.target.files)} />
          <button onClick={() => fileRef.current?.click()} disabled={subiendo}
            className="text-xs font-semibold px-4 py-2 rounded-full transition-all disabled:opacity-50"
            style={{ background: "rgba(179,152,91,0.12)", border: `1px solid ${GOLD}55`, color: GOLD }}>
            {subiendo ? "Subiendo…" : "＋ Subir fotos"}
          </button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {imagenes.map(img => (
            <div key={img.id} className="relative group rounded-lg overflow-hidden aspect-square"
              style={{ border: portada === img.url ? `2px solid ${GOLD}` : "1px solid rgba(255,255,255,0.08)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.55)" }}>
                <button onClick={() => setPortada(img.url)} title="Usar como portada"
                  className="text-[10px] px-2 py-1 rounded-full" style={{ background: GOLD, color: "#000" }}>Portada</button>
                <button onClick={() => borrarImagen(img.id)} title="Eliminar"
                  className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              {portada === img.url && <span className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded" style={{ background: GOLD, color: "#000" }}>Portada</span>}
            </div>
          ))}
        </div>
        <p className="text-white/25 text-xs mt-3">La portada se aplica al guardar. Pasa el cursor sobre una foto para elegirla o eliminarla.</p>
      </div>
    </div>
  );
}

export default function ProyectoClient({ proyecto: inicial }: { proyecto: Proyecto }) {
  const router = useRouter();
  const isAdmin = useAdmin();
  const [p, setP] = useState(inicial);
  const [edit, setEdit] = useState(false);
  const tipoLabel = TIPO_LABEL[p.tipoEvento] ?? "Proyecto";
  const tipoHref = TIPO_HREF[p.tipoEvento] ?? "/presentacion";
  const bloques = [
    { label: "El reto", body: p.reto },
    { label: "Lo que hicimos", body: p.solucion },
    { label: "El resultado", body: p.resultado },
  ].filter((b) => b.body);

  return (
    <div className="bg-[#080808] text-white min-h-screen"
      style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #080808; }
        ::-webkit-scrollbar-thumb { background: rgba(179,152,91,0.35); border-radius: 2px; }
      `}</style>

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50" style={{ background: "rgba(8,8,8,0.9)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/presentacion/servicios">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-white.png" alt="Mainstage Pro" className="h-7 object-contain" draggable={false} />
          </a>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button onClick={() => setEdit(v => !v)}
                className="text-xs font-semibold tracking-wide px-4 py-2.5 rounded-full transition-all"
                style={{ background: edit ? GOLD : "rgba(179,152,91,0.12)", border: `1px solid ${GOLD}55`, color: edit ? "#000" : GOLD }}>
                {edit ? "Cerrar edición" : "Editar"}
              </button>
            )}
            <a href={WA} target="_blank" rel="noopener noreferrer"
              className="text-xs font-semibold tracking-[0.14em] uppercase px-5 py-2.5 rounded-full transition-all duration-300 hover:opacity-85"
              style={{ background: GOLD, color: "#000" }}>
              Contactar
            </a>
          </div>
        </div>
      </nav>

      {isAdmin && edit && (
        <section className="pt-24 px-6">
          <div className="max-w-5xl mx-auto">
            <Editor
              p={p}
              onSaved={(np) => { setP(np); if (np.slug !== p.slug) router.replace(`/presentacion/proyecto/${np.slug}`); }}
              onDeleted={() => router.push(tipoHref)}
            />
          </div>
        </section>
      )}

      {/* Hero */}
      <section className="relative min-h-[72vh] flex flex-col justify-end overflow-hidden pb-16">
        <div className="absolute inset-0">
          {p.portada ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={p.portada} alt={p.titulo} draggable={false} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: "radial-gradient(circle at 30% 20%, rgba(179,152,91,0.22), #080808 60%)" }} />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.5) 0%, rgba(8,8,8,0.6) 45%, rgba(8,8,8,0.92) 82%, #080808 100%)" }} />
        </div>

        <div className="relative z-10 px-6 max-w-5xl mx-auto w-full">
          <a href={tipoHref} className="inline-flex items-center gap-2 text-white/45 text-xs tracking-wide hover:text-white/75 transition-colors mb-6"
            style={{ animation: "fadeUp 0.7s ease forwards 0.1s", opacity: 0 }}>
            <span aria-hidden>←</span> {tipoLabel}
          </a>
          {p.esBorrador && (
            <div className="mb-4" style={{ animation: "fadeUp 0.7s ease forwards 0.15s", opacity: 0 }}>
              <span className="text-[10px] font-semibold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full"
                style={{ background: "rgba(179,152,91,0.14)", border: `1px solid ${GOLD}55`, color: GOLD }}>
                Borrador · pendiente de revisión
              </span>
            </div>
          )}
          <h1 className="font-bold text-white leading-[1.04]"
            style={{ fontSize: "clamp(2.2rem, 6vw, 4.5rem)", letterSpacing: "-0.03em", animation: "fadeUp 0.9s ease forwards 0.25s", opacity: 0 }}>
            {p.titulo}
          </h1>
          {p.resumen && (
            <p className="text-white/55 mt-6 leading-relaxed max-w-2xl"
              style={{ fontSize: "clamp(0.95rem, 1.6vw, 1.15rem)", animation: "fadeUp 0.9s ease forwards 0.4s", opacity: 0 }}>
              {p.resumen}
            </p>
          )}
        </div>
      </section>

      {/* Ficha */}
      <section className="px-6 -mt-4">
        <div className="max-w-5xl mx-auto">
          <R>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                { k: "Tipo", v: tipoLabel },
                p.ubicacion ? { k: "Lugar", v: p.ubicacion } : null,
                p.fecha ? { k: "Fecha", v: p.fecha } : null,
                p.asistentes ? { k: "Asistentes", v: `${p.asistentes.toLocaleString("es-MX")}+` } : null,
              ].filter(Boolean).map((f, i) => {
                const item = f as { k: string; v: string };
                return (
                  <div key={i} className="p-5 sm:p-6" style={{ background: "rgba(255,255,255,0.025)" }}>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/30 mb-2">{item.k}</p>
                    <p className="text-white/85 text-sm sm:text-base font-medium">{item.v}</p>
                  </div>
                );
              })}
            </div>
          </R>

          {p.servicios.length > 0 && (
            <R delay={80}>
              <div className="flex flex-wrap gap-2 mt-6">
                {p.servicios.map((s, i) => (
                  <span key={i} className="text-xs text-white/60 px-3.5 py-1.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>{s}</span>
                ))}
              </div>
            </R>
          )}
        </div>
      </section>

      {/* Reto / Solución / Resultado */}
      {bloques.length > 0 && (
        <section className="py-24 px-6">
          <div className="max-w-3xl mx-auto space-y-16">
            {bloques.map((b, i) => (
              <R key={i} delay={i * 60}>
                <p className="text-[#B3985B] text-xs tracking-[0.28em] uppercase mb-4">{b.label}</p>
                <p className="text-white/70 leading-relaxed" style={{ fontSize: "clamp(1.05rem, 2vw, 1.35rem)" }}>{b.body}</p>
              </R>
            ))}
          </div>
        </section>
      )}

      {/* Galería */}
      {p.imagenes.length > 0 && (
        <section className="pb-24 px-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
            {p.imagenes.map((img, i) => (
              <R key={img.id} delay={i * 60} className={i === 0 && p.imagenes.length > 2 ? "sm:col-span-2" : ""}>
                <figure className="relative rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.caption ?? p.titulo} draggable={false}
                    className="w-full h-full object-cover" style={{ aspectRatio: i === 0 && p.imagenes.length > 2 ? "21/9" : "4/3" }} />
                  {img.caption && (
                    <figcaption className="absolute bottom-0 inset-x-0 p-4 text-xs text-white/80"
                      style={{ background: "linear-gradient(to top, rgba(8,8,8,0.85), transparent)" }}>{img.caption}</figcaption>
                  )}
                </figure>
              </R>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="pb-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <R>
            <h2 className="font-bold text-white leading-[1.08] mb-5" style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)", letterSpacing: "-0.025em" }}>
              ¿Tienes un evento en mente?
            </h2>
            <p className="text-white/45 text-sm sm:text-base leading-relaxed mb-9 max-w-xl mx-auto">
              Cuéntanos qué necesitas y te devolvemos una propuesta técnica a la medida en menos de 24 horas.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href={WA} target="_blank" rel="noopener noreferrer"
                className="px-9 py-4 rounded-full font-semibold text-black text-sm tracking-wide transition-all hover:scale-105" style={{ background: GOLD }}>
                Contactar por WhatsApp
              </a>
              <a href={tipoHref} className="text-white/40 text-sm hover:text-white/70 transition-colors">Ver más de {tipoLabel.toLowerCase()} →</a>
            </div>
          </R>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-6 py-10">
        <div className="max-w-5xl mx-auto text-center text-xs text-white/30">
          Mainstage Pro · Producción técnica de eventos
        </div>
      </footer>
    </div>
  );
}
