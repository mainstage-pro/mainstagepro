"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import TaskModal, { type TareaDetalle } from "./TaskModal";
import NuevaTareaModal from "./NuevaTareaModal";

interface Recurso { id: string; name?: string; nombre?: string; color?: string | null }

// ── Vista semanal del equipo ──────────────────────────────────────────────────
// Una sub-pestaña por miembro. Para cada persona: columnas lun–vie con sus
// tareas agrupadas por tipo de sistema (Tarea · Plan · Proyecto de evento ·
// Proyecto de empresa · Trato). Cada día muestra su carga y se resalta el más
// cargado. Las tareas se pueden reasignar a otro día arrastrándolas (desktop) o
// con el menú "mover" de cada tarjeta (móvil). Reasignar = PATCH fecha.

const TIPOS: { key: string; label: string; corto: string; color: string }[] = [
  { key: "TAREA",    label: "Tareas",               corto: "Tarea",   color: "#9ca3af" },
  { key: "PLAN",     label: "Plan de trabajo",      corto: "Plan",    color: "#a78bfa" },
  { key: "EVENTO",   label: "Proyectos de evento",  corto: "Evento",  color: "#60a5fa" },
  { key: "PROYECTO", label: "Proyectos de empresa", corto: "Empresa", color: "#818cf8" },
  { key: "TRATO",    label: "Tratos",               corto: "Trato",   color: "#34d399" },
];
const TIPO_INFO = Object.fromEntries(TIPOS.map(t => [t.key, t]));

const DIAS_LABEL = ["Lun", "Mar", "Mié", "Jue", "Vie"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

interface TareaSemana {
  id: string;
  titulo: string;
  prioridad: string;
  estado: string;
  tipo: string;
  dia: string;
  contexto: string | null;
  vencida: boolean;
  recurrente?: boolean;
  orden?: number;
  estadoVerificacion?: string | null;
  noRealizada?: boolean;
}
interface UsuarioSemana {
  id: string;
  name: string;
  area: string | null;
  total: number;
  tareas: TareaSemana[];
}
interface RespData {
  isAdmin: boolean;
  currentUserId: string;
  inicio: string;
  dias: string[];
  usuarios: UsuarioSemana[];
}

function prioColor(p: string) {
  if (p === "URGENTE") return "#ef4444";
  if (p === "ALTA") return "#f97316";
  if (p === "MEDIA") return "#eab308";
  return "#6b7280";
}

function fmtDiaCorto(ymd: string) {
  const [, m, d] = ymd.split("-");
  return `${parseInt(d, 10)} ${MESES[parseInt(m, 10) - 1]}`;
}

// Desplaza un YYYY-MM-DD por n días (aritmética UTC de calendario).
function shiftYMD(ymd: string, n: number) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ISO de una fecha-calendario a medianoche UTC (convención de guardado de tareas,
// para que la tarea quede exactamente en ese día).
function isoDia(ymd: string) {
  return new Date(`${ymd}T00:00:00.000Z`).toISOString();
}

export function VistaSemanaEquipo() {
  const [data, setData] = useState<RespData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [inicio, setInicio] = useState<string | null>(null); // lunes de la semana
  const [miembroId, setMiembroId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  // Día (YYYY-MM-DD) para el que se está creando una tarea nueva desde la vista.
  const [agregarDia, setAgregarDia] = useState<string | null>(null);

  // ── Panel de tarea (mismo que Operaciones) ──
  const [selectedTask, setSelectedTask] = useState<TareaDetalle | null>(null);
  const [loadingPanel, setLoadingPanel] = useState(false);
  const [usuarios, setUsuarios] = useState<Recurso[]>([]);
  const [proyectos, setProyectos] = useState<Recurso[]>([]);
  const [iniciativas, setIniciativas] = useState<Recurso[]>([]);
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/me").then(r => r.json()).catch(() => null),
      fetch("/api/usuarios").then(r => r.json()).catch(() => null),
      fetch("/api/operaciones/proyectos").then(r => r.json()).catch(() => null),
      fetch("/api/iniciativas").then(r => r.json()).catch(() => null),
    ]).then(([me, u, p, i]) => {
      if (me?.id) setSessionId(me.id);
      setUsuarios(u?.usuarios ?? []);
      setProyectos(p?.proyectos ?? []);
      setIniciativas(Array.isArray(i) ? i : (i?.iniciativas ?? []));
    });
  }, []);

  const cargar = (semana: string | null) => {
    setLoading(true);
    setError(false);
    const url = semana
      ? `/api/operaciones/equipo-semanal?inicio=${semana}`
      : `/api/operaciones/equipo-semanal`;
    let vivo = true;
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: RespData) => {
        if (!vivo) return;
        setData(d);
        setInicio(d.inicio);
        setMiembroId(prev => {
          if (prev && d.usuarios.some(u => u.id === prev)) return prev;
          return d.usuarios[0]?.id ?? null;
        });
        setLoading(false);
      })
      .catch(() => { if (vivo) { setError(true); setLoading(false); } });
    return () => { vivo = false; };
  };

  useEffect(() => { cargar(null); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Reasignar una tarea a otro día (optimista + PATCH).
  const moverTarea = async (tareaId: string, nuevoDia: string) => {
    if (!data) return;
    const prev = data;
    const usuarios = data.usuarios.map(u => ({
      ...u,
      tareas: u.tareas.map(t => (t.id === tareaId ? { ...t, dia: nuevoDia, vencida: false } : t)),
    }));
    setData({ ...data, usuarios });
    try {
      const r = await fetch(`/api/tareas/${tareaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: isoDia(nuevoDia) }),
      });
      if (!r.ok) throw new Error();
      const res = await r.json();
      // Si era recurrente y el server la reagendó a otra fecha, recargamos.
      if (res?.reagendada) cargar(inicio);
    } catch {
      setData(prev);
      setAviso("No se pudo mover la tarea. Intenta de nuevo.");
      setTimeout(() => setAviso(null), 3000);
    }
  };

  // Reordenar un grupo de tareas dentro de un día (optimista + PATCH orden).
  // orderedIds va en el nuevo orden deseado; asigna orden = índice a cada una.
  const reordenarGrupo = async (orderedIds: string[]) => {
    if (!data || !miembroId) return;
    const prev = data;
    const ordenMap = new Map(orderedIds.map((id, i) => [id, i]));
    const usuarios = data.usuarios.map(u => (u.id !== miembroId ? u : {
      ...u,
      tareas: u.tareas.map(t => (ordenMap.has(t.id) ? { ...t, orden: ordenMap.get(t.id)! } : t)),
    }));
    setData({ ...data, usuarios });
    try {
      await Promise.all(orderedIds.map((id, i) =>
        fetch(`/api/tareas/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orden: i }),
        }).then(r => { if (!r.ok) throw new Error(); })
      ));
    } catch {
      setData(prev);
      setAviso("No se pudo reordenar. Intenta de nuevo.");
      setTimeout(() => setAviso(null), 3000);
    }
  };

  // ── Abrir/editar tarea en el panel ──
  const abrirTarea = async (id: string) => {
    setLoadingPanel(true);
    try {
      const res = await fetch(`/api/tareas/${id}`);
      const d = await res.json();
      setSelectedTask((d.tarea ?? d) as TareaDetalle);
    } catch {
      setSelectedTask(null);
      setAviso("No se pudo abrir la tarea.");
      setTimeout(() => setAviso(null), 3000);
    } finally {
      setLoadingPanel(false);
    }
  };

  const cerrarPanel = () => { setSelectedTask(null); setLoadingPanel(false); };

  const guardarTarea = async (id: string, patch: Record<string, unknown>) => {
    const res = await fetch(`/api/tareas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      setAviso("No se pudo guardar el cambio.");
      setTimeout(() => setAviso(null), 3000);
      return;
    }
    const d = await res.json().catch(() => ({}));
    const saved = d?.tarea;
    // Fusionar el patch en la tarea abierta (el modal conserva su estado local;
    // subtareas/comentarios/archivos no vienen en la respuesta del PATCH).
    setSelectedTask(prev => {
      if (!prev || prev.id !== id) return prev;
      const merged = { ...prev, ...patch } as TareaDetalle;
      if (saved) {
        merged.fecha = saved.fecha ?? merged.fecha;
        merged.recurrencia = saved.recurrencia ?? merged.recurrencia;
      }
      return merged;
    });
    cargar(inicio);
  };

  const completarTarea = async (id: string) => {
    await fetch(`/api/tareas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "COMPLETADA" }),
    });
    setSelectedTask(null);
    cargar(inicio);
  };

  // Marcar la tarea abierta como "no realizada" con motivo + justificación.
  const noRealizarTarea = async (id: string, motivo: string, justificacion: string) => {
    const r = await fetch(`/api/tareas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noRealizada: true, motivoNoRealizada: motivo, justificacionNoRealizada: justificacion }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setAviso(d.error ?? "No se pudo marcar como no realizada.");
      setTimeout(() => setAviso(null), 3000);
      return;
    }
    setSelectedTask(null);
    cargar(inicio);
  };

  // Completar/reabrir una tarea directamente desde su tarjeta (optimista + PATCH).
  const alternarCompletada = async (id: string, completar: boolean) => {
    if (!data) return;
    const prev = data;
    const nuevoEstado = completar ? "COMPLETADA" : "PENDIENTE";
    const usuarios = data.usuarios.map(u => ({
      ...u,
      tareas: u.tareas.map(t => (t.id === id ? { ...t, estado: nuevoEstado } : t)),
    }));
    setData({ ...data, usuarios });
    try {
      const r = await fetch(`/api/tareas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!r.ok) throw new Error();
      const res = await r.json().catch(() => ({}));
      // Recurrente completada: el server la reagenda a otra fecha; recargamos.
      if (res?.reagendada) cargar(inicio);
    } catch {
      setData(prev);
      setAviso("No se pudo actualizar la tarea. Intenta de nuevo.");
      setTimeout(() => setAviso(null), 3000);
    }
  };

  const eliminarTarea = async (id: string) => {
    await fetch(`/api/tareas/${id}`, { method: "DELETE" });
    setSelectedTask(null);
    cargar(inicio);
  };

  const agregarSubtarea = async (parentId: string, sub: { titulo: string; fecha: string | null; prioridad: string }) => {
    await fetch("/api/tareas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...sub, parentId, area: "GENERAL" }),
    });
    abrirTarea(parentId);
  };

  const completarSubtarea = async (id: string) => {
    await fetch(`/api/tareas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "COMPLETADA" }),
    });
    if (selectedTask) abrirTarea(selectedTask.id);
  };

  const eliminarSubtarea = async (id: string) => {
    await fetch(`/api/tareas/${id}`, { method: "DELETE" });
    if (selectedTask) abrirTarea(selectedTask.id);
  };

  if (loading && !data) {
    return <div className="p-8 text-sm text-[#555]">Cargando semana…</div>;
  }
  if (error || !data) {
    return <div className="p-8 text-sm text-red-400">No se pudo cargar la vista semanal.</div>;
  }

  const miembro = data.usuarios.find(u => u.id === miembroId) ?? data.usuarios[0];
  const rangoLabel = data.dias.length
    ? `${fmtDiaCorto(data.dias[0])} – ${fmtDiaCorto(data.dias[4])}`
    : "";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Barra superior: navegación de semana */}
      <div className="flex flex-wrap items-center gap-3 px-4 md:px-6 pt-4 pb-3 shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-white">Semana del equipo</h1>
          <p className="text-xs text-[#666] mt-0.5">
            Tareas de lunes a viernes por persona, agrupadas por tipo. Haz clic para abrir y editar, arrástrala para reordenarla o moverla de día, y marca el círculo para completarla.
          </p>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => cargar(shiftYMD(data.inicio, -7))}
            className="w-8 h-8 grid place-items-center rounded-md border border-white/[0.08] text-[#999] hover:text-white hover:bg-white/[0.04]"
            aria-label="Semana anterior"
          >‹</button>
          <button
            onClick={() => cargar(null)}
            className="px-3 h-8 rounded-md border border-white/[0.08] text-xs text-[#999] hover:text-white hover:bg-white/[0.04]"
          >Hoy</button>
          <button
            onClick={() => cargar(shiftYMD(data.inicio, 7))}
            className="w-8 h-8 grid place-items-center rounded-md border border-white/[0.08] text-[#999] hover:text-white hover:bg-white/[0.04]"
            aria-label="Semana siguiente"
          >›</button>
          <span className="ml-2 text-sm text-[#bbb] tabular-nums whitespace-nowrap">{rangoLabel}</span>
        </div>
      </div>

      {/* Sub-pestañas por miembro */}
      {data.usuarios.length > 1 && (
        <div className="flex gap-1 px-4 md:px-6 pb-2 overflow-x-auto shrink-0" style={{ scrollbarWidth: "thin" }}>
          {data.usuarios.map(u => {
            const activo = u.id === miembro?.id;
            return (
              <button
                key={u.id}
                onClick={() => setMiembroId(u.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 border transition-colors ${
                  activo
                    ? "border-[#B3985B]/60 bg-[#B3985B]/15 text-white"
                    : "border-white/[0.06] text-[#888] hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                {u.name.split(/\s+/)[0]}
                <span className={`ml-1.5 tabular-nums ${activo ? "text-[#B3985B]" : "text-[#555]"}`}>{u.total}</span>
                {u.id === data.currentUserId && (
                  <span className="ml-1 text-[9px] text-[#B3985B]">·tú</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {aviso && (
        <div className="mx-4 md:mx-6 mb-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-1.5">
          {aviso}
        </div>
      )}

      {/* Rejilla semanal del miembro seleccionado */}
      {miembro ? (
        <SemanaMiembro
          dias={data.dias}
          miembro={miembro}
          onMover={moverTarea}
          onAbrir={abrirTarea}
          onReordenar={reordenarGrupo}
          onAgregar={setAgregarDia}
          onCompletar={alternarCompletada}
        />
      ) : (
        <div className="p-8 text-sm text-[#555]">Sin miembros para mostrar.</div>
      )}

      {/* Crear tarea nueva para un día concreto del miembro seleccionado */}
      {agregarDia && miembro && (
        <NuevaTareaModal
          open
          onClose={() => setAgregarDia(null)}
          usuarios={usuarios as { id: string; name: string }[]}
          defaultAsignadoId={miembro.id}
          fechaInicial={agregarDia}
          onCreated={() => { setAgregarDia(null); cargar(inicio); }}
        />
      )}

      {/* Panel de tarea, idéntico al de Operaciones (TaskModal) */}
      {(selectedTask || loadingPanel) && (
        <TaskModal
          tarea={selectedTask}
          loading={loadingPanel}
          usuarios={usuarios as { id: string; name: string }[]}
          proyectos={proyectos as { id: string; nombre: string; color: string | null }[]}
          iniciativas={iniciativas as { id: string; nombre: string; color: string | null }[]}
          sessionId={sessionId}
          onClose={cerrarPanel}
          onSave={guardarTarea}
          onComplete={completarTarea}
          onNoRealizada={noRealizarTarea}
          onDelete={eliminarTarea}
          onAddSubtarea={agregarSubtarea}
          onCompleteSubtarea={completarSubtarea}
          onDeleteSubtarea={eliminarSubtarea}
        />
      )}
    </div>
  );
}

function SemanaMiembro({
  dias,
  miembro,
  onMover,
  onAbrir,
  onReordenar,
  onAgregar,
  onCompletar,
}: {
  dias: string[];
  miembro: UsuarioSemana;
  onMover: (tareaId: string, dia: string) => void;
  onAbrir: (tareaId: string) => void;
  onReordenar: (orderedIds: string[]) => void;
  onAgregar: (dia: string) => void;
  onCompletar: (tareaId: string, completar: boolean) => void;
}) {
  const [dragOver, setDragOver] = useState<string | null>(null);
  // Ranura de inserción resaltada al arrastrar dentro de un grupo: "dia|tipo|index".
  const [dropSlot, setDropSlot] = useState<string | null>(null);
  // Origen de la tarjeta que se está arrastrando.
  const dragInfo = useRef<{ id: string; dia: string; tipo: string } | null>(null);

  // Agrupar tareas por día, ordenadas por `orden` dentro de cada día.
  const porDia = useMemo(() => {
    const m = new Map<string, TareaSemana[]>();
    dias.forEach(d => m.set(d, []));
    for (const t of miembro.tareas) m.get(t.dia)?.push(t);
    for (const arr of m.values()) arr.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    return m;
  }, [dias, miembro.tareas]);

  // Carga por día (pendientes) para el mapa de calor.
  const cargaPorDia = dias.map(d => (porDia.get(d) ?? []).filter(t => t.estado !== "COMPLETADA").length);
  const maxCarga = Math.max(1, ...cargaPorDia);

  // Soltar sobre el área del día (no sobre una tarjeta) = mover de día.
  const handleDrop = (dia: string) => {
    const info = dragInfo.current;
    dragInfo.current = null;
    setDragOver(null);
    setDropSlot(null);
    if (info && info.dia !== dia) onMover(info.id, dia);
  };

  return (
    <div className="flex-1 min-h-0 overflow-auto px-4 md:px-6 pb-6" style={{ scrollbarWidth: "thin" }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 min-w-0">
        {dias.map((dia, i) => {
          const tareas = porDia.get(dia) ?? [];
          const carga = cargaPorDia[i];
          const esPico = carga > 0 && carga === maxCarga;
          const heat = carga / maxCarga;
          return (
            <div
              key={dia}
              onDragOver={e => { e.preventDefault(); setDragOver(dia); }}
              onDragLeave={() => setDragOver(prev => (prev === dia ? null : prev))}
              onDrop={() => handleDrop(dia)}
              className={`rounded-xl border flex flex-col min-h-[140px] transition-colors ${
                dragOver === dia
                  ? "border-[#B3985B] bg-[#B3985B]/[0.06]"
                  : esPico
                  ? "border-orange-500/30 bg-orange-500/[0.03]"
                  : "border-white/[0.06] bg-[#0d0d0d]"
              }`}
            >
              {/* Encabezado del día */}
              <div className="px-3 pt-2.5 pb-2 border-b border-white/[0.05]">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold text-white">{DIAS_LABEL[i]}</span>
                  <span className="text-[11px] text-[#666]">{fmtDiaCorto(dia)}</span>
                  <span className={`ml-auto text-xs tabular-nums font-semibold ${esPico ? "text-orange-400" : "text-[#888]"}`}>
                    {carga}
                  </span>
                </div>
                <div className="mt-1.5 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.round(heat * 100)}%`, background: esPico ? "#f97316" : "#B3985B" }}
                  />
                </div>
                {esPico && (
                  <span className="inline-block mt-1 text-[9px] text-orange-400 uppercase tracking-wide">Día más cargado</span>
                )}
              </div>

              {/* Tareas del día, agrupadas por tipo */}
              <div className="flex-1 p-2 space-y-2">
                {tareas.length === 0 ? (
                  <p className="text-[11px] text-[#3a3a3a] italic px-1 py-2">Sin tareas</p>
                ) : (
                  TIPOS.filter(tp => tareas.some(t => t.tipo === tp.key)).map(tp => {
                    const items = tareas.filter(t => t.tipo === tp.key);
                    // Soltar en la ranura `index` de este grupo: reordena si viene del
                    // mismo grupo; si viene de otro día, mueve a este día.
                    const soltarEnRanura = (index: number) => {
                      const info = dragInfo.current;
                      dragInfo.current = null;
                      setDropSlot(null);
                      setDragOver(null);
                      if (!info) return;
                      if (info.dia === dia && info.tipo === tp.key) {
                        const ids = items.map(x => x.id);
                        const from = ids.indexOf(info.id);
                        if (from === -1) return;
                        ids.splice(from, 1);
                        let insert = index;
                        if (from < index) insert -= 1;
                        if (insert === from) return;
                        ids.splice(insert, 0, info.id);
                        onReordenar(ids);
                      } else if (info.dia !== dia) {
                        onMover(info.id, dia);
                      }
                    };
                    return (
                      <div key={tp.key}>
                        <div className="flex items-center gap-1.5 px-1 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tp.color }} />
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#777]">{tp.label}</span>
                          <span className="text-[10px] text-[#555] ml-auto tabular-nums">{items.length}</span>
                        </div>
                        <ul className="space-y-1">
                          {items.map((t, idx) => (
                            <Fragment key={t.id}>
                              {dropSlot === `${dia}|${tp.key}|${idx}` && (
                                <li className="h-0.5 rounded-full bg-[#B3985B] my-0.5" />
                              )}
                              <TareaCard
                                t={t}
                                dias={dias}
                                onDragStart={() => { dragInfo.current = { id: t.id, dia, tipo: tp.key }; }}
                                onDragEnd={() => { dragInfo.current = null; setDropSlot(null); }}
                                onDragOverCard={index => setDropSlot(`${dia}|${tp.key}|${index}`)}
                                onDropCard={soltarEnRanura}
                                idx={idx}
                                onMover={onMover}
                                onAbrir={onAbrir}
                                onCompletar={onCompletar}
                              />
                            </Fragment>
                          ))}
                          {dropSlot === `${dia}|${tp.key}|${items.length}` && (
                            <li className="h-0.5 rounded-full bg-[#B3985B] my-0.5" />
                          )}
                        </ul>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Agregar tarea a este día */}
              <div className="px-2 pb-2 pt-1">
                <button
                  onClick={() => onAgregar(dia)}
                  className="w-full text-[11px] text-[#777] hover:text-white border border-dashed border-white/[0.08] hover:border-white/20 rounded-md py-1.5 transition-colors"
                >
                  + Agregar tarea
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TareaCard({
  t,
  dias,
  idx,
  onDragStart,
  onDragEnd,
  onDragOverCard,
  onDropCard,
  onMover,
  onAbrir,
  onCompletar,
}: {
  t: TareaSemana;
  dias: string[];
  idx: number;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOverCard: (index: number) => void;
  onDropCard: (index: number) => void;
  onMover: (tareaId: string, dia: string) => void;
  onAbrir: (tareaId: string) => void;
  onCompletar: (tareaId: string, completar: boolean) => void;
}) {
  const [menu, setMenu] = useState(false);
  const completada = t.estado === "COMPLETADA";
  const recurrente = !!t.recurrente;
  const verif = t.estadoVerificacion;
  // Índice de inserción (antes/después) según la mitad del cursor sobre la tarjeta.
  const insertIndex = (e: React.DragEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return e.clientY > r.top + r.height / 2 ? idx + 1 : idx;
  };
  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={e => { e.preventDefault(); onDragOverCard(insertIndex(e)); }}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); onDropCard(insertIndex(e)); }}
      className="group relative rounded-lg border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] px-2 py-1.5 cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start gap-1.5">
        <button
          onClick={e => { e.stopPropagation(); onCompletar(t.id, !completada); }}
          className={`group/chk mt-0.5 shrink-0 w-3.5 h-3.5 rounded-full border grid place-items-center transition-colors ${
            completada ? "bg-[#34d399] border-[#34d399]" : "hover:bg-white/10"
          }`}
          style={completada ? undefined : { borderColor: prioColor(t.prioridad), color: prioColor(t.prioridad) }}
          title={completada ? "Marcar como pendiente" : "Marcar como completada"}
          aria-label={completada ? "Marcar como pendiente" : "Marcar como completada"}
        >
          <svg
            width="8" height="8" viewBox="0 0 24 24" fill="none"
            stroke={completada ? "#0a0a0a" : "currentColor"} strokeWidth="4"
            strokeLinecap="round" strokeLinejoin="round"
            className={completada ? "" : "opacity-0 group-hover/chk:opacity-100"}
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </button>
        <div
          className="min-w-0 flex-1 cursor-pointer"
          onClick={() => onAbrir(t.id)}
          title="Abrir tarea"
        >
          <span className={`text-[12px] leading-tight block ${completada ? "text-[#555] line-through" : "text-[#d4d4d4]"}`}>
            {t.titulo}
          </span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
            {recurrente && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-[#B3985B]/70" title="Tarea recurrente">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                  <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                </svg>
              </span>
            )}
            {t.contexto && (
              <span className="text-[10px] text-[#555] truncate max-w-[140px]">{t.contexto}</span>
            )}
            {/* Estado de la ocurrencia mostrada: claridad done / no-done / verificación */}
            {completada && t.noRealizada && (
              <span className="text-[10px] text-orange-400 font-medium">✕ no realizada</span>
            )}
            {completada && !t.noRealizada && verif === "VERIFICADA" && (
              <span className="text-[10px] text-[#34d399] font-medium">✓ verificada</span>
            )}
            {completada && !t.noRealizada && verif === "PENDIENTE_VERIFICACION" && (
              <span className="text-[10px] text-amber-400 font-medium">● por verificar</span>
            )}
            {completada && !t.noRealizada && verif === "RECHAZADA" && (
              <span className="text-[10px] text-red-400 font-medium">✕ rechazada</span>
            )}
            {completada && !t.noRealizada && (verif === "NO_REQUIERE" || !verif) && (
              <span className="text-[10px] text-[#34d399]/70 font-medium">✓ hecha</span>
            )}
            {!completada && t.vencida && (
              <span className="text-[10px] text-red-400 font-medium">
                {recurrente ? "⚠ sin cerrar" : "⚠ vencida"}
              </span>
            )}
            {t.estado === "EN_PROGRESO" && <span className="text-[10px] text-blue-400">En progreso</span>}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={e => { e.stopPropagation(); setMenu(v => !v); }}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[#666] hover:text-white text-xs px-1"
            aria-label="Mover a otro día"
            title="Mover a otro día"
          >⠿</button>
        </div>
      </div>

      {menu && (
        <div className="absolute right-1 top-6 z-10 rounded-md border border-white/10 bg-[#161616] shadow-lg p-1 min-w-[120px]">
          <p className="text-[10px] text-[#666] px-2 py-1">
            Mover a
            {recurrente && <span className="block text-[9px] text-[#B3985B]/70 normal-case">Solo esta vez · la recurrencia no cambia</span>}
          </p>
          {dias.map((d, i) => (
            <button
              key={d}
              disabled={d === t.dia}
              onClick={() => { setMenu(false); onMover(t.id, d); }}
              className={`w-full text-left px-2 py-1 rounded text-[11px] ${
                d === t.dia
                  ? "text-[#444] cursor-default"
                  : "text-[#ccc] hover:bg-white/[0.06]"
              }`}
            >
              {DIAS_LABEL[i]} <span className="text-[#666]">{fmtDiaCorto(d)}</span>
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
