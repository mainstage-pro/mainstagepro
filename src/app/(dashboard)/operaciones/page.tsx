"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import TaskItem, { type TareaItem } from "./components/TaskItem";
import TaskPanel, { type TareaDetalle } from "./components/TaskPanel";
import QuickAdd from "./components/QuickAdd";
import UndoToast, { type UndoState } from "./components/UndoToast";
import type { TareaIntegrada } from "@/lib/tareas-integradas";

// ── Types ────────────────────────────────────────────────────────────────────

interface Carpeta {
  id: string; nombre: string; color: string | null; icono: string | null;
  proyectos: ProyectoNav[];
}
interface ProyectoNav {
  id: string; nombre: string; color: string | null; icono: string | null; orden: number;
}
interface ProyectoDetalle {
  id: string; nombre: string; color: string | null; descripcion: string | null;
  secciones: SeccionDetalle[];
  tareas: TareaItem[];
}
interface SeccionDetalle {
  id: string; nombre: string; orden: number; colapsada: boolean;
  tareas: TareaItem[];
}
interface Iniciativa { id: string; nombre: string; color: string | null }
interface Usuario   { id: string; name: string }

type VistaKey = "bandeja" | "hoy" | "proximas" | "integrada" | { tipo: "proyecto"; id: string };

const SORT_OPTIONS = ["Sin agrupar", "Por proyecto", "Por prioridad", "Por área", "Por fecha"];
const PROJECT_COLORS = [
  "#B3985B","#e85d04","#e63946","#2ec4b6","#3d85c8","#9b5de5","#f15bb5","#00bbf9",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function severityColor(s: string) {
  if (s === "URGENTE") return "border-red-500";
  if (s === "ALTA")    return "border-orange-500";
  return "border-yellow-600";
}

function areaLabel(a: string) {
  const M: Record<string,string> = {
    VENTAS:"Ventas", ADMINISTRACION:"Adm.", PRODUCCION:"Producción",
    MARKETING:"Marketing", RRHH:"RR.HH.", GENERAL:"General",
  };
  return M[a] ?? a;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OperacionesPage() {
  const [carpetas, setCarpetas]                 = useState<Carpeta[]>([]);
  const [proyectosNav, setProyectosNav]         = useState<ProyectoNav[]>([]);
  const [iniciativas, setIniciativas]           = useState<Iniciativa[]>([]);
  const [usuarios, setUsuarios]                 = useState<Usuario[]>([]);
  const [sessionId, setSessionId]               = useState<string>("");

  const [vista, setVista]                       = useState<VistaKey>("hoy");
  const [tareas, setTareas]                     = useState<TareaItem[]>([]);
  const [integradas, setIntegradas]             = useState<TareaIntegrada[]>([]);
  const [proyectoDetalle, setProyectoDetalle]   = useState<ProyectoDetalle | null>(null);
  const [loadingMain, setLoadingMain]           = useState(false);

  const [selectedId, setSelectedId]             = useState<string | null>(null);
  const [selectedTask, setSelectedTask]         = useState<TareaDetalle | null>(null);
  const [loadingPanel, setLoadingPanel]         = useState(false);

  const [sortHoy, setSortHoy]                   = useState(SORT_OPTIONS[0]);
  const [showCompleted, setShowCompleted]       = useState(false);
  const [undoState, setUndoState]               = useState<UndoState | null>(null);
  const undoTimer     = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const showCompletedRef = useRef(showCompleted);
  useEffect(() => { showCompletedRef.current = showCompleted; }, [showCompleted]);

  const [carpetasOpen, setCarpetasOpen]         = useState<Set<string>>(new Set());
  const [proyectosSueltos, setProyectosSueltos] = useState(true);

  const [showNuevaCarpeta, setShowNuevaCarpeta]     = useState(false);
  const [showNuevoProyecto, setShowNuevoProyecto]   = useState(false);
  const [showNuevaSeccion, setShowNuevaSeccion]     = useState(false);
  const [nuevoCarpetaNombre, setNuevoCarpetaNombre] = useState("");
  const [nuevoProyectoNombre, setNuevoProyectoNombre] = useState("");
  const [nuevoProyectoColor, setNuevoProyectoColor]   = useState(PROJECT_COLORS[0]);
  const [nuevoProyectoCarpeta, setNuevoProyectoCarpeta] = useState("");
  const [nuevaSeccionNombre, setNuevaSeccionNombre] = useState("");
  const carpetaInputRef  = useRef<HTMLInputElement>(null);
  const proyectoInputRef = useRef<HTMLInputElement>(null);

  // ── Load nav ────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch("/api/operaciones/carpetas").then(r => r.json()),
      fetch("/api/operaciones/proyectos").then(r => r.json()),
      fetch("/api/iniciativas").then(r => r.json()),
      fetch("/api/usuarios").then(r => r.json()),
    ]).then(([carp, proy, init, usr]) => {
      setCarpetas(carp.carpetas ?? []);
      setProyectosNav(proy.proyectos ?? []);
      setIniciativas(init.iniciativas ?? []);
      setUsuarios(usr.usuarios ?? []);
      if (usr.usuarios?.[0]) setSessionId(usr.usuarios[0].id);
    });
  }, []);

  // ── Load view ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof vista !== "string") return;
    setLoadingMain(true);
    setProyectoDetalle(null);
    if (vista === "integrada") {
      fetch("/api/tareas/integradas")
        .then(r => r.json())
        .then(d => { setIntegradas(d.tareas ?? []); setLoadingMain(false); });
      return;
    }
    fetch(`/api/tareas?vista=${vista}`)
      .then(r => r.json())
      .then(d => { setTareas(d.tareas ?? []); setLoadingMain(false); });
  }, [vista]);

  useEffect(() => {
    if (typeof vista === "string") return;
    setLoadingMain(true);
    fetch(`/api/operaciones/proyectos/${vista.id}`)
      .then(r => r.json())
      .then(d => { setProyectoDetalle(d.proyecto ?? null); setLoadingMain(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeof vista === "object" ? (vista as {id:string}).id : null]);

  // ── Load task detail ────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId) { setSelectedTask(null); return; }
    setLoadingPanel(true);
    fetch(`/api/tareas/${selectedId}`)
      .then(r => r.json())
      .then(d => { setSelectedTask(d.tarea ?? null); setLoadingPanel(false); });
  }, [selectedId]);

  // ── Mutations ────────────────────────────────────────────────────────────

  const addTarea = useCallback(async (data: {
    titulo: string; fecha: string | null; fechaVencimiento: string | null;
    prioridad: string; recurrencia: string | null;
    proyectoTareaId: string | null; seccionId: string | null; parentId: string | null;
  }) => {
    const res = await fetch("/api/tareas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) return;
    const { tarea } = await res.json();
    if (data.parentId) return;
    if (typeof vista === "string" && vista !== "integrada") {
      setTareas(prev => [...prev, tarea]);
    }
    if (typeof vista !== "string" && proyectoDetalle) {
      if (data.seccionId) {
        setProyectoDetalle(prev => prev ? {
          ...prev, secciones: prev.secciones.map(s =>
            s.id === data.seccionId ? { ...s, tareas: [...s.tareas, tarea] } : s
          ),
        } : null);
      } else {
        setProyectoDetalle(prev => prev ? { ...prev, tareas: [...prev.tareas, tarea] } : null);
      }
    }
  }, [vista, proyectoDetalle]);

  const completeTarea = useCallback(async (id: string) => {
    // Find titulo for undo toast
    let titulo = "Tarea";
    const findTitulo = (arr: TareaItem[]) => arr.find(t => t.id === id)?.titulo;
    titulo = findTitulo(tareas) ?? (proyectoDetalle ? (findTitulo(proyectoDetalle.tareas) ?? proyectoDetalle.secciones.flatMap(s => s.tareas).find(t => t.id === id)?.titulo ?? titulo) : titulo);

    const res = await fetch(`/api/tareas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "COMPLETADA" }),
    });
    if (!res.ok) return;
    const { nextTarea } = await res.json();

    // Mark completed in state (keep visible for undo window)
    const markCompleted = (arr: TareaItem[]) =>
      arr.map(t => t.id === id ? { ...t, estado: "COMPLETADA" } : t);
    if (nextTarea) {
      setTareas(prev => [nextTarea, ...markCompleted(prev)]);
      setProyectoDetalle(prev => prev ? {
        ...prev, tareas: [nextTarea, ...markCompleted(prev.tareas)],
        secciones: prev.secciones.map(s => ({ ...s, tareas: markCompleted(s.tareas) })),
      } : null);
    } else {
      setTareas(markCompleted);
      setProyectoDetalle(prev => prev ? {
        ...prev, tareas: markCompleted(prev.tareas),
        secciones: prev.secciones.map(s => ({ ...s, tareas: markCompleted(s.tareas) })),
      } : null);
    }

    // Show undo toast with 4s timer
    clearTimeout(undoTimer.current);
    setUndoState({ id, titulo, expiresAt: Date.now() + 4000 });
    undoTimer.current = setTimeout(() => {
      if (!showCompletedRef.current) {
        const remove = (arr: TareaItem[]) => arr.filter(t => t.id !== id);
        setTareas(remove);
        setProyectoDetalle(prev => prev ? {
          ...prev, tareas: remove(prev.tareas),
          secciones: prev.secciones.map(s => ({ ...s, tareas: remove(s.tareas) })),
        } : null);
      }
      setUndoState(null);
    }, 4000);
  }, [tareas, proyectoDetalle]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUndo = useCallback(async () => {
    if (!undoState) return;
    clearTimeout(undoTimer.current);
    await fetch(`/api/tareas/${undoState.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "PENDIENTE" }),
    });
    const restore = (arr: TareaItem[]) =>
      arr.map(t => t.id === undoState.id ? { ...t, estado: "PENDIENTE" } : t);
    setTareas(restore);
    setProyectoDetalle(prev => prev ? {
      ...prev, tareas: restore(prev.tareas),
      secciones: prev.secciones.map(s => ({ ...s, tareas: restore(s.tareas) })),
    } : null);
    setUndoState(null);
  }, [undoState]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismissUndo = useCallback(() => {
    clearTimeout(undoTimer.current);
    if (!showCompletedRef.current && undoState) {
      const id = undoState.id;
      const remove = (arr: TareaItem[]) => arr.filter(t => t.id !== id);
      setTareas(remove);
      setProyectoDetalle(prev => prev ? {
        ...prev, tareas: remove(prev.tareas),
        secciones: prev.secciones.map(s => ({ ...s, tareas: remove(s.tareas) })),
      } : null);
    }
    setUndoState(null);
  }, [undoState]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveTarea = useCallback(async (id: string, patch: Record<string, unknown>) => {
    await fetch(`/api/tareas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if ("titulo" in patch) {
      const upd = (arr: TareaItem[]) =>
        arr.map(t => t.id === id ? { ...t, titulo: patch.titulo as string } : t);
      setTareas(upd);
      setProyectoDetalle(prev => prev ? {
        ...prev, tareas: upd(prev.tareas),
        secciones: prev.secciones.map(s => ({ ...s, tareas: upd(s.tareas) })),
      } : null);
    }
  }, []);

  const deleteTarea = useCallback(async (id: string) => {
    await fetch(`/api/tareas/${id}`, { method: "DELETE" });
    const rm = (arr: TareaItem[]) => arr.filter(t => t.id !== id);
    setTareas(rm);
    setProyectoDetalle(prev => prev ? {
      ...prev, tareas: rm(prev.tareas),
      secciones: prev.secciones.map(s => ({ ...s, tareas: rm(s.tareas) })),
    } : null);
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addSubtarea = useCallback(async (parentId: string, data: { titulo: string; fecha: string | null; prioridad: string }) => {
    await fetch("/api/tareas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, parentId }),
    });
  }, []);

  const addSeccion = useCallback(async () => {
    if (!nuevaSeccionNombre.trim() || typeof vista === "string") return;
    const res = await fetch("/api/operaciones/secciones", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevaSeccionNombre.trim(), proyectoId: vista.id }),
    });
    if (res.ok) {
      const { seccion } = await res.json();
      setProyectoDetalle(prev => prev ? {
        ...prev, secciones: [...prev.secciones, { ...seccion, tareas: [] }],
      } : null);
      setNuevaSeccionNombre(""); setShowNuevaSeccion(false);
    }
  }, [nuevaSeccionNombre, vista]);

  async function crearCarpeta() {
    if (!nuevoCarpetaNombre.trim()) return;
    const res = await fetch("/api/operaciones/carpetas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevoCarpetaNombre.trim() }),
    });
    if (res.ok) {
      const { carpeta } = await res.json();
      setCarpetas(prev => [...prev, { ...carpeta, proyectos: [] }]);
      setNuevoCarpetaNombre(""); setShowNuevaCarpeta(false);
    }
  }

  async function crearProyecto() {
    if (!nuevoProyectoNombre.trim()) return;
    const res = await fetch("/api/operaciones/proyectos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nuevoProyectoNombre.trim(), color: nuevoProyectoColor,
        carpetaId: nuevoProyectoCarpeta || null,
      }),
    });
    if (res.ok) {
      const { proyecto } = await res.json();
      setProyectosNav(prev => [...prev, proyecto]);
      if (nuevoProyectoCarpeta) {
        setCarpetas(prev => prev.map(c => c.id === nuevoProyectoCarpeta
          ? { ...c, proyectos: [...c.proyectos, proyecto] } : c));
      }
      setNuevoProyectoNombre(""); setNuevoProyectoColor(PROJECT_COLORS[0]);
      setNuevoProyectoCarpeta(""); setShowNuevoProyecto(false);
    }
  }

  // ── Hoy grouped ────────────────────────────────────────────────────────
  const hoyGrouped = useMemo(() => {
    if (vista !== "hoy" || sortHoy === SORT_OPTIONS[0]) return null;
    const grouped: Record<string, TareaItem[]> = {};
    for (const t of tareas) {
      let key = "";
      if (sortHoy === "Por proyecto")   key = t.proyectoTarea?.nombre ?? "Bandeja de entrada";
      else if (sortHoy === "Por prioridad") key = t.prioridad;
      else if (sortHoy === "Por área")  key = areaLabel(t.area);
      else if (sortHoy === "Por fecha") key = t.fecha ? new Date(t.fecha).toLocaleDateString("es-MX",{dateStyle:"medium"}) : "Sin fecha";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    }
    const PRIO_ORD: Record<string,number> = { URGENTE:0, ALTA:1, MEDIA:2, BAJA:3 };
    const keys = sortHoy === "Por prioridad"
      ? ["URGENTE","ALTA","MEDIA","BAJA"].filter(k => grouped[k])
      : Object.keys(grouped).sort();
    return keys.map(label => ({ label, tareas: grouped[label] }));
  }, [tareas, sortHoy, vista]);

  const proyectosSinCarpeta = useMemo(() =>
    proyectosNav.filter(p => !carpetas.some(c => c.proyectos.some(cp => cp.id === p.id))),
  [proyectosNav, carpetas]);

  const vistaKey    = typeof vista === "string" ? vista : vista.id;
  const vistaLabel  =
    vista === "bandeja"   ? "Bandeja de entrada" :
    vista === "hoy"       ? "Hoy" :
    vista === "proximas"  ? "Próximas" :
    vista === "integrada" ? "Operación Integrada" :
    proyectoDetalle?.nombre ?? "Proyecto";

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── LEFT NAV ──────────────────────────────────────────────────────── */}
      <nav className="hidden md:flex w-60 shrink-0 flex-col bg-[#060606] border-r border-[#111] overflow-y-auto">
        <div className="px-3 pt-4 pb-2 border-b border-[#111]">
          <p className="text-[11px] text-[#333] uppercase tracking-widest font-bold px-1 mb-1">Operaciones</p>
        </div>

        <div className="px-2 py-2 space-y-0.5">
          {([
            { key:"hoy",       label:"Hoy",                 icon:"☀" },
            { key:"proximas",  label:"Próximas",             icon:"📅" },
            { key:"bandeja",   label:"Bandeja de entrada",   icon:"📥" },
            { key:"integrada", label:"Op. Integrada",        icon:"⚡" },
          ] as const).map(item => (
            <button key={item.key} onClick={() => setVista(item.key)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                vistaKey === item.key ? "bg-[#1a1a1a] text-white" : "text-[#555] hover:text-[#bbb] hover:bg-[#0f0f0f]"
              }`}>
              <span className="text-sm w-4">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        <div className="border-t border-[#111] mt-1 pt-2 px-2 flex-1 space-y-0.5">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-[10px] text-[#333] uppercase tracking-widest font-bold">Proyectos</p>
            <button onClick={() => { setShowNuevoProyecto(true); setTimeout(() => proyectoInputRef.current?.focus(), 50); }}
              className="text-[#333] hover:text-[#B3985B] transition-colors" title="Nuevo proyecto">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>

          {carpetas.map(carpeta => (
            <div key={carpeta.id}>
              <button onClick={() => setCarpetasOpen(prev => { const n = new Set(prev); n.has(carpeta.id) ? n.delete(carpeta.id) : n.add(carpeta.id); return n; })}
                className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-sm text-[#555] hover:text-[#bbb] hover:bg-[#0f0f0f] transition-colors">
                <span className="text-[9px] transition-transform inline-block" style={{ transform: carpetasOpen.has(carpeta.id) ? "rotate(90deg)" : "" }}>▶</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                <span className="truncate">{carpeta.nombre}</span>
              </button>
              {carpetasOpen.has(carpeta.id) && (
                <div className="ml-4 space-y-0.5">
                  {carpeta.proyectos.map(p => (
                    <button key={p.id} onClick={() => setVista({ tipo:"proyecto", id:p.id })}
                      className={`w-full flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors ${
                        vistaKey === p.id ? "bg-[#1a1a1a] text-white" : "text-[#555] hover:text-[#bbb] hover:bg-[#0f0f0f]"
                      }`}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color ?? "#555" }} />
                      <span className="truncate">{p.nombre}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {proyectosSinCarpeta.length > 0 && (
            <div>
              <button onClick={() => setProyectosSueltos(!proyectosSueltos)}
                className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-sm text-[#333] hover:text-[#555] transition-colors">
                <span className="text-[9px] inline-block" style={{ transform: proyectosSueltos ? "rotate(90deg)" : "" }}>▶</span>
                Sin carpeta
              </button>
              {proyectosSueltos && proyectosSinCarpeta.map(p => (
                <button key={p.id} onClick={() => setVista({ tipo:"proyecto", id:p.id })}
                  className={`w-full flex items-center gap-2 px-4 py-1 rounded text-sm transition-colors ${
                    vistaKey === p.id ? "bg-[#1a1a1a] text-white" : "text-[#555] hover:text-[#bbb] hover:bg-[#0f0f0f]"
                  }`}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color ?? "#555" }} />
                  <span className="truncate">{p.nombre}</span>
                </button>
              ))}
            </div>
          )}

          {showNuevaCarpeta ? (
            <div className="px-2 py-1 space-y-1">
              <input ref={carpetaInputRef} value={nuevoCarpetaNombre} onChange={e => setNuevoCarpetaNombre(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") crearCarpeta(); if (e.key === "Escape") setShowNuevaCarpeta(false); }}
                placeholder="Nombre de carpeta"
                className="w-full bg-[#111] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]" />
              <div className="flex gap-2">
                <button onClick={crearCarpeta} className="text-xs text-[#B3985B] hover:underline">Crear</button>
                <button onClick={() => setShowNuevaCarpeta(false)} className="text-xs text-[#555] hover:text-white">Cancelar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => { setShowNuevaCarpeta(true); setTimeout(() => carpetaInputRef.current?.focus(), 50); }}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-xs text-[#333] hover:text-[#555] transition-colors">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nueva carpeta
            </button>
          )}
        </div>
      </nav>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#111] shrink-0">
          <h1 className="text-lg font-semibold text-white">{vistaLabel}</h1>

          {vista === "hoy" && (
            <div className="ml-auto flex items-center gap-1 flex-wrap">
              {SORT_OPTIONS.map(opt => (
                <button key={opt} onClick={() => setSortHoy(opt)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${sortHoy === opt ? "bg-[#1a1a1a] text-white" : "text-[#444] hover:text-[#888]"}`}>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {typeof vista === "string" && vista !== "integrada" && (
            <button
              onClick={() => setShowCompleted(v => !v)}
              className={`ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded text-xs transition-colors ${
                vista === "hoy" ? "ml-2" : "ml-auto"
              } ${showCompleted ? "text-[#B3985B] bg-[#B3985B]/10" : "text-[#444] hover:text-[#888]"}`}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Completadas
            </button>
          )}

          {typeof vista !== "string" && proyectoDetalle && (
            <button onClick={() => setShowNuevaSeccion(true)} className="ml-auto px-3 py-1 bg-[#1a1a1a] text-xs text-[#888] rounded hover:bg-[#222] hover:text-white transition-colors">
              + Sección
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pb-20">
          {loadingMain ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 border border-[#333] border-t-[#B3985B] rounded-full animate-spin" />
            </div>
          ) : vista === "integrada" ? (
            <div className="max-w-3xl mx-auto px-6 py-4 space-y-2">
              {integradas.length === 0 ? (
                <div className="text-center py-16 text-[#333]">
                  <p className="text-lg">✓</p>
                  <p className="text-sm mt-1">Sin alertas integradas</p>
                </div>
              ) : integradas.map(t => (
                <Link key={t.id} href={t.href}
                  className={`flex items-start gap-3 p-3 rounded-md bg-[#080808] border-l-2 hover:bg-[#0d0d0d] transition-colors ${severityColor(t.severidad)}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{t.titulo}</p>
                    {t.descripcion && <p className="text-xs text-[#555] mt-0.5">{t.descripcion}</p>}
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#888]">{t.etiqueta}</span>
                      {t.diasVencido && <span className="text-[10px] text-red-400">{t.diasVencido}d vencida</span>}
                      {t.monto && <span className="text-[10px] text-[#B3985B]">${t.monto.toLocaleString("es-MX")}</span>}
                      {t.cliente && <span className="text-[10px] text-[#666]">{t.cliente}</span>}
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" className="shrink-0 mt-1">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </Link>
              ))}
            </div>
          ) : typeof vista === "string" ? (
            <div className="max-w-3xl mx-auto px-4 py-3">
              {(() => {
                const visibleTareas = showCompleted ? tareas : tareas.filter(t => t.estado !== "COMPLETADA");
                if (visibleTareas.length === 0) return (
                  <div className="text-center py-16 text-[#333]">
                    <p className="text-4xl mb-3">{vista === "hoy" ? "☀️" : "📋"}</p>
                    <p className="text-sm">
                      {vista === "hoy" ? "Sin tareas para hoy" : vista === "proximas" ? "Sin tareas próximas" : "Bandeja vacía"}
                    </p>
                  </div>
                );
                if (hoyGrouped) return hoyGrouped.map(group => {
                  const groupVisible = showCompleted ? group.tareas : group.tareas.filter(t => t.estado !== "COMPLETADA");
                  if (groupVisible.length === 0) return null;
                  return (
                    <div key={group.label} className="mb-4">
                      <p className="text-xs text-[#444] font-semibold uppercase tracking-wider px-3 py-2">{group.label}</p>
                      {groupVisible.map(t => (
                        <TaskItem key={t.id} tarea={t} isSelected={selectedId === t.id}
                          onComplete={completeTarea} onSelect={setSelectedId} onDelete={deleteTarea} showProject />
                      ))}
                    </div>
                  );
                });
                return visibleTareas.map(t => (
                  <TaskItem key={t.id} tarea={t} isSelected={selectedId === t.id}
                    onComplete={completeTarea} onSelect={setSelectedId} onDelete={deleteTarea} showProject />
                ));
              })()}
              <QuickAdd onAdd={addTarea} placeholder="Agregar tarea…" />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-3">
              {proyectoDetalle && (
                <>
                  {proyectoDetalle.tareas.map(t => (
                    <TaskItem key={t.id} tarea={t} isSelected={selectedId === t.id}
                      onComplete={completeTarea} onSelect={setSelectedId} onDelete={deleteTarea} />
                  ))}
                  <QuickAdd proyectoTareaId={proyectoDetalle.id} onAdd={addTarea} placeholder="Agregar tarea al proyecto…" />
                  {proyectoDetalle.secciones.map(seccion => (
                    <SectionBlock
                      key={seccion.id}
                      seccion={seccion}
                      proyectoId={proyectoDetalle.id}
                      selectedId={selectedId}
                      onComplete={completeTarea}
                      onSelect={setSelectedId}
                      onDelete={deleteTarea}
                      onAddTarea={addTarea}
                      onToggleCollapse={async (id, colapsada) => {
                        await fetch(`/api/operaciones/secciones/${id}`, {
                          method: "PATCH", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ colapsada }),
                        });
                        setProyectoDetalle(prev => prev ? {
                          ...prev, secciones: prev.secciones.map(s => s.id === id ? { ...s, colapsada } : s),
                        } : null);
                      }}
                      onDeleteSection={async (id) => {
                        await fetch(`/api/operaciones/secciones/${id}`, { method: "DELETE" });
                        setProyectoDetalle(prev => prev ? {
                          ...prev, secciones: prev.secciones.filter(s => s.id !== id),
                        } : null);
                      }}
                    />
                  ))}
                  {showNuevaSeccion ? (
                    <div className="mt-4 px-3 py-2 border border-dashed border-[#2a2a2a] rounded-md space-y-2">
                      <input autoFocus value={nuevaSeccionNombre}
                        onChange={e => setNuevaSeccionNombre(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") addSeccion(); if (e.key === "Escape") setShowNuevaSeccion(false); }}
                        placeholder="Nombre de la sección"
                        className="w-full bg-transparent text-sm text-white placeholder-[#444] focus:outline-none" />
                      <div className="flex gap-2">
                        <button onClick={addSeccion} className="text-xs text-[#B3985B] hover:underline">Crear</button>
                        <button onClick={() => setShowNuevaSeccion(false)} className="text-xs text-[#555] hover:text-white">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowNuevaSeccion(true)}
                      className="mt-4 flex items-center gap-2 text-xs text-[#333] hover:text-[#555] px-3 py-2 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Agregar sección
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── TASK PANEL ────────────────────────────────────────────────────── */}
      {selectedId && (
        loadingPanel ? (
          <aside className="w-96 shrink-0 border-l border-[#1a1a1a] bg-[#0a0a0a] flex items-center justify-center">
            <div className="w-5 h-5 border border-[#333] border-t-[#B3985B] rounded-full animate-spin" />
          </aside>
        ) : selectedTask ? (
          <TaskPanel
            tarea={selectedTask}
            usuarios={usuarios}
            proyectos={proyectosNav}
            iniciativas={iniciativas}
            sessionId={sessionId}
            onClose={() => setSelectedId(null)}
            onSave={saveTarea}
            onComplete={completeTarea}
            onDelete={deleteTarea}
            onAddSubtarea={addSubtarea}
            onCompleteSubtarea={completeTarea}
            onDeleteSubtarea={deleteTarea}
          />
        ) : null
      )}

      {/* ── UNDO TOAST ────────────────────────────────────────────────────── */}
      <UndoToast undo={undoState} onUndo={handleUndo} onDismiss={handleDismissUndo} />

      {/* ── MODAL: Nuevo proyecto ──────────────────────────────────────────── */}
      {showNuevoProyecto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowNuevoProyecto(false)}>
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 w-80 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold">Nuevo proyecto</h3>
            <div className="space-y-3">
              <input ref={proyectoInputRef} value={nuevoProyectoNombre}
                onChange={e => setNuevoProyectoNombre(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") crearProyecto(); if (e.key === "Escape") setShowNuevoProyecto(false); }}
                placeholder="Nombre del proyecto"
                className="w-full bg-[#111] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]" />
              <div className="space-y-1">
                <label className="text-[10px] text-[#555] uppercase tracking-wider">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {PROJECT_COLORS.map(c => (
                    <button key={c} onClick={() => setNuevoProyectoColor(c)}
                      className={`w-5 h-5 rounded-full hover:scale-110 transition-transform ${nuevoProyectoColor === c ? "ring-2 ring-white ring-offset-1 ring-offset-[#0d0d0d]" : ""}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-[#555] uppercase tracking-wider">Carpeta (opcional)</label>
                <select value={nuevoProyectoCarpeta} onChange={e => setNuevoProyectoCarpeta(e.target.value)}
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]">
                  <option value="">— Sin carpeta —</option>
                  {carpetas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNuevoProyecto(false)} className="px-3 py-1.5 text-sm text-[#555] hover:text-white">Cancelar</button>
              <button onClick={crearProyecto} className="px-4 py-1.5 bg-[#B3985B] text-black text-sm font-medium rounded hover:bg-[#c9aa6a] transition-colors">
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SectionBlock ────────────────────────────────────────────────────────────

function SectionBlock({
  seccion, proyectoId, selectedId,
  onComplete, onSelect, onDelete, onAddTarea,
  onToggleCollapse, onDeleteSection,
}: {
  seccion: SeccionDetalle;
  proyectoId: string;
  selectedId: string | null;
  onComplete: (id: string) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAddTarea: (data: {
    titulo: string; fecha: string | null; fechaVencimiento: string | null;
    prioridad: string; recurrencia: string | null;
    proyectoTareaId: string | null; seccionId: string | null; parentId: string | null;
  }) => void;
  onToggleCollapse: (id: string, colapsada: boolean) => void;
  onDeleteSection: (id: string) => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div className="mt-5">
      <div className="flex items-center gap-2 group cursor-pointer mb-1"
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        onClick={() => onToggleCollapse(seccion.id, !seccion.colapsada)}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"
          style={{ transform: seccion.colapsada ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
        <span className="text-xs font-semibold text-[#666] hover:text-white transition-colors">{seccion.nombre}</span>
        {seccion.tareas.length > 0 && <span className="text-[10px] text-[#333]">({seccion.tareas.length})</span>}
        {hov && (
          <button onClick={e => { e.stopPropagation(); onDeleteSection(seccion.id); }}
            className="ml-auto text-[#333] hover:text-red-400 p-0.5 transition-colors" title="Eliminar sección">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        )}
      </div>
      {!seccion.colapsada && (
        <>
          {seccion.tareas.map(t => (
            <TaskItem key={t.id} tarea={t} isSelected={selectedId === t.id}
              onComplete={onComplete} onSelect={onSelect} onDelete={onDelete} />
          ))}
          <QuickAdd proyectoTareaId={proyectoId} seccionId={seccion.id} compact
            placeholder={`Tarea en ${seccion.nombre}…`} onAdd={onAddTarea} />
        </>
      )}
    </div>
  );
}
