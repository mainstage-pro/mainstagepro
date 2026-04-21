"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import TaskItem, { type TareaItem } from "./components/TaskItem";
import TaskModal, { type TareaDetalle } from "./components/TaskModal";
import QuickAdd from "./components/QuickAdd";
import MobileQuickAdd, { type MobileQuickAddHandle } from "./components/MobileQuickAdd";
import UndoToast, { type UndoState } from "./components/UndoToast";
import { useCelebration } from "@/components/CelebrationToast";
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

  const [vista, setVista]                       = useState<VistaKey>("bandeja");
  const [tareas, setTareas]                     = useState<TareaItem[]>([]);
  const [integradas, setIntegradas]             = useState<TareaIntegrada[]>([]);
  const [proyectoDetalle, setProyectoDetalle]   = useState<ProyectoDetalle | null>(null);
  const [loadingMain, setLoadingMain]           = useState(false);

  const searchParams = useSearchParams();
  const [selectedId, setSelectedId]             = useState<string | null>(() => searchParams.get("open"));
  const [selectedTask, setSelectedTask]         = useState<TareaDetalle | null>(null);
  const [loadingPanel, setLoadingPanel]         = useState(false);

  const [sortHoy, setSortHoy]                   = useState(() => {
    if (typeof window === "undefined") return SORT_OPTIONS[0];
    return localStorage.getItem("op_sort_hoy") ?? SORT_OPTIONS[0];
  });
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [showCompleted, setShowCompleted]       = useState(false);
  const [draggingId, setDraggingId]             = useState<string | null>(null);
  const [undoState, setUndoState]               = useState<UndoState | null>(null);
  const { celebrate, Toast: CelebrationToastEl } = useCelebration();
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
      fetch("/api/me").then(r => r.json()),
    ]).then(([carp, proy, init, usr, me]) => {
      setCarpetas(carp.carpetas ?? []);
      setProyectosNav(proy.proyectos ?? []);
      setIniciativas(init.iniciativas ?? []);
      setUsuarios(usr.usuarios ?? []);
      if (me?.id) setSessionId(me.id);
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
    prioridad: string; area?: string; recurrencia: string | null;
    proyectoTareaId: string | null; seccionId: string | null; parentId: string | null;
    asignadoAId?: string | null;
  }) => {
    const res = await fetch("/api/tareas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) return;
    const { tarea } = await res.json();
    if (data.parentId) return;
    // Si la tarea tiene proyecto y estamos en bandeja, no la agregamos a la lista plana
    if (typeof vista === "string" && vista !== "integrada") {
      if (vista === "bandeja" && data.proyectoTareaId) return; // se fue al proyecto
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

    // Micro-celebración
    celebrate("tarea");

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
    // When a project is assigned to a bandeja task, move it out of the bandeja list
    if ("proyectoTareaId" in patch && patch.proyectoTareaId && vista === "bandeja") {
      const rm = (arr: TareaItem[]) => arr.filter(t => t.id !== id);
      setTareas(rm);
      if (selectedId === id) setSelectedId(null);
      return;
    }
    // Update list items with any changed scalar fields
    const upd = (arr: TareaItem[]) => arr.map(t => {
      if (t.id !== id) return t;
      return {
        ...t,
        ...(patch.titulo        != null ? { titulo:    patch.titulo    as string } : {}),
        ...(patch.prioridad     != null ? { prioridad: patch.prioridad as string } : {}),
        ...(patch.area          != null ? { area:      patch.area      as string } : {}),
        ...(patch.estado        != null ? { estado:    patch.estado    as string } : {}),
        ...(patch.fecha         !== undefined ? { fecha:            patch.fecha            as string | null } : {}),
        ...(patch.fechaVencimiento !== undefined ? { fechaVencimiento: patch.fechaVencimiento as string | null } : {}),
      };
    });
    setTareas(upd);
    setProyectoDetalle(prev => prev ? {
      ...prev, tareas: upd(prev.tareas),
      secciones: prev.secciones.map(s => ({ ...s, tareas: upd(s.tareas) })),
    } : null);
  }, [vista, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const moveToSubtask = useCallback(async (childId: string, parentId: string) => {
    if (childId === parentId) return;
    await fetch(`/api/tareas/${childId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId }),
    });
    // Remove child from flat list — it now lives as subtask inside parent
    const remove = (arr: TareaItem[]) => arr.filter(t => t.id !== childId);
    setTareas(remove);
    setProyectoDetalle(prev => prev ? {
      ...prev, tareas: remove(prev.tareas),
      secciones: prev.secciones.map(s => ({ ...s, tareas: remove(s.tareas) })),
    } : null);
    setDraggingId(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Sort helper: cronológico + prioridad ────────────────────────────────
  const PRIO_ORD: Record<string,number> = { URGENTE:0, ALTA:1, MEDIA:2, BAJA:3 };
  function sortCronoPrio(arr: TareaItem[]) {
    return [...arr].sort((a, b) => {
      const da = a.fecha ? new Date(a.fecha).getTime() : Infinity;
      const db = b.fecha ? new Date(b.fecha).getTime() : Infinity;
      if (da !== db) return da - db;
      return (PRIO_ORD[a.prioridad] ?? 3) - (PRIO_ORD[b.prioridad] ?? 3);
    });
  }

  // ── Hoy / Próximas grouped ───────────────────────────────────────────────
  const hoyGrouped = useMemo(() => {
    if (typeof vista !== "string" || (vista !== "hoy" && vista !== "proximas")) return null;

    const base = showCompleted ? tareas : tareas.filter(t => t.estado !== "COMPLETADA");

    // Manual sort options (from the sort buttons)
    if (sortHoy !== SORT_OPTIONS[0]) {
      const grouped: Record<string, TareaItem[]> = {};
      for (const t of base) {
        let key = "";
        if (sortHoy === "Por proyecto")   key = t.proyectoTarea?.nombre ?? "Bandeja de entrada";
        else if (sortHoy === "Por prioridad") key = t.prioridad;
        else if (sortHoy === "Por área")  key = areaLabel(t.area);
        else if (sortHoy === "Por fecha") key = t.fecha ? new Date(t.fecha + "T00:00:00").toLocaleDateString("es-MX",{dateStyle:"medium"}) : "Sin fecha";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(t);
      }
      const keys = sortHoy === "Por prioridad"
        ? ["URGENTE","ALTA","MEDIA","BAJA"].filter(k => grouped[k])
        : Object.keys(grouped).sort();
      return keys.map(label => ({ label, tareas: sortCronoPrio(grouped[label]) }));
    }

    // Default: auto-group by área when there are multiple, always cronológico+prioridad
    const areas = [...new Set(base.map(t => t.area))];
    if (areas.length <= 1) return null; // render flat list, sorted below

    const grouped: Record<string, TareaItem[]> = {};
    for (const t of base) {
      if (!grouped[t.area]) grouped[t.area] = [];
      grouped[t.area].push(t);
    }
    const AREA_ORD = ["GENERAL","VENTAS","ADMINISTRACION","PRODUCCION","MARKETING","RRHH"];
    const keys = AREA_ORD.filter(k => grouped[k]);
    return keys.map(key => ({ label: areaLabel(key), tareas: sortCronoPrio(grouped[key]) }));
  }, [tareas, sortHoy, vista, showCompleted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flat sorted list (used when no grouping)
  const tareasOrdenadas = useMemo(() => {
    const base = showCompleted ? tareas : tareas.filter(t => t.estado !== "COMPLETADA");
    return sortCronoPrio(base);
  }, [tareas, showCompleted]); // eslint-disable-line react-hooks/exhaustive-deps

  const proyectosSinCarpeta = useMemo(() =>
    proyectosNav.filter(p => !carpetas.some(c => c.proyectos.some(cp => cp.id === p.id))),
  [proyectosNav, carpetas]);

  const vistaKey    = typeof vista === "string" ? vista : vista.id;
  const vistaLabel  =
    vista === "bandeja"   ? "Bandeja de entrada" :
    vista === "hoy"       ? "Hoy" :
    vista === "proximas"  ? "Próximas" :
    vista === "integrada" ? "Alertas" :
    proyectoDetalle?.nombre ?? "Proyecto";

  // ── Proyecto/Carpeta CRUD ────────────────────────────────────────────────
  async function renameProyecto(id: string, nombre: string) {
    await fetch(`/api/operaciones/proyectos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    setProyectosNav(prev => prev.map(p => p.id === id ? { ...p, nombre } : p));
    setCarpetas(prev => prev.map(c => ({ ...c, proyectos: c.proyectos.map(p => p.id === id ? { ...p, nombre } : p) })));
  }

  async function deleteProyecto(id: string) {
    await fetch(`/api/operaciones/proyectos/${id}`, { method: "DELETE" });
    setProyectosNav(prev => prev.filter(p => p.id !== id));
    setCarpetas(prev => prev.map(c => ({ ...c, proyectos: c.proyectos.filter(p => p.id !== id) })));
    if (typeof vista !== "string" && vista.id === id) setVista("bandeja");
  }

  async function renameCarpeta(id: string, nombre: string) {
    await fetch(`/api/operaciones/carpetas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    setCarpetas(prev => prev.map(c => c.id === id ? { ...c, nombre } : c));
  }

  async function deleteCarpeta(id: string) {
    await fetch(`/api/operaciones/carpetas/${id}`, { method: "DELETE" });
    setCarpetas(prev => prev.filter(c => c.id !== id));
  }

  // Today count for badge
  const hoyCount = useMemo(() => {
    const hoy = new Date(); hoy.setHours(23,59,59,999);
    if (typeof vista === "string" && vista === "hoy") {
      return tareas.filter(t => t.estado !== "COMPLETADA").length;
    }
    return 0; // don't calculate cross-view for perf
  }, [tareas, vista]);

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("op_sidebar");
    return saved === null ? true : saved === "1";
  });

  function toggleSidebar() {
    setSidebarOpen(v => {
      const next = !v;
      localStorage.setItem("op_sidebar", next ? "1" : "0");
      return next;
    });
  }

  const [mobileQuickAdd, setMobileQuickAdd] = useState(false);
  const [mobileProyectos, setMobileProyectos] = useState(false);
  const mobileQARef = useRef<MobileQuickAddHandle>(null);
  const [quickAddTrigger, setQuickAddTrigger] = useState(0);

  return (
    <div className="flex h-full overflow-hidden bg-[#0a0a0a]">

      {/* ══════════════════════════════════════════════════════════════════════
          LEFT SIDEBAR — Todoist-style navigation
      ══════════════════════════════════════════════════════════════════════ */}
      <aside className={`${sidebarOpen ? "w-56" : "w-0"} hidden md:flex shrink-0 overflow-hidden transition-[width] duration-200 bg-[#060606] border-r border-[#0f0f0f] flex-col`}>

        {/* ── Nueva tarea (CTA) ──────────────────────────────────────────── */}
        <div className="p-3 shrink-0">
          <button
            onClick={() => { setVista("bandeja"); setQuickAddTrigger(n => n + 1); }}
            className="w-full flex items-center gap-2 px-3 py-2 bg-[#B3985B]/10 hover:bg-[#B3985B]/16 border border-[#B3985B]/20 hover:border-[#B3985B]/35 text-[#B3985B] rounded-xl text-sm font-medium transition-all group"
          >
            <span className="w-5 h-5 rounded-full bg-[#B3985B]/20 group-hover:bg-[#B3985B]/30 flex items-center justify-center transition-colors">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </span>
            Nueva tarea
          </button>
        </div>

        {/* ── Fixed nav items ────────────────────────────────────────────── */}
        <nav className="px-2 space-y-0.5 shrink-0">
          <SideItem
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>}
            label="Bandeja" isActive={vistaKey === "bandeja"} onClick={() => setVista("bandeja")}
          />
          <SideItem
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>}
            label="Hoy" isActive={vistaKey === "hoy"} onClick={() => setVista("hoy")}
            count={vistaKey === "hoy" ? (hoyCount > 0 ? hoyCount : undefined) : undefined}
          />
          <SideItem
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
            label="Próximas" isActive={vistaKey === "proximas"} onClick={() => setVista("proximas")}
          />
          <SideItem
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>}
            label="Alertas" isActive={vistaKey === "integrada"} onClick={() => setVista("integrada")}
          />
        </nav>

        {/* ── Proyectos section ──────────────────────────────────────────── */}
        <div className="mt-4 flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 shrink-0">
            <span className="text-[10px] text-[#333] uppercase tracking-widest font-semibold select-none">Proyectos</span>
            <button
              onClick={() => { setShowNuevoProyecto(true); setTimeout(() => proyectoInputRef.current?.focus(), 50); }}
              className="w-5 h-5 flex items-center justify-center rounded text-[#2a2a2a] hover:text-[#B3985B] hover:bg-[#B3985B]/10 transition-all"
              title="Nuevo proyecto"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5" style={{ scrollbarWidth: "none" }}>
            {/* Proyectos sin carpeta */}
            {proyectosSinCarpeta.map(p => (
              <NavProyecto key={p.id} proyecto={p} isActive={vistaKey === p.id}
                onSelect={() => setVista({ tipo: "proyecto", id: p.id })}
                onRename={n => renameProyecto(p.id, n)}
                onDelete={() => deleteProyecto(p.id)}
              />
            ))}

            {/* Carpetas */}
            {carpetas.map(c => (
              <NavCarpeta key={c.id} carpeta={c} open={carpetasOpen.has(c.id)} vistaKey={vistaKey}
                onToggle={() => setCarpetasOpen(prev => {
                  const next = new Set(prev);
                  next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                  return next;
                })}
                onSelectProyecto={id => setVista({ tipo: "proyecto", id })}
                onRenameCarpeta={renameCarpeta}
                onDeleteCarpeta={deleteCarpeta}
                onRenameProyecto={renameProyecto}
                onDeleteProyecto={deleteProyecto}
              />
            ))}

            {/* Nueva carpeta inline */}
            {showNuevaCarpeta ? (
              <div className="flex items-center gap-1.5 px-2 py-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                <input ref={carpetaInputRef} value={nuevoCarpetaNombre} onChange={e => setNuevoCarpetaNombre(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") crearCarpeta(); if (e.key === "Escape") setShowNuevaCarpeta(false); }}
                  placeholder="Nombre de carpeta"
                  className="flex-1 bg-transparent text-xs text-white placeholder-[#333] focus:outline-none min-w-0" />
              </div>
            ) : (
              <button
                onClick={() => { setShowNuevaCarpeta(true); setTimeout(() => carpetaInputRef.current?.focus(), 50); }}
                className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-[#2a2a2a] hover:text-[#555] transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
                Nueva carpeta
              </button>
            )}
          </div>
        </div>

        {/* ── Bottom ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 p-2 border-t border-[#0f0f0f]">
          <Link
            href="/operaciones/equipo"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#333] hover:text-white hover:bg-[#111] transition-all"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Vista de equipo
          </Link>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* ── CONTENT HEADER ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#0f0f0f] shrink-0">

          {/* Sidebar toggle */}
          <button
            onClick={toggleSidebar}
            className="w-6 h-6 flex items-center justify-center rounded text-[#2a2a2a] hover:text-[#777] hover:bg-[#111] transition-all shrink-0"
            title={sidebarOpen ? "Ocultar sidebar" : "Mostrar sidebar"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <h1 className="text-base font-semibold text-white tracking-tight">{vistaLabel}</h1>

          {/* Sort dropdown (Hoy / Próximas) */}
          {(vista === "hoy" || vista === "proximas") && (
            <div className="ml-auto relative">
              <button
                onClick={() => setSortDropdownOpen(v => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
                  sortHoy !== SORT_OPTIONS[0]
                    ? "bg-[#1a1a1a] text-white border-[#2a2a2a]"
                    : "text-[#444] border-[#1a1a1a] hover:text-[#777] hover:bg-[#111]"
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/>
                  <line x1="21" y1="14" x2="7" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/>
                </svg>
                {sortHoy === SORT_OPTIONS[0] ? "Agrupar" : sortHoy.replace("Por ", "")}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points={sortDropdownOpen ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}/>
                </svg>
              </button>
              {sortDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-[9990]" onClick={() => setSortDropdownOpen(false)} />
                  <div className="absolute right-0 top-9 z-[9991] bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl shadow-2xl py-1 min-w-[160px]">
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => {
                          setSortHoy(opt);
                          localStorage.setItem("op_sort_hoy", opt);
                          setSortDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-[#151515] ${
                          sortHoy === opt ? "text-[#B3985B]" : "text-[#666] hover:text-white"
                        }`}
                      >
                        {opt}
                        {sortHoy === opt && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Show completed toggle */}
          {typeof vista === "string" && vista !== "integrada" && (
            <button
              onClick={() => setShowCompleted(v => !v)}
              className={`${(vista === "hoy" || vista === "proximas") ? "ml-2" : "ml-auto"} flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
                showCompleted ? "text-[#B3985B] bg-[#B3985B]/10 border border-[#B3985B]/20" : "text-[#333] hover:text-[#666] hover:bg-[#111]"
              }`}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Completadas
            </button>
          )}

          {/* Add section (project view) */}
          {typeof vista !== "string" && proyectoDetalle && (
            <button
              onClick={() => setShowNuevaSeccion(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-[#111] text-xs text-[#666] rounded-lg hover:bg-[#1a1a1a] hover:text-white transition-all"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Sección
            </button>
          )}
        </div>

        {/* ── TASK LIST ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto pb-[72px] md:pb-0">
          {loadingMain ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 border border-[#222] border-t-[#B3985B] rounded-full animate-spin" />
            </div>

          ) : vista === "integrada" ? (
            <div className="max-w-2xl mx-auto px-4 py-5 space-y-2">
              {integradas.length === 0 ? (
                <EmptyState icon="⚡" title="Sin alertas" sub="Todo en orden en todos los módulos" />
              ) : integradas.map(t => (
                <Link key={t.id} href={t.href}
                  className={`flex items-start gap-3 p-4 rounded-xl bg-[#080808] border-l-2 hover:bg-[#0d0d0d] transition-colors ${severityColor(t.severidad)}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{t.titulo}</p>
                    {t.descripcion && <p className="text-xs text-[#555] mt-0.5">{t.descripcion}</p>}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#1a1a1a] text-[#666]">{t.etiqueta}</span>
                      {t.diasVencido && <span className="text-[11px] text-red-400">{t.diasVencido}d vencida</span>}
                      {t.monto && <span className="text-[11px] text-[#B3985B] font-medium">${t.monto.toLocaleString("es-MX")}</span>}
                      {t.cliente && <span className="text-[11px] text-[#555]">{t.cliente}</span>}
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" className="shrink-0 mt-1">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </Link>
              ))}
            </div>

          ) : typeof vista === "string" ? (
            <div className="max-w-2xl mx-auto px-2 py-4 pb-24">
              {/* Quick add at top for bandeja/proximas */}
              {(vista === "bandeja" || vista === "proximas" || vista === "hoy") && (
                <div className="mb-3">
                  <QuickAdd
                    onAdd={addTarea}
                    placeholder={vista === "hoy" ? "Agregar tarea para hoy…" : "Agregar tarea…"}
                    proyectos={proyectosNav}
                    usuarios={usuarios}
                    triggerOpen={quickAddTrigger}
                  />
                </div>
              )}

              {tareasOrdenadas.length === 0 && !hoyGrouped ? (
                <EmptyState
                  icon={vista === "hoy" ? "☀️" : vista === "proximas" ? "📅" : "📥"}
                  title={vista === "hoy" ? "Nada para hoy" : vista === "proximas" ? "Sin tareas próximas" : "Bandeja vacía"}
                  sub={vista === "bandeja" ? "Escribe una tarea arriba y presiona Enter" : ""}
                />
              ) : hoyGrouped ? (
                hoyGrouped.map(group => group.tareas.length === 0 ? null : (
                  <div key={group.label} className="mb-6">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className="text-xs text-[#555] font-semibold uppercase tracking-widest">{group.label}</span>
                      <span className="text-[11px] text-[#2a2a2a] font-medium">{group.tareas.length}</span>
                    </div>
                    {group.tareas.map(t => (
                      <TaskItem key={t.id} tarea={t} isSelected={selectedId === t.id}
                        onComplete={completeTarea} onSelect={setSelectedId} onDelete={deleteTarea}
                        onDateChange={(id, field, val) => saveTarea(id, { [field]: val || null })}
                        showProject draggable
                        onDragStart={setDraggingId} onDragEnd={() => setDraggingId(null)}
                        onDrop={targetId => { if (draggingId && draggingId !== targetId) moveToSubtask(draggingId, targetId); }}
                        isDragOver={false}
                      />
                    ))}
                  </div>
                ))
              ) : (
                tareasOrdenadas.map(t => (
                  <TaskItem key={t.id} tarea={t} isSelected={selectedId === t.id}
                    onComplete={completeTarea} onSelect={setSelectedId} onDelete={deleteTarea}
                    onDateChange={(id, field, val) => saveTarea(id, { [field]: val || null })}
                    showProject draggable
                    onDragStart={setDraggingId} onDragEnd={() => setDraggingId(null)}
                    onDrop={targetId => { if (draggingId && draggingId !== targetId) moveToSubtask(draggingId, targetId); }}
                    isDragOver={false}
                  />
                ))
              )}
            </div>

          ) : (
            <div className="max-w-2xl mx-auto px-2 py-4 pb-24">
              {proyectoDetalle && (
                <>
                  {proyectoDetalle.tareas.map(t => (
                    <TaskItem key={t.id} tarea={t} isSelected={selectedId === t.id}
                      onComplete={completeTarea} onSelect={setSelectedId} onDelete={deleteTarea}
                      onDateChange={(id, field, val) => saveTarea(id, { [field]: val || null })}
                      draggable
                      onDragStart={setDraggingId} onDragEnd={() => setDraggingId(null)}
                      onDrop={targetId => { if (draggingId && draggingId !== targetId) moveToSubtask(draggingId, targetId); }}
                    />
                  ))}
                  <QuickAdd
                    proyectoTareaId={proyectoDetalle.id} onAdd={addTarea}
                    placeholder="Agregar tarea…" proyectos={proyectosNav} usuarios={usuarios}
                  />

                  {proyectoDetalle.secciones.map(seccion => (
                    <SectionBlock
                      key={seccion.id} seccion={seccion} proyectoId={proyectoDetalle.id}
                      selectedId={selectedId}
                      onComplete={completeTarea} onSelect={setSelectedId} onDelete={deleteTarea}
                      onAddTarea={addTarea} draggingId={draggingId}
                      onDragStart={setDraggingId} onDragEnd={() => setDraggingId(null)}
                      onDrop={targetId => { if (draggingId && draggingId !== targetId) moveToSubtask(draggingId, targetId); }}
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
                    <div className="mt-5 px-3 py-3 border border-dashed border-[#1e1e1e] rounded-xl space-y-2">
                      <input autoFocus value={nuevaSeccionNombre}
                        onChange={e => setNuevaSeccionNombre(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") addSeccion(); if (e.key === "Escape") setShowNuevaSeccion(false); }}
                        placeholder="Nombre de la sección"
                        className="w-full bg-transparent text-sm text-white placeholder-[#333] focus:outline-none" />
                      <div className="flex gap-3">
                        <button onClick={addSeccion} className="text-xs text-[#B3985B] hover:underline font-medium">Crear</button>
                        <button onClick={() => setShowNuevaSeccion(false)} className="text-xs text-[#444] hover:text-white">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowNuevaSeccion(true)}
                      className="mt-5 flex items-center gap-2 text-xs text-[#2a2a2a] hover:text-[#555] px-3 py-2 rounded-lg transition-colors">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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

      {/* ── TASK MODAL ──────────────────────────────────────────────────────── */}
      {selectedId && (
        <TaskModal
          tarea={selectedTask} loading={loadingPanel}
          usuarios={usuarios} proyectos={proyectosNav} iniciativas={iniciativas} sessionId={sessionId}
          onClose={() => setSelectedId(null)} onSave={saveTarea}
          onComplete={completeTarea} onDelete={deleteTarea}
          onAddSubtarea={addSubtarea} onCompleteSubtarea={completeTarea} onDeleteSubtarea={deleteTarea}
        />
      )}

      {/* ── UNDO TOAST ──────────────────────────────────────────────────────── */}
      <UndoToast undo={undoState} onUndo={handleUndo} onDismiss={handleDismissUndo} />
      {CelebrationToastEl}

      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE: FAB + Bottom Tab Bar
      ══════════════════════════════════════════════════════════════════════ */}

      {/* FAB */}
      <button
        onClick={() => {
          // Focus BEFORE setState so iOS keyboard triggers within the gesture
          mobileQARef.current?.focus();
          setMobileQuickAdd(true);
        }}
        className="md:hidden fixed right-5 z-40 w-14 h-14 rounded-full bg-[#B3985B] flex items-center justify-center shadow-[0_4px_24px_rgba(179,152,91,0.45)] active:scale-95 transition-transform"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 100px)" }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.8" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* Mobile Quick Add bottom sheet */}
      <MobileQuickAdd
        ref={mobileQARef}
        open={mobileQuickAdd}
        onClose={() => setMobileQuickAdd(false)}
        onAdd={addTarea}
        proyectos={proyectosNav}
        usuarios={usuarios}
        defaultProyectoId={typeof vista !== "string" ? vista.id : null}
      />

      {/* Bottom Tab Bar */}
      <nav
        className="md:hidden fixed z-30 left-3 right-3 bg-[#0d0d0d] border border-[#222] rounded-2xl flex items-stretch overflow-hidden shadow-2xl"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
      >
        {([
          {
            key: "bandeja", label: "Bandeja",
            icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
            onClick: () => { setVista("bandeja"); setMobileProyectos(false); },
            isActive: vistaKey === "bandeja" && !mobileProyectos,
          },
          {
            key: "hoy", label: "Hoy",
            icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
            onClick: () => { setVista("hoy"); setMobileProyectos(false); },
            isActive: vistaKey === "hoy" && !mobileProyectos,
          },
          {
            key: "proximas", label: "Próximo",
            icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
            onClick: () => { setVista("proximas"); setMobileProyectos(false); },
            isActive: vistaKey === "proximas" && !mobileProyectos,
          },
          {
            key: "explorar", label: "Explorar",
            icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
            onClick: () => setMobileProyectos(v => !v),
            isActive: mobileProyectos || (typeof vistaKey !== "string"),
          },
          {
            key: "equipo", label: "Equipo",
            icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
            href: "/operaciones/equipo",
            isActive: false,
          },
        ] as const).map(tab => {
          const isActive = tab.isActive;
          const content = (
            <span className={`flex flex-col items-center gap-1 py-2 flex-1 transition-colors ${isActive ? "text-[#B3985B]" : "text-[#444]"}`}>
              {tab.icon}
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </span>
          );
          if ("href" in tab) {
            return <Link key={tab.key} href={tab.href} className="flex-1 flex items-center justify-center">{content}</Link>;
          }
          return (
            <button key={tab.key} onClick={tab.onClick} className="flex-1 flex items-center justify-center">
              {content}
            </button>
          );
        })}
      </nav>

      {/* Mobile: panel de proyectos (Explorar) */}
      {mobileProyectos && (
        <>
          <div className="fixed inset-0 z-[35] bg-black/60 md:hidden" onClick={() => setMobileProyectos(false)} />
          <div className="md:hidden fixed inset-x-0 bottom-[56px] z-[36] bg-[#0d0d0d] border-t border-[#1e1e1e] rounded-t-2xl max-h-[70vh] overflow-y-auto"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex justify-center pt-2.5 pb-2">
              <div className="w-8 h-1 rounded-full bg-[#2a2a2a]" />
            </div>
            <div className="flex items-center justify-between px-4 pb-2">
              <h2 className="text-white font-semibold text-base">Proyectos</h2>
              <button
                onClick={() => { setShowNuevoProyecto(true); setMobileProyectos(false); setTimeout(() => proyectoInputRef.current?.focus(), 80); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#B3985B]/10 text-[#B3985B] hover:bg-[#B3985B]/20 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>
            <div className="pb-4">
              {proyectosSinCarpeta.map(p => (
                <button key={p.id} onClick={() => { setVista({ tipo: "proyecto", id: p.id }); setMobileProyectos(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${vistaKey === p.id ? "text-[#B3985B] bg-[#B3985B]/5" : "text-white hover:bg-[#111]"}`}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color ?? "#555" }} />
                  {p.nombre}
                </button>
              ))}
              {carpetas.map(c => (
                <div key={c.id}>
                  <div className="flex items-center gap-2 px-4 py-2">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    <span className="text-[11px] text-[#444] font-semibold uppercase tracking-widest">{c.nombre}</span>
                  </div>
                  {c.proyectos.map(p => (
                    <button key={p.id} onClick={() => { setVista({ tipo: "proyecto", id: p.id }); setMobileProyectos(false); }}
                      className={`w-full flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm transition-colors ${vistaKey === p.id ? "text-[#B3985B] bg-[#B3985B]/5" : "text-white hover:bg-[#111]"}`}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color ?? "#555" }} />
                      {p.nombre}
                    </button>
                  ))}
                </div>
              ))}
              {proyectosSinCarpeta.length === 0 && carpetas.length === 0 && (
                <p className="text-center text-[#444] text-sm py-8">Sin proyectos aún</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── MODAL: Nuevo proyecto ───────────────────────────────────────────── */}
      {showNuevoProyecto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowNuevoProyecto(false)}>
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl p-6 w-80 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold">Nuevo proyecto</h3>
            <div className="space-y-3">
              <input ref={proyectoInputRef} value={nuevoProyectoNombre}
                onChange={e => setNuevoProyectoNombre(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") crearProyecto(); if (e.key === "Escape") setShowNuevoProyecto(false); }}
                placeholder="Nombre del proyecto"
                className="w-full bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]" />
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#444] uppercase tracking-wider">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {PROJECT_COLORS.map(c => (
                    <button key={c} onClick={() => setNuevoProyectoColor(c)}
                      className={`w-6 h-6 rounded-full hover:scale-110 transition-transform ${nuevoProyectoColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#0d0d0d]" : ""}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#444] uppercase tracking-wider">Carpeta (opcional)</label>
                <select value={nuevoProyectoCarpeta} onChange={e => setNuevoProyectoCarpeta(e.target.value)}
                  className="w-full bg-[#111] border border-[#1e1e1e] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#B3985B]">
                  <option value="">— Sin carpeta —</option>
                  {carpetas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNuevoProyecto(false)} className="px-3 py-1.5 text-sm text-[#555] hover:text-white">Cancelar</button>
              <button onClick={crearProyecto} className="px-4 py-1.5 bg-[#B3985B] text-black text-sm font-semibold rounded-xl hover:bg-[#c9aa6a] transition-colors">
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SideItem ─────────────────────────────────────────────────────────────────

function SideItem({ icon, label, isActive, onClick, count }: {
  icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void; count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
        isActive
          ? "bg-[#1a1a1a] text-white"
          : "text-[#444] hover:text-[#bbb] hover:bg-[#0d0d0d]"
      }`}
    >
      <span className={`shrink-0 ${isActive ? "text-[#B3985B]" : ""}`}>{icon}</span>
      <span className="flex-1 text-left truncate">{label}</span>
      {count !== undefined && (
        <span className={`text-[11px] font-semibold min-w-[18px] text-center rounded-full px-1 ${
          isActive ? "text-[#B3985B]" : "text-[#444]"
        }`}>{count}</span>
      )}
    </button>
  );
}

// ── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="text-4xl mb-4 opacity-60">{icon}</span>
      <p className="text-sm font-medium text-[#444]">{title}</p>
      {sub && <p className="text-xs text-[#2a2a2a] mt-1">{sub}</p>}
    </div>
  );
}

// ── NavProyecto ─────────────────────────────────────────────────────────────

function NavProyecto({ proyecto, isActive, indent = 2, onSelect, onRename, onDelete }: {
  proyecto: ProyectoNav;
  isActive: boolean;
  indent?: number;
  onSelect: () => void;
  onRename: (nombre: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [hov, setHov]       = useState(false);
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState(proyecto.nombre);

  async function save() {
    const trimmed = nombre.trim();
    if (trimmed && trimmed !== proyecto.nombre) await onRename(trimmed);
    else setNombre(proyecto.nombre);
    setEditing(false);
  }

  if (editing) return (
    <div className="flex items-center gap-1 px-2 py-0.5" style={{ paddingLeft: `${indent * 4}px` }}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: proyecto.color ?? "#555" }} />
      <input autoFocus value={nombre} onChange={e => setNombre(e.target.value)}
        onBlur={save} onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setNombre(proyecto.nombre); setEditing(false); } }}
        className="flex-1 bg-[#1a1a1a] border border-[#B3985B]/40 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none" />
    </div>
  );

  return (
    <div className="relative group/proy" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <button onClick={onSelect}
        className={`w-full flex items-center gap-2 py-1 rounded text-sm transition-colors ${
          isActive ? "bg-[#1a1a1a] text-white" : "text-[#555] hover:text-[#bbb] hover:bg-[#0f0f0f]"
        }`} style={{ paddingLeft: `${indent * 4}px`, paddingRight: hov ? "56px" : "8px" }}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: proyecto.color ?? "#555" }} />
        <span className="truncate">{proyecto.nombre}</span>
      </button>
      {hov && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          <button onClick={e => { e.stopPropagation(); setEditing(true); }}
            className="w-5 h-5 flex items-center justify-center rounded text-[#444] hover:text-[#B3985B] hover:bg-[#1a1a1a] transition-all">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            className="w-5 h-5 flex items-center justify-center rounded text-[#444] hover:text-red-400 hover:bg-red-950/20 transition-all">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ── NavCarpeta ──────────────────────────────────────────────────────────────

function NavCarpeta({ carpeta, open, vistaKey, onToggle, onSelectProyecto, onRenameCarpeta, onDeleteCarpeta, onRenameProyecto, onDeleteProyecto }: {
  carpeta: Carpeta;
  open: boolean;
  vistaKey: string;
  onToggle: () => void;
  onSelectProyecto: (id: string) => void;
  onRenameCarpeta: (id: string, nombre: string) => Promise<void>;
  onDeleteCarpeta: (id: string) => Promise<void>;
  onRenameProyecto: (id: string, nombre: string) => Promise<void>;
  onDeleteProyecto: (id: string) => Promise<void>;
}) {
  const [hov, setHov]       = useState(false);
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState(carpeta.nombre);

  async function save() {
    const trimmed = nombre.trim();
    if (trimmed && trimmed !== carpeta.nombre) await onRenameCarpeta(carpeta.id, trimmed);
    else setNombre(carpeta.nombre);
    setEditing(false);
  }

  return (
    <div>
      <div className="relative" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
        {editing ? (
          <div className="flex items-center gap-1 px-2 py-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <input autoFocus value={nombre} onChange={e => setNombre(e.target.value)}
              onBlur={save} onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setNombre(carpeta.nombre); setEditing(false); } }}
              className="flex-1 bg-[#1a1a1a] border border-[#B3985B]/40 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none" />
          </div>
        ) : (
          <button onClick={onToggle}
            className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-sm text-[#555] hover:text-[#bbb] hover:bg-[#0f0f0f] transition-colors"
            style={{ paddingRight: hov ? "56px" : "8px" }}>
            <span className="text-[10px] transition-transform inline-block shrink-0" style={{ transform: open ? "rotate(90deg)" : "" }}>▶</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="shrink-0">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="truncate">{carpeta.nombre}</span>
          </button>
        )}
        {hov && !editing && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <button onClick={e => { e.stopPropagation(); setEditing(true); }}
              className="w-5 h-5 flex items-center justify-center rounded text-[#444] hover:text-[#B3985B] hover:bg-[#1a1a1a] transition-all">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button onClick={e => { e.stopPropagation(); onDeleteCarpeta(carpeta.id); }}
              className="w-5 h-5 flex items-center justify-center rounded text-[#444] hover:text-red-400 hover:bg-red-950/20 transition-all">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        )}
      </div>
      {open && (
        <div className="ml-4 space-y-0.5">
          {carpeta.proyectos.map(p => (
            <NavProyecto key={p.id} proyecto={p} isActive={vistaKey === p.id} indent={2}
              onSelect={() => onSelectProyecto(p.id)}
              onRename={nombre => onRenameProyecto(p.id, nombre)}
              onDelete={() => onDeleteProyecto(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── SectionBlock ─────────────────────────────────────────────────────────────

function SectionBlock({
  seccion, proyectoId, selectedId,
  onComplete, onSelect, onDelete, onAddTarea,
  onToggleCollapse, onDeleteSection,
  draggingId, onDragStart, onDragEnd, onDrop,
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
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (targetId: string) => void;
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
        {seccion.tareas.length > 0 && <span className="text-[11px] text-[#333]">({seccion.tareas.length})</span>}
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
              onComplete={onComplete} onSelect={onSelect} onDelete={onDelete}
              onDateChange={(id, field, val) => { fetch(`/api/tareas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: val || null }) }); }}
              draggable={!!draggingId || true}
              onDragStart={onDragStart} onDragEnd={onDragEnd}
              onDrop={targetId => { if (draggingId && draggingId !== targetId) onDrop(targetId); }}
            />
          ))}
          <QuickAdd proyectoTareaId={proyectoId} seccionId={seccion.id} compact
            placeholder={`Tarea en ${seccion.nombre}…`} onAdd={onAddTarea} />
        </>
      )}
    </div>
  );
}
