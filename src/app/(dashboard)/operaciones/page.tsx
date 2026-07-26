"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import TaskItem, { type TareaItem } from "./components/TaskItem";
import TaskModal, { type TareaDetalle } from "./components/TaskModal";
import NuevaTareaModal from "./components/NuevaTareaModal";
import UndoToast, { type UndoState } from "./components/UndoToast";
import ProyectoAccesoPanel from "./components/ProyectoAccesoPanel";
import { VistaCapturaRapida } from "./components/VistaCapturaRapida";
import { VistaIdeas }        from "./components/VistaIdeas";
import { VistaIniciativas }  from "./components/VistaIniciativas";
import { useCelebration } from "@/components/CelebrationToast";
import type { TareaIntegrada } from "@/lib/tareas-integradas";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";
import { Users, Zap, Building2, Sun, Calendar, Inbox, ClipboardList, MapPin, User, Handshake,
  Megaphone, Palette, Calculator, Target, Lightbulb, Music, Video, Wrench, Package, ShoppingCart,
  Scale, FileText, Folder, type LucideIcon } from "lucide-react";

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
  id: string; nombre: string; descripcion?: string | null; orden: number; colapsada: boolean;
  tipoModulo?: string;
  tareas: TareaItem[];
}
interface Iniciativa { id: string; nombre: string; color: string | null }
interface Usuario   { id: string; name: string }

type VistaKey = "bandeja" | "hoy" | "proximas" | "integrada" | "proyectos-evento" | "proyectos-empresa" | "tratos"
  | "captura" | "ideas" | "iniciativas"
  | { tipo: "proyecto"; id: string } | { tipo: "area"; nombre: string };

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

interface ProyectoInternoConTareas {
  id: string;
  nombre: string;
  area: string;
  estado: string;
  prioridad: string;
  fechaFin: string | null;
  lider: { id: string; name: string } | null;
  tareas: TareaItem[];
}

interface TratoConTareas {
  id: string;
  nombreEvento: string | null;
  etapa: string;
  etapaInterna: string | null;
  fechaEventoEstimada: string | null;
  cliente: { id: string; nombre: string } | null;
  responsable: { id: string; name: string } | null;
  tareas: TareaItem[];
}


interface ProyViewOpts {
  showCompleted: boolean;
  sortBy:        "none" | "prioridad" | "fecha" | "nombre" | "creacion";
  groupBy:       "none" | "prioridad";
  filterPrio:    string[];
  filterTipo:    string[];
}
const PROY_VIEW_DEFAULT: ProyViewOpts = { showCompleted: false, sortBy: "none", groupBy: "none", filterPrio: [], filterTipo: [] };

interface VistaOpts {
  showCompleted: boolean;
  sortBy:   "none" | "prioridad" | "fecha" | "nombre" | "creacion";
  groupBy:  "none" | "proyecto" | "prioridad" | "fecha";
  filterPrio: string[];
  filterTipo: string[];
}
const VISTA_DEFAULT: VistaOpts = { showCompleted: false, sortBy: "none", groupBy: "none", filterPrio: [], filterTipo: [] };

// ── Bloque 5: opciones de tag de origen para filtro ──
const TIPO_ORIGEN_OPTS: { key: string; label: string; color: string }[] = [
  { key: "TAREA",    label: "Tarea",    color: "#9ca3af" },
  { key: "PROYECTO", label: "Proyecto", color: "#818cf8" },
  { key: "EVENTO",   label: "Evento",   color: "#60a5fa" },
];
const PRIO_ORDER: Record<string, number> = { URGENTE: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };

// Nombre de la sección para agrupar una tarea por su origen real (trato/evento/proyecto),
// no solo por proyecto-de-tareas. "Bandeja de entrada" queda solo para tareas sueltas.
function grupoOrigen(t: TareaItem): string {
  const tipo = t.tipoOrigen ?? "TAREA";
  if (tipo === "TRATO"    && t.trato)           return t.trato.nombreEvento || t.trato.cliente?.nombre || "Tratos";
  if (tipo === "EVENTO"   && t.proyectoEvento)  return t.proyectoEvento.nombre;
  if (tipo === "PROYECTO" && t.proyectoInterno) return t.proyectoInterno.nombre;
  if (t.proyectoTarea)                          return t.proyectoTarea.nombre;
  return "Bandeja de entrada";
}
const PROJECT_COLORS = [
  "#B3985B","#e85d04","#e63946","#2ec4b6","#3d85c8","#9b5de5","#f15bb5","#00bbf9",
];

// ── Hub de 4 sub-módulos dentro de un proyecto (los 4 sistemas del módulo unificado).

// ── Helpers ──────────────────────────────────────────────────────────────────

function severityColor(s: string) {
  if (s === "URGENTE") return "border-red-500";
  if (s === "ALTA")    return "border-orange-500";
  return "border-yellow-600";
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
  const [sessionArea, setSessionArea]           = useState<string>("");
  // Sub-módulo activo dentro del hub de un proyecto (TAREA|PLAN|EVENTO|PROYECTO)

  const [capturaCounts, setCapturaCounts] = useState({ captura: 0, ideas: 0, iniciativas: 0 });
  const [vista, setVista]                             = useState<VistaKey>(() => {
    if (typeof window === "undefined") return "bandeja";
    try { const s = localStorage.getItem("op_vista"); if (s) { const v = JSON.parse(s); if (v === "plan") return "bandeja"; return v as VistaKey; } } catch {}
    return "bandeja";
  });
  const [tareas, setTareas]                           = useState<TareaItem[]>([]);
  const [integradas, setIntegradas]                   = useState<TareaIntegrada[]>([]);
  const [proyectoDetalle, setProyectoDetalle]         = useState<ProyectoDetalle | null>(null);
  const [proyectosEvento, setProyectosEvento]         = useState<ProyectoEventoConTareas[]>([]);
  const [proyectosEmpresa, setProyectosEmpresa]       = useState<ProyectoInternoConTareas[]>([]);
  const [tratosOp, setTratosOp]                       = useState<TratoConTareas[]>([]);
  const [loadingMain, setLoadingMain]                 = useState(false);

  const searchParams = useSearchParams();
  const [selectedId, setSelectedId]             = useState<string | null>(() => searchParams.get("open"));

  // Permite abrir una vista concreta desde otra ruta vía ?vista=
  useEffect(() => {
    const v = searchParams.get("vista");
    if (v && v !== "plan") setVista(v as VistaKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
  const [searchResults, setSearchResults]       = useState<TareaItem[] | null>(null);
  const [searchLoading, setSearchLoading]       = useState(false);
  const [draggingId, setDraggingId]             = useState<string | null>(null);
  // ── Pointer-based drag (smooth ghost card, no HTML5 Drag API) ──────────────
  const ptrDragInfo   = useRef<{ id: string; title: string } | null>(null);
  const moveToSecRef      = useRef<(taskId: string, secId: string) => void>(() => {});
  const moveManyToSecRef  = useRef<(taskIds: string[], secId: string) => void>(() => {});
  const selectedIdsRef    = useRef<Set<string>>(new Set());
  const [ptrTargetSec,  setPtrTargetSec]  = useState<string | null>(null);
  const [ptrGhostPos,   setPtrGhostPos]   = useState<{ x: number; y: number } | null>(null);

  function startPtrDrag(taskId: string, title: string) {
    ptrDragInfo.current = { id: taskId, title };
    setDraggingId(taskId);
    setPtrTargetSec(null);
  }

  // Marca si el arrastre en curso es de una subtarea. Los handlers de mover
  // (moveToSection / moveToSubtask) lo consultan para refrescar el árbol al soltar,
  // porque las subtareas viven en el estado local del TaskItem padre, no en proyectoDetalle.
  const dragIsSubRef = useRef(false);
  const markSubDrag = useCallback((active: boolean) => { dragIsSubRef.current = active; }, []);

  // Body cursor during drag
  useEffect(() => {
    if (ptrGhostPos) {
      document.body.style.cursor      = 'grabbing';
      document.body.style.userSelect  = 'none';
    } else {
      document.body.style.cursor      = '';
      document.body.style.userSelect  = '';
    }
  }, [ptrGhostPos]);

  // FIX 4+6: resetDragState — single canonical cleanup for all drag state
  const resetDragState = useCallback(() => {
    ptrDragInfo.current = null;
    dragIsSubRef.current = false;
    setDraggingId(null);
    setPtrTargetSec(null);
    setPtrGhostPos(null);
  }, []);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!ptrDragInfo.current) return;
      // Track ghost position
      setPtrGhostPos({ x: e.clientX, y: e.clientY });
      // Detect target section under cursor
      const els = document.elementsFromPoint(e.clientX, e.clientY);
      let secId: string | null = null;
      for (const el of els) {
        const found = (el as HTMLElement).closest?.('[data-section-id]');
        if (found) { secId = found.getAttribute('data-section-id'); break; }
      }
      setPtrTargetSec(secId);
    }
    function onUp(e: MouseEvent) {
      if (!ptrDragInfo.current) return;
      const els = document.elementsFromPoint(e.clientX, e.clientY);
      let secId: string | null = null;
      for (const el of els) {
        const found = (el as HTMLElement).closest?.('[data-section-id]');
        if (found) { secId = found.getAttribute('data-section-id'); break; }
      }
      const info = ptrDragInfo.current;
      ptrDragInfo.current = null;
      setDraggingId(null);
      setPtrTargetSec(null);
      setPtrGhostPos(null);
      // FIX 5: on drop, if multi-select active and dragged task is selected, move all selected
      if (secId && info) {
        // If the dragged task is part of a multi-selection, move all selected tasks
        // We access selectedIds via a ref to avoid stale closure (see selectedIdsRef below)
        const multiIds = selectedIdsRef.current;
        if (multiIds.has(info.id) && multiIds.size > 1) {
          moveManyToSecRef.current([...multiIds], secId);
          clearMultiSelect();
        } else {
          moveToSecRef.current(info.id, secId);
        }
      }
    }
    // FIX 4: global Escape + visibility-change cleanup
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') resetDragState(); }
    function onVis() { if (document.hidden) resetDragState(); }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    document.addEventListener('keydown',   onKey);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      document.removeEventListener('keydown',   onKey);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [resetDragState]); // eslint-disable-line react-hooks/exhaustive-deps


  const [undoState, setUndoState]               = useState<UndoState | null>(null);
  const [addToast,  setAddToast]                = useState<{ msg: string; visible: boolean } | null>(null);
  const [syncTrigger, setSyncTrigger]           = useState(0);
  const [confirmDeleteId, setConfirmDeleteId]   = useState<string | null>(null);
  const [selectedIds, setSelectedIds]           = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk]           = useState(false);
  const [noSecDropOver, setNoSecDropOver]        = useState(false);
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
  const vistaRef = useRef(vista);
  useEffect(() => { vistaRef.current = vista; }, [vista]);
  useEffect(() => { try { localStorage.setItem("op_proy_view", JSON.stringify(proyViewOpts)); } catch {} }, [proyViewOpts]);
  useEffect(() => {
    if (!showViewPanel) return;
    function h(e: MouseEvent) { if (viewPanelRef.current && !viewPanelRef.current.contains(e.target as Node)) setShowViewPanel(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showViewPanel]);
  useEffect(() => { try { localStorage.setItem("op_vista_opts", JSON.stringify(vistaOpts)); } catch {} }, [vistaOpts]);
  useEffect(() => { try { localStorage.setItem("op_vista", JSON.stringify(vista)); } catch {} }, [vista]);
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
  const [showAccesoPanel, setShowAccesoPanel]       = useState(false);
  const [showNuevaSeccion, setShowNuevaSeccion]     = useState<"TAREA" | "PLAN" | null>(null);
  // Colapso persistente de las 2 secciones fijas (Tareas / Plan de trabajo) por proyecto.
  const [fijasColapsadas, setFijasColapsadas]       = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("ops-fijas-colapsadas") || "[]")); }
    catch { return new Set(); }
  });
  const toggleFijaColapsada = useCallback((key: string) => {
    setFijasColapsadas(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      try { localStorage.setItem("ops-fijas-colapsadas", JSON.stringify([...next])); } catch { /* noop */ }
      return next;
    });
  }, []);
  const [nuevoCarpetaNombre, setNuevoCarpetaNombre] = useState("");
  const [nuevoProyectoNombre, setNuevoProyectoNombre] = useState("");
  const [nuevoProyectoColor, setNuevoProyectoColor]   = useState(PROJECT_COLORS[0]);
  const [nuevoProyectoCarpeta, setNuevoProyectoCarpeta] = useState("");
  const [nuevaSeccionNombre, setNuevaSeccionNombre] = useState("");
  const [draggingSeccionId, setDraggingSeccionId]   = useState<string | null>(null);
  const [seccionDropTarget, setSeccionDropTarget]   = useState<{ id: string; pos: "before" | "after" } | null>(null);
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
      if (me?.area) setSessionArea(me.area);
    });
  }, []);

  // fetch captura counts for badges
  useEffect(() => {
    fetch("/api/captura/counts")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCapturaCounts(d); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Búsqueda global — debounce 350ms + fetch ?q= ───────────────────────────
  useEffect(() => {
    const q = busqueda.trim();
    if (q.length < 2) { setSearchResults(null); setSearchLoading(false); return; }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tareas?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.tareas ?? []);
        }
      } catch { /* ignore */ } finally { setSearchLoading(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [busqueda]);

  // ── SW sync listener — recargar vista cuando el SW termina de sincronizar ──
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_DONE" && event.data?.remaining === 0) {
        setSyncTrigger(n => n + 1);
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
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
    if (vista === "proyectos-empresa") {
      fetch("/api/tareas/por-proyecto-interno")
        .then(r => r.json())
        .then(d => { setProyectosEmpresa(d.proyectos ?? []); })
        .catch(() => {})
        .finally(() => setLoadingMain(false));
      return;
    }
    if (vista === "tratos") {
      fetch("/api/tareas/por-trato")
        .then(r => r.json())
        .then(d => { setTratosOp(d.tratos ?? []); })
        .catch(() => {})
        .finally(() => setLoadingMain(false));
      return;
    }
    fetch(`/api/tareas?vista=${vista}`)
      .then(r => r.json())
      .then(d => { setTareas(d.tareas ?? []); })
      .catch(() => {})
      .finally(() => setLoadingMain(false));
  }, [vista, syncTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeof vista === "string") return;
    setLoadingMain(true);
    setFilterUserProy(null);
    if (vista.tipo === "area") {
      fetch(`/api/tareas?vista=area&area=${vista.nombre}`)
        .then(r => r.json())
        .then(d => { setTareas(d.tareas ?? []); })
        .catch(() => {})
        .finally(() => setLoadingMain(false));
      return;
    }
    const proyId = (vista as { tipo: "proyecto"; id: string }).id;
    fetch(`/api/operaciones/proyectos/${proyId}`)
      .then(r => r.json())
      .then(d => { setProyectoDetalle(d.proyecto ?? null); })
      .catch(() => {})
      .finally(() => setLoadingMain(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeof vista === "object" ? (vista.tipo === "area" ? `area-${vista.nombre}` : (vista as { tipo: "proyecto"; id: string }).id) : null, syncTrigger]);

  // ── Load task detail ────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId) { setSelectedTask(null); return; }
    setLoadingPanel(true);
    fetch(`/api/tareas/${selectedId}`)
      .then(r => r.json())
      .then(d => { setSelectedTask(d.tarea ?? null); setLoadingPanel(false); });
  }, [selectedId]);

  // ── Mutations ────────────────────────────────────────────────────────────

  function applyProyFilter(tareas: TareaItem[], tipo: "TAREA" | "PLAN"): TareaItem[] {
    let r = tareas;
    // Hub: filtra por la sección fija (Tareas | Plan de trabajo).
    r = r.filter(t => (t.tipoOrigen ?? "TAREA") === tipo);
    if (!proyViewOpts.showCompleted) r = r.filter(t => t.estado !== "COMPLETADA");
    if (filterUserProy) r = r.filter(t => t.asignadoA?.id === filterUserProy);
    if (proyViewOpts.filterPrio.length > 0) r = r.filter(t => proyViewOpts.filterPrio.includes(t.prioridad));
    if (proyViewOpts.filterTipo.length > 0) r = r.filter(t => proyViewOpts.filterTipo.includes(t.tipoOrigen ?? "TAREA"));
    if (proyViewOpts.sortBy === "prioridad") r = [...r].sort((a, b) => (PRIO_ORDER[a.prioridad] ?? 3) - (PRIO_ORDER[b.prioridad] ?? 3));
    // FIX: Ordenar por fecha de creación
    if (proyViewOpts.sortBy === "creacion") r = [...r].sort((a, b) => {
      const ca = (a as unknown as Record<string, string>).createdAt ?? "";
      const cb = (b as unknown as Record<string, string>).createdAt ?? "";
      return ca.localeCompare(cb);
    });
    if (proyViewOpts.sortBy === "fecha") {
      r = [...r].sort((a, b) => {
        const da = a.fecha ?? null;
        const db = b.fecha ?? null;
        if (!da && !db) return (PRIO_ORDER[a.prioridad] ?? 3) - (PRIO_ORDER[b.prioridad] ?? 3);
        if (!da) return 1; if (!db) return -1;
        const dateCmp = da.localeCompare(db);
        if (dateCmp !== 0) return dateCmp;
        return (PRIO_ORDER[a.prioridad] ?? 3) - (PRIO_ORDER[b.prioridad] ?? 3);
      });
    }
    if (proyViewOpts.sortBy === "nombre")    r = [...r].sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
    return r;
  }


  function groupProyTareas(tareas: TareaItem[]): { label: string; color?: string; items: TareaItem[] }[] {
    if (proyViewOpts.groupBy === "prioridad") {
      return [
        { label: "Urgente",        color: "#f87171", items: tareas.filter(t => t.prioridad === "URGENTE") },
        { label: "Alta",           color: "#fb923c", items: tareas.filter(t => t.prioridad === "ALTA") },
        { label: "Media",          color: "#B3985B", items: tareas.filter(t => t.prioridad === "MEDIA") },
        { label: "Sin prioridad",  color: "#4b5563", items: tareas.filter(t => t.prioridad === "BAJA") },
      ].filter(g => g.items.length > 0);
    }
    return [{ label: "", items: tareas }];
  }

  const hasActiveProyOpts  = proyViewOpts.filterPrio.length > 0 || proyViewOpts.filterTipo.length > 0 || proyViewOpts.sortBy !== "none" || proyViewOpts.groupBy !== "none" || proyViewOpts.showCompleted || !!filterUserProy;
  const hasActiveVistaOpts = vistaOpts.filterPrio.length > 0 || vistaOpts.filterTipo.length > 0 || vistaOpts.sortBy !== "none" || vistaOpts.groupBy !== "none" || vistaOpts.showCompleted;

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
    const json = await res.json().catch(() => ({}));

    // Sin conexión — SW encoló la petición
    if (json.offline || json.queued) {
      setAddToast({ msg: "Sin conexión — tarea en cola, se enviará al reconectar", visible: true });
      setTimeout(() => setAddToast(t => t ? { ...t, visible: false } : null), 3500);
      setTimeout(() => setAddToast(null), 4000);
      return;
    }

    if (!res.ok) return;
    const { tarea } = json;
    if (!tarea || data.parentId) return;

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
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      // Gate de evidencia (422) u otro error: avisar y no marcar completada
      toast.error(d.error ?? "No se pudo completar la tarea");
      return;
    }
    const { tarea, reagendada, fechaAnterior } = await res.json();

    // ── Recurrente reagendada: la MISMA tarea avanza de fecha (no se completa ni duplica) ──
    if (reagendada && tarea) {
      const reprogram = (arr: TareaItem[]) =>
        arr.map(t => t.id === id ? { ...t, estado: "PENDIENTE", fecha: tarea.fecha } : t);
      setTareas(reprogram);
      setProyectoDetalle(prev => prev ? {
        ...prev, tareas: reprogram(prev.tareas),
        secciones: prev.secciones.map(s => ({ ...s, tareas: reprogram(s.tareas) })),
      } : null);

      celebrate("tarea");

      const nuevaFechaLabel = tarea.fecha
        ? new Date(tarea.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short" })
        : undefined;
      clearTimeout(undoTimer.current);
      setUndoState({ id, titulo, expiresAt: Date.now() + 4000, reagendada: true, fechaAnterior, nuevaFechaLabel });
      undoTimer.current = setTimeout(() => {
        // En "Hoy" la recurrente ya saltó a una fecha futura: debe salir de la lista
        // (como Todoist). En otras vistas se queda re-ordenada por su nueva fecha.
        if (vistaRef.current === "hoy") {
          setTareas(prev => prev.filter(t => t.id !== id));
        }
        setUndoState(null);
      }, 4000);
      return;
    }

    // Mark completed in state (keep visible for undo window)
    const markCompleted = (arr: TareaItem[]) =>
      arr.map(t => t.id === id ? { ...t, estado: "COMPLETADA" } : t);
    setTareas(markCompleted);
    setProyectoDetalle(prev => prev ? {
      ...prev, tareas: markCompleted(prev.tareas),
      secciones: prev.secciones.map(s => ({ ...s, tareas: markCompleted(s.tareas) })),
    } : null);

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
    // Reagendado: deshacer = regresar la tarea a su fecha previa (nunca se completó).
    // Completado normal: deshacer = volver a PENDIENTE.
    const body = undoState.reagendada
      ? { fecha: undoState.fechaAnterior ?? null }
      : { estado: "PENDIENTE" };
    const res = await fetch(`/api/tareas/${undoState.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      return;
    }
    const restore = (arr: TareaItem[]) =>
      arr.map(t => t.id === undoState.id
        ? (undoState.reagendada
            ? { ...t, fecha: undoState.fechaAnterior ?? null }
            : { ...t, estado: "PENDIENTE" })
        : t);
    setTareas(restore);
    setProyectoDetalle(prev => prev ? {
      ...prev, tareas: restore(prev.tareas),
      secciones: prev.secciones.map(s => ({ ...s, tareas: restore(s.tareas) })),
    } : null);
    setUndoState(null);
  }, [undoState]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismissUndo = useCallback(() => {
    clearTimeout(undoTimer.current);
    // Reagendada no se elimina de la lista: sigue viva con su nueva fecha.
    if (!showCompletedRef.current && undoState && !undoState.reagendada) {
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
    // Optimistic update happens first; si el guardado falla lo avisamos.
    fetch(`/api/tareas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
      .then(async res => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          toast.error(d.error ?? "No se pudo guardar el cambio");
          return;
        }
        // Al cambiar la recurrencia el server recalcula la próxima `fecha`.
        // Reflejarla (el orden por cercanía y los colores dependen de `fecha`).
        if ("recurrencia" in patch) {
          const { tarea: saved } = await res.json().catch(() => ({ tarea: null }));
          if (saved) {
            const setFecha = (arr: TareaItem[]) =>
              arr.map(t => t.id === id ? { ...t, fecha: saved.fecha, recurrencia: saved.recurrencia } : t);
            setTareas(setFecha);
            setProyectoDetalle(prev => prev ? {
              ...prev, tareas: setFecha(prev.tareas),
              secciones: prev.secciones.map(s => ({ ...s, tareas: setFecha(s.tareas) })),
            } : null);
            setSelectedTask(prev => prev && prev.id === id
              ? { ...prev, fecha: saved.fecha, recurrencia: saved.recurrencia } : prev);
          }
        }
      })
      .catch(() => toast.error("Error de conexión al guardar"));

    // Reflejar en el detalle abierto: el modal lee `recurrencia` directamente del
    // objeto tarea, así que sin esto el picker no refleja lo aplicado.
    if (selectedId === id && "recurrencia" in patch) {
      setSelectedTask(prev =>
        prev && prev.id === id ? { ...prev, recurrencia: (patch.recurrencia as string | null) } : prev
      );
    }

    // When a project is assigned to a bandeja task, remove it from the list immediately
    if ("proyectoTareaId" in patch && patch.proyectoTareaId && vista === "bandeja") {
      const rm = (arr: TareaItem[]) => arr.filter(t => t.id !== id);
      setTareas(rm);
      if (selectedId === id) setSelectedId(null);
      return;
    }

    // In "hoy" view, if fecha is moved to tomorrow or later (or cleared), remove from list
    if (vista === "hoy" && "fecha" in patch) {
      const hoyCST = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
      const nuevaFecha = patch.fecha as string | null;
      if (!nuevaFecha || nuevaFecha > hoyCST) {
        const rm = (arr: TareaItem[]) => arr.filter(t => t.id !== id);
        setTareas(rm);
        if (selectedId === id) setSelectedId(null);
        return;
      }
    }

    const upd = (arr: TareaItem[]) => arr.map(t => {
      if (t.id !== id) return t;
      const next = { ...t };
      if (patch.titulo       != null) next.titulo    = patch.titulo    as string;
      if (patch.prioridad    != null) next.prioridad = patch.prioridad as string;
      if (patch.area         != null) next.area      = patch.area      as string;
      if (patch.estado       != null) next.estado    = patch.estado    as string;
      if ("fecha"            in patch) next.fecha            = patch.fecha            as string | null;
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
    // Increment parent's subtask count so the expand button appears immediately
    const bumpParent = (arr: TareaItem[]) => arr.map(t =>
      t.id === parentId ? { ...t, _count: { ...t._count, subtareas: t._count.subtareas + 1 } } : t
    );
    setTareas(prev => bumpParent(remove(prev)));
    setProyectoDetalle(prev => prev ? {
      ...prev,
      tareas: bumpParent(remove(prev.tareas)),
      secciones: prev.secciones.map(s => ({ ...s, tareas: bumpParent(remove(s.tareas)) })),
    } : null);
    setDraggingId(null);
    // Si lo arrastrado era una subtarea, su padre original la tiene en estado local:
    // refrescamos para que desaparezca de ahí y aparezca bajo el nuevo padre.
    if (dragIsSubRef.current) { dragIsSubRef.current = false; setSyncTrigger(n => n + 1); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reordenar tareas (above / below) sin hacer subtarea ─────────────────
  const reorderTask = useCallback((draggedId: string, targetId: string, position: "above" | "below") => {
    if (draggedId === targetId) return;
    const reorder = (arr: TareaItem[]): TareaItem[] => {
      const dragged = arr.find(t => t.id === draggedId);
      if (!dragged) return arr;
      const without = arr.filter(t => t.id !== draggedId);
      const targetIdx = without.findIndex(t => t.id === targetId);
      if (targetIdx === -1) return arr;
      const insertAt = position === "above" ? targetIdx : targetIdx + 1;
      return [...without.slice(0, insertAt), dragged, ...without.slice(insertAt)];
    };
    setTareas(reorder);
    setProyectoDetalle(prev => prev ? {
      ...prev,
      tareas: reorder(prev.tareas),
      secciones: prev.secciones.map(s => ({ ...s, tareas: reorder(s.tareas) })),
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
      // parentId: null saca la tarea de su padre si era subtarea (inocuo para tareas top-level).
      body: JSON.stringify({ seccionId, parentId: null }),
    });
    setDraggingId(null);
    if (dragIsSubRef.current) { dragIsSubRef.current = false; setSyncTrigger(n => n + 1); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Keep ref in sync so the global mousemove/mouseup can call it without stale closure
  useEffect(() => { moveToSecRef.current = moveToSection; }, [moveToSection]);
  // FIX 5: Keep selectedIds ref in sync so the mouseup closure can read current value
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

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

  const moveManyToSection = useCallback((taskIds: string[], seccionId: string) => {
    const idSet = new Set(taskIds);
    setProyectoDetalle(prev => {
      if (!prev) return null;
      const targetSec = prev.secciones.find(s => s.id === seccionId);
      if (!targetSec) return prev;
      const allTasks: TareaItem[] = [
        ...prev.tareas.filter(t => idSet.has(t.id)),
        ...prev.secciones.flatMap(s => s.tareas.filter(t => idSet.has(t.id))),
      ];
      return {
        ...prev,
        tareas: prev.tareas.filter(t => !idSet.has(t.id)),
        secciones: prev.secciones.map(s => {
          if (s.id === seccionId) return {
            ...s, tareas: [
              ...s.tareas.filter(t => !idSet.has(t.id)),
              ...allTasks.map(t => ({ ...t, seccion: { id: s.id, nombre: s.nombre } })),
            ],
          };
          return { ...s, tareas: s.tareas.filter(t => !idSet.has(t.id)) };
        }),
      };
    });
    Promise.all(taskIds.map(id => fetch(`/api/tareas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seccionId }),
    })));
    setDraggingId(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // FIX 5: Keep moveManyToSection ref in sync for multi-select drag
  useEffect(() => { moveManyToSecRef.current = moveManyToSection; }, [moveManyToSection]);

  // Moves multiple tasks to unsectioned at once (used during multi-select drag)
  const moveManyToNoSection = useCallback((taskIds: string[]) => {
    const idSet = new Set(taskIds);
    setProyectoDetalle(prev => {
      if (!prev) return null;
      const fromSections = prev.secciones.flatMap(s => s.tareas.filter(t => idSet.has(t.id)));
      if (fromSections.length === 0) return prev;
      return {
        ...prev,
        tareas: [...prev.tareas, ...fromSections.map(t => ({ ...t, seccion: null }))],
        secciones: prev.secciones.map(s => ({ ...s, tareas: s.tareas.filter(t => !idSet.has(t.id)) })),
      };
    });
    Promise.all(taskIds.map(id => fetch(`/api/tareas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seccionId: null }),
    })));
    setDraggingId(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const moveToProject = useCallback((taskId: string, proyectoId: string, proyectoNombre: string) => {
    // FIX 2: Optimistic removal from both flat list AND project sections (prevents ghost)
    const rm = (arr: TareaItem[]) => arr.filter(t => t.id !== taskId);
    setTareas(rm);
    setProyectoDetalle(prev => prev ? {
      ...prev,
      tareas: rm(prev.tareas),
      secciones: prev.secciones.map(s => ({ ...s, tareas: rm(s.tareas) })),
    } : null);
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

  const addSeccion = useCallback(async (tipoModulo: "TAREA" | "PLAN") => {
    if (!nuevaSeccionNombre.trim() || typeof vista === "string" || vista.tipo === "area") return;
    const res = await fetch("/api/operaciones/secciones", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nuevaSeccionNombre.trim(),
        proyectoId: (vista as { tipo: "proyecto"; id: string }).id,
        orden: proyectoDetalle?.secciones.length ?? 0,
        tipoModulo,
      }),
    });
    if (res.ok) {
      const { seccion } = await res.json();
      setProyectoDetalle(prev => prev ? {
        ...prev, secciones: [...prev.secciones, { ...seccion, tareas: [] }],
      } : null);
      setNuevaSeccionNombre(""); setShowNuevaSeccion(null);
    }
  }, [nuevaSeccionNombre, vista, proyectoDetalle]);

  // ── Reorder sections via drag-and-drop ─────────────────────────────────
  async function reorderSecciones(draggedId: string, targetId: string, pos: "before" | "after") {
    if (!proyectoDetalle || draggedId === targetId) return;
    const secs = [...proyectoDetalle.secciones];
    const fromIdx = secs.findIndex(s => s.id === draggedId);
    if (fromIdx === -1) return;
    const [dragged] = secs.splice(fromIdx, 1);
    let toIdx = secs.findIndex(s => s.id === targetId);
    if (pos === "after") toIdx++;
    secs.splice(Math.max(0, toIdx), 0, dragged);
    const updated = secs.map((s, i) => ({ ...s, orden: i }));
    setProyectoDetalle(prev => prev ? { ...prev, secciones: updated } : null);
    await Promise.all(updated.map((s, i) =>
      fetch(`/api/operaciones/secciones/${s.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orden: i }),
      })
    ));
  }

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
    return list.filter(t =>
      t.titulo.toLowerCase().includes(q) ||
      (t.descripcion?.toLowerCase().includes(q) ?? false)
    );
  };

  const hoyGrouped = useMemo(() => {
    if (typeof vista !== "string" || vista === "integrada" || vista === "proyectos-evento" || vista === "proyectos-empresa" || vista === "tratos") return null;

    let base = applyBusqueda(vistaOpts.showCompleted ? tareas : tareas.filter(t => t.estado !== "COMPLETADA"));
    if (vistaOpts.filterPrio.length > 0) base = base.filter(t => vistaOpts.filterPrio.includes(t.prioridad));
    if (vistaOpts.filterTipo.length > 0) base = base.filter(t => vistaOpts.filterTipo.includes(t.tipoOrigen ?? "TAREA"));
    // Bandeja/próximas solo muestran tareas sueltas (tipoOrigen TAREA).
    // "Hoy" muestra los 4 tipos (TAREA | PLAN | EVENTO | PROYECTO) que vencen hoy.
    if (vista === "bandeja" || vista === "proximas") {
      base = base.filter(t => (t.tipoOrigen ?? "TAREA") === "TAREA");
    }

    function applySort(arr: TareaItem[]): TareaItem[] {
      if (vistaOpts.sortBy === "prioridad") return [...arr].sort((a, b) => (PRIO_ORDER[a.prioridad] ?? 3) - (PRIO_ORDER[b.prioridad] ?? 3));
      // FIX: Ordenar por fecha de creación
      if (vistaOpts.sortBy === "creacion") return [...base].sort((a, b) => {
        const ca = (a as unknown as Record<string, string>).createdAt ?? "";
        const cb = (b as unknown as Record<string, string>).createdAt ?? "";
        return ca.localeCompare(cb);
      });
      if (vistaOpts.sortBy === "fecha") {
        return [...arr].sort((a, b) => {
          const da = a.fecha ?? null;
          const db = b.fecha ?? null;
          if (!da && !db) return (PRIO_ORDER[a.prioridad] ?? 3) - (PRIO_ORDER[b.prioridad] ?? 3);
          if (!da) return 1; if (!db) return -1;
          const dateCmp = da.localeCompare(db);
          if (dateCmp !== 0) return dateCmp;
          return (PRIO_ORDER[a.prioridad] ?? 3) - (PRIO_ORDER[b.prioridad] ?? 3);
        });
      }
      if (vistaOpts.sortBy === "nombre")    return [...arr].sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
      return sortCronoPrio(arr);
    }

    if (vistaOpts.groupBy !== "none") {
      const grouped: Record<string, TareaItem[]> = {};
      for (const t of base) {
        let key = "";
        if (vistaOpts.groupBy === "proyecto")  key = grupoOrigen(t);
        else if (vistaOpts.groupBy === "prioridad") key = t.prioridad;
        else if (vistaOpts.groupBy === "fecha") key = t.fecha ? new Date(t.fecha + "T00:00:00").toLocaleDateString("es-MX",{dateStyle:"medium"}) : "Sin fecha";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(t);
      }
      const keys = vistaOpts.groupBy === "prioridad"
        ? ["URGENTE","ALTA","MEDIA","BAJA"].filter(k => grouped[k])
        : Object.keys(grouped).sort();
      return keys.map(label => ({ label, tareas: applySort(grouped[label]) }));
    }

    // Natural grouping: bandeja stays flat, hoy groups by project
    if (vista === "bandeja") return null;
    const proyNames = [...new Set(base.map(grupoOrigen))];
    if (vista !== "hoy" && proyNames.length <= 1) return null;

    const grouped: Record<string, TareaItem[]> = {};
    for (const t of base) {
      const key = grupoOrigen(t);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    }
    const keys = Object.keys(grouped).sort((a, b) => a === "Bandeja de entrada" ? 1 : b === "Bandeja de entrada" ? -1 : a.localeCompare(b));
    return keys.map(key => ({ label: key, tareas: applySort(grouped[key]) }));
  }, [tareas, vistaOpts, vista, busqueda]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flat sorted list (used when no grouping)
  const tareasOrdenadas = useMemo(() => {
    let base = applyBusqueda(vistaOpts.showCompleted ? tareas : tareas.filter(t => t.estado !== "COMPLETADA"));
    if (vistaOpts.filterPrio.length > 0) base = base.filter(t => vistaOpts.filterPrio.includes(t.prioridad));
    if (vistaOpts.filterTipo.length > 0) base = base.filter(t => vistaOpts.filterTipo.includes(t.tipoOrigen ?? "TAREA"));
    // Bandeja/próximas: solo tareas sueltas. "Hoy" incluye los 4 tipos que vencen hoy.
    if (vista === "bandeja" || vista === "proximas") {
      base = base.filter(t => (t.tipoOrigen ?? "TAREA") === "TAREA");
    }
    if (vistaOpts.sortBy === "prioridad") return [...base].sort((a, b) => (PRIO_ORDER[a.prioridad] ?? 3) - (PRIO_ORDER[b.prioridad] ?? 3));
    if (vistaOpts.sortBy === "fecha")     return [...base].sort((a, b) => { if (!a.fecha) return 1; if (!b.fecha) return -1; return a.fecha.localeCompare(b.fecha); });
    if (vistaOpts.sortBy === "nombre")    return [...base].sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
    return sortCronoPrio(base);
  }, [tareas, vistaOpts, busqueda, vista]); // eslint-disable-line react-hooks/exhaustive-deps

  const proyectosSinCarpeta = useMemo(() =>
    proyectosNav.filter(p => !carpetas.some(c => c.proyectos.some(cp => cp.id === p.id))),
  [proyectosNav, carpetas]);

  const AREA_LABELS: Record<string, string> = {
    VENTAS: "Comercial", PRODUCCION: "Producción", MARKETING: "Marketing",
    ADMINISTRACION: "Administración", RRHH: "RRHH", DIRECCION: "Dirección",
  };
  const vistaKey    = typeof vista === "string" ? vista : (vista.tipo === "area" ? `area-${vista.nombre}` : (vista as { tipo: "proyecto"; id: string }).id);
  const vistaLabel  =
    vista === "bandeja"          ? "Bandeja de entrada" :
    vista === "hoy"              ? "Hoy" :
    vista === "proximas"         ? "Próximas" :
    vista === "integrada"        ? "Alertas" :
    vista === "proyectos-evento" ? "Proyectos / Eventos" :
    vista === "proyectos-empresa" ? "Proyectos de empresa" :
    vista === "tratos"           ? "Tratos / Ventas" :
    vista === "captura"          ? "Captura rápida" :
    vista === "ideas"            ? "Ideas" :
    vista === "iniciativas"      ? "Iniciativas" :
    typeof vista === "object" && vista.tipo === "area" ? `Área · ${AREA_LABELS[vista.nombre] ?? vista.nombre}` :
    proyectoDetalle?.nombre ?? "Área";

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
    if (typeof vista !== "string" && vista.tipo === "proyecto" && vista.id === id) setVista("bandeja");
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

  // Today count for badge
  const hoyCount = useMemo(() => {
    const hoy = new Date(); hoy.setHours(23,59,59,999);
    if (typeof vista === "string" && vista === "hoy") {
      return tareas.filter(t => t.estado !== "COMPLETADA" && (t.tipoOrigen ?? "TAREA") === "TAREA").length;
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

  const [mobileProyectos, setMobileProyectos] = useState(false);
  // Modal unificado "Nueva tarea" (selector de 4 tipos)
  const [nuevaTareaOpen, setNuevaTareaOpen] = useState(false);
  // Contexto con el que se abre el modal (proyecto y tipo pre-seleccionado).
  const [nuevaTareaCtx, setNuevaTareaCtx] = useState<{
    proyectoTareaId?: string | null;
    seccionId?: string | null;
    tipoInicial?: "TAREA" | "PLAN" | "EVENTO" | "PROYECTO" | null;
    tituloInicial?: string | null;
    defaultArea?: string | null;
  }>({});

  // Abre el modal unificado. Si se pasa contexto (proyecto/tipo), lo pre-carga.
  const abrirNuevaTarea = useCallback((ctx?: {
    proyectoTareaId?: string | null;
    seccionId?: string | null;
    tipoInicial?: "TAREA" | "PLAN" | "EVENTO" | "PROYECTO" | null;
    tituloInicial?: string | null;
    defaultArea?: string | null;
  }) => {
    setNuevaTareaCtx(ctx ?? {});
    setNuevaTareaOpen(true);
  }, []);

  // Inserta en el estado una tarea recién creada desde el modal unificado.
  const handleTareaCreada = useCallback((tarea: TareaItem) => {
    const msg = ADD_MSGS[Math.floor(Math.random() * ADD_MSGS.length)];
    setAddToast({ msg, visible: true });
    setTimeout(() => setAddToast(t => t ? { ...t, visible: false } : null), 1800);
    setTimeout(() => setAddToast(null), 2150);
    // Insertamos en listas planas (vistas string). Las vistas integrada/hoy se
    // recargan solas al navegar; evitamos duplicar.
    if (typeof vista === "string" && vista !== "integrada") {
      setTareas(prev => prev.some(t => t.id === tarea.id) ? prev : [...prev, tarea]);
    }
    // Si estamos dentro de un proyecto y la tarea pertenece a él, insértala en vivo.
    if (typeof vista !== "string" && vista.tipo === "proyecto" && tarea.proyectoTarea?.id === vista.id) {
      setProyectoDetalle(prev => prev && !prev.tareas.some(t => t.id === tarea.id)
        ? { ...prev, tareas: [tarea, ...prev.tareas] }
        : prev);
    }
  }, [vista]); // eslint-disable-line react-hooks/exhaustive-deps

  // Abrir el modal unificado si la URL trae ?nueva=1 (acceso directo).
  useEffect(() => {
    if (searchParams.get("nueva") !== "1") return;
    window.history.replaceState(null, "", "/operaciones");
    abrirNuevaTarea();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full bg-[#0a0a0a]">

      {/* ── Drag ghost card (follows cursor) ─────────────────────────────── */}
      {/* FIX 5: Ghost card — single or multi-select stack */}
      {ptrGhostPos && ptrDragInfo.current && (() => {
        const isMulti = selectedIds.has(ptrDragInfo.current.id) && selectedIds.size > 1;
        return (
          <div
            style={{
              position: 'fixed',
              left: 0, top: 0,
              transform: `translate(${ptrGhostPos.x + 14}px, ${ptrGhostPos.y - 18}px) rotate(2deg)`,
              zIndex: 9999,
              pointerEvents: 'none',
              willChange: 'transform',
            }}
          >
            {isMulti ? (
              <div className="relative">
                {/* Stack shadow cards */}
                <div className="absolute -top-1.5 -right-1.5 w-full h-full bg-[#222] border border-[#B3985B]/20 rounded-xl opacity-60" />
                <div className="absolute -top-0.5 -right-0.5 w-full h-full bg-[#1a1a1a] border border-[#B3985B]/30 rounded-xl opacity-80" />
                {/* Main card */}
                <div className="relative bg-[#181818] border border-[#B3985B]/60 rounded-xl px-3.5 py-2.5 shadow-2xl shadow-black/70 max-w-[260px] backdrop-blur-sm">
                  <p className="text-[#B3985B] font-bold text-sm mb-1">{selectedIds.size} tareas</p>
                  <p className="text-[#B3985B]/70 text-[10px]">Arrastrando selección…</p>
                </div>
              </div>
            ) : (
              <div className="bg-[#181818] border border-[#B3985B]/60 rounded-xl px-3.5 py-2.5 shadow-2xl shadow-black/70 max-w-[260px] backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#B3985B] shrink-0" />
                  <p className="text-white text-sm font-medium truncate leading-snug">{ptrDragInfo.current.title}</p>
                </div>
                <p className="text-[#B3985B]/70 text-[10px] mt-1 ml-3.5">Arrastrando…</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════
          LEFT SIDEBAR — Todoist-style navigation
      ══════════════════════════════════════════════════════════════════════ */}
      <aside className={`${sidebarOpen ? "w-56" : "w-0"} hidden lg:flex shrink-0 overflow-hidden transition-[width] duration-200 bg-[#060606] border-r border-[#0f0f0f] flex-col lg:sticky lg:top-0 lg:self-start lg:h-[100dvh]`}>

        {/* ── Nueva tarea (CTA) ──────────────────────────────────────────── */}
        <div className="p-3 shrink-0">
          <button
            onClick={() => abrirNuevaTarea(
              typeof vista !== "string" && vista.tipo === "proyecto"
                ? { proyectoTareaId: vista.id }
                : undefined,
            )}
            className="w-full flex items-center gap-2 px-3 py-2 bg-[#B3985B]/10 hover:bg-[#B3985B]/16 border border-[#B3985B]/20 hover:border-[#B3985B]/35 text-[#B3985B] rounded-xl text-sm font-medium transition-all group"
          >
            <span className="w-5 h-5 rounded-full bg-[#B3985B]/20 group-hover:bg-[#B3985B]/30 flex items-center justify-center transition-colors">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </span>
            Nueva tarea
          </button>
        </div>

        {/* ── Buscador ───────────────────────────────────────────────────── */}
        <div className="px-3 pb-2 shrink-0">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#333] pointer-events-none" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar tarea…"
              className="w-full pl-7 pr-6 py-1.5 bg-[#0d0d0d] border border-[#181818] rounded-lg text-xs text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/30 transition-colors"
            />
            {busqueda && (
              <button onClick={() => setBusqueda("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#333] hover:text-[#777] transition-colors">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
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
          <div className="border-t border-[#181818] my-1.5 mx-2" />
          <SideItem
            icon={<Handshake strokeWidth={1.5} className="w-3.5 h-3.5" />}
            label="Tratos"
            isActive={vistaKey === "tratos"}
            onClick={() => setVista("tratos")}
          />
          <SideItem
            icon={<Calendar strokeWidth={1.5} className="w-3.5 h-3.5" />}
            label="Proyectos de evento"
            isActive={vistaKey === "proyectos-evento"}
            onClick={() => setVista("proyectos-evento")}
          />
          <SideItem
            icon={<Building2 strokeWidth={1.5} className="w-3.5 h-3.5" />}
            label="Proyectos de empresa"
            isActive={vistaKey === "proyectos-empresa"}
            onClick={() => setVista("proyectos-empresa")}
          />
        </nav>

        {/* ── Áreas section (carpetas y proyectos) ───────────────────────── */}
        <div className="mt-4 flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 shrink-0">
            <span className="text-xs text-[#3a3a3a] font-semibold tracking-widest uppercase select-none">Áreas</span>
            <button
              onClick={() => { setShowNuevoProyecto(true); setTimeout(() => proyectoInputRef.current?.focus(), 50); }}
              className="w-5 h-5 flex items-center justify-center rounded text-[#2a2a2a] hover:text-[#B3985B] hover:bg-[#B3985B]/10 transition-all"
              title="Nueva área"
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

        {sessionRole === "ADMIN" && (
          <div className="px-2 py-2 shrink-0 border-t border-[#111] mt-auto">
            <button
              onClick={() => setShowAccesoPanel(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#3a3a3a] hover:text-[#777] hover:bg-[#0f0f0f] transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Acceso a áreas
            </button>
          </div>
        )}

      </aside>

      {showAccesoPanel && <ProyectoAccesoPanel onClose={() => setShowAccesoPanel(false)} />}

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* ── CONTENT HEADER ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#0f0f0f] shrink-0">

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

          <h1 className="text-base font-semibold text-white tracking-tight shrink-0 min-w-0 truncate max-w-[140px] sm:max-w-none">{vistaLabel}</h1>

          {/* Search — hidden on mobile (available in Explorar panel) */}
          <div className="relative hidden sm:flex flex-1 max-w-xs mx-2">
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
                      {([["none","Sin orden"],["prioridad","Prioridad"],["fecha","Fecha venc."],["creacion","Fecha creación"],["nombre","Nombre"]] as const).map(([val, label]) => (
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
                      {([["none","Ninguno"],["proyecto","Área"],["prioridad","Prioridad"],["fecha","Fecha"]] as const).map(([val, label]) => (
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

                  {/* Filtrar por tipo (tipoOrigen) */}
                  <div className="px-4 py-3 border-t border-[#161616]">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold mb-2">Filtrar por tipo</p>
                    <div className="flex gap-1 flex-wrap">
                      {TIPO_ORIGEN_OPTS.map(({ key, label, color }) => {
                        const active = vistaOpts.filterTipo.includes(key);
                        return (
                          <button key={key}
                            onClick={() => setVistaOpts(o => ({ ...o, filterTipo: active ? o.filterTipo.filter(p => p !== key) : [...o.filterTipo, key] }))}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all border"
                            style={{ borderColor: active ? color + "60" : "#1e1e1e", backgroundColor: active ? color + "18" : "transparent", color: active ? color : "#555" }}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
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
              {usuarios.length > 0 && (() => {
                // Count tasks per user (before user filter, respecting showCompleted)
                const allTareasProy = proyectoDetalle ? [
                  ...proyectoDetalle.tareas,
                  ...proyectoDetalle.secciones.flatMap(s => s.tareas),
                ].filter(t => proyViewOpts.showCompleted || t.estado !== 'COMPLETADA') : []
                const countByUser: Record<string, number> = {}
                for (const t of allTareasProy) {
                  const uid = t.asignadoA?.id ?? '__none'
                  countByUser[uid] = (countByUser[uid] ?? 0) + 1
                }
                const totalCount = allTareasProy.length
                return (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setFilterUserProy(null)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium transition-all border ${
                        !filterUserProy
                          ? "bg-[#B3985B]/15 text-[#B3985B] border-[#B3985B]/30"
                          : "bg-transparent text-[#555] border-transparent hover:text-white"
                      }`}
                    >
                      Todos {totalCount > 0 && <span className="text-[10px] opacity-70">({totalCount})</span>}
                    </button>
                    {usuarios.map((u, idx) => {
                      const initials = u.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                      const isActive = filterUserProy === u.id;
                      const count = countByUser[u.id] ?? 0;
                      return (
                        <button
                          key={u.id}
                          onClick={() => setFilterUserProy(isActive ? null : u.id)}
                          title={`${u.name} · ${count} tarea${count !== 1 ? 's' : ''}`}
                          className={`${idx >= 4 ? "hidden sm:flex" : "flex"} relative w-7 h-7 rounded-full text-[10px] font-bold transition-all items-center justify-center shrink-0 ${
                            isActive
                              ? "ring-2 ring-[#B3985B] bg-[#B3985B]/20 text-[#B3985B]"
                              : "bg-[#1a1a1a] text-[#555] hover:text-white hover:bg-[#222]"
                          }`}
                        >
                          {initials}
                          {count > 0 && (
                            <span className={`absolute -bottom-1 -right-1 min-w-[14px] h-3.5 rounded-full border text-[7px] font-bold flex items-center justify-center px-0.5 ${
                              isActive
                                ? 'bg-[#B3985B]/20 border-[#B3985B]/40 text-[#B3985B]'
                                : 'bg-[#111] border-[#222] text-gray-500'
                            }`}>
                              {count > 9 ? '9+' : count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )
              })()}


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
                      {([["none","Sin orden"],["prioridad","Prioridad"],["fecha","Fecha venc."],["creacion","Fecha creación"],["nombre","Nombre"]] as const).map(([val, label]) => (
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
                      {([["none","Ninguno"],["prioridad","Prioridad"]] as const).map(([val, label]) => (
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

                  {/* Filtrar por tipo (tipoOrigen) */}
                  <div className="px-4 py-3 border-t border-[#161616]">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold mb-2">Filtrar por tipo</p>
                    <div className="flex gap-1 flex-wrap">
                      {TIPO_ORIGEN_OPTS.map(({ key, label, color }) => {
                        const active = proyViewOpts.filterTipo.includes(key);
                        return (
                          <button key={key}
                            onClick={() => setProyViewOpts(o => ({ ...o, filterTipo: active ? o.filterTipo.filter(p => p !== key) : [...o.filterTipo, key] }))}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all border"
                            style={{ borderColor: active ? color + "60" : "#1e1e1e", backgroundColor: active ? color + "18" : "transparent", color: active ? color : "#555" }}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
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
        <div className="flex-1 overflow-y-auto pb-44 lg:pb-4">
          {searchLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 border border-[#222] border-t-[#B3985B] rounded-full animate-spin" />
            </div>

          ) : searchResults !== null ? (
            // ── Resultados de búsqueda global ────────────────────────────────
            <div className="max-w-2xl mx-auto px-2 py-4 pb-24">
              <p className="text-[11px] text-[#444] px-3 mb-3">
                {searchResults.length === 0
                  ? `Sin resultados para "${busqueda}"`
                  : `${searchResults.length} resultado${searchResults.length !== 1 ? "s" : ""} para "${busqueda}"`}
              </p>
              {searchResults.map(t => (
                <TaskItem key={t.id} tarea={t} isSelected={selectedId === t.id}
                  onComplete={completeTarea} onSelect={setSelectedId} onDelete={setConfirmDeleteId}
                  onDateChange={(id, val) => saveTarea(id, { fecha: val || null })}
                  onPriorityChange={(id, p) => saveTarea(id, { prioridad: p })}
                  onAssign={(id, userId) => saveTarea(id, { asignadoAId: userId })}
                  onProjectChange={(id, proyectoId) => saveTarea(id, { proyectoTareaId: proyectoId })}
                  projects={proyectosNav}
                  users={usuarios}
                  showProject
                  reloadKey={syncTrigger} markSubDrag={markSubDrag}
                />
              ))}
            </div>

          ) : loadingMain ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 border border-[#222] border-t-[#B3985B] rounded-full animate-spin" />
            </div>

          ) : vista === "captura" ? (
            <VistaCapturaRapida />

          ) : vista === "ideas" ? (
            <VistaIdeas
              onConvertirATarea={(texto) => {
                setVista("bandeja");
                setTimeout(() => abrirNuevaTarea({ tituloInicial: texto }), 50);
              }}
            />

          ) : vista === "iniciativas" ? (
            <VistaIniciativas />

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
                  // Rollback del optimista: la tarea no se completó (p.ej. requiere evidencia).
                  setProyectosEvento(prev => prev.map(p => ({
                    ...p,
                    tareas: p.tareas.map(t => t.id === id ? { ...t, estado: "PENDIENTE" } : t),
                  })));
                  return;
                }
                const { reagendada, tarea } = await res.json();
                // Recurrente: no se completa, salta a su próxima fecha y sigue pendiente.
                if (reagendada && tarea) {
                  setProyectosEvento(prev => prev.map(p => ({
                    ...p,
                    tareas: p.tareas.map(t => t.id === id ? { ...t, estado: "PENDIENTE", fecha: tarea.fecha } : t),
                  })));
                }
              }}
              onRefresh={() => {
                setLoadingMain(true);
                fetch("/api/tareas/por-proyecto")
                  .then(r => r.json())
                  .then(d => { setProyectosEvento(d.proyectos ?? []); setLoadingMain(false); });
              }}
            />

          ) : vista === "tratos" ? (
            <TratosView
              tratos={tratosOp}
              onSelectTarea={setSelectedId}
              selectedId={selectedId}
              onCompleteTarea={async (id) => {
                setTratosOp(prev => prev.map(t => ({
                  ...t,
                  tareas: t.tareas.map(x => x.id === id ? { ...x, estado: "COMPLETADA" } : x),
                })));
                const res = await fetch(`/api/tareas/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ estado: "COMPLETADA" }),
                });
                if (!res.ok) {
                  const d = await res.json().catch(() => ({}));
                  toast.error(d.error ?? "Error al guardar");
                  // Rollback del optimista: la tarea no se completó (p.ej. requiere evidencia).
                  setTratosOp(prev => prev.map(t => ({
                    ...t,
                    tareas: t.tareas.map(x => x.id === id ? { ...x, estado: "PENDIENTE" } : x),
                  })));
                  return;
                }
                const { reagendada, tarea, subetapaAvanzada } = await res.json();
                // Recurrente: no se completa, salta a su próxima fecha y sigue pendiente.
                if (reagendada && tarea) {
                  setTratosOp(prev => prev.map(t => ({
                    ...t,
                    tareas: t.tareas.map(x => x.id === id ? { ...x, estado: "PENDIENTE", fecha: tarea.fecha } : x),
                  })));
                } else if (subetapaAvanzada) {
                  // El trato avanzó de subetapa: recargar para reflejar las nuevas tareas.
                  fetch("/api/tareas/por-trato")
                    .then(r => r.json())
                    .then(d => setTratosOp(d.tratos ?? []))
                    .catch(() => {});
                }
              }}
              onRefresh={() => {
                setLoadingMain(true);
                fetch("/api/tareas/por-trato")
                  .then(r => r.json())
                  .then(d => { setTratosOp(d.tratos ?? []); setLoadingMain(false); });
              }}
            />

          ) : vista === "proyectos-empresa" ? (
            <ProyectosEmpresaView
              proyectos={proyectosEmpresa}
              onSelectTarea={setSelectedId}
              selectedId={selectedId}
              onCompleteTarea={async (id) => {
                setProyectosEmpresa(prev => prev.map(p => ({
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
                  setProyectosEmpresa(prev => prev.map(p => ({
                    ...p,
                    tareas: p.tareas.map(t => t.id === id ? { ...t, estado: "PENDIENTE" } : t),
                  })));
                  return;
                }
                const { reagendada, tarea } = await res.json();
                if (reagendada && tarea) {
                  setProyectosEmpresa(prev => prev.map(p => ({
                    ...p,
                    tareas: p.tareas.map(t => t.id === id ? { ...t, estado: "PENDIENTE", fecha: tarea.fecha } : t),
                  })));
                }
              }}
              onRefresh={() => {
                setLoadingMain(true);
                fetch("/api/tareas/por-proyecto-interno")
                  .then(r => r.json())
                  .then(d => { setProyectosEmpresa(d.proyectos ?? []); setLoadingMain(false); });
              }}
            />

          ) : vista === "integrada" ? (
            <div className="max-w-2xl mx-auto px-4 py-5 space-y-2">
              {integradas.length === 0 ? (
                <EmptyState icon={<Zap strokeWidth={1.5} className="w-9 h-9" />} title="Sin alertas" sub="Todo en orden en todos los módulos" />
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
              {/* Nueva tarea (modal 4 tipos) al tope para bandeja/proximas/hoy */}
              {(vista === "bandeja" || vista === "proximas" || vista === "hoy") && (
                <div className="mb-3">
                  <button
                    onClick={() => abrirNuevaTarea()}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] text-[#888] hover:text-[#B3985B] hover:border-[#B3985B]/30 transition-all text-sm font-medium"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#B3985B]/15 flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </span>
                    Nueva tarea
                  </button>
                </div>
              )}

              {tareasOrdenadas.length === 0 && !hoyGrouped ? (
                <EmptyState
                  icon={vista === "hoy" ? <Sun strokeWidth={1.5} className="w-9 h-9" /> : vista === "proximas" ? <Calendar strokeWidth={1.5} className="w-9 h-9" /> : <Inbox strokeWidth={1.5} className="w-9 h-9" />}
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
                        onDateChange={(id, val) => saveTarea(id, { fecha: val || null })}
                        onPriorityChange={(id, p) => saveTarea(id, { prioridad: p })}
                        onAssign={(id, userId) => saveTarea(id, { asignadoAId: userId })}
                        onProjectChange={(id, proyectoId) => saveTarea(id, { proyectoTareaId: proyectoId })}
                        projects={proyectosNav}
                        users={usuarios}
                        showProject draggable
                        isBeingDragged={draggingId === t.id}
                        onDragStart={setDraggingId} onDragEnd={() => setDraggingId(null)}
                        onDrop={targetId => { if (draggingId && draggingId !== targetId) moveToSubtask(draggingId, targetId); }}
                        draggingId={draggingId}
                        onReorder={(draggedId, targetId, pos) => reorderTask(draggedId, targetId, pos)}
                        multiSelected={selectedIds.has(t.id)} onMultiSelect={toggleMultiSelect}
                        onExtractChild={handleExtractChild}
                        reloadKey={syncTrigger} markSubDrag={markSubDrag}
                      />
                    ))}
                  </div>
                ))
              ) : (
                tareasOrdenadas.map(t => (
                  <TaskItem key={t.id} tarea={t} isSelected={selectedId === t.id}
                    onComplete={completeTarea} onSelect={setSelectedId} onDelete={setConfirmDeleteId}
                    onDateChange={(id, val) => saveTarea(id, { fecha: val || null })}
                    onPriorityChange={(id, p) => saveTarea(id, { prioridad: p })}
                    onAssign={(id, userId) => saveTarea(id, { asignadoAId: userId })}
                    onProjectChange={(id, proyectoId) => saveTarea(id, { proyectoTareaId: proyectoId })}
                    projects={proyectosNav}
                    users={usuarios}
                    showProject draggable
                    isBeingDragged={draggingId === t.id}
                    onDragStart={setDraggingId} onDragEnd={() => setDraggingId(null)}
                    onDrop={targetId => { if (draggingId && draggingId !== targetId) moveToSubtask(draggingId, targetId); }}
                     draggingId={draggingId}
                     onReorder={(draggedId, targetId, pos) => reorderTask(draggedId, targetId, pos)}
                    multiSelected={selectedIds.has(t.id)} onMultiSelect={toggleMultiSelect}
                    reloadKey={syncTrigger} markSubDrag={markSubDrag}
                  />
                ))
              )}
            </div>

          ) : (
            <div className="max-w-2xl mx-auto px-2 py-4 pb-24">
              {proyectoDetalle && (
                <>
                  {/* ── 2 secciones fijas e inamovibles: 1. Tareas · 2. Plan de trabajo ── */}
                  {([
                    { tipoMod: "TAREA", num: 1, titulo: "Tareas",         accent: "#9ca3af" },
                    { tipoMod: "PLAN",  num: 2, titulo: "Plan de trabajo", accent: "#34d399" },
                  ] as const).map(({ tipoMod, num, titulo, accent }) => {
                  const secciones = proyectoDetalle.secciones.filter(s => (s.tipoModulo ?? "TAREA") === tipoMod);
                  const colKey = `${proyectoDetalle.id}:${tipoMod}`;
                  const colapsada = fijasColapsadas.has(colKey);
                  return (
                  <section key={tipoMod} className="mb-8 group/fija">
                  {/* ── Encabezado fijo de la sección (colapsable) ── */}
                  <button
                    onClick={() => toggleFijaColapsada(colKey)}
                    className="w-full flex items-center gap-2 mb-3 pb-2 border-b border-[#161616] text-left group/hdr"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5"
                      className="shrink-0 group-hover/hdr:stroke-[#B3985B] transition-transform"
                      style={{ transform: colapsada ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                    <span className="w-1.5 h-4 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                    <h2 className="text-[15px] font-semibold text-white">{num}. {titulo}</h2>
                  </button>

                  {!colapsada && (
                  <>
                  {/* ── Nueva tarea (contexto de proyecto + sección fija) ── */}
                  <button
                    onClick={() => abrirNuevaTarea({
                      proyectoTareaId: proyectoDetalle.id,
                    })}
                    className="w-full flex items-center gap-2 px-3 py-2.5 mb-3 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] text-[#888] hover:text-[#B3985B] hover:border-[#B3985B]/30 transition-all text-sm font-medium"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#B3985B]/15 flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </span>
                    Nueva tarea
                  </button>

                  {/* ── Drop zone: mover a sin sección (solo aparece al arrastrar desde una sección) ── */}
                  {draggingId && secciones.some(s => s.tareas.some(t => t.id === draggingId)) && (
                    <div
                      className={`flex items-center justify-center h-9 rounded-xl border-2 border-dashed mb-2 transition-all ${
                        noSecDropOver
                          ? "border-[#B3985B]/60 bg-[#B3985B]/[0.06] text-[#B3985B]"
                          : "border-[#1e1e1e] text-[#2a2a2a]"
                      }`}
                      onDragOver={e => { e.preventDefault(); e.stopPropagation(); setNoSecDropOver(true); }}
                      onDragLeave={() => setNoSecDropOver(false)}
                      onDrop={e => {
                        e.preventDefault(); e.stopPropagation(); setNoSecDropOver(false);
                        if (!draggingId) return;
                        const idsToMove = selectedIds.has(draggingId) && selectedIds.size > 1 ? [...selectedIds] : [draggingId];
                        moveManyToNoSection(idsToMove);
                        if (idsToMove.length > 1) clearMultiSelect();
                      }}
                    >
                      <span className="text-[11px] font-medium select-none">
                        {noSecDropOver
                          ? selectedIds.has(draggingId) && selectedIds.size > 1
                            ? `→ Mover ${selectedIds.size} tareas — sin sección`
                            : "→ Quitar de sección"
                          : "↑ Soltar aquí para quitar de sección"}
                      </span>
                    </div>
                  )}

                  {/* ── Tareas sin sección ── */}
                  {groupProyTareas(applyProyFilter(proyectoDetalle.tareas, tipoMod)).map(group => (
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
                          onDateChange={(id, val) => saveTarea(id, { fecha: val || null })}
                          onPriorityChange={(id, p) => saveTarea(id, { prioridad: p })}
                          onAssign={(id, userId) => saveTarea(id, { asignadoAId: userId })}
                          onProjectChange={(id, proyectoId) => saveTarea(id, { proyectoTareaId: proyectoId })}
                          projects={proyectosNav}
                          users={usuarios}
                          draggable
                          isBeingDragged={draggingId === t.id}
                          onDragStart={setDraggingId} onDragEnd={() => setDraggingId(null)}
                          onDrop={targetId => { if (draggingId && draggingId !== targetId) moveToSubtask(draggingId, targetId); }}
                          draggingId={draggingId}
                          onReorder={(draggedId, targetId, pos) => reorderTask(draggedId, targetId, pos)}
                          multiSelected={selectedIds.has(t.id)} onMultiSelect={toggleMultiSelect}
                          onExtractChild={handleExtractChild}
                          reloadKey={syncTrigger} markSubDrag={markSubDrag}
                        />
                      ))}
                    </div>
                  ))}

                  {/* ── Secciones (sub-secciones libres de esta sección fija) ── */}
                  {secciones.map((seccion) => (
                    <SectionBlock
                      key={seccion.id} seccion={seccion} proyectoId={proyectoDetalle.id}
                      selectedId={selectedId}
                      onComplete={completeTarea} onSelect={setSelectedId} onDelete={setConfirmDeleteId}
                      onAddTarea={addTarea} draggingId={draggingId}
                      onNuevoRegistro={(secId) => abrirNuevaTarea({ proyectoTareaId: proyectoDetalle.id, seccionId: secId })}
                      ptrTargetSec={ptrTargetSec}
                      onPtrDragStart={startPtrDrag}
                      onDragStart={setDraggingId} onDragEnd={() => setDraggingId(null)}
                      onDrop={targetId => { if (draggingId && draggingId !== targetId) moveToSubtask(draggingId, targetId); }}
                      onDropSection={() => {
                        if (!draggingId) return;
                        if (selectedIds.has(draggingId) && selectedIds.size > 1) {
                          moveManyToSection([...selectedIds], seccion.id);
                          clearMultiSelect();
                        } else {
                          moveToSection(draggingId, seccion.id);
                        }
                      }}
                      onMoveToNoSection={moveToNoSection}
                      onDateChange={(id, val) => saveTarea(id, { fecha: val || null })}
                      onPriorityChange={(id, p) => saveTarea(id, { prioridad: p })}
                      onAssign={(id, userId) => saveTarea(id, { asignadoAId: userId })}
                      onProjectChange={(id, proyectoId) => saveTarea(id, { proyectoTareaId: proyectoId })}
                      users={usuarios}
                      projects={proyectosNav}
                      viewFilter={(t) => applyProyFilter(t, tipoMod)}
                      selectedIds={selectedIds} onMultiSelect={toggleMultiSelect}
                      onExtractChild={handleExtractChild}
                      reloadKey={syncTrigger} markSubDrag={markSubDrag}
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
                      onRename={async (id, nuevoNombre) => {
                        const res = await fetch(`/api/operaciones/secciones/${id}`, {
                          method: "PATCH", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ nombre: nuevoNombre }),
                        });
                        if (!res.ok) { toast.error("Error al renombrar"); return; }
                        setProyectoDetalle(prev => prev ? {
                          ...prev, secciones: prev.secciones.map(s => s.id === id ? { ...s, nombre: nuevoNombre } : s),
                        } : null);
                      }}
                      onEditDescripcion={async (id, nuevaDesc) => {
                        const res = await fetch(`/api/operaciones/secciones/${id}`, {
                          method: "PATCH", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ descripcion: nuevaDesc || null }),
                        });
                        if (!res.ok) { toast.error("Error al guardar objetivo"); return; }
                        setProyectoDetalle(prev => prev ? {
                          ...prev, secciones: prev.secciones.map(s => s.id === id ? { ...s, descripcion: nuevaDesc || null } : s),
                        } : null);
                      }}
                      onSectionDragStart={() => setDraggingSeccionId(seccion.id)}
                      onSectionDragEnd={() => { setDraggingSeccionId(null); setSeccionDropTarget(null); }}
                      onSectionDragOver={(pos) => setSeccionDropTarget({ id: seccion.id, pos })}
                      onSectionDragLeave={() => setSeccionDropTarget(null)}
                      onSectionDrop={(draggedId, pos) => { reorderSecciones(draggedId, seccion.id, pos); setDraggingSeccionId(null); setSeccionDropTarget(null); }}
                      isDraggingSection={draggingSeccionId === seccion.id}
                      isDropTarget={seccionDropTarget?.id === seccion.id}
                      dropPos={seccionDropTarget?.id === seccion.id ? seccionDropTarget.pos : undefined}
                      allSections={secciones}
                      onMoveToSection={moveToSection}
                    />
                  ))}

                  {/* ── Agregar sección (al final; se despliega suave al pasar el cursor, sin dejar hueco) ── */}
                  <div className={`overflow-hidden transition-all duration-200 ease-out ${
                    showNuevaSeccion === tipoMod
                      ? "max-h-40 opacity-100 mt-3"
                      : "max-h-0 opacity-0 mt-0 group-hover/fija:max-h-12 group-hover/fija:opacity-100 group-hover/fija:mt-3 focus-within:max-h-40 focus-within:opacity-100 focus-within:mt-3"
                  }`}>
                    {showNuevaSeccion === tipoMod ? (
                      <div className="px-3 py-3 border border-dashed border-[#2a2a2a] rounded-xl space-y-2 bg-[#0a0a0a]">
                        <input autoFocus value={nuevaSeccionNombre}
                          onChange={e => setNuevaSeccionNombre(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") addSeccion(tipoMod); if (e.key === "Escape") setShowNuevaSeccion(null); }}
                          placeholder="Nombre de la sección…"
                          className="w-full bg-transparent text-sm text-white placeholder-[#333] focus:outline-none" />
                        <div className="flex gap-3">
                          <button onClick={() => addSeccion(tipoMod)} className="text-xs text-[#B3985B] hover:underline font-medium">Crear</button>
                          <button onClick={() => setShowNuevaSeccion(null)} className="text-xs text-[#444] hover:text-white">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowNuevaSeccion(tipoMod)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#1c1c1c] text-[#3a3a3a] hover:border-[#B3985B]/40 hover:text-[#B3985B]/70 transition-colors text-xs font-medium">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Agregar sección
                      </button>
                    )}
                  </div>
                  </>
                  )}
                  </section>
                  );
                  })}
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
            className="ms-card rounded-2xl p-6 shadow-2xl w-full max-w-sm mx-4"
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
        <div className="fixed left-1/2 -translate-x-1/2 z-[80] flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-2 py-1.5 shadow-2xl shadow-black/70 select-none"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 180px)" }}>
          <button onClick={clearMultiSelect}
            className="w-7 h-7 flex items-center justify-center text-[#555] hover:text-white transition-colors rounded-lg hover:bg-[#2a2a2a]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <span className="text-xs text-[#666] font-medium px-2 border-r border-[#2a2a2a] mr-1">
            {draggingId && selectedIds.has(draggingId)
              ? `Moviendo ${selectedIds.size} tareas…`
              : `${selectedIds.size} ${selectedIds.size === 1 ? "tarea" : "tareas"} · arrastra para mover`}
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
          <div className="ms-card rounded-2xl p-6 shadow-2xl w-full max-w-sm mx-4"
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
        <div className={`fixed left-1/2 -translate-x-1/2 z-[70] pointer-events-none transition-all duration-300 ${
          addToast.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
        }`} style={{ bottom: "calc(env(safe-area-inset-bottom) + 180px)" }}>
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
        onClick={() => abrirNuevaTarea()}
        className="lg:hidden fixed right-5 z-40 w-14 h-14 rounded-full bg-[#B3985B] flex items-center justify-center shadow-[0_4px_24px_rgba(179,152,91,0.45)] active:scale-95 transition-transform"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 100px)" }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.8" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* Modal unificado "Nueva tarea" (selector de 4 tipos) */}
      <NuevaTareaModal
        open={nuevaTareaOpen}
        onClose={() => setNuevaTareaOpen(false)}
        usuarios={usuarios}
        proyectoTareaId={nuevaTareaCtx.proyectoTareaId ?? null}
        seccionId={nuevaTareaCtx.seccionId ?? null}
        tipoInicial={nuevaTareaCtx.tipoInicial ?? null}
        tituloInicial={nuevaTareaCtx.tituloInicial ?? null}
        defaultArea={nuevaTareaCtx.defaultArea ?? null}
        onCreated={handleTareaCreada}
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
            key: "menu", label: "Menú",
            icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
            onClick: () => setMobileProyectos(v => !v),
            isActive: mobileProyectos || !["bandeja", "hoy", "proximas"].includes(vistaKey as string),
          },
        ] as const).map(tab => {
          const isActive = tab.isActive;
          return (
            <button key={tab.key} onClick={tab.onClick} className="flex-1 flex items-center justify-center">
              <span className={`flex flex-col items-center gap-1 py-2 flex-1 transition-colors ${isActive ? "text-[#B3985B]" : "text-[#444]"}`}>
                {tab.icon}
                <span className="text-[10px] font-medium leading-none">{tab.label}</span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* Mobile: panel de proyectos (Explorar) */}
      {mobileProyectos && (
        <>
          <div className="fixed inset-0 z-[35] bg-black/60 lg:hidden" onClick={() => setMobileProyectos(false)} />
          <div className="lg:hidden fixed inset-x-0 z-[36] bg-[#0d0d0d] border-t border-[#1e1e1e] rounded-t-2xl max-h-[70vh] overflow-y-auto"
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 80px)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex justify-center pt-2.5 pb-2">
              <div className="w-8 h-1 rounded-full bg-[#2a2a2a]" />
            </div>
            <div className="flex items-center justify-between px-4 pb-3">
              <h2 className="text-white font-semibold text-base">Menú</h2>
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
                  className="w-full pl-9 pr-8 py-2 ms-card text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/40 transition-colors"
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
              {busqueda.trim().length >= 2 ? (() => {
                if (searchLoading) return (
                  <div className="flex justify-center py-6">
                    <div className="w-4 h-4 border border-[#333] border-t-[#B3985B] rounded-full animate-spin" />
                  </div>
                );
                const resultados = searchResults ?? [];
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
                        {t.proyectoTarea?.nombre ?? "Bandeja de entrada"}
                        {t.fecha && <> · {new Date(t.fecha + "T00:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}</>}
                      </p>
                    </div>
                  </button>
                ));
              })() : (
                <>
                  {/* Vistas de gestión operativa */}
                  <div className="flex items-center gap-2 px-4 py-2 mt-1">
                    <span className="text-[12px] text-[#555] font-semibold tracking-wide uppercase">Vistas</span>
                  </div>
                  <button onClick={() => { setVista("tratos"); setMobileProyectos(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${vistaKey === "tratos" ? "text-[#B3985B] bg-[#B3985B]/5" : "text-white hover:bg-[#111]"}`}>
                    <Handshake strokeWidth={1.6} className="w-[18px] h-[18px]" />
                    Tratos
                  </button>
                  <button onClick={() => { setVista("proyectos-evento"); setMobileProyectos(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${vistaKey === "proyectos-evento" ? "text-[#B3985B] bg-[#B3985B]/5" : "text-white hover:bg-[#111]"}`}>
                    <Calendar strokeWidth={1.6} className="w-[18px] h-[18px]" />
                    Proyectos de evento
                  </button>
                  <button onClick={() => { setVista("proyectos-empresa"); setMobileProyectos(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${vistaKey === "proyectos-empresa" ? "text-[#B3985B] bg-[#B3985B]/5" : "text-white hover:bg-[#111]"}`}>
                    <Building2 strokeWidth={1.6} className="w-[18px] h-[18px]" />
                    Proyectos de empresa
                  </button>
                  <div className="border-t border-[#141414] my-2 mx-4" />
                  {proyectosSinCarpeta.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 mt-2">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg>
                      <span className="text-[12px] text-[#555] font-semibold tracking-wide uppercase">Áreas</span>
                    </div>
                  )}
                  {proyectosSinCarpeta.map(p => {
                    const IconP = iconoParaProyecto(p.nombre);
                    return (
                    <button key={p.id} onClick={() => { setVista({ tipo: "proyecto", id: p.id }); setMobileProyectos(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${vistaKey === p.id ? "text-[#B3985B] bg-[#B3985B]/5" : "text-white hover:bg-[#111]"}`}>
                      <IconP className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} style={{ color: p.color ?? "#888" }} />
                      {p.nombre}
                    </button>
                    );
                  })}
                  {carpetas.map(c => (
                    <div key={c.id}>
                      <div className="flex items-center gap-2 px-4 py-2">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                        <span className="text-[12px] text-[#555] font-semibold tracking-wide">{c.nombre}</span>
                      </div>
                      {c.proyectos.map(p => {
                        const IconP = iconoParaProyecto(p.nombre);
                        return (
                        <button key={p.id} onClick={() => { setVista({ tipo: "proyecto", id: p.id }); setMobileProyectos(false); }}
                          className={`w-full flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm transition-colors ${vistaKey === p.id ? "text-[#B3985B] bg-[#B3985B]/5" : "text-white hover:bg-[#111]"}`}>
                          <IconP className="w-4 h-4 shrink-0" strokeWidth={1.75} style={{ color: p.color ?? "#888" }} />
                          {p.nombre}
                        </button>
                        );
                      })}
                    </div>
                  ))}
                  {proyectosSinCarpeta.length === 0 && carpetas.length === 0 && (
                    <p className="text-center text-[#444] text-sm py-8">Sin áreas aún</p>
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
            <h3 className="text-white font-semibold">Nueva área</h3>
            <div className="space-y-3">
              <input ref={proyectoInputRef} value={nuevoProyectoNombre}
                onChange={e => setNuevoProyectoNombre(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") crearProyecto(); if (e.key === "Escape") setShowNuevoProyecto(false); }}
                placeholder="Nombre del área"
                className="w-full ms-card px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]" />
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
                  className="w-full ms-card px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#B3985B]"
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
        <span className="mb-4 opacity-60 text-[#555]"><ClipboardList strokeWidth={1.5} className="w-9 h-9" /></span>
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
                  <span className="inline-flex items-center gap-1 text-xs text-[#555]">
                    <Calendar strokeWidth={1.75} className="w-3 h-3" /> {new Date(proyecto.fechaEvento.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                  {proyecto.lugarEvento && (
                    <span className="inline-flex items-center gap-1 text-xs text-[#444] truncate max-w-[180px]"><MapPin strokeWidth={1.75} className="w-3 h-3 shrink-0" /> {proyecto.lugarEvento}</span>
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
                                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                                  diff < 0  ? "bg-red-950/30 text-red-400" :
                                  diff === 0 ? "bg-emerald-950/30 text-emerald-400" :
                                  "bg-[#111] text-[#555]"
                                }`}>
                                  <Calendar strokeWidth={1.75} className="w-3 h-3" /> {diff < 0 ? `Venció hace ${Math.abs(diff)}d` : diff === 0 ? "Hoy" : new Date(t.fecha.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", { timeZone: "UTC", day: "2-digit", month: "short" })}
                                </span>
                              );
                            })()}
                            {(t as { asignadoA?: { name: string } | null }).asignadoA && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-[#444]">
                                <User strokeWidth={1.75} className="w-3 h-3" /> {(t as { asignadoA?: { name: string } | null }).asignadoA!.name}
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

// ── TratosView ───────────────────────────────────────────────────────────────
// Espejo de ProyectosEventoView para tratos de venta. Agrupa las tareas ad-hoc
// (tipoOrigen TRATO) por trato, con enlace al detalle del trato en el CRM.

interface TratosViewProps {
  tratos: TratoConTareas[];
  selectedId: string | null;
  onSelectTarea: (id: string) => void;
  onCompleteTarea: (id: string) => void;
  onRefresh: () => void;
}

function TratosView({ tratos, selectedId, onSelectTarea, onCompleteTarea, onRefresh }: TratosViewProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleCollapse(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (tratos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span className="mb-4 opacity-60 text-[#555]"><Handshake strokeWidth={1.5} className="w-9 h-9" /></span>
        <p className="text-sm font-medium text-[#444]">Sin tratos con tareas</p>
        <p className="text-xs text-[#333] mt-1">Agrega tareas a un trato desde su detalle en el CRM</p>
        <Link href="/crm/tratos" className="mt-4 text-xs text-[#B3985B] hover:underline">
          Ir a Tratos →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#444]">
          {tratos.length} trato{tratos.length !== 1 ? "s" : ""} con tareas activas
        </p>
        <button onClick={onRefresh} className="text-xs text-[#333] hover:text-[#B3985B] transition-colors flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Actualizar
        </button>
      </div>

      {tratos.map(trato => {
        const isCollapsed = collapsed.has(trato.id);
        const total       = trato.tareas.length;
        const completadas = trato.tareas.filter(t => t.estado === "COMPLETADA").length;
        const pct         = total > 0 ? Math.round((completadas / total) * 100) : 0;
        const activas     = trato.tareas.filter(t => t.estado !== "COMPLETADA" && t.estado !== "CANCELADA");
        const nombre      = trato.nombreEvento || trato.cliente?.nombre || "Trato sin nombre";

        return (
          <div key={trato.id} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleCollapse(trato.id)}
              className="w-full flex items-start gap-3 px-5 py-4 hover:bg-[#111] transition-colors text-left group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#B3985B]/10 text-[#B3985B]">
                    {trato.etapa}
                  </span>
                </div>
                <h3 className="text-white font-semibold text-sm mt-1.5 group-hover:text-[#B3985B] transition-colors">
                  {nombre}
                </h3>
                {trato.cliente && (
                  <div className="flex items-center gap-3 mt-1">
                    <span className="inline-flex items-center gap-1 text-xs text-[#555]">
                      <User strokeWidth={1.75} className="w-3 h-3" /> {trato.cliente.nombre}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className={`text-xs font-semibold ${pct === 100 ? "text-green-400" : "text-[#B3985B]"}`}>{pct}%</p>
                  <p className="text-[10px] text-[#444]">{completadas}/{total}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round"
                  className={`transition-transform duration-200 ${isCollapsed ? "rotate-0" : "rotate-180"}`}>
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
              </div>
            </button>

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
                        <button
                          onClick={e => { e.stopPropagation(); onCompleteTarea(t.id); }}
                          title="Marcar como completada"
                          className="mt-0.5 w-4 h-4 rounded-full border border-[#2a2a2a] hover:border-green-500 flex items-center justify-center text-[8px] text-transparent hover:text-green-400 transition-all flex-shrink-0"
                        >
                          ✓
                        </button>
                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
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
                                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                                  diff < 0  ? "bg-red-950/30 text-red-400" :
                                  diff === 0 ? "bg-emerald-950/30 text-emerald-400" :
                                  "bg-[#111] text-[#555]"
                                }`}>
                                  <Calendar strokeWidth={1.75} className="w-3 h-3" /> {diff < 0 ? `Venció hace ${Math.abs(diff)}d` : diff === 0 ? "Hoy" : new Date(t.fecha.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", { timeZone: "UTC", day: "2-digit", month: "short" })}
                                </span>
                              );
                            })()}
                            {(t as { asignadoA?: { name: string } | null }).asignadoA && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-[#444]">
                                <User strokeWidth={1.75} className="w-3 h-3" /> {(t as { asignadoA?: { name: string } | null }).asignadoA!.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div className="pt-1 px-1">
                  <Link
                    href={`/crm/tratos/${trato.id}`}
                    onClick={e => e.stopPropagation()}
                    className="text-[11px] text-[#333] hover:text-[#B3985B] transition-colors flex items-center gap-1"
                  >
                    Ver el trato en el CRM
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

// ── ProyectosEmpresaView ─────────────────────────────────────────────────────
// Espejo de ProyectosEventoView para proyectos internos de la empresa.
// Agrupa las tareas por proyecto interno, con enlace al detalle en el módulo.

const AREA_BADGE_COLOR: Record<string, string> = {
  DIRECCION:      "bg-amber-950/40 text-amber-400",
  ADMINISTRACION: "bg-teal-950/40 text-teal-400",
  MARKETING:      "bg-pink-950/40 text-pink-400",
  VENTAS:         "bg-blue-950/40 text-blue-400",
  PRODUCCION:     "bg-purple-950/40 text-purple-400",
};

interface ProyectosEmpresaViewProps {
  proyectos: ProyectoInternoConTareas[];
  selectedId: string | null;
  onSelectTarea: (id: string) => void;
  onCompleteTarea: (id: string) => void;
  onRefresh: () => void;
}

function ProyectosEmpresaView({ proyectos, selectedId, onSelectTarea, onCompleteTarea, onRefresh }: ProyectosEmpresaViewProps) {
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
        <span className="mb-4 opacity-60 text-[#555]"><Building2 strokeWidth={1.5} className="w-9 h-9" /></span>
        <p className="text-sm font-medium text-[#444]">Sin proyectos de empresa con tareas</p>
        <p className="text-xs text-[#333] mt-1">Agrega tareas a un proyecto interno desde su detalle</p>
        <Link href="/proyectos-de-empresa" className="mt-4 text-xs text-[#B3985B] hover:underline">
          Ir a Proyectos de empresa →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
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
        const areaColor   = AREA_BADGE_COLOR[proyecto.area?.toUpperCase()] ?? "bg-gray-800 text-gray-400";

        return (
          <div key={proyecto.id} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleCollapse(proyecto.id)}
              className="w-full flex items-start gap-3 px-5 py-4 hover:bg-[#111] transition-colors text-left group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${areaColor}`}>
                    {proyecto.area}
                  </span>
                </div>
                <h3 className="text-white font-semibold text-sm mt-1.5 group-hover:text-[#B3985B] transition-colors">
                  {proyecto.nombre}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  {proyecto.lider && (
                    <span className="inline-flex items-center gap-1 text-xs text-[#555]">
                      <User strokeWidth={1.75} className="w-3 h-3" /> {proyecto.lider.name}
                    </span>
                  )}
                  {proyecto.fechaFin && (
                    <span className="inline-flex items-center gap-1 text-xs text-[#444]">
                      <Calendar strokeWidth={1.75} className="w-3 h-3" /> {new Date(proyecto.fechaFin.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className={`text-xs font-semibold ${pct === 100 ? "text-green-400" : "text-[#B3985B]"}`}>{pct}%</p>
                  <p className="text-[10px] text-[#444]">{completadas}/{total}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round"
                  className={`transition-transform duration-200 ${isCollapsed ? "rotate-0" : "rotate-180"}`}>
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
              </div>
            </button>

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
                        <button
                          onClick={e => { e.stopPropagation(); onCompleteTarea(t.id); }}
                          title="Marcar como completada"
                          className="mt-0.5 w-4 h-4 rounded-full border border-[#2a2a2a] hover:border-green-500 flex items-center justify-center text-[8px] text-transparent hover:text-green-400 transition-all flex-shrink-0"
                        >
                          ✓
                        </button>
                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
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
                                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                                  diff < 0  ? "bg-red-950/30 text-red-400" :
                                  diff === 0 ? "bg-emerald-950/30 text-emerald-400" :
                                  "bg-[#111] text-[#555]"
                                }`}>
                                  <Calendar strokeWidth={1.75} className="w-3 h-3" /> {diff < 0 ? `Venció hace ${Math.abs(diff)}d` : diff === 0 ? "Hoy" : new Date(t.fecha.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", { timeZone: "UTC", day: "2-digit", month: "short" })}
                                </span>
                              );
                            })()}
                            {(t as { asignadoA?: { name: string } | null }).asignadoA && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-[#444]">
                                <User strokeWidth={1.75} className="w-3 h-3" /> {(t as { asignadoA?: { name: string } | null }).asignadoA!.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div className="pt-1 px-1">
                  <Link
                    href={`/proyectos-de-empresa/${proyecto.id}`}
                    onClick={e => e.stopPropagation()}
                    className="text-[11px] text-[#333] hover:text-[#B3985B] transition-colors flex items-center gap-1"
                  >
                    Ver el proyecto de empresa
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

function SideItem({ icon, label, isActive, onClick, count, countColor }: {
  icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void; count?: number; countColor?: string;
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
        <span
          className="text-[11px] font-semibold min-w-[18px] text-center rounded-full px-1"
          style={{ color: countColor ?? (isActive ? "#B3985B" : "#444") }}
        >{count}</span>
      )}
    </button>
  );
}

// ── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="mb-4 opacity-60 text-[#555]">{icon}</span>
      <p className="text-sm font-medium text-[#444]">{title}</p>
      {sub && <p className="text-xs text-[#2a2a2a] mt-1">{sub}</p>}
    </div>
  );
}

// ── NavProyecto ─────────────────────────────────────────────────────────────

// Elige un icono según lo que representa el nombre del área/proyecto. La primera
// regla que coincide gana, así que el orden importa (lo específico va antes que lo genérico).
const PROYECTO_ICON_RULES: { re: RegExp; Icon: LucideIcon }[] = [
  { re: /ilumina|luz|luces/i,                                              Icon: Lightbulb },
  { re: /audio|sonido|m[uú]sica/i,                                         Icon: Music },
  { re: /v[ií]deo|pantalla|led|proyecci[oó]n/i,                            Icon: Video },
  { re: /dise[ñn]|gr[aá]fic|identidad|marca|branding|creativ/i,           Icon: Palette },
  { re: /marketing|contenido|redes|social|public|campa[ñn]|difus/i,       Icon: Megaphone },
  { re: /venta|comercial|cuenta|prospec|cliente|cotiza|contrato/i,        Icon: Handshake },
  { re: /rrhh|recursos humanos|talento|personal|n[oó]mina|reclut/i,       Icon: Users },
  { re: /admin|finanz|contab|cobr|pago|factur|tesor|presupuest/i,         Icon: Calculator },
  { re: /direcc|estrateg|gobierno|negocio|consejo|alianza/i,              Icon: Target },
  { re: /producci|montaje|t[eé]cni|rigging|escenario|monta/i,            Icon: Wrench },
  { re: /inventario|almac|stock|equipo|activo|bodega/i,                    Icon: Package },
  { re: /compra|proveedor|orden|abastec/i,                                 Icon: ShoppingCart },
  { re: /oficina|servicio|inmueble|instalac/i,                            Icon: Building2 },
  { re: /legal|riesgo|cumplimiento|jur[ií]dic/i,                          Icon: Scale },
  { re: /evento|show|concierto|festival|producci[oó]n de evento/i,        Icon: Calendar },
  { re: /reporte|document|archivo|control|bit[aá]cora/i,                   Icon: FileText },
];

function iconoParaProyecto(nombre: string): LucideIcon {
  for (const { re, Icon } of PROYECTO_ICON_RULES) if (re.test(nombre)) return Icon;
  return Folder;
}

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

  const Icon = iconoParaProyecto(proyecto.nombre);

  if (editing) return (
    <div className="flex items-center gap-1.5 px-2 py-0.5" style={{ paddingLeft: `${indent * 4}px` }}>
      <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} style={{ color: proyecto.color ?? "#888" }} />
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
        <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75}
          style={{ color: proyecto.color ?? (isActive ? "#B3985B" : "#666") }} />
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


// ── SectionBlock ───────────────────────────────────────────────────────────────────────────────

function SectionBlock({
  seccion, proyectoId, selectedId,
  onComplete, onSelect, onDelete, onAddTarea, onNuevoRegistro,
  onToggleCollapse, onDeleteSection, onRename, onEditDescripcion,
  draggingId, onDragStart, onDragEnd, onDrop, onDropSection,
  onPriorityChange, onAssign, onProjectChange, users, projects, viewFilter,
  selectedIds, onMultiSelect, onExtractChild, onMoveToNoSection,
  allSections, onMoveToSection,
  reloadKey, markSubDrag,
  ptrTargetSec, onPtrDragStart, onDateChange,
  // Section-level DnD
  onSectionDragStart, onSectionDragEnd,
  onSectionDragOver, onSectionDragLeave, onSectionDrop,
  isDraggingSection, isDropTarget, dropPos,
}: {
  seccion: SeccionDetalle;
  proyectoId: string;
  selectedId: string | null;
  onComplete: (id: string) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAddTarea: (data: {
    titulo: string; descripcion: string | null; fecha: string | null; fechaVencimiento: string | null;
    prioridad: string; area: string; recurrencia: string | null;
    proyectoTareaId: string | null; seccionId: string | null; parentId: string | null;
    asignadoAId: string | null;
  }) => void;
  onNuevoRegistro?: (seccionId: string) => void;
  onToggleCollapse: (id: string, colapsada: boolean) => void;
  onDeleteSection: (id: string) => void;
  onRename: (id: string, nombre: string) => Promise<void>;
  onEditDescripcion?: (id: string, descripcion: string) => Promise<void>;
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
  allSections?:       SeccionDetalle[];
  onMoveToSection?:   (taskId: string, seccionId: string) => void;
  reloadKey?:         number;
  markSubDrag?:       (active: boolean) => void;
  ptrTargetSec?:      string | null;
  onPtrDragStart?:    (taskId: string, title: string) => void;
  onDateChange?:      (id: string, value: string) => void;
  // Section-level DnD props
  onSectionDragStart?: () => void;
  onSectionDragEnd?:   () => void;
  onSectionDragOver?:  (pos: "before" | "after") => void;
  onSectionDragLeave?: () => void;
  onSectionDrop?:      (draggedId: string, pos: "before" | "after") => void;
  isDraggingSection?:  boolean;
  isDropTarget?:       boolean;
  dropPos?:            "before" | "after";
}) {
  const [hov,        setHov]        = useState(false);
  const [headerOver, setHeaderOver] = useState(false);
  // Inline rename state
  const [editando,   setEditando]   = useState(false);
  const [editNombre, setEditNombre] = useState(seccion.nombre);
  const inputRef = useRef<HTMLInputElement>(null);
  // Inline objetivo/descripción state
  const [editandoDesc, setEditandoDesc] = useState(false);
  const [editDesc,     setEditDesc]     = useState(seccion.descripcion ?? "");
  const descRef = useRef<HTMLTextAreaElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editando && inputRef.current) inputRef.current.focus();
  }, [editando]);
  useEffect(() => {
    if (editandoDesc && descRef.current) { descRef.current.focus(); descRef.current.select(); }
  }, [editandoDesc]);

  async function guardarNombre() {
    const nuevo = editNombre.trim();
    if (!nuevo || nuevo === seccion.nombre) { setEditando(false); setEditNombre(seccion.nombre); return; }
    setEditando(false);
    await onRename(seccion.id, nuevo);
  }

  async function guardarDesc() {
    const nuevo = editDesc.trim();
    setEditandoDesc(false);
    if (nuevo === (seccion.descripcion ?? "").trim()) { setEditDesc(seccion.descripcion ?? ""); return; }
    await onEditDescripcion?.(seccion.id, nuevo);
  }

  // Is the dragged task FROM this section?
  const isDraggingFromHere = !!draggingId && seccion.tareas.some(t => t.id === draggingId);
  // Is there an active cross-section drag?
  const isCrossDrag = !!draggingId && !isDraggingFromHere;
  const isPtrTarget = ptrTargetSec === seccion.id && !!draggingId && !isDraggingFromHere;

  return (
    <div
      className={`mt-5 rounded-2xl transition-all duration-150
        ${isPtrTarget ? "ring-2 ring-[#B3985B] ring-offset-1 ring-offset-[#0a0a0a] bg-[#B3985B]/5" : ""}
        ${isDraggingSection ? "opacity-40" : ""}
      `}
      data-section-id={seccion.id}
      onDragOver={e => {
        // Only handle section-level DnD, not task DnD
        if (!e.dataTransfer.types.includes("dragsectionid")) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const pos: "before" | "after" = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
        onSectionDragOver?.(pos);
      }}
      onDragLeave={e => {
        if (!e.dataTransfer.types.includes("dragsectionid")) return;
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          onSectionDragLeave?.();
        }
      }}
      onDrop={e => {
        const draggedId = e.dataTransfer.getData("dragsectionid");
        if (!draggedId) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const pos: "before" | "after" = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
        onSectionDrop?.(draggedId, pos);
      }}
    >
      {/* ── Drop indicator: BEFORE ── */}
      <div className={`overflow-hidden transition-all duration-150 ${
        isDropTarget && dropPos === "before" ? "max-h-2 opacity-100" : "max-h-0 opacity-0"
      }`}>
        <div className="h-0.5 bg-[#B3985B] rounded-full mx-2 shadow-[0_0_8px_#B3985B66]" />
      </div>

      {/* ── Pointer-drag drop banner — animated so it slides in smoothly ── */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${isPtrTarget ? "max-h-20 mb-2 opacity-100" : "max-h-0 mb-0 opacity-0"}`}
        style={{ willChange: "max-height" }}
      >
        <div className="flex items-center justify-center gap-2.5 h-14 rounded-xl bg-[#B3985B] text-black text-sm font-bold select-none shadow-lg shadow-[#B3985B]/20">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
          Soltar en &ldquo;{seccion.nombre}&rdquo;
        </div>
      </div>

      {/* Section header */}
      <div
        className={`flex items-center gap-2 group cursor-pointer mb-1 mt-1 px-2 py-2 rounded-lg border-b border-[#161616] transition-all ${
          headerOver && !isCrossDrag ? "bg-[#B3985B]/10 ring-1 ring-[#B3985B]/40" : ""
        }`}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        onClick={e => {
          if ((e.target as HTMLElement).closest("button,input,[draggable]")) return;
          if (!editando) onToggleCollapse(seccion.id, !seccion.colapsada);
        }}
        onDragOver={e => { if (!draggingId) return; e.preventDefault(); e.stopPropagation(); setHeaderOver(true); }}
        onDragLeave={() => setHeaderOver(false)}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); setHeaderOver(false); onDropSection?.(); }}
      >
        {/* Collapse chevron */}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={headerOver ? "#B3985B" : "#555"} strokeWidth="2.5"
          style={{ transform: seccion.colapsada ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s", flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>

        {/* Drag handle — siempre ocupa espacio (sin reflujo); solo cambia opacidad al pasar el cursor */}
        <div
          draggable={!editando}
          onDragStart={e => {
            e.stopPropagation();
            e.dataTransfer.setData("dragsectionid", seccion.id);
            e.dataTransfer.effectAllowed = "move";
            onSectionDragStart?.();
          }}
          onDragEnd={e => {
            e.stopPropagation();
            onSectionDragEnd?.();
          }}
          onClick={e => e.stopPropagation()}
          title="Arrastrar para reordenar"
          className={`cursor-grab active:cursor-grabbing text-[#3a3a3a] hover:text-[#777] transition-opacity p-0.5 shrink-0 select-none ${
            hov && !editando ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* 6-dot grip icon */}
          <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
            <circle cx="2.5" cy="2"  r="1.2"/>
            <circle cx="7.5" cy="2"  r="1.2"/>
            <circle cx="2.5" cy="6"  r="1.2"/>
            <circle cx="7.5" cy="6"  r="1.2"/>
            <circle cx="2.5" cy="10" r="1.2"/>
            <circle cx="7.5" cy="10" r="1.2"/>
          </svg>
        </div>

        {/* Section name: editable input OR static text */}
        {editando ? (
          <input
            ref={inputRef}
            value={editNombre}
            onChange={e => setEditNombre(e.target.value)}
            onBlur={guardarNombre}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); guardarNombre(); }
              if (e.key === "Escape") { setEditando(false); setEditNombre(seccion.nombre); }
            }}
            onClick={e => e.stopPropagation()}
            className="text-sm font-semibold text-white bg-[#1a1a1a] border border-[#B3985B]/50 rounded px-2 py-0.5 outline-none w-40 max-w-full"
          />
        ) : (
          <span className={`text-[15px] font-semibold transition-colors ${
            headerOver ? "text-[#B3985B]" : "text-[#d0d0d0] group-hover:text-white"
          }`}>
            {seccion.nombre}
          </span>
        )}

        {!headerOver && !editando && (() => {
          const visible = viewFilter ? viewFilter(seccion.tareas) : seccion.tareas;
          return visible.length > 0
            ? <span className="min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full bg-[#161616] text-[11px] font-semibold text-[#666]">{visible.length}</span>
            : null;
        })()}

        {/* Action buttons: rename + delete */}
        {hov && !headerOver && !editando && (
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={e => { e.stopPropagation(); setEditDesc(seccion.descripcion ?? ""); setEditandoDesc(true); }}
              className="text-[#333] hover:text-[#B3985B] p-0.5 transition-colors"
              title={seccion.descripcion ? "Editar objetivo" : "Agregar objetivo"}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>
              </svg>
            </button>
            <button
              onClick={e => { e.stopPropagation(); setEditando(true); setEditNombre(seccion.nombre); }}
              className="text-[#333] hover:text-[#B3985B] p-0.5 transition-colors"
              title="Renombrar sección"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button onClick={e => { e.stopPropagation(); onDeleteSection(seccion.id); }}
              className="text-[#333] hover:text-red-400 p-0.5 transition-colors" title="Eliminar sección">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Objetivo / descripción de la sección — editable inline */}
      {editandoDesc ? (
        <div className="pl-[30px] pr-2 -mt-0.5 mb-1.5">
          <textarea
            ref={descRef}
            value={editDesc}
            onChange={e => setEditDesc(e.target.value)}
            onBlur={guardarDesc}
            onKeyDown={e => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); guardarDesc(); }
              if (e.key === "Escape") { setEditandoDesc(false); setEditDesc(seccion.descripcion ?? ""); }
            }}
            onClick={e => e.stopPropagation()}
            rows={2}
            placeholder="Objetivo de la sección…"
            className="w-full text-[12.5px] leading-snug text-[#bbb] bg-[#141414] border border-[#B3985B]/40 rounded-md px-2 py-1.5 outline-none resize-none"
          />
          <div className="text-[10px] text-[#555] mt-0.5">⌘/Ctrl + Enter para guardar · Esc para cancelar</div>
        </div>
      ) : seccion.descripcion ? (
        <p
          onClick={e => { e.stopPropagation(); setEditDesc(seccion.descripcion ?? ""); setEditandoDesc(true); }}
          className="pl-[30px] pr-2 -mt-0.5 mb-1.5 text-[12.5px] leading-snug text-[#8a8a8a] cursor-text hover:text-[#aaa] transition-colors"
          title="Editar objetivo"
        >
          {seccion.descripcion}
        </p>
      ) : hov ? (
        <button
          onClick={e => { e.stopPropagation(); setEditDesc(""); setEditandoDesc(true); }}
          className="pl-[30px] pr-2 -mt-0.5 mb-1.5 block text-[12px] text-[#4a4a4a] hover:text-[#B3985B] transition-colors"
        >
          + Agregar objetivo
        </button>
      ) : null}

      {!seccion.colapsada && (
        <>
          {(viewFilter ? viewFilter(seccion.tareas) : seccion.tareas).map(t => (
            <TaskItem key={t.id} tarea={t} isSelected={selectedId === t.id}
              onComplete={onComplete} onSelect={onSelect} onDelete={onDelete}
              onDateChange={onDateChange}
              onPriorityChange={onPriorityChange}
              onAssign={onAssign}
              onProjectChange={onProjectChange}
              users={users}
              projects={projects}
              draggable={!!draggingId || true}
              isBeingDragged={draggingId === t.id}
              onDragStart={onDragStart} onDragEnd={onDragEnd}
              onDrop={targetId => { if (draggingId && draggingId !== targetId) onDrop(targetId); }}
              draggingId={draggingId}
              multiSelected={selectedIds?.has(t.id)} onMultiSelect={onMultiSelect}
              onExtractChild={onExtractChild}
              onMoveToNoSection={onMoveToNoSection}
              availableSections={allSections?.filter(s => s.id !== seccion.id)}
              onMoveToSection={onMoveToSection}
              onPtrDragStart={onPtrDragStart}
              reloadKey={reloadKey} markSubDrag={markSubDrag}
            />
          ))}
          <button
            onClick={() => onNuevoRegistro?.(seccion.id)}
            className="w-full flex items-center gap-2 px-3 py-2 mt-1 rounded-lg text-[#555] hover:text-[#B3985B] transition-colors text-[13px]"
          >
            <span className="w-4 h-4 rounded-full bg-[#B3985B]/15 flex items-center justify-center shrink-0">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </span>
            Nueva tarea en {seccion.nombre}
          </button>
        </>
      )}

      {/* ── Drop indicator: AFTER ── */}
      <div className={`overflow-hidden transition-all duration-150 ${
        isDropTarget && dropPos === "after" ? "max-h-2 opacity-100" : "max-h-0 opacity-0"
      }`}>
        <div className="h-0.5 bg-[#B3985B] rounded-full mx-2 mt-1 shadow-[0_0_8px_#B3985B66]" />
      </div>
    </div>
  );
}
