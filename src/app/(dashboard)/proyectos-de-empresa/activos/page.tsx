"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AREAS, AREA_LABELS, PRIORIDADES, PRIO_META, areaLabel, areaChipClass } from "@/lib/gestion";

type Usuario = { id: string; name: string };

const inputCls = "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[12.5px] text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50";
const labelCls = "text-[10px] uppercase tracking-wider text-[#666] mb-1 block";

function AreaChips({ value, onChange }: { value: string | null; onChange: (a: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {AREAS.map(a => (
        <button key={a} type="button" onClick={() => onChange(a)}
          className="px-2.5 py-1 rounded-md text-[11px] transition-all border"
          style={{
            background: value === a ? "rgba(179,152,91,0.14)" : "#111",
            borderColor: value === a ? "rgba(179,152,91,0.5)" : "#222",
            color: value === a ? "#c9a96a" : "#777",
          }}>
          {AREA_LABELS[a]}
        </button>
      ))}
    </div>
  );
}

function DynamicList({ label, placeholder, items, setItems, addLabel }: {
  label: string; placeholder: string; items: string[];
  setItems: (v: string[]) => void; addLabel: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label} <span className="text-[#333] normal-case">(opcional)</span></label>
      <div className="space-y-1.5">
        {items.map((val, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-[10px] text-[#444] w-4 text-right">{idx + 1}.</span>
            <input value={val} placeholder={placeholder}
              onChange={e => setItems(items.map((v, i) => i === idx ? e.target.value : v))}
              className={inputCls} />
            <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))}
              className="shrink-0 p-1 text-[#444] hover:text-[#888] transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setItems([...items, ""])}
          className="text-[11px] text-[#B3985B] hover:text-[#c9a96a] transition-colors">{addLabel}</button>
      </div>
    </div>
  );
}

const ESTADO_LABELS: Record<string, string> = {
  PLANIFICACION:"Planificación", ACTIVO:"Activo", EN_PAUSA:"En pausa", COMPLETADO:"Completado",
};

const ESTADO_ORDER = ["PLANIFICACION","ACTIVO","EN_PAUSA","COMPLETADO"];

type Proyecto = {
  id: string; nombre: string; descripcion: string | null; area: string;
  estado: string; prioridad: string; porcentajeAvance: number;
  avance: number; tareasTotal: number; tareasHechas: number;
  fechaInicio: string | null; fechaFin: string | null;
  esPrivado: boolean;
  accesos?: { userId: string }[];
  lider: { id: string; name: string };
  fases: { id: string; nombre: string; completada: boolean; _count: { tareas: number } }[];
};

function ModalNuevoProyecto({ isAdmin, onSave, onClose }: {
  isAdmin: boolean; onSave: (p: Proyecto) => void; onClose: () => void;
}) {
  const [usuarios, setUsuarios]   = useState<Usuario[]>([]);
  const [nombre, setNombre]       = useState("");
  const [descripcion, setDescr]   = useState("");
  const [area, setArea]           = useState<string | null>(null);
  const [liderId, setLider]       = useState<string | null>(null);
  const [prioridad, setPrio]      = useState("MEDIA");
  const [fechaInicio, setInicio]  = useState("");
  const [fechaFin, setFin]        = useState("");
  const [presupuesto, setPresu]   = useState("");
  const [objetivo, setObjetivo]   = useState("");
  const [entregable, setEntreg]   = useState("");
  const [etapas, setEtapas]       = useState<string[]>([]);
  const [subtareas, setSubtareas] = useState<string[]>([]);
  const [esPrivado, setPrivado]   = useState(false);
  const [accesoIds, setAccesoIds] = useState<string[]>([]);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    fetch("/api/usuarios").then(r => r.json()).then(d => setUsuarios(d.usuarios ?? [])).catch(() => {});
  }, []);

  const puedeCrear = !!nombre.trim() && !!area && !!liderId;

  async function handleSave() {
    if (!puedeCrear || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/proyectos-internos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(), descripcion: descripcion || null, area,
          liderId, prioridad,
          fechaInicio: fechaInicio || null, fechaFin: fechaFin || null,
          presupuesto: presupuesto.trim() ? Number(presupuesto) : null,
          objetivo: objetivo.trim() || null,
          entregable: entregable.trim() || null,
          esPrivado: isAdmin && esPrivado,
          accesoUserIds: isAdmin && esPrivado ? accesoIds : [],
        }),
      });
      if (!res.ok) { setSaving(false); return; }
      const proyecto = (await res.json()).proyecto;

      // Etapas de planeación → fases
      const faseIds: string[] = [];
      for (const nom of etapas.filter(e => e.trim())) {
        const fr = await fetch(`/api/proyectos-internos/${proyecto.id}/fases`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre: nom.trim() }),
        });
        if (fr.ok) faseIds.push((await fr.json()).fase.id);
      }
      // Subtareas del proyecto → tareas ligadas
      for (const st of subtareas.filter(s => s.trim())) {
        await fetch("/api/tareas", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titulo: st.trim(), area, asignadoAId: liderId,
            proyectoInternoId: proyecto.id, faseInternaId: faseIds[0] ?? null,
          }),
        });
      }
      onSave(proyecto);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl w-full max-w-lg p-6 space-y-3.5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-white font-semibold text-sm">Nuevo proyecto interno</h2>

        <div>
          <label className={labelCls}>Nombre del proyecto</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} autoFocus
            placeholder="¿Cómo se llama el proyecto?" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Propósito / descripción</label>
          <textarea value={descripcion} onChange={e => setDescr(e.target.value)} rows={3}
            placeholder="¿Para qué sirve este proyecto? ¿Qué resultado busca?"
            className={`${inputCls} resize-none`} />
        </div>

        <div>
          <label className={labelCls}>Área</label>
          <AreaChips value={area} onChange={setArea} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Responsable (líder)</label>
            <select value={liderId ?? ""} onChange={e => setLider(e.target.value || null)} className={inputCls}>
              <option value="">Selecciona…</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Prioridad</label>
            <select value={prioridad} onChange={e => setPrio(e.target.value)} className={inputCls}>
              {PRIORIDADES.map(p => <option key={p} value={p}>{PRIO_META[p].label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Inicio</label>
            <input type="date" value={fechaInicio} onChange={e => setInicio(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Fecha de entrega</label>
            <input type="date" value={fechaFin} onChange={e => setFin(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Presupuesto planeado</label>
          <input type="number" min="0" step="0.01" value={presupuesto} onChange={e => setPresu(e.target.value)}
            placeholder="0.00" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Objetivo</label>
          <textarea value={objetivo} onChange={e => setObjetivo(e.target.value)} rows={2}
            placeholder="¿Qué meta concreta persigue este proyecto?"
            className={`${inputCls} resize-none`} />
        </div>

        <div>
          <label className={labelCls}>Entregable</label>
          <textarea value={entregable} onChange={e => setEntreg(e.target.value)} rows={2}
            placeholder="¿Cuál es el entregable claro al terminar?"
            className={`${inputCls} resize-none`} />
        </div>

        <DynamicList label="Etapas de planeación" placeholder="Nombre de la etapa" items={etapas} setItems={setEtapas} addLabel="+ Etapa" />
        <DynamicList label="Subtareas del proyecto" placeholder="Subtarea a cumplir" items={subtareas} setItems={setSubtareas} addLabel="+ Subtarea" />

        {isAdmin && (
          <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={esPrivado} onChange={e => setPrivado(e.target.checked)}
                className="accent-[#B3985B]" />
              <span className="text-[12.5px] text-white font-medium">Proyecto privado</span>
              <span className="text-[10.5px] text-[#555]">— sólo tú y quien elijas lo ven</span>
            </label>
            {esPrivado && (
              <div className="pt-1">
                <label className={labelCls}>Con acceso</label>
                <div className="flex flex-wrap gap-1.5">
                  {usuarios.map(u => {
                    const on = accesoIds.includes(u.id);
                    return (
                      <button key={u.id} type="button"
                        onClick={() => setAccesoIds(on ? accesoIds.filter(x => x !== u.id) : [...accesoIds, u.id])}
                        className="px-2.5 py-1 rounded-md text-[11px] transition-all border"
                        style={{
                          background: on ? "rgba(179,152,91,0.14)" : "#111",
                          borderColor: on ? "rgba(179,152,91,0.5)" : "#222",
                          color: on ? "#c9a96a" : "#777",
                        }}>
                        {u.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <p className="text-[10.5px] text-[#444]">{puedeCrear ? "Listo para crear." : "Nombre, área y responsable requeridos."}</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-[#555] hover:text-white transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={!puedeCrear || saving}
              className="px-4 py-2 bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold rounded-lg transition-colors disabled:opacity-40">
              {saving ? "Creando..." : "Crear proyecto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ESTADO_META: Record<string, { color: string; soft: string }> = {
  PLANIFICACION: { color: "#a78bfa", soft: "rgba(167,139,250,0.12)" },
  ACTIVO:        { color: "#4ade80", soft: "rgba(74,222,128,0.12)" },
  EN_PAUSA:      { color: "#e8a020", soft: "rgba(232,160,32,0.12)" },
  COMPLETADO:    { color: "#60a5fa", soft: "rgba(96,165,250,0.12)" },
};

const PRIO_COLOR: Record<string, string> = {
  URGENTE: "#ef4444", ALTA: "#f97316", MEDIA: "#B3985B", BAJA: "#333",
};

function iniciales(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function fechaCorta(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function ProyectoCard({ p, dragging, isAdmin, onDragStart, onDragEnd, onDelete, onPrivacy }: {
  p: Proyecto; dragging: boolean; isAdmin: boolean;
  onDragStart: () => void; onDragEnd: () => void; onDelete: (p: Proyecto) => void; onPrivacy: (p: Proyecto) => void;
}) {
  const prioColor = PRIO_COLOR[p.prioridad] ?? PRIO_COLOR.MEDIA;
  const fin = fechaCorta(p.fechaFin);
  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
      className={`group/card relative rounded-xl border border-white/[0.07] bg-[#0e0e0e] hover:border-white/[0.14] hover:bg-[#121212] cursor-grab active:cursor-grabbing transition-all overflow-hidden ${
        dragging ? "opacity-40 rotate-1" : ""
      }`}>
      <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: prioColor }} />
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        {isAdmin && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPrivacy(p); }}
            className={`p-1 rounded-md transition-all ${p.esPrivado ? "text-[#c9a96a]" : "text-[#444] opacity-0 group-hover/card:opacity-100 hover:text-[#c9a96a]"} hover:bg-[#B3985B]/10`}
            title={p.esPrivado ? "Proyecto privado — gestionar acceso" : "Hacer privado / gestionar acceso"}>
            {p.esPrivado ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
              </svg>
            )}
          </button>
        )}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(p); }}
          className="p-1 rounded-md text-[#444] opacity-0 group-hover/card:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Eliminar proyecto">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
      <Link href={`/proyectos-de-empresa/${p.id}`} className="block p-3.5 pl-4"
        onClick={e => { if (dragging) e.preventDefault(); }}>
        <p className="text-[13.5px] text-white font-medium leading-snug mb-2.5 pr-5">{p.nombre}</p>

        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-medium ${areaChipClass(p.area)}`}>
            {areaLabel(p.area)}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-[#777]">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: prioColor }} />
            {PRIO_META[p.prioridad]?.label ?? p.prioridad}
          </span>
        </div>

        {p.tareasTotal > 0 ? (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#555]">{p.tareasHechas}/{p.tareasTotal} tareas</span>
              <span className="text-[10px] font-semibold text-[#B3985B]">{p.avance}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#8a7440] to-[#c9a96a] transition-all"
                style={{ width: `${p.avance}%` }} />
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <span className="text-[10px] text-[#3a3a3a]">Sin tareas todavía</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/[0.05]">
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <span className="w-5 h-5 shrink-0 rounded-full bg-[#B3985B]/15 text-[#c9a96a] text-[9px] font-bold flex items-center justify-center">
              {iniciales(p.lider.name)}
            </span>
            <span className="text-[11px] text-[#888] truncate">{p.lider.name}</span>
          </span>
          {fin && (
            <span className="inline-flex items-center gap-1 shrink-0 text-[10.5px] text-[#666]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {fin}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}

function KanbanBoard({ proyectos, isAdmin, onMove, onDelete, onPrivacy }: {
  proyectos: Proyecto[];
  isAdmin: boolean;
  onMove: (id: string, estado: string) => void;
  onDelete: (p: Proyecto) => void;
  onPrivacy: (p: Proyecto) => void;
}) {
  const [dragId, setDragId]   = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {ESTADO_ORDER.map(estado => {
        const meta = ESTADO_META[estado];
        const cards = proyectos.filter(p => p.estado === estado);
        const isOver = overCol === estado;
        return (
          <div key={estado}
            className={`flex flex-col rounded-2xl border bg-white/[0.012] transition-colors ${
              isOver ? "border-[#B3985B]/40 bg-[#B3985B]/[0.04]" : "border-white/[0.06]"
            }`}
            onDragOver={e => { e.preventDefault(); setOverCol(estado); }}
            onDragLeave={() => setOverCol(c => c === estado ? null : c)}
            onDrop={() => {
              if (dragId) onMove(dragId, estado);
              setDragId(null); setOverCol(null);
            }}>
            {/* Header de columna */}
            <div className="flex items-center gap-2 px-3.5 py-3 border-b border-white/[0.05]">
              <span className="w-2 h-2 rounded-full" style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }} />
              <span className="text-[12.5px] font-semibold text-[#ddd]">{ESTADO_LABELS[estado]}</span>
              <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: meta.soft, color: meta.color }}>
                {cards.length}
              </span>
            </div>
            {/* Cuerpo */}
            <div className="flex-1 space-y-2.5 p-2.5 min-h-[140px]">
              {cards.map(p => (
                <ProyectoCard key={p.id} p={p} dragging={dragId === p.id} isAdmin={isAdmin}
                  onDragStart={() => setDragId(p.id)}
                  onDragEnd={() => { setDragId(null); setOverCol(null); }}
                  onDelete={onDelete} onPrivacy={onPrivacy} />
              ))}
              {cards.length === 0 && (
                <div className="flex items-center justify-center h-24 rounded-xl border border-dashed border-white/[0.05]">
                  <p className="text-[11px] text-[#2f2f2f]">Arrastra proyectos aquí</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ConfirmarEliminar({ proyecto, onConfirm, onClose }: {
  proyecto: Proyecto; onConfirm: () => void; onClose: () => void;
}) {
  const [borrando, setBorrando] = useState(false);
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="w-11 h-11 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </div>
        <h2 className="text-white font-semibold text-sm mb-1">Eliminar proyecto</h2>
        <p className="text-[12.5px] text-[#888] leading-relaxed mb-5">
          ¿Seguro que quieres eliminar <span className="text-white font-medium">{proyecto.nombre}</span>? Se quitará del tablero.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#555] hover:text-white transition-colors">Cancelar</button>
          <button onClick={() => { setBorrando(true); onConfirm(); }} disabled={borrando}
            className="px-4 py-2 bg-red-500/90 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
            {borrando ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PrivacidadPanel({ proyecto, onClose, onUpdated }: {
  proyecto: Proyecto; onClose: () => void; onUpdated: (p: Partial<Proyecto> & { id: string }) => void;
}) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [privado, setPrivado]   = useState(proyecto.esPrivado);
  const [accesos, setAccesos]   = useState<string[]>((proyecto.accesos ?? []).map(a => a.userId));
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    fetch("/api/usuarios").then(r => r.json()).then(d => setUsuarios(d.usuarios ?? [])).catch(() => {});
  }, []);

  async function togglePrivado(v: boolean) {
    setPrivado(v);
    await fetch(`/api/proyectos-internos/${proyecto.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ esPrivado: v }),
    });
    onUpdated({ id: proyecto.id, esPrivado: v });
  }

  async function toggleUsuario(userId: string) {
    const on = accesos.includes(userId);
    setSaving(true);
    if (on) {
      setAccesos(accesos.filter(x => x !== userId));
      await fetch("/api/admin/proyectos-internos/accesos", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proyectoId: proyecto.id, userId }),
      });
    } else {
      setAccesos([...accesos, userId]);
      await fetch("/api/admin/proyectos-internos/accesos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proyectoId: proyecto.id, userId }),
      });
    }
    const next = on ? accesos.filter(x => x !== userId) : [...accesos, userId];
    onUpdated({ id: proyecto.id, accesos: next.map(id => ({ userId: id })) });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div>
          <h2 className="text-white font-semibold text-sm">Privacidad · {proyecto.nombre}</h2>
          <p className="text-[11.5px] text-[#666] mt-0.5">Controla quién ve este proyecto y sus tareas en gestión operativa.</p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={privado} onChange={e => togglePrivado(e.target.checked)} className="accent-[#B3985B]" />
          <span className="text-[12.5px] text-white font-medium">Proyecto privado</span>
        </label>

        {privado && (
          <div>
            <label className={labelCls}>Con acceso {saving && <span className="text-[#555] normal-case">· guardando…</span>}</label>
            <div className="flex flex-wrap gap-1.5">
              {usuarios.map(u => {
                const on = accesos.includes(u.id);
                const esLider = u.id === proyecto.lider.id;
                return (
                  <button key={u.id} type="button" disabled={esLider}
                    onClick={() => toggleUsuario(u.id)}
                    title={esLider ? "El líder siempre tiene acceso" : undefined}
                    className="px-2.5 py-1 rounded-md text-[11px] transition-all border disabled:opacity-50"
                    style={{
                      background: on || esLider ? "rgba(179,152,91,0.14)" : "#111",
                      borderColor: on || esLider ? "rgba(179,152,91,0.5)" : "#222",
                      color: on || esLider ? "#c9a96a" : "#777",
                    }}>
                    {u.name}{esLider ? " (líder)" : ""}
                  </button>
                );
              })}
            </div>
            <p className="text-[10.5px] text-[#444] mt-2">El administrador siempre ve todos los proyectos.</p>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold rounded-lg transition-colors">Listo</button>
        </div>
      </div>
    </div>
  );
}

export default function ProyectosInternosPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [estadoFiltro, setEstado] = useState("ACTIVO");
  const [showModal, setShowModal] = useState(false);
  const [vista, setVista]         = useState<"lista" | "kanban">("kanban");
  const [aEliminar, setAEliminar] = useState<Proyecto | null>(null);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [privacidadDe, setPrivacidadDe] = useState<Proyecto | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setIsAdmin(d.user?.role === "ADMIN")).catch(() => {});
    fetch("/api/proyectos-internos").then(r => r.json()).then(d => {
      setProyectos(d.proyectos ?? []);
      setLoading(false);
    });
  }, []);

  async function moverProyecto(id: string, estado: string) {
    setProyectos(prev => prev.map(p => p.id === id ? { ...p, estado } : p));
    await fetch(`/api/proyectos-internos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
  }

  async function eliminarProyecto(id: string) {
    setProyectos(prev => prev.filter(p => p.id !== id));
    setAEliminar(null);
    await fetch(`/api/proyectos-internos/${id}`, { method: "DELETE" });
  }

  const filtrados = proyectos.filter(p => p.estado === estadoFiltro);

  return (
    <div className={`p-4 md:p-6 ${vista === "kanban" ? "max-w-none" : "max-w-3xl"} mx-auto space-y-5`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-1">Gestión Operativa</p>
          <h1 className="ms-h1">Proyectos de empresa</h1>
          <p className="ms-subtitle mt-1">Mejoras, implementaciones y desarrollo de la empresa</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="shrink-0 ms-btn-primary">
          + Nuevo
        </button>
      </div>

      {/* Toggle de vista */}
      <div className="ms-tabs w-fit">
        {(["kanban", "lista"] as const).map(v => (
          <button key={v} onClick={() => setVista(v)}
            className={`capitalize text-xs ${vista === v ? "ms-tab-active" : "ms-tab"}`}>
            {v}
          </button>
        ))}
      </div>

      {/* Filtros por estado (solo lista) */}
      {vista === "lista" && (
        <div className="flex gap-2 flex-wrap">
          {ESTADO_ORDER.map(e => (
            <button key={e} onClick={() => setEstado(e)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                estadoFiltro === e ? "bg-[#B3985B] text-black" : "bg-[#111] border border-[#1a1a1a] text-[#666] hover:text-white"
              }`}>
              {ESTADO_LABELS[e]}
              <span className="ml-1.5 text-[10px] opacity-60">
                {proyectos.filter(p => p.estado === e).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Kanban */}
      {vista === "kanban" && !loading && (
        <KanbanBoard proyectos={proyectos} isAdmin={isAdmin} onMove={moverProyecto} onDelete={setAEliminar} onPrivacy={setPrivacidadDe} />
      )}

      {/* Lista */}
      {vista === "lista" && (loading ? (
        <p className="text-[#444] text-sm">Cargando...</p>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#333] text-sm">Sin proyectos {ESTADO_LABELS[estadoFiltro]?.toLowerCase()}</p>
        </div>
      ) : (
        <div className="space-y-px">
          {filtrados.map(p => {
            const fasesTotal    = p.fases.length;
            const fasesCompletas= p.fases.filter(f => f.completada).length;

            return (
              <Link key={p.id} href={`/proyectos-de-empresa/${p.id}`}
                className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-[#0d0d0d] group transition-colors">
                {/* Círculo / avance */}
                <div className="shrink-0 relative w-5 h-5">
                  {p.avance > 0 ? (
                    <svg viewBox="0 0 20 20" className="w-5 h-5 -rotate-90">
                      <circle cx="10" cy="10" r="8" fill="none" stroke="#1a1a1a" strokeWidth="2" />
                      <circle cx="10" cy="10" r="8" fill="none" stroke="#B3985B" strokeWidth="2"
                        strokeDasharray={`${2 * Math.PI * 8}`}
                        strokeDashoffset={`${2 * Math.PI * 8 * (1 - p.avance / 100)}`}
                        strokeLinecap="round" />
                    </svg>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-[#2a2a2a] group-hover:border-[#B3985B]/40 transition-colors" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-white">{p.nombre}</span>
                  {p.esPrivado && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c9a96a" strokeWidth="2" strokeLinecap="round" className="shrink-0">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${areaChipClass(p.area)}`}>
                    {areaLabel(p.area)}
                  </span>
                  {fasesTotal > 0 && (
                    <span className="text-[11px] text-[#444]">{fasesCompletas}/{fasesTotal} fases</span>
                  )}
                  {p.avance > 0 && (
                    <span className="text-[11px] text-[#555]">{p.avance}%</span>
                  )}
                </div>

                {/* Eliminar */}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAEliminar(p); }}
                  className="shrink-0 p-1 rounded-md text-[#3a3a3a] opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Eliminar proyecto">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </Link>
            );
          })}
        </div>
      ))}

      {showModal && (
        <ModalNuevoProyecto
          isAdmin={isAdmin}
          onSave={p => { setProyectos(prev => [p, ...prev]); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}

      {privacidadDe && (
        <PrivacidadPanel
          proyecto={privacidadDe}
          onUpdated={u => setProyectos(prev => prev.map(p => p.id === u.id ? { ...p, ...u } : p))}
          onClose={() => setPrivacidadDe(null)}
        />
      )}

      {aEliminar && (
        <ConfirmarEliminar
          proyecto={aEliminar}
          onConfirm={() => eliminarProyecto(aEliminar.id)}
          onClose={() => setAEliminar(null)}
        />
      )}
    </div>
  );
}
