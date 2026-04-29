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
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";

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

type VistaKey = "bandeja" | "hoy" | "proximas" | "integrada" | "proyectos-evento" | "equipo" | { tipo: "proyecto"; id: string };

interface ProyectoEventoConTareas {
  id: string;
  nombre: string;
  tipoEvento: string;
  fechaEvento: string;
  estado: string;
  lugarEvento: string | null;
  encargado: { id: string; name: string } | null;
  tareas: TareaItem[];
}


interface ProyViewOpts {
  showCompleted: boolean;
  sortBy:        "none" | "prioridad" | "fecha" | "nombre";
  groupBy:       "none" | "prioridad" | "area";
  filterPrio:    string[];
}
const PROY_VIEW_DEFAULT: ProyViewOpts = { showCompleted: false, sortBy: "none", groupBy: "none", filterPrio: [] };

interface VistaOpts {
  showCompleted: boolean;
  sortBy:   "none" | "prioridad" | "fecha" | "nombre";
  groupBy:  "none" | "proyecto" | "prioridad" | "area" | "fecha";
  filterPrio: string[];
}
const VISTA_DEFAULT: VistaOpts = { showCompleted: false, sortBy: "none", groupBy: "none", filterPrio: [] };
const PRIO_ORDER: Record<string, number> = { URGENTE: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };
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
    MARKETING:"Marketing", RRHH:"RR.HH.", GENERAL:"General", DIRECCION:"Dirección",
  };
  return M[a] ?? a;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OperacionesPage() {
  const toast = useToast();
  const [carpetas, setCarpetas]                 = useState<Carpeta[]>([]);
  const [proyectosNav, setProyectosNav]         = useState<ProyectoNav[]>([]);
  const [iniciativas, setIniciativas]           = useState<Iniciativa[]>([]);
  const [usuarios, setUsuarios]                 = useState<Usuario[]>([]);
  const [sessionId, setSessionId]               = useState<string>("");
  const [sessionRole, setSessionRole]           = useState<string>("");

  const [vista, setVista]                             = useState<VistaKey>("bandeja");
  const [tareas, setTareas]                           = useState<TareaItem[]>([]);
  const [integradas, setIntegradas]                   = useState<TareaIntegrada[]>([]);
  const [proyectoDetalle, setProyectoDetalle]         = useState<ProyectoDetalle | null>(null);
  const [proyectosEvento, setProyectosEvento]         = useState<ProyectoEventoConTareas[]>([]);
  const [loadingMain, setLoadingMain]                 = useState(false);

  const searchParams = useSearchParams();
  const [selectedId, setSelectedId]             = useState<string | null>(() => searchParams.get("open"));
  const [selectedTask, setSelectedTask]         = useState<TareaDetalle | null>(null);
  const [loadingPanel, setLoadingPanel]         = useState(false);

  const [vistaOpts, setVistaOpts]               = useState<VistaOpts>(() => {
    if (typeof window === "undefined") return VISTA_DEFAULT;
    try { const r = localStorage.getItem("op_vista_opts"); if (r) return { ...VISTA_DEFAULT, ...JSON.parse(r) }; } catch {}
    return VISTA_DEFAULT;
  });
  const [showVistaPanel, setShowVistaPanel]     = useState(false);
  const vistaPanelRef                           = useRef<HTMLDivElement>(null);
  const [busqueda, setBusqueda]                 = useState("");
  const [draggingId, setDraggingId]             = useState<string | null>(null);
  const [undoState, setUndoState]               = useState<UndoState | null>(null);
  const [addToast,  setAddToast]                = useState<{ msg: string; visible: boolean } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId]   = useState<string | null>(null);
  const [selectedIds, setSelectedIds]           = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk]           = useState(false);
  const [proyViewOpts, setProyViewOpts]         = useState<ProyViewOpts>(() => {
    if (typeof window === "undefined") return PROY_VIEW_DEFAULT;
    try { const r = localStorage.getItem("op_proy_view"); if (r) return { ...PROY_VIEW_DEFAULT, ...JSON.parse(r) }; } catch {}
    return PROY_VIEW_DEFAULT;
  });
  const [showViewPanel, setShowViewPanel]       = useState(false);
  const viewPanelRef = useRef<HTMLDivElement>(null);
  const [filterUserProy, setFilterUserProy]     = useState<string | null>(null);
  const { celebrate, Toast: CelebrationToastEl } = useCelebration();
  const undoTimer     = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const showCompletedRef = useRef(vistaOpts.showCompleted);
  useEffect(() => { showCompletedRef.current = vistaOpts.showCompleted; }, [vistaOpts.showCompleted]);
  useEffect(() => { try { localStorage.setItem("op_proy_view", JSON.stringify(proyViewOpts)); } catch {} }, [proyViewOpts]);
  useEffect(() => {
    if (!showViewPanel) return;
    function h(e: MouseEvent) { if (viewPanelRef.current && !viewPanelRef.current.contains(e.target as Node)) setShowViewPanel(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showViewPanel]);
  useEffect(() => { try { localStorage.setItem("op_vista_opts", JSON.stringify(vistaOpts)); } catch {} }, [vistaOpts]);
  useEffect(() => {
    if (!showVistaPanel) return;
    function h(e: MouseEvent) { if (vistaPanelRef.current && !vistaPanelRef.current.contains(e.target as Node)) setShowVistaPanel(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showVistaPanel]);

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
      fetch("/api/operaciones/carpetas").then(r => r.json()).catch(() => ({ carpetas: [] })),
      fetch("/api/operaciones/proyectos").then(r => r.json()).catch(() => ({ proyectos: [] })),
      fetch("/api/iniciativas").then(r => r.json()).catch(() => ({ iniciativas: [] })),
      fetch("/api/usuarios").then(r => r.json()).catch(() => ({ usuarios: [] })),
      fetch("/api/me").then(r => r.json()).catch(() => ({})),
    ]).then(([carp, proy, init, usr, me]) => {
      setCarpetas(carp.carpetas ?? []);
      setProyectosNav(proy.proyectos ?? []);
      setIniciativas(init.iniciativas ?? []);
      setUsuarios(usr.usuarios ?? []);
      if (me?.id) setSessionId(me.id);
      if (me?.role) setSessionRole(me.role);
    });
  }, []);

  // ── Load view ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof vista !== "string") return;
    setLoadingMain(true);
    setProyectoDetalle(null);
    setFilterUserProy(null);
    if (vista === "integrada") {
      fetch("/api/tareas/integradas")
        .then(r => r.json())
        .then(d => { setIntegradas(d.tareas ?? []); })
        .catch(() => {})
        .finally(() => setLoadingMain(false));
      return;
    }
    if (vista === "proyectos-evento") {
      fetch("/api/tareas/por-proyecto")
        .then(r => r.json())
        .then(d => { setProyectosEvento(d.proyectos ?? []); })
        .catch(() => {})
        .finally(() => setLoadingMain(false));
      return;
    }
    fetch(`/api/tareas?vista=${vista}`)
      .then(r => r.json())
      .then(d => { setTareas(d.tareas ?? []); })
      .catch(() => {})
      .finally(() => setLoadingMain(false));
  }, [vista]);

  useEffect(() => {
    if (typeof vista === "string") return;
    setLoadingMain(true);
    setFilterUserProy(null);
    fetch(`/api/operaciones/proyectos/${vista.id}`)
      .then(r => r.json())
      .then(d => { setProyectoDetalle(d.proyecto ?? null); })
      .catch(() => {})
      .finally(() => setLoadingMain(false));
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

  function applyProyFilter(tareas: TareaItem[]): TareaItem[] {
    let r = tareas;
    if (!proyViewOpts.showCompleted) r = r.filter(t => t.estado !== "COMPLETADA");
    if (filterUserProy) r = r.filter(t => t.asignadoA?.id === filterUserProy);
    if (proyViewOpts.filterPrio.length > 0) r = r.filter(t => proyViewOpts.filterPrio.includes(t.prioridad));
    if (proyViewOpts.sortBy === "prioridad") r = [...r].sort((a, b) => (PRIO_ORDER[a.prioridad] ?? 3) - (PRIO_ORDER[b.prioridad] ?? 3));
    if (proyViewOpts.sortBy === "fecha") {
      r = [...r].sort((a, b) => {
        const da = a.fecha ?? a.fechaVencimiento ?? null;
        const db = b.fecha ?? b.fechaVencimiento ?? null;
        if (!da) return 1; if (!db) return -1;
        return da.localeCompare(db);
      });
    }
    if (proyViewOpts.sortBy === "nombre")    r = [...r].sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
    return r;
  }

  const AREA_LABELS_MAP: Record<string, string> = { VENTAS: "Ventas", ADMINISTRACION: "Administración", PRODUCCION: "Producción", MARKETING: "Marketing", RRHH: "RR.HH.", GENERAL: "General" };

  function groupProyTareas(tareas: TareaItem[]): { label: string; color?: string; items: TareaItem[] }[] {
    if (proyViewOpts.groupBy === "prioridad") {
      return [
        { label: "Urgente",        color: "#f87171", items: tareas.filter(t => t.prioridad === "URGENTE") },
        { label: "Alta",           color: "#fb923c", items: tareas.filter(t => t.prioridad === "ALTA") },
        { label: "Media",          color: "#B3985B", items: tareas.filter(t => t.prioridad === "MEDIA") },
        { label: "Sin prioridad",  color: "#4b5563", items: tareas.filter(t => t.prioridad === "BAJA") },
      ].filter(g => g.items.length > 0);
    }
    if (proyViewOpts.groupBy === "area") {
      return [...new Set(tareas.map(t => t.area))].map(area => ({
        label: AREA_LABELS_MAP[area] ?? area,
        items: tareas.filter(t => t.area === area),
      }));
    }
    return [{ label: "", items: tareas }];
  }

  const hasActiveProyOpts  = proyViewOpts.filterPrio.length > 0 || proyViewOpts.sortBy !== "none" || proyViewOpts.groupBy !== "none" || proyViewOpts.showCompleted || !!filterUserProy;
  const hasActiveVistaOpts = vistaOpts.filterPrio.length > 0 || vistaOpts.sortBy !== "none" || vistaOpts.groupBy !== "none" || vistaOpts.showCompleted;

  const ADD_MSGS = [
    "Tarea registrada",
    "Tarea agregada con éxito",
    "Registrada correctamente",
    "Tarea guardada",
    "Agregada al tablero",
  ];

  const addTarea = useCallback(async (data: {
    titulo: string; descripcion?: string | null; fecha: string | null; fechaVencimiento: string | null;
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

    // Brief success toast
    const msg = ADD_MSGS[Math.floor(Math.random() * ADD_MSGS.length)];
    setAddToast({ msg, visible: true });
    setTimeout(() => setAddToast(t => t ? { ...t, visible: false } : null), 1800);
    setTimeout(() => setAddToast(null), 2150);
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
    const res = await fetch(`/api/tareas/${undoState.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "PENDIENTE" }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      return;
    }
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

  const saveTarea = useCallback((id: string, patch: Record<string, unknown>) => {
    // Fire-and-forget — optimistic update happens first
    fetch(`/api/tareas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    // When a project is assigned to a bandeja task, remove it from the list immediately
    if ("proyectoTareaId" in patch && patch.proyectoTareaId && vista === "bandeja") {
      const rm = (arr: TareaItem[]) => arr.filter(t => t.id !== id);
      setTareas(rm);
      if (selectedId === id) setSelectedId(null);
      return;
    }

    const upd = (arr: TareaItem[]) => arr.map(t => {
      if (t.id !== id) return t;
      const next = { ...t };
      if (patch.titulo       != null) next.titulo    = patch.titulo    as string;
      if (patch.prioridad    != null) next.prioridad = patch.prioridad as string;
      if (patch.area         != null) next.area      = patch.area      as string;
      if (patch.estado       != null) next.estado    = patch.estado    as string;
      if ("fecha"            in patch) next.fecha            = patch.fecha            as string | null;
      if ("fechaVencimiento" in patch) next.fechaVencimiento = patch.fechaVencimiento as string | null;
      if ("asignadoAId"      in patch) {
        const uid = patch.asignadoAId as string | null;
        next.asignadoA = uid ? (usuarios.find(u => u.id === uid) ?? null) : null;
      }
      if ("proyectoTareaId"  in patch) {
        const pid = patch.proyectoTareaId as string | null;
        const proj = pid ? proyectosNav.find(p => p.id === pid) : null;
        next.proyectoTarea = proj ? { id: proj.id, nombre: proj.nombre, color: proj.color } : null;
      }
      return next;
    });

    setTareas(upd);
    setProyectoDetalle(prev => prev ? {
      ...prev, tareas: upd(prev.tareas),
      secciones: prev.secciones.map(s => ({ ...s, tareas: upd(s.tareas) })),
    } : null);
  }, [vista, selectedId, usuarios, proyectosNav]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteTarea = useCallback(async (id: string) => {
    const res = await fetch(`/api/tareas/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al eliminar");
      return;
    }
    const rm = (arr: TareaItem[]) => arr.filter(t => t.id !== id);
    setTareas(rm);
    setProyectoDetalle(prev => prev ? {
      ...prev, tareas: rm(prev.tareas),
      secciones: prev.secciones.map(s => ({ ...s, tareas: rm(s.tareas) })),
    } : null);
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addSubtarea = useCallback(async (parentId: string, data: { titulo: string; fecha: string | null; prioridad: string }) => {
    const res = await fetch("/api/tareas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, parentId }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const moveToSection = useCallback((taskId: string, seccionId: string) => {
    setProyectoDetalle(prev => {
      if (!prev) return null;
      // Find task in unsectioned list or any section
      let task = prev.tareas.find(t => t.id === taskId);
      const fromUnsectioned = !!task;
      if (!task) task = prev.secciones.flatMap(s => s.tareas).find(t => t.id === taskId);
      if (!task) return prev;
      const targetSec = prev.secciones.find(s => s.id === seccionId);
      if (!targetSec) return prev;
      return {
        ...prev,
        tareas: fromUnsectioned ? prev.tareas.filter(t => t.id !== taskId) : prev.tareas,
        secciones: prev.secciones.map(s => {
          if (s.id === seccionId) return { ...s, tareas: [...s.tareas, { ...task!, seccion: { id: s.id, nombre: s.nombre } }] };
          if (!fromUnsectioned) return { ...s, tareas: s.tareas.filter(t => t.id !== taskId) };
          return s;
        }),
      };
    });
    fetch(`/api/tareas/${taskId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seccionId }),
    });
    setDraggingId(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const moveToNoSection = useCallback((taskId: string) => {
    setProyectoDetalle(prev => {
      if (!prev) return null;
      let task: TareaItem | undefined;
      let fromSeccionId: string | null = null;
      for (const s of prev.secciones) {
        const found = s.tareas.find(t => t.id === taskId);
        if (found) { task = found; fromSeccionId = s.id; break; }
      }
      if (!task || !fromSeccionId) return prev;
      return {
        ...prev,
        tareas: [...prev.tareas, { ...task, seccion: null }],
        secciones: prev.secciones.map(s =>
          s.id === fromSeccionId ? { ...s, tareas: s.tareas.filter(t => t.id !== taskId) } : s
        ),
      };
    });
    fetch(`/api/tareas/${taskId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seccionId: null }),
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const moveToProject = useCallback((taskId: string, proyectoId: string, proyectoNombre: string) => {
    const rm = (arr: TareaItem[]) => arr.filter(t => t.id !== taskId);
    setTareas(rm);
    setDraggingId(null);
    fetch(`/api/tareas/${taskId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proyectoTareaId: proyectoId, seccionId: null }),
    });
    setAddToast({ msg: `Movida a ${proyectoNombre}`, visible: true });
    setTimeout(() => setAddToast(null), 2000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMultiSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const clearMultiSelect = useCallback(() => setSelectedIds(new Set()), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") clearMultiSelect();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [clearMultiSelect]);

  const bulkComplete = useCallback(async () => {
    const ids = [...selectedIds];
    const mark = (arr: TareaItem[]) => arr.map(t => selectedIds.has(t.id) ? { ...t, estado: "COMPLETADA" } : t);
    setTareas(mark);
    setProyectoDetalle(prev => prev ? {
      ...prev, tareas: mark(prev.tareas),
      secciones: prev.secciones.map(s => ({ ...s, tareas: mark(s.tareas) })),
    } : null);
    clearMultiSelect();
    await Promise.all(ids.map(id => fetch(`/api/tareas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "COMPLETADA" }),
    })));
  }, [selectedIds, clearMultiSelect]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExtractChild = useCallback((extracted: TareaItem) => {
    if (typeof vista !== "string") {
      setProyectoDetalle(prev => prev ? { ...prev, tareas: [extracted, ...prev.tareas] } : null);
    } else {
      setTareas(prev => [extracted, ...prev]);
    }
  }, [vista]); // eslint-disable-line react-hooks/exhaustive-deps

  const bulkDelete = useCallback(async () => {
    const ids = [...selectedIds];
    const rm = (arr: TareaItem[]) => arr.filter(t => !selectedIds.has(t.id));
    setTareas(rm);
    setProyectoDetalle(prev => prev ? {
      ...prev, tareas: rm(prev.tareas),
      secciones: prev.secciones.map(s => ({ ...s, tareas: rm(s.tareas) })),
    } : null);
    clearMultiSelect();
    setConfirmBulk(false);
    await Promise.all(ids.map(id => fetch(`/api/tareas/${id}`, { method: "DELETE" })));
  }, [selectedIds, clearMultiSelect]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const applyBusqueda = (list: TareaItem[]) => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return list;
    return list.filter(t => t.titulo.toLowerCase().includes(q));
  };

  const hoyGrouped = useMemo(() => {
    if (typeof vista !== "string" || vista === "integrada" || vista === "proyectos-evento") return null;

    let base = applyBusqueda(vistaOpts.showCompleted ? tareas : tareas.filter(t => t.estado !== "COMPLETADA"));
    if (vistaOpts.filterPrio.length > 0) base = base.filter(t => vistaOpts.filterPrio.includes(t.prioridad));

    function applySort(arr: TareaItem[]): TareaItem[] {
      if (vistaOpts.sortBy === "prioridad") return [...arr].sort((a, b) => (PRIO_ORDER[a.prioridad] ?? 3) - (PRIO_ORDER[b.prioridad] ?? 3));
      if (vistaOpts.sortBy === "fecha") {
        return [...arr].sort((a, b) => {
          const da = a.fecha ?? a.fechaVencimiento ?? null;
          const db = b.fecha ?? b.fechaVencimiento ?? null;
          if (!da) return 1; if (!db) return -1;
          return da.localeCompare(db);
        });
      }
      if (vistaOpts.sortBy === "nombre")    return [...arr].sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
      return sortCronoPrio(arr);
    }

    if (vistaOpts.groupBy !== "none") {
      const grouped: Record<string, TareaItem[]> = {};
      for (const t of base) {
        let key = "";
        if (vistaOpts.groupBy === "proyecto")  key = t.proyectoTarea?.nombre ?? "Bandeja de entrada";
        else if (vistaOpts.groupBy === "prioridad") key = t.prioridad;
        else if (vistaOpts.groupBy === "area") key = areaLabel(t.area);
        else if (vistaOpts.groupBy === "fecha") key = t.fecha ? new Date(t.fecha + "T00:00:00").toLocaleDateString("es-MX",{dateStyle:"medium"}) : "Sin fecha";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(t);
      }
      const keys = vistaOpts.groupBy === "prioridad"
        ? ["URGENTE","ALTA","MEDIA","BAJA"].filter(k => grouped[k])
        : Object.keys(grouped).sort();
      return keys.map(label => ({ label, tareas: applySort(grouped[label]) }));
    }

    // Natural grouping: bandeja stays flat, hoy groups by area, proximas groups if >1 area
    if (vista === "bandeja") return null;
    const areas = [...new Set(base.map(t => t.area))];
    if (vista !== "hoy" && areas.length <= 1) return null;

    const grouped: Record<string, TareaItem[]> = {};
    for (const t of base) {
      if (!grouped[t.area]) grouped[t.area] = [];
      grouped[t.area].push(t);
    }
    const AREA_ORD = ["GENERAL","VENTAS","ADMINISTRACION","PRODUCCION","MARKETING","RRHH","DIRECCION"];
    const extra = Object.keys(grouped).filter(k => !AREA_ORD.includes(k)).sort();
    const keys = [...AREA_ORD.filter(k => grouped[k]), ...extra.filter(k => grouped[k])];
    return keys.map(key => ({ label: areaLabel(key), tareas: applySort(grouped[key]) }));
  }, [tareas, vistaOpts, vista, busqueda]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flat sorted list (used when no grouping)
  const tareasOrdenadas = useMemo(() => {
    let base = applyBusqueda(vistaOpts.showCompleted ? tareas : tareas.filter(t => t.estado !== "COMPLETADA"));
    if (vistaOpts.filterPrio.length > 0) base = base.filter(t => vistaOpts.filterPrio.includes(t.prioridad));
    if (vistaOpts.sortBy === "prioridad") return [...base].sort((a, b) => (PRIO_ORDER[a.prioridad] ?? 3) - (PRIO_ORDER[b.prioridad] ?? 3));
    if (vistaOpts.sortBy === "fecha")     return [...base].sort((a, b) => { if (!a.fechaVencimiento) return 1; if (!b.fechaVencimiento) return -1; return a.fechaVencimiento.localeCompare(b.fechaVencimiento); });
    if (vistaOpts.sortBy === "nombre")    return [...base].sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
    return sortCronoPrio(base);
  }, [tareas, vistaOpts, busqueda]); // eslint-disable-line react-hooks/exhaustive-deps

  const proyectosSinCarpeta = useMemo(() =>
    proyectosNav.filter(p => !carpetas.some(c => c.proyectos.some(cp => cp.id === p.id))),
  [proyectosNav, carpetas]);

  const vistaKey    = typeof vista === "string" ? vista : vista.id;
  const vistaLabel  =
    vista === "bandeja"          ? "Bandeja de entrada" :
    vista === "hoy"              ? "Hoy" :
    vista === "proximas"         ? "Próximas" :
    vista === "integrada"        ? "Alertas" :
    vista === "proyectos-evento" ? "Proyectos / Eventos" :
    vista === "equipo"         ? "Vista equipo" :
    proyectoDetalle?.nombre ?? "Proyecto";

  // ── Proyecto/Carpeta CRUD ────────────────────────────────────────────────
  async function renameProyecto(id: string, nombre: string) {
    const res = await fetch(`/api/operaciones/proyectos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      return;
    }
    setProyectosNav(prev => prev.map(p => p.id === id ? { ...p, nombre } : p));
    setCarpetas(prev => prev.map(c => ({ ...c, proyectos: c.proyectos.map(p => p.id === id ? { ...p, nombre } : p) })));
  }

  async function deleteProyecto(id: string) {
    const res = await fetch(`/api/operaciones/proyectos/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al eliminar");
      return;
    }
    setProyectosNav(prev => prev.filter(p => p.id !== id));
    setCarpetas(prev => prev.map(c => ({ ...c, proyectos: c.proyectos.filter(p => p.id !== id) })));
    if (typeof vista !== "string" && vista.id === id) setVista("bandeja");
  }

  async function renameCarpeta(id: string, nombre: string) {
    const res = await fetch(`/api/operaciones/carpetas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      return;
    }
    setCarpetas(prev => prev.map(c => c.id === id ? { ...c, nombre } : c));
  }

  async function deleteCarpeta(id: string) {
    const res = await fetch(`/api/operaciones/carpetas/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al eliminar");
      return;
    }
    setCarpetas(prev => prev.filter(c => c.id !== id));
  }

  // Equipo view: tareas agrupadas por usuario asignado
  const equipoGroups = useMemo(() => {
    if (vista !== "equipo") return [];
    const map = new Map<string, { nombre: string; tareas: typeof tareas }>();
    for (const t of tareas) {
      const uid  = t.asignadoA?.id  ?? "__sin_asignar";
      const name = t.asignadoA?.name ?? "Sin asignar";
      if (!map.has(uid)) map.set(uid, { nombre: name, tareas: [] });
      map.get(uid)!.tareas.push(t);
    }
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [vista, tareas]);

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

  // Abrir captura rápida si la URL trae ?nueva=1 (acceso directo desde pantalla bloqueada)
  useEffect(() => {
    if (searchParams.get("nueva") !== "1") return;
    window.history.replaceState(null, "", "/operaciones");
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setMobileQuickAdd(true);
    } else {
      setVista("bandeja");
      setQuickAddTrigger(n => n + 1);
    }
  }, []);

  return (
    <div className="flex h-full overflow-hidden bg-[#0a0a0a]">

      {/* ══════════════════════════════════════════════════════════════════════
          LEFT SIDEBAR — Todoist-style navigation
      ══════════════════════════════════════════════════════════════════════ */}
      <aside className={`${sidebarOpen ? "w-56" : "w-0"} hidden lg:flex shrink-0 overflow-hidden transition-[width] duration-200 bg-[#060606] border-r border-[#0f0f0f] flex-col`}>

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
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>}
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
          <SideItem
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg>}
            label="Proyectos" isActive={vistaKey === "proyectos-evento"} onClick={() => setVista("proyectos-evento")}
          />
          {sessionRole === "ADMIN" && (
            <SideItem
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
              label="Equipo" isActive={vistaKey === "equipo"} onClick={() => setVista("equipo")}
            />
          )}
        </nav>

        {/* ── Proyectos section ──────────────────────────────────────────── */}
        <div className="mt-4 flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 shrink-0">
            <span className="text-xs text-[#3a3a3a] font-semibold tracking-widest uppercase select-none">Proyectos</span>
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
                draggingTask={!!draggingId}
                onDropTask={() => moveToProject(draggingId!, p.id, p.nombre)}
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
                draggingTask={!!draggingId}
                onDropTask={(id, nombre) => moveToProject(draggingId!, id, nombre)}
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

          {/* Sidebar toggle — desktop only */}
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex w-6 h-6 items-center justify-center rounded text-[#2a2a2a] hover:text-[#777] hover:bg-[#111] transition-all shrink-0"
            title={sidebarOpen ? "Ocultar sidebar" : "Mostrar sidebar"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <h1 className="text-base font-semibold text-white tracking-tight shrink-0">{vistaLabel}</h1>

          {/* Search */}
          <div className="relative flex-1 max-w-xs mx-2">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#444] pointer-events-none" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar tarea…"
              className="w-full pl-7 pr-7 py-1 bg-[#111] border border-[#1a1a1a] rounded-lg text-xs text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/40 transition-colors"
            />
            {busqueda && (
              <button onClick={() => setBusqueda("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#444] hover:text-white transition-colors">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>

          {/* Vista button + panel (all string views) */}
          {typeof vista === "string" && (
            <div className="ml-auto relative" ref={vistaPanelRef}>
              <button
                onClick={() => setShowVistaPanel(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                  showVistaPanel || hasActiveVistaOpts
                    ? "bg-[#B3985B]/12 text-[#B3985B] border border-[#B3985B]/30"
                    : "bg-[#111] text-[#555] hover:bg-[#1a1a1a] hover:text-white"
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
                </svg>
                Vista
                {hasActiveVistaOpts && <span className="w-1.5 h-1.5 rounded-full bg-[#B3985B] shrink-0" />}
              </button>

              {showVistaPanel && (
                <div className="absolute right-0 top-9 z-50 w-64 bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#161616]">
                    <p className="text-[11px] text-[#555] uppercase tracking-widest font-semibold">Opciones de vista</p>
                  </div>

                  {/* Mostrar completadas */}
                  <div className="px-4 py-3 border-b border-[#161616]">
                    <button
                      onClick={() => setVistaOpts(o => ({ ...o, showCompleted: !o.showCompleted }))}
                      className="w-full flex items-center justify-between"
                    >
                      <span className="text-sm text-[#ccc]">Mostrar completadas</span>
                      <span className={`w-8 h-4 rounded-full transition-colors relative ${vistaOpts.showCompleted ? "bg-[#B3985B]" : "bg-[#2a2a2a]"}`}>
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${vistaOpts.showCompleted ? "left-4" : "left-0.5"}`} />
                      </span>
                    </button>
                  </div>

                  {/* Ordenar por */}
                  <div className="px-4 py-3 border-b border-[#161616]">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold mb-2">Ordenar por</p>
                    <div className="grid grid-cols-2 gap-1">
                      {([["none","Sin orden"],["prioridad","Prioridad"],["fecha","Fecha"],["nombre","Nombre"]] as const).map(([val, label]) => (
                        <button key={val} onClick={() => setVistaOpts(o => ({ ...o, sortBy: val }))}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium text-left transition-all ${vistaOpts.sortBy === val ? "bg-[#B3985B]/15 text-[#B3985B] border border-[#B3985B]/30" : "bg-[#141414] text-[#555] hover:text-[#aaa] border border-transparent"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Agrupar por */}
                  <div className="px-4 py-3 border-b border-[#161616]">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold mb-2">Agrupar por</p>
                    <div className="grid grid-cols-2 gap-1">
                      {([["none","Ninguno"],["proyecto","Proyecto"],["prioridad","Prioridad"],["area","Área"],["fecha","Fecha"]] as const).map(([val, label]) => (
                        <button key={val} onClick={() => setVistaOpts(o => ({ ...o, groupBy: val }))}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium text-left transition-all ${vistaOpts.groupBy === val ? "bg-[#B3985B]/15 text-[#B3985B] border border-[#B3985B]/30" : "bg-[#141414] text-[#555] hover:text-[#aaa] border border-transparent"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filtrar por prioridad */}
                  <div className="px-4 py-3">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold mb-2">Filtrar por prioridad</p>
                    <div className="flex gap-1 flex-wrap">
                      {([["URGENTE","Urgente","#f87171"],["ALTA","Alta","#fb923c"],["MEDIA","Media","#B3985B"],["BAJA","Baja","#4b5563"]] as const).map(([key, label, color]) => {
                        const active = vistaOpts.filterPrio.includes(key);
                        return (
                          <button key={key}
                            onClick={() => setVistaOpts(o => ({ ...o, filterPrio: active ? o.filterPrio.filter(p => p !== key) : [...o.filterPrio, key] }))}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all border"
                            style={{ borderColor: active ? color + "60" : "#1e1e1e", backgroundColor: active ? color + "18" : "transparent", color: active ? color : "#555" }}
                          >
                            <svg width="9" height="9" viewBox="0 0 24 24" fill={active ? color : "none"} stroke={color} strokeWidth="2">
                              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                            </svg>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reset */}
                  {hasActiveVistaOpts && (
                    <div className="px-4 pb-3">
                      <button onClick={() => setVistaOpts(VISTA_DEFAULT)}
                        className="w-full text-center text-xs text-[#444] hover:text-red-400 transition-colors py-1.5 border-t border-[#161616] mt-1 pt-3">
                        Restablecer opciones
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* View options (project view) */}
          {typeof vista !== "string" && proyectoDetalle && (
            <div className="ml-auto flex items-center gap-2">

              {/* User filter avatars */}
              {usuarios.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setFilterUserProy(null)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition-all border ${
                      !filterUserProy
                        ? "bg-[#B3985B]/15 text-[#B3985B] border-[#B3985B]/30"
                        : "bg-transparent text-[#555] border-transparent hover:text-white"
                    }`}
                  >
                    Todos
                  </button>
                  {usuarios.map(u => {
                    const initials = u.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                    const isActive = filterUserProy === u.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => setFilterUserProy(isActive ? null : u.id)}
                        title={u.name}
                        className={`w-7 h-7 rounded-full text-[10px] font-bold transition-all flex items-center justify-center shrink-0 ${
                          isActive
                            ? "ring-2 ring-[#B3985B] bg-[#B3985B]/20 text-[#B3985B]"
                            : "bg-[#1a1a1a] text-[#555] hover:text-white hover:bg-[#222]"
                        }`}
                      >
                        {initials}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="relative" ref={viewPanelRef}>
              <button
                onClick={() => setShowViewPanel(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                  showViewPanel || hasActiveProyOpts
                    ? "bg-[#B3985B]/12 text-[#B3985B] border border-[#B3985B]/30"
                    : "bg-[#111] text-[#555] hover:bg-[#1a1a1a] hover:text-white"
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
                </svg>
                Vista
                {hasActiveProyOpts && <span className="w-1.5 h-1.5 rounded-full bg-[#B3985B] shrink-0" />}
              </button>

              {showViewPanel && (
                <div className="absolute right-0 top-9 z-50 w-64 bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#161616]">
                    <p className="text-[11px] text-[#555] uppercase tracking-widest font-semibold">Opciones de vista</p>
                  </div>

                  {/* Mostrar completadas */}
                  <div className="px-4 py-3 border-b border-[#161616]">
                    <button
                      onClick={() => setProyViewOpts(o => ({ ...o, showCompleted: !o.showCompleted }))}
                      className="w-full flex items-center justify-between"
                    >
                      <span className="text-sm text-[#ccc]">Mostrar completadas</span>
                      <span className={`w-8 h-4 rounded-full transition-colors relative ${proyViewOpts.showCompleted ? "bg-[#B3985B]" : "bg-[#2a2a2a]"}`}>
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${proyViewOpts.showCompleted ? "left-4" : "left-0.5"}`} />
                      </span>
                    </button>
                  </div>

                  {/* Ordenar por */}
                  <div className="px-4 py-3 border-b border-[#161616]">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold mb-2">Ordenar por</p>
                    <div className="grid grid-cols-2 gap-1">
                      {([["none","Sin orden"],["prioridad","Prioridad"],["fecha","Fecha"],["nombre","Nombre"]] as const).map(([val, label]) => (
                        <button key={val} onClick={() => setProyViewOpts(o => ({ ...o, sortBy: val }))}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium text-left transition-all ${proyViewOpts.sortBy === val ? "bg-[#B3985B]/15 text-[#B3985B] border border-[#B3985B]/30" : "bg-[#141414] text-[#555] hover:text-[#aaa] border border-transparent"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Agrupar por */}
                  <div className="px-4 py-3 border-b border-[#161616]">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold mb-2">Agrupar por</p>
                    <div className="flex gap-1">
                      {([["none","Ninguno"],["prioridad","Prioridad"],["area","Área"]] as const).map(([val, label]) => (
                        <button key={val} onClick={() => setProyViewOpts(o => ({ ...o, groupBy: val }))}
                          className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${proyViewOpts.groupBy === val ? "bg-[#B3985B]/15 text-[#B3985B] border border-[#B3985B]/30" : "bg-[#141414] text-[#555] hover:text-[#aaa] border border-transparent"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filtrar por prioridad */}
                  <div className="px-4 py-3">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold mb-2">Filtrar por prioridad</p>
                    <div className="flex gap-1 flex-wrap">
                      {([["URGENTE","Urgente","#f87171"],["ALTA","Alta","#fb923c"],["MEDIA","Media","#B3985B"],["BAJA","Baja","#4b5563"]] as const).map(([key, label, color]) => {
                        const active = proyViewOpts.filterPrio.includes(key);
                        return (
                          <button key={key}
                            onClick={() => setProyViewOpts(o => ({ ...o, filterPrio: active ? o.filterPrio.filter(p => p !== key) : [...o.filterPrio, key] }))}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all border"
                            style={{ borderColor: active ? color + "60" : "#1e1e1e", backgroundColor: active ? color + "18" : "transparent", color: active ? color : "#555" }}
                          >
                            <svg width="9" height="9" viewBox="0 0 24 24" fill={active ? color : "none"} stroke={color} strokeWidth="2">
                              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                            </svg>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reset */}
                  {hasActiveProyOpts && (
                    <div className="px-4 pb-3">
                      <button onClick={() => { setProyViewOpts(PROY_VIEW_DEFAULT); setFilterUserProy(null); }}
                        className="w-full text-center text-xs text-[#444] hover:text-red-400 transition-colors py-1.5 border-t border-[#161616] mt-1 pt-3">
                        Restablecer opciones
                      </button>
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>
          )}
        </div>

        {/* ── TASK LIST ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto pb-[72px] lg:pb-0">
          {loadingMain ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 border border-[#222] border-t-[#B3985B] rounded-full animate-spin" />
            </div>

          ) : vista === "proyectos-evento" ? (
            <ProyectosEventoView
              proyectos={proyectosEvento}
              onSelectTarea={setSelectedId}
              selectedId={selectedId}
              onCompleteTarea={async (id) => {
                setProyectosEvento(prev => prev.map(p => ({
                  ...p,
                  tareas: p.tareas.map(t => t.id === id ? { ...t, estado: "COMPLETADA" } : t),
                })));
                const res = await fetch(`/api/tareas/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ estado: "COMPLETADA" }),
                });
                if (!res.ok) {
                  const d = await res.json().catch(() => ({}));
                  toast.error(d.error ?? "Error al guardar");
                }
              }}
              onRefresh={() => {
                setLoadingMain(true);
                fetch("/api/tareas/por-proyecto")
                  .then(r => r.json())
                  .then(d => { setProyectosEvento(d.proyectos ?? []); setLoadingMain(false); });
              }}
            />

          ) : vista === "equipo" ? (
            <div className="max-w-2xl mx-auto px-2 py-4 pb-24">
              {equipoGroups.length === 0 ? (
                <EmptyState icon="👥" title="Sin tareas de equipo" sub="No hay tareas personales asignadas a ningún usuario" />
              ) : equipoGroups.map(group => (
                <div key={group.nombre} className="mb-6">
                  <div className="flex items-center gap-2 px-3 py-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-[#B3985B]/20 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-[#B3985B]">
                        {group.nombre.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs text-[#aaa] font-semibold">{group.nombre}</span>
                    <span className="text-[11px] text-[#333] font-medium">{group.tareas.length}</span>
                  </div>
                  {group.tareas.map(t => (
                    <TaskItem key={t.id} tarea={t} isSelected={selectedId === t.id}
                      onComplete={completeTarea} onSelect={setSelectedId} onDelete={setConfirmDeleteId}
                      onDateChange={(id, field, val) => saveTarea(id, { [field]: val || null })}
                      onPriorityChange={(id, p) => saveTarea(id, { prioridad: p })}
                      onAssign={(id, userId) => saveTarea(id, { asignadoAId: userId })}
                      onProjectChange={(id, proyectoId) => saveTarea(id, { proyectoTareaId: proyectoId })}
                      projects={proyectosNav}
                      users={usuarios}
                      showProject
                    />
                  ))}
                </div>
              ))}
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
                        onComplete={completeTarea} onSelect={setSelectedId} onDelete={setConfirmDeleteId}
                        onDateChange={(id, field, val) => saveTarea(id, { [field]: val || null })}
                        onPriorityChange={(id, p) => saveTarea(id, { prioridad: p })}
                        onAssign={(id, userId) => saveTarea(id, { asignadoAId: userId })}
                        onProjectChange={(id, proyectoId) => saveTarea(id, { proyectoTareaId: proyectoId })}
                        projects={proyectosNav}
                        users={usuarios}
                        showProject draggable
                        isBeingDragged={draggingId === t.id}
                        onDragStart={setDraggingId} onDragEnd={() => setDraggingId(null)}
                        onDrop={targetId => { if (draggingId && draggingId !== targetId) moveToSubtask(draggingId, targetId); }}
                        multiSelected={selectedIds.has(t.id)} onMultiSelect={toggleMultiSelect}
                        onExtractChild={handleExtractChild}
                      />
                    ))}
                  </div>
                ))
              ) : (
                tareasOrdenadas.map(t => (
                  <TaskItem key={t.id} tarea={t} isSelected={selectedId === t.id}
                    onComplete={completeTarea} onSelect={setSelectedId} onDelete={setConfirmDeleteId}
                    onDateChange={(id, field, val) => saveTarea(id, { [field]: val || null })}
                    onPriorityChange={(id, p) => saveTarea(id, { prioridad: p })}
                    onAssign={(id, userId) => saveTarea(id, { asignadoAId: userId })}
                    onProjectChange={(id, proyectoId) => saveTarea(id, { proyectoTareaId: proyectoId })}
                    projects={proyectosNav}
                    users={usuarios}
                    showProject draggable
                    isBeingDragged={draggingId === t.id}
                    onDragStart={setDraggingId} onDragEnd={() => setDraggingId(null)}
                    onDrop={targetId => { if (draggingId && draggingId !== targetId) moveToSubtask(draggingId, targetId); }}
                    multiSelected={selectedIds.has(t.id)} onMultiSelect={toggleMultiSelect}
                  />
                ))
              )}
            </div>

          ) : (
            <div className="max-w-2xl mx-auto px-2 py-4 pb-24">
              {proyectoDetalle && (
                <>
                  {/* ── Agregar tarea (siempre arriba) ── */}
                  <QuickAdd
                    proyectoTareaId={proyectoDetalle.id} onAdd={addTarea}
                    placeholder="Agregar tarea…" proyectos={proyectosNav} usuarios={usuarios}
                  />

                  {/* ── Agregar sección (solo aquí) ── */}
                  <div className="mb-4">
                    {showNuevaSeccion ? (
                      <div className="px-3 py-3 border border-dashed border-[#2a2a2a] rounded-xl space-y-2 bg-[#0a0a0a]">
                        <input autoFocus value={nuevaSeccionNombre}
                          onChange={e => setNuevaSeccionNombre(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") addSeccion(); if (e.key === "Escape") setShowNuevaSeccion(false); }}
                          placeholder="Nombre de la sección…"
                          className="w-full bg-transparent text-sm text-white placeholder-[#333] focus:outline-none" />
                        <div className="flex gap-3">
                          <button onClick={addSeccion} className="text-xs text-[#B3985B] hover:underline font-medium">Crear</button>
                          <button onClick={() => setShowNuevaSeccion(false)} className="text-xs text-[#444] hover:text-white">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowNuevaSeccion(true)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#222] text-[#444] hover:border-[#B3985B]/40 hover:text-[#B3985B]/70 transition-all text-xs font-medium">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Agregar sección
                      </button>
                    )}
                  </div>

                  {/* ── Tareas sin sección ── */}
                  {groupProyTareas(applyProyFilter(proyectoDetalle.tareas)).map(group => (
                    <div key={group.label}>
                      {group.label && (
                        <div className="flex items-center gap-2 px-3 py-2 mt-3 mb-1">
                          {group.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: group.color }} />}
                          <span className="text-xs font-semibold text-[#555] uppercase tracking-widest">{group.label}</span>
                          <span className="text-[11px] text-[#333]">{group.items.length}</span>
                        </div>
                      )}
                      {group.items.map(t => (
                        <TaskItem key={t.id} tarea={t} isSelected={selectedId === t.id}
                          onComplete={completeTarea} onSelect={setSelectedId} onDelete={setConfirmDeleteId}
                          onDateChange={(id, field, val) => saveTarea(id, { [field]: val || null })}
                          onPriorityChange={(id, p) => saveTarea(id, { prioridad: p })}
                          onAssign={(id, userId) => saveTarea(id, { asignadoAId: userId })}
                          onProjectChange={(id, proyectoId) => saveTarea(id, { proyectoTareaId: proyectoId })}
                          projects={proyectosNav}
                          users={usuarios}
                          draggable
                          isBeingDragged={draggingId === t.id}
                          onDragStart={setDraggingId} onDragEnd={() => setDraggingId(null)}
                          onDrop={targetId => { if (draggingId && draggingId !== targetId) moveToSubtask(draggingId, targetId); }}
                          multiSelected={selectedIds.has(t.id)} onMultiSelect={toggleMultiSelect}
                          onExtractChild={handleExtractChild}
                        />
                      ))}
                    </div>
                  ))}

                  {/* ── Secciones ── */}
                  {proyectoDetalle.secciones.map(seccion => (
                    <SectionBlock
                      key={seccion.id} seccion={seccion} proyectoId={proyectoDetalle.id}
                      selectedId={selectedId}
                      onComplete={completeTarea} onSelect={setSelectedId} onDelete={setConfirmDeleteId}
                      onAddTarea={addTarea} draggingId={draggingId}
                      onDragStart={setDraggingId} onDragEnd={() => setDraggingId(null)}
                      onDrop={targetId => { if (draggingId && draggingId !== targetId) moveToSubtask(draggingId, targetId); }}
                      onDropSection={() => { if (draggingId) moveToSection(draggingId, seccion.id); }}
                      onMoveToNoSection={moveToNoSection}
                      onPriorityChange={(id, p) => saveTarea(id, { prioridad: p })}
                      onAssign={(id, userId) => saveTarea(id, { asignadoAId: userId })}
                      onProjectChange={(id, proyectoId) => saveTarea(id, { proyectoTareaId: proyectoId })}
                      users={usuarios}
                      projects={proyectosNav}
                      viewFilter={applyProyFilter}
                      selectedIds={selectedIds} onMultiSelect={toggleMultiSelect}
                      onExtractChild={handleExtractChild}
                      onToggleCollapse={async (id, colapsada) => {
                        const res = await fetch(`/api/operaciones/secciones/${id}`, {
                          method: "PATCH", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ colapsada }),
                        });
                        if (!res.ok) {
                          const d = await res.json().catch(() => ({}));
                          toast.error(d.error ?? "Error al guardar");
                          return;
                        }
                        setProyectoDetalle(prev => prev ? {
                          ...prev, secciones: prev.secciones.map(s => s.id === id ? { ...s, colapsada } : s),
                        } : null);
                      }}
                      onDeleteSection={async (id) => {
                        const res = await fetch(`/api/operaciones/secciones/${id}`, { method: "DELETE" });
                        if (!res.ok) {
                          const d = await res.json().catch(() => ({}));
                          toast.error(d.error ?? "Error al eliminar");
                          return;
                        }
                        setProyectoDetalle(prev => prev ? {
                          ...prev, secciones: prev.secciones.filter(s => s.id !== id),
                        } : null);
                      }}
                    />
                  ))}
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
          onComplete={completeTarea} onDelete={setConfirmDeleteId}
          onAddSubtarea={addSubtarea} onCompleteSubtarea={completeTarea} onDeleteSubtarea={setConfirmDeleteId}
        />
      )}

      {/* ── CONFIRM DELETE MODAL ────────────────────────────────────────────── */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="bg-[#111] border border-[#222] rounded-2xl p-6 shadow-2xl w-full max-w-sm mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-950/50 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">¿Eliminar esta tarea?</p>
                <p className="text-xs text-[#555] mt-1 leading-relaxed">
                  Esta acción no se puede deshacer. La tarea y sus subtareas serán eliminadas permanentemente.
                </p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm text-[#777] hover:text-white border border-[#2a2a2a] hover:border-[#444] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => { deleteTarea(confirmDeleteId); setConfirmDeleteId(null); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600/90 hover:bg-red-500 transition-all"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MULTI-SELECT TOOLBAR ────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] hidden md:flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-2 py-1.5 shadow-2xl shadow-black/70 select-none">
          <button onClick={clearMultiSelect}
            className="w-7 h-7 flex items-center justify-center text-[#555] hover:text-white transition-colors rounded-lg hover:bg-[#2a2a2a]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <span className="text-xs text-[#666] font-medium px-2 border-r border-[#2a2a2a] mr-1">
            {selectedIds.size} {selectedIds.size === 1 ? "tarea" : "tareas"}
          </span>
          <button onClick={bulkComplete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white hover:bg-[#2a2a2a] transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            Completar
          </button>
          <button onClick={() => setConfirmBulk(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-red-400 hover:bg-red-950/30 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            </svg>
            Eliminar
          </button>
        </div>
      )}

      {/* ── CONFIRM BULK DELETE ──────────────────────────────────────────────── */}
      {confirmBulk && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setConfirmBulk(false)}>
          <div className="bg-[#111] border border-[#222] rounded-2xl p-6 shadow-2xl w-full max-w-sm mx-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-950/50 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">¿Eliminar {selectedIds.size} {selectedIds.size === 1 ? "tarea" : "tareas"}?</p>
                <p className="text-xs text-[#555] mt-1 leading-relaxed">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirmBulk(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-[#777] hover:text-white border border-[#2a2a2a] hover:border-[#444] transition-all">
                Cancelar
              </button>
              <button onClick={bulkDelete}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600/90 hover:bg-red-500 transition-all">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── UNDO TOAST ──────────────────────────────────────────────────────── */}
      <UndoToast undo={undoState} onUndo={handleUndo} onDismiss={handleDismissUndo} />
      {CelebrationToastEl}

      {/* Add-task toast */}
      {addToast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] pointer-events-none transition-all duration-300 ${
          addToast.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
        }`}>
          <div className="flex items-center gap-2.5 bg-[#141414] border border-[#2a2a2a] rounded-full px-4 py-2 shadow-2xl shadow-black/60 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B3985B] shrink-0" />
            <span className="text-sm text-white/80">{addToast.msg}</span>
          </div>
        </div>
      )}

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
        className="lg:hidden fixed right-5 z-40 w-14 h-14 rounded-full bg-[#B3985B] flex items-center justify-center shadow-[0_4px_24px_rgba(179,152,91,0.45)] active:scale-95 transition-transform"
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
        className="lg:hidden fixed z-30 left-3 right-3 bg-[#0d0d0d] border border-[#222] rounded-2xl flex items-stretch overflow-hidden shadow-2xl"
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
          <div className="fixed inset-0 z-[35] bg-black/60 lg:hidden" onClick={() => setMobileProyectos(false)} />
          <div className="lg:hidden fixed inset-x-0 bottom-[56px] z-[36] bg-[#0d0d0d] border-t border-[#1e1e1e] rounded-t-2xl max-h-[70vh] overflow-y-auto"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex justify-center pt-2.5 pb-2">
              <div className="w-8 h-1 rounded-full bg-[#2a2a2a]" />
            </div>
            <div className="flex items-center justify-between px-4 pb-3">
              <h2 className="text-white font-semibold text-base">Explorar</h2>
              <button
                onClick={() => { setShowNuevoProyecto(true); setMobileProyectos(false); setTimeout(() => proyectoInputRef.current?.focus(), 80); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#B3985B]/10 text-[#B3985B] hover:bg-[#B3985B]/20 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>

            {/* Search input */}
            <div className="px-4 pb-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar tarea por nombre…"
                  className="w-full pl-9 pr-8 py-2 bg-[#111] border border-[#1e1e1e] rounded-xl text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/40 transition-colors"
                />
                {busqueda && (
                  <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            </div>

            {/* Results: tasks when searching, projects when not */}
            <div className="pb-4">
              {busqueda.trim() ? (() => {
                const q = busqueda.toLowerCase().trim();
                const resultados = tareas.filter(t =>
                  t.titulo.toLowerCase().includes(q) && t.estado !== "COMPLETADA" && t.estado !== "CANCELADA"
                );
                if (resultados.length === 0) return (
                  <p className="text-center text-[#444] text-sm py-8">Sin resultados para &ldquo;{busqueda}&rdquo;</p>
                );
                return resultados.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedId(t.id); setMobileProyectos(false); setBusqueda(""); }}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#111] transition-colors border-b border-[#0d0d0d] last:border-0"
                  >
                    <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${t.prioridad === "URGENTE" ? "bg-red-500" : t.prioridad === "ALTA" ? "bg-orange-400" : t.prioridad === "MEDIA" ? "bg-yellow-400" : "bg-[#444]"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">{t.titulo}</p>
                      <p className="text-[#555] text-xs mt-0.5">
                        {t.proyectoTarea?.nombre ?? "Bandeja"} · {t.area}
                        {t.fecha && <> · {new Date(t.fecha + "T00:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}</>}
                      </p>
                    </div>
                  </button>
                ));
              })() : (
                <>
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
                        <span className="text-[12px] text-[#555] font-semibold tracking-wide">{c.nombre}</span>
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
                </>
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
                <Combobox
                  value={nuevoProyectoCarpeta}
                  onChange={v => setNuevoProyectoCarpeta(v)}
                  options={[{ value: "", label: "— Sin carpeta —" }, ...carpetas.map(c => ({ value: c.id, label: c.nombre }))]}
                  className="w-full bg-[#111] border border-[#1e1e1e] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#B3985B]"
                />
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

// ── ProyectosEventoView ──────────────────────────────────────────────────────

const PRIO_DOT: Record<string, string> = {
  URGENTE: "bg-red-500",
  ALTA:    "bg-orange-500",
  MEDIA:   "bg-[#B3985B]",
  BAJA:    "bg-[#444]",
};
const ESTADO_ICON: Record<string, string> = {
  PENDIENTE:   "○",
  EN_PROGRESO: "◑",
  COMPLETADA:  "●",
};
const TIPO_EVENTO_COLOR: Record<string, string> = {
  MUSICAL:      "bg-purple-950/40 text-purple-400",
  SOCIAL:       "bg-pink-950/40 text-pink-400",
  EMPRESARIAL:  "bg-blue-950/40 text-blue-400",
  OTRO:         "bg-gray-800 text-gray-400",
};

interface ProyectosEventoViewProps {
  proyectos: ProyectoEventoConTareas[];
  selectedId: string | null;
  onSelectTarea: (id: string) => void;
  onCompleteTarea: (id: string) => void;
  onRefresh: () => void;
}

function ProyectosEventoView({ proyectos, selectedId, onSelectTarea, onCompleteTarea, onRefresh }: ProyectosEventoViewProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleCollapse(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (proyectos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span className="text-4xl mb-4 opacity-60">📋</span>
        <p className="text-sm font-medium text-[#444]">Sin proyectos con tareas</p>
        <p className="text-xs text-[#333] mt-1">Agrega tareas a tus proyectos desde el módulo de Proyectos</p>
        <Link href="/proyectos" className="mt-4 text-xs text-[#B3985B] hover:underline">
          Ir a Proyectos →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
      {/* Header info */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#444]">
          {proyectos.length} proyecto{proyectos.length !== 1 ? "s" : ""} con tareas activas
        </p>
        <button onClick={onRefresh} className="text-xs text-[#333] hover:text-[#B3985B] transition-colors flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Actualizar
        </button>
      </div>

      {proyectos.map(proyecto => {
        const isCollapsed = collapsed.has(proyecto.id);
        const total       = proyecto.tareas.length;
        const completadas = proyecto.tareas.filter(t => t.estado === "COMPLETADA").length;
        const pct         = total > 0 ? Math.round((completadas / total) * 100) : 0;
        const activas     = proyecto.tareas.filter(t => t.estado !== "COMPLETADA" && t.estado !== "CANCELADA");
        const hoyStr   = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
        const diffDias = Math.round((new Date(proyecto.fechaEvento.substring(0, 10)).getTime() - new Date(hoyStr).getTime()) / 86400000);
        const tipoColor   = TIPO_EVENTO_COLOR[proyecto.tipoEvento?.toUpperCase()] ?? TIPO_EVENTO_COLOR.OTRO;

        return (
          <div key={proyecto.id} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl overflow-hidden">
            {/* Sección header — nombre del proyecto */}
            <button
              onClick={() => toggleCollapse(proyecto.id)}
              className="w-full flex items-start gap-3 px-5 py-4 hover:bg-[#111] transition-colors text-left group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tipoColor}`}>
                    {proyecto.tipoEvento}
                  </span>
                  {diffDias <= 7 && diffDias >= 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      diffDias === 0 ? "bg-red-950/50 text-red-400" :
                      diffDias <= 2 ? "bg-orange-950/40 text-orange-400" :
                      "bg-yellow-950/30 text-yellow-500"
                    }`}>
                      {diffDias === 0 ? "¡Hoy!" : diffDias === 1 ? "Mañana" : `En ${diffDias}d`}
                    </span>
                  )}
                  {diffDias < 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-900 text-gray-600">
                      Hace {Math.abs(diffDias)}d
                    </span>
                  )}
                </div>
                <h3 className="text-white font-semibold text-sm mt-1.5 group-hover:text-[#B3985B] transition-colors">
                  {proyecto.nombre}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-[#555]">
                    📅 {new Date(proyecto.fechaEvento.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                  {proyecto.lugarEvento && (
                    <span className="text-xs text-[#444] truncate max-w-[180px]">📍 {proyecto.lugarEvento}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {/* Progress */}
                <div className="text-right">
                  <p className={`text-xs font-semibold ${pct === 100 ? "text-green-400" : "text-[#B3985B]"}`}>{pct}%</p>
                  <p className="text-[10px] text-[#444]">{completadas}/{total}</p>
                </div>
                {/* Chevron */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round"
                  className={`transition-transform duration-200 ${isCollapsed ? "rotate-0" : "rotate-180"}`}>
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
              </div>
            </button>

            {/* Progress bar */}
            {!isCollapsed && total > 0 && (
              <div className="px-5 pb-1">
                <div className="w-full h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-green-500" : "bg-[#B3985B]"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Tareas list */}
            {!isCollapsed && (
              <div className="px-3 pb-3 space-y-1 mt-1">
                {activas.length === 0 && completadas === total && total > 0 ? (
                  <div className="text-center py-4">
                    <span className="text-green-400 text-sm">✓ Todas las tareas completadas</span>
                  </div>
                ) : activas.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-[#444]">Sin tareas activas</p>
                  </div>
                ) : (
                  activas.map(t => {
                    const dot  = PRIO_DOT[t.prioridad] ?? PRIO_DOT.MEDIA;
                    const icon = ESTADO_ICON[t.estado]  ?? "○";
                    const isSelected = selectedId === t.id;
                    return (
                      <div
                        key={t.id}
                        className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? "bg-[#1a1a1a] border border-[#B3985B]/30"
                            : "hover:bg-[#111] border border-transparent"
                        }`}
                        onClick={() => onSelectTarea(t.id)}
                      >
                        {/* Complete button */}
                        <button
                          onClick={e => { e.stopPropagation(); onCompleteTarea(t.id); }}
                          title="Marcar como completada"
                          className="mt-0.5 w-4 h-4 rounded-full border border-[#2a2a2a] hover:border-green-500 flex items-center justify-center text-[8px] text-transparent hover:text-green-400 transition-all flex-shrink-0"
                        >
                          ✓
                        </button>
                        {/* Priority dot */}
                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white leading-snug">{t.titulo}</p>
                          <div className="flex items-center flex-wrap gap-2 mt-1">
                            <span className="text-[10px] text-[#555]">
                              {icon} {t.estado === "EN_PROGRESO" ? "En progreso" : "Pendiente"}
                            </span>
                            {t.fecha && (() => {
                              const hoyTarea = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
                              const diff = Math.round((new Date(t.fecha.substring(0, 10)).getTime() - new Date(hoyTarea).getTime()) / 86400000);
                              return (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                  diff < 0  ? "bg-red-950/30 text-red-400" :
                                  diff === 0 ? "bg-emerald-950/30 text-emerald-400" :
                                  "bg-[#111] text-[#555]"
                                }`}>
                                  📅 {diff < 0 ? `Venció hace ${Math.abs(diff)}d` : diff === 0 ? "Hoy" : new Date(t.fecha.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", { timeZone: "UTC", day: "2-digit", month: "short" })}
                                </span>
                              );
                            })()}
                            {(t as { asignadoA?: { name: string } | null }).asignadoA && (
                              <span className="text-[10px] text-[#444]">
                                👤 {(t as { asignadoA?: { name: string } | null }).asignadoA!.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {/* Footer: link to project */}
                <div className="pt-1 px-1">
                  <Link
                    href={`/proyectos/${proyecto.id}?tab=tareas`}
                    onClick={e => e.stopPropagation()}
                    className="text-[11px] text-[#333] hover:text-[#B3985B] transition-colors flex items-center gap-1"
                  >
                    Ver todas las tareas en el proyecto
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </Link>
                </div>
              </div>
            )}
          </div>
        );
      })}
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

function NavProyecto({ proyecto, isActive, indent = 2, onSelect, onRename, onDelete, draggingTask = false, onDropTask }: {
  proyecto: ProyectoNav;
  isActive: boolean;
  indent?: number;
  onSelect: () => void;
  onRename: (nombre: string) => Promise<void>;
  onDelete: () => Promise<void>;
  draggingTask?: boolean;
  onDropTask?: () => void;
}) {
  const [hov,      setHov]     = useState(false);
  const [taskOver, setTaskOver] = useState(false);
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
    <div className="relative group/proy"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onDragOver={e => { if (!draggingTask) return; e.preventDefault(); setTaskOver(true); }}
      onDragLeave={() => setTaskOver(false)}
      onDrop={e => { e.preventDefault(); setTaskOver(false); onDropTask?.(); }}
    >
      <button onClick={onSelect}
        className={`w-full flex items-center gap-2.5 py-2 rounded-xl text-sm font-medium transition-all ${
          taskOver
            ? "bg-[#B3985B]/15 text-[#B3985B] ring-1 ring-[#B3985B]/40 scale-[1.01]"
            : isActive ? "bg-[#1a1a1a] text-white" : "text-[#444] hover:text-[#bbb] hover:bg-[#0d0d0d]"
        }`} style={{ paddingLeft: `${indent * 4}px`, paddingRight: hov && !taskOver ? "56px" : "12px" }}>
        <span className={`w-2 h-2 rounded-full shrink-0 ring-1 ring-white/10 ${isActive ? "ring-white/20" : ""}`}
          style={{ backgroundColor: proyecto.color ?? "#555" }} />
        <span className="truncate">{proyecto.nombre}</span>
        {taskOver && (
          <span className="ml-auto text-[10px] font-medium opacity-70 shrink-0">← soltar</span>
        )}
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

function NavCarpeta({ carpeta, open, vistaKey, onToggle, onSelectProyecto, onRenameCarpeta, onDeleteCarpeta, onRenameProyecto, onDeleteProyecto, draggingTask = false, onDropTask }: {
  carpeta: Carpeta;
  open: boolean;
  vistaKey: string;
  onToggle: () => void;
  onSelectProyecto: (id: string) => void;
  onRenameCarpeta: (id: string, nombre: string) => Promise<void>;
  onDeleteCarpeta: (id: string) => Promise<void>;
  onRenameProyecto: (id: string, nombre: string) => Promise<void>;
  onDeleteProyecto: (id: string) => Promise<void>;
  draggingTask?: boolean;
  onDropTask?: (id: string, nombre: string) => void;
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
    <div className="mt-3">
      <div className="relative" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
        {editing ? (
          <div className="flex items-center gap-1.5 px-3 py-1">
            <input autoFocus value={nombre} onChange={e => setNombre(e.target.value)}
              onBlur={save} onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setNombre(carpeta.nombre); setEditing(false); } }}
              className="flex-1 bg-[#1a1a1a] border border-[#B3985B]/40 rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none" />
          </div>
        ) : (
          <button onClick={onToggle}
            className="w-full flex items-center gap-1.5 px-3 py-1 group/folder transition-all"
            style={{ paddingRight: hov ? "52px" : "12px" }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              className="shrink-0 text-[#7a6535] group-hover/folder:text-[#B3985B] transition-all"
              style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <span className={`truncate text-[10px] font-semibold tracking-[0.12em] uppercase transition-colors ${open ? "text-[#B3985B]" : "text-[#7a6535] group-hover/folder:text-[#B3985B]"}`}>
              {carpeta.nombre}
            </span>
          </button>
        )}
        {hov && !editing && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <button onClick={e => { e.stopPropagation(); setEditing(true); }}
              className="w-5 h-5 flex items-center justify-center rounded text-[#2a2a2a] hover:text-[#B3985B] hover:bg-[#1a1a1a] transition-all">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button onClick={e => { e.stopPropagation(); onDeleteCarpeta(carpeta.id); }}
              className="w-5 h-5 flex items-center justify-center rounded text-[#2a2a2a] hover:text-red-400 hover:bg-red-950/20 transition-all">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        )}
      </div>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {carpeta.proyectos.map(p => (
            <NavProyecto key={p.id} proyecto={p} isActive={vistaKey === p.id} indent={5}
              onSelect={() => onSelectProyecto(p.id)}
              onRename={nombre => onRenameProyecto(p.id, nombre)}
              onDelete={() => onDeleteProyecto(p.id)}
              draggingTask={draggingTask}
              onDropTask={() => onDropTask?.(p.id, p.nombre)}
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
  draggingId, onDragStart, onDragEnd, onDrop, onDropSection,
  onPriorityChange, onAssign, onProjectChange, users, projects, viewFilter,
  selectedIds, onMultiSelect, onExtractChild, onMoveToNoSection,
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
  onDropSection?: () => void;
  onPriorityChange?:  (id: string, prioridad: string) => void;
  onAssign?:          (id: string, userId: string | null) => void;
  onProjectChange?:   (id: string, proyectoId: string | null) => void;
  users?:             { id: string; name: string }[];
  projects?:          { id: string; nombre: string; color: string | null }[];
  viewFilter?:        (tareas: TareaItem[]) => TareaItem[];
  selectedIds?:       Set<string>;
  onMultiSelect?:     (id: string) => void;
  onExtractChild?:    (tarea: TareaItem) => void;
  onMoveToNoSection?: (id: string) => void;
}) {
  const [hov,        setHov]        = useState(false);
  const [headerOver, setHeaderOver] = useState(false);
  const [bottomOver, setBottomOver] = useState(false);

  return (
    <div className="mt-5">
      {/* Section header — also a drop target */}
      <div
        className={`flex items-center gap-2 group cursor-pointer mb-1 px-2 py-1 rounded-lg transition-all ${
          headerOver ? "bg-[#B3985B]/10 ring-1 ring-[#B3985B]/40" : ""
        }`}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        onClick={() => onToggleCollapse(seccion.id, !seccion.colapsada)}
        onDragOver={e => { if (!draggingId) return; e.preventDefault(); e.stopPropagation(); setHeaderOver(true); }}
        onDragLeave={() => setHeaderOver(false)}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); setHeaderOver(false); onDropSection?.(); }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={headerOver ? "#B3985B" : "#444"} strokeWidth="2"
          style={{ transform: seccion.colapsada ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
        <span className={`text-xs font-semibold transition-colors ${headerOver ? "text-[#B3985B]" : "text-[#666] hover:text-white"}`}>
          {seccion.nombre}
          {headerOver && <span className="ml-2 text-[10px] font-normal opacity-70">← soltar aquí</span>}
        </span>
        {!headerOver && seccion.tareas.length > 0 && <span className="text-[11px] text-[#333]">({seccion.tareas.length})</span>}
        {hov && !headerOver && (
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
          {(viewFilter ? viewFilter(seccion.tareas) : seccion.tareas).map(t => (
            <TaskItem key={t.id} tarea={t} isSelected={selectedId === t.id}
              onComplete={onComplete} onSelect={onSelect} onDelete={onDelete}
              onDateChange={(id, field, val) => { fetch(`/api/tareas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: val || null }) }); }}
              onPriorityChange={onPriorityChange}
              onAssign={onAssign}
              onProjectChange={onProjectChange}
              users={users}
              projects={projects}
              draggable={!!draggingId || true}
              isBeingDragged={draggingId === t.id}
              onDragStart={onDragStart} onDragEnd={onDragEnd}
              onDrop={targetId => { if (draggingId && draggingId !== targetId) onDrop(targetId); }}
              multiSelected={selectedIds?.has(t.id)} onMultiSelect={onMultiSelect}
              onExtractChild={onExtractChild}
              onMoveToNoSection={onMoveToNoSection}
            />
          ))}
          {/* Bottom drop zone — visible only when dragging */}
          {draggingId && (
            <div
              className={`flex items-center justify-center h-9 rounded-xl border-2 border-dashed transition-all mb-1 ${
                bottomOver
                  ? "border-[#B3985B]/60 bg-[#B3985B]/[0.06] text-[#B3985B]"
                  : "border-[#1e1e1e] text-[#2a2a2a]"
              }`}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); setBottomOver(true); }}
              onDragLeave={() => setBottomOver(false)}
              onDrop={e => { e.preventDefault(); e.stopPropagation(); setBottomOver(false); onDropSection?.(); }}
            >
              <span className="text-[11px] font-medium select-none">
                {bottomOver ? `→ Mover a "${seccion.nombre}"` : `Soltar en ${seccion.nombre}`}
              </span>
            </div>
          )}
          <QuickAdd proyectoTareaId={proyectoId} seccionId={seccion.id} compact
            placeholder={`Tarea en ${seccion.nombre}…`} onAdd={onAddTarea} />
        </>
      )}
    </div>
  );
}
