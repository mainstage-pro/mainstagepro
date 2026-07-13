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
  fechaInicio: string | null; fechaFin: string | null;
  lider: { id: string; name: string };
  fases: { id: string; nombre: string; completada: boolean; _count: { tareas: number } }[];
  _count: { tareas: number };
};

function ModalNuevoProyecto({ onSave, onClose }: {
  onSave: (p: Proyecto) => void; onClose: () => void;
}) {
  const [usuarios, setUsuarios]   = useState<Usuario[]>([]);
  const [nombre, setNombre]       = useState("");
  const [descripcion, setDescr]   = useState("");
  const [area, setArea]           = useState<string | null>(null);
  const [liderId, setLider]       = useState<string | null>(null);
  const [prioridad, setPrio]      = useState("MEDIA");
  const [fechaInicio, setInicio]  = useState("");
  const [fechaFin, setFin]        = useState("");
  const [etapas, setEtapas]       = useState<string[]>([]);
  const [subtareas, setSubtareas] = useState<string[]>([]);
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

        <DynamicList label="Etapas de planeación" placeholder="Nombre de la etapa" items={etapas} setItems={setEtapas} addLabel="+ Etapa" />
        <DynamicList label="Subtareas del proyecto" placeholder="Subtarea a cumplir" items={subtareas} setItems={setSubtareas} addLabel="+ Subtarea" />

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

const ESTADO_DOT: Record<string, string> = {
  PLANIFICACION: "#a78bfa", ACTIVO: "#4ade80", EN_PAUSA: "#e8a020", COMPLETADO: "#555",
};

function KanbanBoard({ proyectos, onMove }: {
  proyectos: Proyecto[];
  onMove: (id: string, estado: string) => void;
}) {
  const [dragId, setDragId]   = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollbarWidth: "thin" }}>
      {ESTADO_ORDER.map(estado => {
        const cards = proyectos.filter(p => p.estado === estado);
        return (
          <div key={estado} className="w-64 shrink-0"
            onDragOver={e => { e.preventDefault(); setOverCol(estado); }}
            onDragLeave={() => setOverCol(c => c === estado ? null : c)}
            onDrop={() => {
              if (dragId) onMove(dragId, estado);
              setDragId(null); setOverCol(null);
            }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1a1a1a] bg-white/[0.02] mb-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: ESTADO_DOT[estado] }} />
              <span className="text-xs font-semibold text-[#ccc]">{ESTADO_LABELS[estado]}</span>
              <span className="ml-auto text-[10px] text-[#555]">{cards.length}</span>
            </div>
            <div className={`space-y-2 min-h-[80px] rounded-lg p-1 transition-colors ${
              overCol === estado ? "bg-[#B3985B]/5 ring-1 ring-[#B3985B]/20" : ""
            }`}>
              {cards.map(p => {
                const fasesTotal = p.fases.length;
                const fasesCompletas = p.fases.filter(f => f.completada).length;
                return (
                  <div key={p.id} draggable
                    onDragStart={() => setDragId(p.id)}
                    onDragEnd={() => { setDragId(null); setOverCol(null); }}
                    className={`rounded-lg border border-white/[0.08] bg-white/[0.025] p-3 cursor-grab active:cursor-grabbing transition-opacity ${
                      dragId === p.id ? "opacity-40" : ""
                    }`}>
                    <Link href={`/proyectos-internos/${p.id}`} className="block" onClick={e => { if (dragId) e.preventDefault(); }}>
                      <p className="text-[13px] text-white leading-snug mb-2">{p.nombre}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-medium ${areaChipClass(p.area)}`}>
                          {areaLabel(p.area)}
                        </span>
                        {fasesTotal > 0 && <span className="text-[10px] text-[#555]">{fasesCompletas}/{fasesTotal} fases</span>}
                      </div>
                      {p.porcentajeAvance > 0 && (
                        <div className="mt-2 h-1 rounded-full bg-[#1a1a1a] overflow-hidden">
                          <div className="h-full rounded-full bg-[#B3985B]" style={{ width: `${p.porcentajeAvance}%` }} />
                        </div>
                      )}
                    </Link>
                  </div>
                );
              })}
              {cards.length === 0 && (
                <p className="text-center text-[11px] text-[#2a2a2a] py-4">Vacío</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ProyectosInternosPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [estadoFiltro, setEstado] = useState("ACTIVO");
  const [showModal, setShowModal] = useState(false);
  const [vista, setVista]         = useState<"lista" | "kanban">("kanban");

  useEffect(() => {
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

  const filtrados = proyectos.filter(p => p.estado === estadoFiltro);

  return (
    <div className={`p-4 md:p-6 ${vista === "kanban" ? "max-w-6xl" : "max-w-3xl"} mx-auto space-y-5`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-1">Gestión Operativa</p>
          <h1 className="text-white text-2xl font-bold">Proyectos internos</h1>
          <p className="text-[#555] text-sm mt-1">Mejoras, implementaciones y desarrollo de la empresa</p>
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
        <KanbanBoard proyectos={proyectos} onMove={moverProyecto} />
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
              <Link key={p.id} href={`/proyectos-internos/${p.id}`}
                className="flex items-center gap-3 px-1 py-2.5 rounded-xl hover:bg-[#0d0d0d] group transition-colors">
                {/* Círculo / avance */}
                <div className="shrink-0 relative w-5 h-5">
                  {p.porcentajeAvance > 0 ? (
                    <svg viewBox="0 0 20 20" className="w-5 h-5 -rotate-90">
                      <circle cx="10" cy="10" r="8" fill="none" stroke="#1a1a1a" strokeWidth="2" />
                      <circle cx="10" cy="10" r="8" fill="none" stroke="#B3985B" strokeWidth="2"
                        strokeDasharray={`${2 * Math.PI * 8}`}
                        strokeDashoffset={`${2 * Math.PI * 8 * (1 - p.porcentajeAvance / 100)}`}
                        strokeLinecap="round" />
                    </svg>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-[#2a2a2a] group-hover:border-[#B3985B]/40 transition-colors" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-white">{p.nombre}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${areaChipClass(p.area)}`}>
                    {areaLabel(p.area)}
                  </span>
                  {fasesTotal > 0 && (
                    <span className="text-[11px] text-[#444]">{fasesCompletas}/{fasesTotal} fases</span>
                  )}
                  {p.porcentajeAvance > 0 && (
                    <span className="text-[11px] text-[#555]">{p.porcentajeAvance}%</span>
                  )}
                </div>

                {/* Flecha */}
                <span className="shrink-0 opacity-0 group-hover:opacity-100 text-[#555] text-xs transition-opacity">→</span>
              </Link>
            );
          })}
        </div>
      ))}

      {showModal && (
        <ModalNuevoProyecto
          onSave={p => { setProyectos(prev => [p, ...prev]); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
