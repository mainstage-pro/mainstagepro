"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar, User, Plus, Check, Trash2, Target, Package,
  FileText, Wallet, ChevronRight, CalendarClock,
} from "lucide-react";
import {
  areaLabel, areaChipClass, AREAS, AREA_LABELS, PRIORIDADES, PRIO_META,
} from "@/lib/gestion";
import NuevaTareaModal from "../../operaciones/components/NuevaTareaModal";

const ESTADO_LABELS: Record<string, string> = {
  PLANIFICACION: "Planificación", ACTIVO: "Activo",
  EN_PAUSA: "En pausa", COMPLETADO: "Completado", CANCELADO: "Cancelado",
};
const ESTADO_DOT: Record<string, string> = {
  PLANIFICACION: "#a78bfa", ACTIVO: "#4ade80", EN_PAUSA: "#e8a020", COMPLETADO: "#555", CANCELADO: "#555",
};
const PRIO_COLOR: Record<string, string> = {
  URGENTE: "#f87171", ALTA: "#fb923c", MEDIA: "#B3985B", BAJA: "#555",
};

type Usuario = { id: string; name: string };

type Tarea = {
  id: string; titulo: string; descripcion: string | null; estado: string; prioridad: string; area: string;
  fecha: string | null; fechaVencimiento: string | null; fechaCompletada: string | null; notas: string | null;
  createdAt: string; asignadoA: { id: string; name: string } | null;
  _count?: { subtareas: number; comentarios: number; archivos: number };
};
type Fase = { id: string; nombre: string; descripcion: string | null; orden: number; completada: boolean; tareas: Tarea[] };
type Seguimiento = {
  id: string; titulo: string; notas: string | null; estado: string;
  fecha: string | null; fechaCompletada: string | null; asignadoA: { id: string; name: string } | null;
};
type Proyecto = {
  id: string; nombre: string; descripcion: string | null; area: string; estado: string; prioridad: string;
  porcentajeAvance: number; presupuesto: number | null; objetivo: string | null; entregable: string | null;
  fechaInicio: string | null; fechaFin: string | null;
  lider: { id: string; name: string };
  fases: Fase[]; tareas: Tarea[]; seguimientos: Seguimiento[];
  tareasTotal: number; tareasHechas: number; avance: number;
};

const money = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
const fechaCorta = (iso: string | null) =>
  iso ? new Date(iso.substring(0, 10) + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "";
const fechaLarga = (iso: string | null) =>
  iso ? new Date(iso.substring(0, 10) + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "";

export default function ProyectoInternoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editNombre, setEditNombre] = useState(false);
  const [nombre, setNombre]     = useState("");
  const [modalTask, setModalTask] = useState<{ mode: "crear"; faseId: string | null } | { mode: "editar"; tareaId: string } | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  async function eliminarProyecto() {
    setEliminando(true);
    await fetch(`/api/proyectos-internos/${id}`, { method: "DELETE" });
    router.push("/proyectos-de-empresa");
  }

  const load = useCallback(async () => {
    const r = await fetch(`/api/proyectos-internos/${id}`, { cache: "no-store" });
    if (r.ok) { const d = await r.json(); setProyecto(d.proyecto); setNombre(d.proyecto?.nombre ?? ""); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch("/api/usuarios").then(r => r.json()).then(d => setUsuarios(d.usuarios ?? [])).catch(() => {}); }, []);

  const patchProyecto = useCallback(async (data: Record<string, unknown>) => {
    setProyecto(prev => prev ? { ...prev, ...data } as Proyecto : prev);
    await fetch(`/api/proyectos-internos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
  }, [id]);

  async function toggleTarea(t: Tarea | Seguimiento) {
    const next = t.estado === "COMPLETADA" ? "PENDIENTE" : "COMPLETADA";
    await fetch(`/api/tareas/${t.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado: next }),
    });
    load();
  }

  async function crearTareaInline(titulo: string, faseId: string | null) {
    if (!titulo.trim() || !proyecto) return;
    await fetch("/api/tareas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: titulo.trim(), area: proyecto.area, asignadoAId: proyecto.lider.id,
        proyectoInternoId: proyecto.id, faseInternaId: faseId,
      }),
    });
    load();
  }

  async function crearSeguimiento(titulo: string, fecha: string, nota: string, responsableId: string) {
    if (!titulo.trim() || !proyecto) return;
    await fetch("/api/tareas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: titulo.trim(), notas: nota || null, area: proyecto.area, asignadoAId: responsableId || proyecto.lider.id,
        proyectoInternoId: proyecto.id, esSeguimiento: true, fecha: fecha || null,
      }),
    });
    load();
  }

  async function crearFase(nombre: string) {
    if (!nombre.trim()) return;
    await fetch(`/api/proyectos-internos/${id}/fases`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: nombre.trim() }),
    });
    load();
  }
  async function patchFase(faseId: string, data: Record<string, unknown>) {
    await fetch(`/api/proyectos-internos/${id}/fases/${faseId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    load();
  }
  async function borrarFase(faseId: string) {
    if (!confirm("¿Eliminar esta sección? Sus tareas también se eliminarán.")) return;
    await fetch(`/api/proyectos-internos/${id}/fases/${faseId}`, { method: "DELETE" });
    load();
  }

  if (loading) return <div className="p-6 text-[#444] text-sm">Cargando...</div>;
  if (!proyecto) return <div className="p-6 text-[#444] text-sm">Proyecto no encontrado.</div>;

  const pct = proyecto.avance;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto pb-16">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#444] mb-4">
        <Link href="/proyectos-de-empresa" className="hover:text-[#B3985B] transition-colors">Proyectos de empresa</Link>
        <ChevronRight size={12} />
        <span className="text-[#888]">{proyecto.nombre}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* ── Columna izquierda ── */}
        <div className="space-y-5 min-w-0">
          {/* Header */}
          <div className="ms-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${areaChipClass(proyecto.area)}`}>{areaLabel(proyecto.area)}</span>
              <span className="w-1 h-1 rounded-full bg-[#333]" />
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#777]">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: ESTADO_DOT[proyecto.estado] }} />
                {ESTADO_LABELS[proyecto.estado]}
              </span>
            </div>
            {editNombre ? (
              <input value={nombre} onChange={e => setNombre(e.target.value)} autoFocus
                className="text-2xl font-bold bg-transparent border-b border-[#B3985B] text-white outline-none w-full"
                onBlur={async () => { if (nombre.trim() && nombre !== proyecto.nombre) await patchProyecto({ nombre }); setEditNombre(false); }}
                onKeyDown={async e => {
                  if (e.key === "Enter") { if (nombre.trim()) await patchProyecto({ nombre }); setEditNombre(false); }
                  if (e.key === "Escape") { setNombre(proyecto.nombre); setEditNombre(false); }
                }} />
            ) : (
              <h1 className="ms-h1 cursor-text hover:text-[#ddd] transition-colors" onClick={() => setEditNombre(true)}>{proyecto.nombre}</h1>
            )}
            <div className="flex items-center gap-3 mt-2 text-[12px] text-[#666] flex-wrap">
              <span className="inline-flex items-center gap-1.5"><User size={13} className="text-[#555]" />{proyecto.lider.name}</span>
              {(proyecto.fechaInicio || proyecto.fechaFin) && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#555]" />
                  {fechaLarga(proyecto.fechaInicio) || "—"} → {fechaLarga(proyecto.fechaFin) || "—"}
                </span>
              )}
            </div>
          </div>

          {/* Objetivo / Entregable / Descripción */}
          <div className="space-y-3">
            <Divider label="Objetivo" Icon={Target} />
            <EditableCard label="Objetivo" Icon={Target} value={proyecto.objetivo}
              placeholder="¿Qué resultado concreto busca este proyecto?"
              onSave={v => patchProyecto({ objetivo: v || null })} />
            <EditableCard label="Entregable" Icon={Package} value={proyecto.entregable}
              placeholder="¿Cuál es el entregable claro y final?"
              onSave={v => patchProyecto({ entregable: v || null })} />
            <EditableCard label="Descripción / notas" Icon={FileText} value={proyecto.descripcion}
              placeholder="Contexto, alcance, consideraciones…"
              onSave={v => patchProyecto({ descripcion: v || null })} />
          </div>

          {/* Secciones (fases) */}
          <div className="space-y-3">
            <Divider label="Plan de trabajo" Icon={Target} />
            {proyecto.fases.map(f => (
              <SeccionCard key={f.id} fase={f}
                onToggleTarea={toggleTarea}
                onOpenTarea={tid => setModalTask({ mode: "editar", tareaId: tid })}
                onNuevaTarea={() => setModalTask({ mode: "crear", faseId: f.id })}
                onAddInline={titulo => crearTareaInline(titulo, f.id)}
                onToggleCompletada={() => patchFase(f.id, { completada: !f.completada })}
                onRenombrar={nom => patchFase(f.id, { nombre: nom })}
                onBorrar={() => borrarFase(f.id)}
              />
            ))}
            {proyecto.tareas.length > 0 && (
              <SeccionCard fase={{ id: "__none__", nombre: "Sin sección", descripcion: null, orden: 999, completada: false, tareas: proyecto.tareas }}
                sinSeccion
                onToggleTarea={toggleTarea}
                onOpenTarea={tid => setModalTask({ mode: "editar", tareaId: tid })}
                onNuevaTarea={() => setModalTask({ mode: "crear", faseId: null })}
                onAddInline={titulo => crearTareaInline(titulo, null)}
              />
            )}
            <NuevaSeccion onCrear={crearFase} />
          </div>

          {/* Seguimientos / Agenda */}
          <div className="space-y-3">
            <Divider label="Seguimientos agendados" Icon={CalendarClock} />
            <SeguimientosBloque seguimientos={proyecto.seguimientos} onToggle={toggleTarea} onCrear={crearSeguimiento} usuarios={usuarios} liderId={proyecto.lider.id} />
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-3 lg:sticky lg:top-6 self-start">
          {/* Progreso */}
          <div className="ms-stat-card p-4">
            <div className="flex items-center gap-3">
              <ProgressRing pct={pct} />
              <div>
                <p className="text-2xl font-bold text-white leading-none">{pct}%</p>
                <p className="text-[11px] text-[#555] mt-1">{proyecto.tareasHechas}/{proyecto.tareasTotal} tareas</p>
              </div>
            </div>
          </div>

          <SideCard label="Estado">
            <select value={proyecto.estado} onChange={e => patchProyecto({ estado: e.target.value })} className={selCls}>
              {["PLANIFICACION", "ACTIVO", "EN_PAUSA", "COMPLETADO", "CANCELADO"].map(k => <option key={k} value={k}>{ESTADO_LABELS[k]}</option>)}
            </select>
          </SideCard>

          <SideCard label="Prioridad">
            <select value={proyecto.prioridad} onChange={e => patchProyecto({ prioridad: e.target.value })} className={selCls}>
              {PRIORIDADES.map(p => <option key={p} value={p}>{PRIO_META[p].label}</option>)}
            </select>
          </SideCard>

          <SideCard label="Responsable">
            <select value={proyecto.lider.id} onChange={e => {
              const u = usuarios.find(x => x.id === e.target.value);
              if (u) patchProyecto({ liderId: u.id, lider: u });
            }} className={selCls}>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </SideCard>

          <SideCard label="Área">
            <select value={proyecto.area} onChange={e => patchProyecto({ area: e.target.value })} className={selCls}>
              {AREAS.map(a => <option key={a} value={a}>{AREA_LABELS[a]}</option>)}
            </select>
          </SideCard>

          <div className="grid grid-cols-2 gap-2">
            <SideCard label="Inicio">
              <input type="date" value={proyecto.fechaInicio?.substring(0, 10) ?? ""}
                onChange={e => patchProyecto({ fechaInicio: e.target.value || null })} className={selCls} />
            </SideCard>
            <SideCard label="Entrega">
              <input type="date" value={proyecto.fechaFin?.substring(0, 10) ?? ""}
                onChange={e => patchProyecto({ fechaFin: e.target.value || null })} className={selCls} />
            </SideCard>
          </div>

          <SideCard label="Presupuesto">
            <PresupuestoInput value={proyecto.presupuesto} onSave={v => patchProyecto({ presupuesto: v })} />
          </SideCard>

          <button onClick={() => setConfirmarEliminar(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-500/15 text-red-400/70 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/[0.06] text-[12px] font-medium transition-all">
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar proyecto
          </button>
        </div>
      </div>

      {modalTask && (
        <NuevaTareaModal
          open onClose={() => { setModalTask(null); load(); }}
          usuarios={usuarios}
          tipoInicial="PROYECTO"
          proyectoInternoIdInicial={proyecto.id}
          proyectoInternoNombre={proyecto.nombre}
          faseInicialId={modalTask.mode === "crear" ? modalTask.faseId : null}
          defaultArea={proyecto.area}
          defaultAsignadoId={proyecto.lider.id}
          tareaIdEdicion={modalTask.mode === "editar" ? modalTask.tareaId : null}
          onCreated={() => load()}
        />
      )}

      {confirmarEliminar && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setConfirmarEliminar(false)}>
          <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="w-11 h-11 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-white font-semibold text-sm mb-1">Eliminar proyecto</h2>
            <p className="text-[12.5px] text-[#888] leading-relaxed mb-5">
              ¿Seguro que quieres eliminar <span className="text-white font-medium">{proyecto.nombre}</span>? Volverás al tablero.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmarEliminar(false)} className="px-4 py-2 text-sm text-[#555] hover:text-white transition-colors">Cancelar</button>
              <button onClick={eliminarProyecto} disabled={eliminando}
                className="px-4 py-2 bg-red-500/90 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                {eliminando ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const selCls = "w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-2.5 py-1.5 text-[12.5px] text-white focus:outline-none focus:border-[#B3985B]/40";

function Divider({ label, Icon }: { label: string; Icon: typeof Target }) {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <span className="w-5 h-5 rounded-md bg-[#B3985B]/12 border border-[#B3985B]/20 flex items-center justify-center shrink-0">
        <Icon size={11} className="text-[#B3985B]" />
      </span>
      <span className="text-[10px] font-bold text-[#B3985B]/70 uppercase tracking-[0.12em]">{label}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-[#B3985B]/15 to-transparent" />
    </div>
  );
}

function SideCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ms-stat-card p-3">
      <p className="text-[10px] uppercase tracking-wider text-[#555] mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 22, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 52 52" className="w-14 h-14 -rotate-90 shrink-0">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#1a1a1a" strokeWidth="4" />
      <circle cx="26" cy="26" r={r} fill="none" stroke="#B3985B" strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} className="transition-all" />
    </svg>
  );
}

function PresupuestoInput({ value, onSave }: { value: number | null; onSave: (v: number | null) => void }) {
  const [v, setV] = useState(value != null ? String(value) : "");
  useEffect(() => { setV(value != null ? String(value) : ""); }, [value]);
  return (
    <div className="flex items-center gap-1.5">
      <Wallet size={13} className="text-[#555] shrink-0" />
      <span className="text-[#555] text-[13px]">$</span>
      <input type="number" value={v} placeholder="0" onChange={e => setV(e.target.value)}
        onBlur={() => onSave(v.trim() === "" ? null : Number(v))}
        className="w-full bg-transparent text-[13px] text-white placeholder-[#333] focus:outline-none" />
    </div>
  );
}

function TareaRow({ t, onToggle, onOpen }: { t: Tarea; onToggle: () => void; onOpen: () => void }) {
  const done = t.estado === "COMPLETADA";
  return (
    <div onClick={onOpen} className="group flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#0f0f0f] transition-colors">
      <button onClick={e => { e.stopPropagation(); onToggle(); }}
        className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
          done ? "border-green-500 bg-green-500/20 text-green-400" : "border-[#333] hover:border-[#B3985B] text-transparent"}`}>
        {done && <Check size={9} strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] leading-snug ${done ? "line-through text-[#555]" : "text-white"}`}>{t.titulo}</p>
        <div className="flex items-center flex-wrap gap-1.5 mt-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ color: PRIO_COLOR[t.prioridad] ?? "#555", background: (PRIO_COLOR[t.prioridad] ?? "#555") + "18" }}>
            {PRIO_META[t.prioridad]?.label ?? t.prioridad}
          </span>
          {t.asignadoA && <span className="inline-flex items-center gap-1 text-[10px] text-[#888] px-1.5 py-0.5 rounded-full bg-[#1a1a1a]"><User size={10} />{t.asignadoA.name}</span>}
          {t.fecha && <span className="inline-flex items-center gap-1 text-[10px] text-[#666] px-1.5 py-0.5 rounded-full bg-[#111]"><Calendar size={10} />{fechaCorta(t.fecha)}</span>}
        </div>
      </div>
      <span className="shrink-0 self-center text-[10px] text-[#555] opacity-0 group-hover:opacity-100 transition-opacity">Abrir →</span>
    </div>
  );
}

function InlineAdd({ onAdd, placeholder }: { onAdd: (v: string) => void; placeholder: string }) {
  const [v, setV] = useState("");
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t border-[#141414]">
      <Plus size={13} className="text-[#555] shrink-0" />
      <input value={v} onChange={e => setV(e.target.value)} placeholder={placeholder}
        onKeyDown={e => { if (e.key === "Enter" && v.trim()) { onAdd(v); setV(""); } }}
        className="flex-1 bg-transparent text-[12.5px] text-white placeholder-[#444] focus:outline-none py-0.5" />
    </div>
  );
}

function SeccionCard({ fase, sinSeccion, onToggleTarea, onOpenTarea, onNuevaTarea, onAddInline, onToggleCompletada, onRenombrar, onBorrar }: {
  fase: Fase; sinSeccion?: boolean;
  onToggleTarea: (t: Tarea) => void; onOpenTarea: (id: string) => void;
  onNuevaTarea: () => void; onAddInline: (titulo: string) => void;
  onToggleCompletada?: () => void; onRenombrar?: (nombre: string) => void; onBorrar?: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nom, setNom] = useState(fase.nombre);
  const total = fase.tareas.length;
  const done = fase.tareas.filter(t => t.estado === "COMPLETADA").length;

  return (
    <div className="ms-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#141414]">
        {!sinSeccion && onToggleCompletada && (
          <button onClick={onToggleCompletada} title={fase.completada ? "Marcar pendiente" : "Marcar sección completada"}
            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
              fase.completada ? "border-green-500 bg-green-500/20 text-green-400" : "border-[#333] hover:border-[#B3985B] text-transparent"}`}>
            {fase.completada && <Check size={9} strokeWidth={3} />}
          </button>
        )}
        {editando && !sinSeccion ? (
          <input value={nom} onChange={e => setNom(e.target.value)} autoFocus
            onBlur={() => { if (nom.trim() && nom !== fase.nombre) onRenombrar?.(nom); setEditando(false); }}
            onKeyDown={e => { if (e.key === "Enter") { if (nom.trim()) onRenombrar?.(nom); setEditando(false); } if (e.key === "Escape") { setNom(fase.nombre); setEditando(false); } }}
            className="flex-1 bg-transparent border-b border-[#B3985B] text-[13px] font-semibold text-white outline-none" />
        ) : (
          <h3 className={`flex-1 text-[13px] font-semibold ${sinSeccion ? "text-[#888]" : "text-white cursor-text"} ${fase.completada ? "text-[#666]" : ""}`}
            onClick={() => !sinSeccion && setEditando(true)}>{fase.nombre}</h3>
        )}
        {total > 0 && <span className="text-[10px] text-[#555]">{done}/{total}</span>}
        {!sinSeccion && onBorrar && (
          <button onClick={onBorrar} className="text-[#333] hover:text-red-400 transition-colors shrink-0"><Trash2 size={13} /></button>
        )}
      </div>

      {fase.tareas.length > 0 && (
        <div className="divide-y divide-[#111]">
          {fase.tareas.map(t => <TareaRow key={t.id} t={t} onToggle={() => onToggleTarea(t)} onOpen={() => onOpenTarea(t.id)} />)}
        </div>
      )}

      <button onClick={onNuevaTarea}
        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-[12px] font-medium text-[#B3985B] hover:bg-[#B3985B]/10 border-t border-[#141414] transition-colors">
        <Plus size={13} /> Nueva tarea con detalles
      </button>
      <InlineAdd onAdd={onAddInline} placeholder="Agregar tarea rápida…" />
    </div>
  );
}

function NuevaSeccion({ onCrear }: { onCrear: (nombre: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [v, setV] = useState("");
  if (!abierto) return (
    <button onClick={() => setAbierto(true)}
      className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-dashed border-[#222] text-[12px] text-[#666] hover:text-[#B3985B] hover:border-[#B3985B]/30 transition-all">
      <Plus size={13} /> Nueva sección / paso
    </button>
  );
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a]">
      <input value={v} onChange={e => setV(e.target.value)} autoFocus placeholder="Nombre de la sección…"
        onKeyDown={e => { if (e.key === "Enter" && v.trim()) { onCrear(v); setV(""); setAbierto(false); } if (e.key === "Escape") { setAbierto(false); setV(""); } }}
        className="flex-1 bg-transparent text-[13px] text-white placeholder-[#444] focus:outline-none" />
      <button onClick={() => { if (v.trim()) { onCrear(v); setV(""); } setAbierto(false); }} className="text-[11px] text-[#B3985B] hover:underline">Crear</button>
      <button onClick={() => { setAbierto(false); setV(""); }} className="text-[11px] text-[#555] hover:text-white">Cancelar</button>
    </div>
  );
}

function SeguimientosBloque({ seguimientos, onToggle, onCrear, usuarios, liderId }: {
  seguimientos: Seguimiento[]; onToggle: (s: Seguimiento) => void; onCrear: (titulo: string, fecha: string, nota: string, responsableId: string) => void;
  usuarios: Usuario[]; liderId: string;
}) {
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");
  const [nota, setNota] = useState("");
  const [responsable, setResponsable] = useState(liderId);
  const pendientes = useMemo(() => seguimientos.filter(s => s.estado !== "COMPLETADA"), [seguimientos]);
  const hechos = useMemo(() => seguimientos.filter(s => s.estado === "COMPLETADA"), [seguimientos]);

  return (
    <div className="ms-card overflow-hidden">
      {seguimientos.length > 0 && (
        <div className="divide-y divide-[#111]">
          {[...pendientes, ...hechos].map(s => {
            const done = s.estado === "COMPLETADA";
            return (
              <div key={s.id} className="flex items-start gap-3 px-4 py-2.5">
                <button onClick={() => onToggle(s)}
                  className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    done ? "border-green-500 bg-green-500/20 text-green-400" : "border-[#333] hover:border-[#B3985B] text-transparent"}`}>
                  {done && <Check size={9} strokeWidth={3} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] leading-snug ${done ? "line-through text-[#555]" : "text-white"}`}>{s.titulo}</p>
                  {s.notas && <p className="text-[11px] text-[#666] mt-0.5">{s.notas}</p>}
                </div>
                {s.asignadoA && <span className="inline-flex items-center gap-1 text-[10px] text-[#888] px-1.5 py-0.5 rounded-full bg-[#1a1a1a] shrink-0"><User size={10} />{s.asignadoA.name.split(" ")[0]}</span>}
                {s.fecha && <span className="inline-flex items-center gap-1 text-[10px] text-[#888] px-1.5 py-0.5 rounded-full bg-[#111] shrink-0"><CalendarClock size={10} />{fechaCorta(s.fecha)}</span>}
              </div>
            );
          })}
        </div>
      )}
      <div className="p-3 border-t border-[#141414] space-y-2">
        <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Nuevo seguimiento (ej. Revisar avance con proveedor)…"
          className="w-full bg-transparent text-[13px] text-white placeholder-[#444] focus:outline-none" />
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={selCls + " w-auto"} />
          <select value={responsable} onChange={e => setResponsable(e.target.value)} className={selCls + " w-auto"} title="Responsable">
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota (opcional)"
            className="flex-1 min-w-[120px] bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-2.5 py-1.5 text-[12.5px] text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/40" />
          <button onClick={() => { if (titulo.trim()) { onCrear(titulo, fecha, nota, responsable); setTitulo(""); setFecha(""); setNota(""); setResponsable(liderId); } }}
            disabled={!titulo.trim()}
            className="shrink-0 px-3 py-1.5 bg-[#B3985B] hover:bg-[#c9a96a] text-black text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-30">
            Agendar
          </button>
        </div>
        <p className="text-[10px] text-[#555]">Los seguimientos con fecha aparecen en <span className="text-[#777]">Operaciones → Hoy</span> con el tag del proyecto.</p>
      </div>
    </div>
  );
}

function EditableCard({ label, Icon, value, placeholder, onSave }: {
  label: string; Icon: typeof Target; value: string | null; placeholder: string; onSave: (v: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [v, setV] = useState(value ?? "");
  useEffect(() => { setV(value ?? ""); }, [value]);
  return (
    <div className="ms-card-deep p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={13} className="text-[#B3985B]/70" />
        <p className="text-[11px] uppercase tracking-wider text-[#666]">{label}</p>
        {!editando && <button onClick={() => setEditando(true)} className="ml-auto text-[10px] text-[#555] hover:text-[#B3985B]">{value ? "Editar" : "Agregar"}</button>}
      </div>
      {editando ? (
        <div className="space-y-2">
          <textarea value={v} onChange={e => setV(e.target.value)} autoFocus rows={3} placeholder={placeholder}
            className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg px-3 py-2 text-[13px] text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/40 resize-none" />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setV(value ?? ""); setEditando(false); }} className="text-[11px] text-[#555] hover:text-white">Cancelar</button>
            <button onClick={() => { onSave(v.trim()); setEditando(false); }} className="text-[11px] text-[#B3985B] hover:underline">Guardar</button>
          </div>
        </div>
      ) : value ? (
        <p className="text-[13px] text-[#999] leading-relaxed whitespace-pre-wrap">{value}</p>
      ) : (
        <p className="text-[12px] text-[#444] italic cursor-text" onClick={() => setEditando(true)}>{placeholder}</p>
      )}
    </div>
  );
}
