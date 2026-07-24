"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AREAS as AREAS_NEG, AREA_LABELS as AREA_LABELS_NEG } from "@/lib/gestion";

// ── Tipos de lookups ────────────────────────────────────────────────────────
type TareaProyecto = { id: string; nombre: string; color?: string | null };
type Usuario = { id: string; name: string; area?: string | null };

type Destino = "tarea" | "proyecto" | "idea" | "iniciativa" | "backlog";

// ── Constantes ──────────────────────────────────────────────────────────────
const DESTINOS: { key: Destino; label: string; color: string; desc: string }[] = [
  { key: "tarea",      label: "Tarea",      color: "#B3985B", desc: "Al módulo de tareas" },
  { key: "proyecto",   label: "Proyecto",   color: "#4ade80", desc: "A proyectos internos" },
  { key: "idea",       label: "Idea",       color: "#a78bfa", desc: "Guardar como idea" },
  { key: "iniciativa", label: "Iniciativa", color: "#3b82f6", desc: "Guardar como iniciativa" },
  { key: "backlog",    label: "Backlog",    color: "#666",    desc: "Archivar en backlog" },
];

const PRIORIDADES: [string, string][] = [["URGENTE", "Urgente"], ["ALTA", "Alta"], ["MEDIA", "Media"], ["BAJA", "Baja"]];

const inputCls = "w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-[12.5px] text-white placeholder-[#444] focus:outline-none focus:border-[#e8a020]/40 transition-colors";
const labelCls = "block text-[10.5px] uppercase tracking-wider font-semibold text-[#777] mb-1.5";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-[#e8a020] ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

// ── Componente ──────────────────────────────────────────────────────────────
export default function MigrarCapturaModal({
  captura, onClose, onDone,
}: {
  captura: { id: string; contenido: string };
  onClose: () => void;
  onDone: () => void;
}) {
  const [destino, setDestino]   = useState<Destino | null>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<{ label: string; href: string } | null>(null);

  // Lookups compartidos
  const [proyectosTarea, setProyectosTarea] = useState<TareaProyecto[]>([]);
  const [usuarios, setUsuarios]             = useState<Usuario[]>([]);

  // Campos comunes
  const [titulo, setTitulo] = useState(captura.contenido);

  // Tarea
  const [proyectoTareaId, setProyectoTareaId] = useState("");
  const [tPrioridad, setTPrioridad]           = useState("MEDIA");
  const [tResponsable, setTResponsable]       = useState("");
  const [tFecha, setTFecha]                   = useState("");

  // Proyecto interno
  const [pArea, setPArea]           = useState("");
  const [pLider, setPLider]         = useState("");
  const [pPrioridad, setPPrioridad] = useState("MEDIA");
  const [pInicio, setPInicio]       = useState("");
  const [pFin, setPFin]             = useState("");
  const [pDescripcion, setPDescripcion] = useState("");

  // Idea / iniciativa / backlog
  const [ligeraArea, setLigeraArea] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/operaciones/proyectos").then(r => r.ok ? r.json() : { proyectos: [] }).then(d => setProyectosTarea(d.proyectos ?? [])).catch(() => {});
    fetch("/api/usuarios").then(r => r.ok ? r.json() : { usuarios: [] }).then(d => setUsuarios(d.usuarios ?? [])).catch(() => {});
  }, []);

  async function marcarClasificado(tipo: string, area?: string | null) {
    await fetch(`/api/captura/${captura.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clasificado: true, tipo, ...(area ? { area } : {}) }),
    });
  }

  async function migrar() {
    if (!destino || saving) return;
    setError(null);
    const nombre = titulo.trim() || captura.contenido;

    if (destino === "tarea") {
      if (!proyectoTareaId) { setError("Elige el proyecto/área destino."); return; }
      setSaving(true);
      const res = await fetch("/api/tareas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: nombre, proyectoTareaId, prioridad: tPrioridad,
          asignadoAId: tResponsable || null, fecha: tFecha || null,
        }),
      });
      if (!res.ok) { setError("No se pudo crear la tarea."); setSaving(false); return; }
      const { tarea } = await res.json();
      await marcarClasificado("tarea");
      setSuccess({ label: "Ver en Tareas", href: `/operaciones?open=${tarea.id}` });
      setSaving(false);
      return;
    }

    if (destino === "proyecto") {
      if (!pArea) { setError("Elige el área del proyecto."); return; }
      if (!pLider) { setError("Elige el responsable del proyecto."); return; }
      setSaving(true);
      const res = await fetch("/api/proyectos-internos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre, area: pArea, liderId: pLider, prioridad: pPrioridad,
          descripcion: pDescripcion || null,
          fechaInicio: pInicio || null, fechaFin: pFin || null,
        }),
      });
      if (!res.ok) { setError("No se pudo crear el proyecto."); setSaving(false); return; }
      const { proyecto } = await res.json();
      await marcarClasificado("proyecto", pArea);
      setSuccess({ label: "Ver en Proyectos", href: `/proyectos-de-empresa/${proyecto.id}` });
      setSaving(false);
      return;
    }

    // Idea / Iniciativa / Backlog (ligeros)
    setSaving(true);
    if (destino === "idea") {
      await fetch("/api/ideas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: nombre, area: ligeraArea }),
      });
      await marcarClasificado("idea", ligeraArea);
      setSuccess({ label: "Ver Ideas", href: `/operaciones` });
    } else if (destino === "iniciativa") {
      await fetch("/api/iniciativas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: nombre, area: ligeraArea }),
      });
      await marcarClasificado("iniciativa", ligeraArea);
      setSuccess({ label: "Ver Iniciativas", href: `/operaciones` });
    } else {
      await marcarClasificado("backlog", ligeraArea);
      setSuccess({ label: "Ver capturas", href: `/operaciones` });
    }
    setSaving(false);
  }

  const destinoMeta = DESTINOS.find(d => d.key === destino);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl border border-[#222] bg-[#0e0e0e] shadow-2xl" style={{ scrollbarWidth: "none" }}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start gap-3 px-5 py-4 border-b border-[#1a1a1a] bg-[#0e0e0e]">
          <div className="flex-1 min-w-0">
            <p className="text-[10.5px] uppercase tracking-wider font-semibold text-[#555]">Migrar captura</p>
            <p className="text-[13px] text-white leading-snug mt-1 line-clamp-2">{captura.contenido}</p>
          </div>
          <button onClick={onClose} className="shrink-0 p-1 text-[#444] hover:text-[#999] transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Éxito */}
        {success ? (
          <div className="p-6 text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${destinoMeta?.color ?? "#4ade80"}18` }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={destinoMeta?.color ?? "#4ade80"} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p className="text-[14px] text-white font-semibold">Captura migrada</p>
            <p className="text-[12px] text-[#666] mt-1 mb-5">Se registró en {destinoMeta?.desc?.toLowerCase()}.</p>
            <div className="flex gap-2">
              <button onClick={() => { onDone(); onClose(); }} className="flex-1 py-2.5 rounded-lg border border-[#222] text-[12px] text-[#888] hover:text-white transition-colors">
                Seguir en bandeja
              </button>
              <Link href={success.href} onClick={() => { onDone(); }}
                className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold text-[#080808] flex items-center justify-center gap-1.5 transition-colors"
                style={{ background: destinoMeta?.color ?? "#4ade80" }}>
                {success.label}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Selector de destino */}
            <div>
              <p className={labelCls}>¿A dónde va esta captura?</p>
              <div className="grid grid-cols-3 gap-1.5">
                {DESTINOS.map(d => (
                  <button
                    key={d.key}
                    onClick={() => { setDestino(d.key); setError(null); }}
                    className="px-2 py-2.5 rounded-lg text-center transition-all border"
                    style={{
                      background: destino === d.key ? `${d.color}18` : "#111",
                      borderColor: destino === d.key ? `${d.color}55` : "#1e1e1e",
                    }}
                  >
                    <span className="block text-[12px] font-semibold" style={{ color: destino === d.key ? d.color : "#aaa" }}>{d.label}</span>
                    <span className="block text-[9.5px] text-[#555] mt-0.5 leading-tight">{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {destino && (
              <>
                {/* Título / nombre — común a todos */}
                <Field label={destino === "proyecto" ? "Nombre del proyecto" : "Título"} required>
                  <input value={titulo} onChange={e => setTitulo(e.target.value)} className={inputCls} placeholder="Escribe un título claro…" />
                </Field>

                {/* ── TAREA ─────────────────────────────────────────────── */}
                {destino === "tarea" && (
                  <>
                    <Field label="Área" required>
                      <select value={proyectoTareaId} onChange={e => setProyectoTareaId(e.target.value)} className={inputCls}>
                        <option value="">Selecciona un área…</option>
                        {proyectosTarea.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Prioridad">
                        <select value={tPrioridad} onChange={e => setTPrioridad(e.target.value)} className={inputCls}>
                          {PRIORIDADES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </Field>
                      <Field label="Fecha límite">
                        <input type="date" value={tFecha} onChange={e => setTFecha(e.target.value)} className={inputCls} />
                      </Field>
                    </div>
                    <Field label="Responsable">
                      <select value={tResponsable} onChange={e => setTResponsable(e.target.value)} className={inputCls}>
                        <option value="">Sin asignar</option>
                        {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </Field>
                  </>
                )}

                {/* ── PROYECTO INTERNO ──────────────────────────────────── */}
                {destino === "proyecto" && (
                  <>
                    <Field label="Área" required>
                      <div className="grid grid-cols-3 gap-1.5">
                        {AREAS_NEG.map(a => (
                          <button key={a} onClick={() => setPArea(a)}
                            className="px-2 py-1.5 rounded-lg text-[11.5px] border transition-all"
                            style={{ background: pArea === a ? "#4ade8018" : "#111", borderColor: pArea === a ? "#4ade8055" : "#1e1e1e", color: pArea === a ? "#4ade80" : "#777" }}>
                            {AREA_LABELS_NEG[a]}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Responsable (líder)" required>
                      <select value={pLider} onChange={e => setPLider(e.target.value)} className={inputCls}>
                        <option value="">Selecciona un responsable…</option>
                        {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </Field>
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="Prioridad">
                        <select value={pPrioridad} onChange={e => setPPrioridad(e.target.value)} className={inputCls}>
                          {PRIORIDADES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </Field>
                      <Field label="Inicio">
                        <input type="date" value={pInicio} onChange={e => setPInicio(e.target.value)} className={inputCls} />
                      </Field>
                      <Field label="Entrega">
                        <input type="date" value={pFin} onChange={e => setPFin(e.target.value)} className={inputCls} />
                      </Field>
                    </div>
                    <Field label="Propósito / descripción">
                      <textarea value={pDescripcion} onChange={e => setPDescripcion(e.target.value)} rows={2} className={inputCls} placeholder="¿Qué resultado busca este proyecto?" />
                    </Field>
                  </>
                )}

                {/* ── LIGEROS: idea / iniciativa / backlog ──────────────── */}
                {(destino === "idea" || destino === "iniciativa" || destino === "backlog") && (
                  <Field label="Área (opcional)">
                    <div className="grid grid-cols-3 gap-1.5">
                      {AREAS_NEG.map(a => (
                        <button key={a} onClick={() => setLigeraArea(ligeraArea === a ? null : a)}
                          className="px-2 py-1.5 rounded-lg text-[11.5px] border transition-all"
                          style={{ background: ligeraArea === a ? "#e8a02018" : "#111", borderColor: ligeraArea === a ? "#e8a02055" : "#1e1e1e", color: ligeraArea === a ? "#e8a020" : "#777" }}>
                          {AREA_LABELS_NEG[a]}
                        </button>
                      ))}
                    </div>
                  </Field>
                )}

                {error && <p className="text-[11.5px] text-red-400">{error}</p>}

                <div className="flex gap-2 pt-1">
                  <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-[#222] text-[12px] text-[#666] hover:text-[#999] transition-colors">
                    Cancelar
                  </button>
                  <button onClick={migrar} disabled={saving}
                    className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold text-[#080808] disabled:opacity-40 transition-colors"
                    style={{ background: destinoMeta?.color ?? "#e8a020" }}>
                    {saving ? "Migrando…" : `Migrar a ${destinoMeta?.label}`}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
