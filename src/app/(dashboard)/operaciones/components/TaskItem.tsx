"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { formatearRecurrencia } from "@/lib/recurrencia";
import DatePicker from "@/components/ui/DatePicker";
import { BadgeDias } from "@/components/ui/BadgeDias";

export interface TareaItem {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: string;
  area: string;
  estado: string;
  fecha: string | null;
  recurrencia: string | null;
  proyectoTarea: { id: string; nombre: string; color: string | null } | null;
  seccion: { id: string; nombre: string } | null;
  asignadoA: { id: string; name: string } | null;
  juntaOrigenId?: string | null;
  juntaOrigen?: { id: string; area: string; fecha: string } | null;
  _count: { subtareas: number; comentarios: number; archivos: number };
  createdAt: string;
  fechaCompletada?: string | null;
  // Campos de contexto de delegación (opcionales — sólo presentes cuando se carga el detalle)
  paraQueSirve?: string | null;
  quePasaSiNoSeHace?: string | null;
  dondeSeEjecuta?: string | null;
  pasos?: unknown;
}

const PRIO: Record<string, { ring: string; dot: string; glow: string }> = {
  URGENTE: { ring: "border-red-500/70",    dot: "bg-red-500",    glow: "shadow-red-500/30" },
  ALTA:    { ring: "border-orange-500/70", dot: "bg-orange-500", glow: "shadow-orange-500/30" },
  MEDIA:   { ring: "border-[#B3985B]/60",  dot: "bg-[#B3985B]",  glow: "shadow-[#B3985B]/20" },
  BAJA:    { ring: "border-[#2a2a2a]",     dot: "bg-[#333]",     glow: "" },
};

const PRIO_OPTIONS = [
  { key: "URGENTE", label: "Urgente",  color: "#f87171" },
  { key: "ALTA",    label: "Alta",     color: "#fb923c" },
  { key: "MEDIA",   label: "Media",    color: "#B3985B" },
  { key: "BAJA",    label: "Baja",     color: "#4b5563" },
];

// ── Umbral de indentación para detectar "hacer subtarea" (px desde el borde izq del row) ──
const SUBTASK_INDENT_THRESHOLD = 18;

function formatFecha(iso: string): { label: string; cls: string } {
  const d   = new Date(iso.substring(0, 10) + "T00:00:00");
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const man = new Date(hoy); man.setDate(hoy.getDate() + 1);
  const sem = new Date(hoy); sem.setDate(hoy.getDate() + 7);

  if (d < hoy)  return { label: d.toLocaleDateString("es-MX", { month: "short", day: "numeric" }), cls: "text-red-400 bg-red-950/30" };
  if (d < man)  return { label: "Hoy",    cls: "text-emerald-400 bg-emerald-950/30" };
  if (d < new Date(man.getTime() + 86400000)) return { label: "Mañana", cls: "text-yellow-400 bg-yellow-950/20" };
  if (d <= sem) return { label: d.toLocaleDateString("es-MX", { weekday: "short" }), cls: "text-[#777] bg-[#111]" };
  return { label: d.toLocaleDateString("es-MX", { month: "short", day: "numeric" }), cls: "text-[#666] bg-[#0f0f0f]" };
}

interface Props {
  tarea: TareaItem;
  onComplete:        (id: string) => void;
  onSelect:          (id: string) => void;
  onDelete:          (id: string) => void;
  onDateChange?:     (id: string, value: string) => void;
  onPriorityChange?: (id: string, prioridad: string) => void;
  onAssign?:         (id: string, userId: string | null) => void;
  onProjectChange?:  (id: string, proyectoId: string | null) => void;
  users?:            { id: string; name: string }[];
  projects?:         { id: string; nombre: string; color: string | null }[];
  isSelected:        boolean;
  showProject?:      boolean;
  depth?:            number;
  draggable?:        boolean;
  onDragStart?:      (id: string) => void;
  onDragEnd?:        () => void;
  onDrop?:           (targetId: string) => void;
  onReorder?:        (draggedId: string, targetId: string, position: "above" | "below") => void;
  isDragOver?:       boolean;
  isBeingDragged?:   boolean;
  multiSelected?:    boolean;
  onMultiSelect?:    (id: string) => void;
  onExtract?:        () => void;
  onExtractChild?:   (tarea: TareaItem) => void;
  onMoveToNoSection?: (id: string) => void;
  draggingId?:        string | null;
  availableSections?: { id: string; nombre: string }[];
  onMoveToSection?:   (taskId: string, seccionId: string) => void;
  onPtrDragStart?:    (taskId: string, title: string) => void;
}

function ActionBtn({ title, onClick, children, active }: {
  title: string; onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode; active?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all
        ${active
          ? "bg-[#B3985B]/15 text-[#B3985B]"
          : "text-[#3a3a3a] hover:text-[#aaa] hover:bg-[#1a1a1a]"
        }`}
    >
      {children}
    </button>
  );
}

type DropZone = "above" | "subtask" | "below" | null;

export default function TaskItem({
  tarea, onComplete, onSelect, onDelete, onDateChange,
  onPriorityChange, onAssign, onProjectChange, users = [], projects = [],
  isSelected, showProject = false, depth = 0,
  draggable: isDraggable = false,
  onDragStart, onDragEnd, onDrop, onReorder,
  isDragOver = false, isBeingDragged = false,
  multiSelected = false, onMultiSelect,
  onExtract, onExtractChild, onMoveToNoSection,
  draggingId, availableSections, onMoveToSection, onPtrDragStart,
}: Props) {
  const [hovered,       setHovered]       = useState(false);
  const [completing,    setCompleting]    = useState(false);
  const [dropZone,      setDropZone]      = useState<DropZone>(null);
  const [editingDate,   setEditingDate]   = useState<"fecha" | null>(null);
  const [localFecha,    setLocalFecha]    = useState(tarea.fecha ? tarea.fecha.substring(0, 10) : "");
  // Keep local date in sync when parent prop changes
  useEffect(() => { setLocalFecha(tarea.fecha ? tarea.fecha.substring(0, 10) : ""); }, [tarea.fecha]);
  const [expanded,      setExpanded]      = useState(false);
  const [subtareasExp,  setSubtareasExp]  = useState<TareaItem[]>([]);
  const [loadingExp,    setLoadingExp]    = useState(false);
  const [subtaskCount,  setSubtaskCount]  = useState(tarea._count.subtareas);
  useEffect(() => { setSubtaskCount(tarea._count.subtareas); }, [tarea._count.subtareas]);
  const [showMore,      setShowMore]      = useState(false);
  const [showAssign,    setShowAssign]    = useState(false);
  const [showProyecto,  setShowProyecto]  = useState(false);
  const [showSecciones, setShowSecciones] = useState(false);
  const [subtaskDraggingId, setSubtaskDraggingId] = useState<string | null>(null);
  const [extractDropOver,   setExtractDropOver]   = useState(false);
  const [aboveLine,         setAboveLine]         = useState(false); // reorder strip above row

  const rowRef          = useRef<HTMLDivElement>(null);
  const justDraggedRef  = useRef(false);
  const moreRef         = useRef<HTMLDivElement>(null);
  const assignRef       = useRef<HTMLDivElement>(null);
  const mobileAssignRef = useRef<HTMLDivElement>(null);
  const proyectoRef     = useRef<HTMLDivElement>(null);

  const isCompleted = tarea.estado === "COMPLETADA";
  const actionsVisible = hovered || isSelected || showMore || showAssign || showProyecto || !!editingDate;

  const getDropZone = useCallback((_e: React.DragEvent): DropZone => {
    // The entire row is always a subtask drop target.
    // Reorder (above/below) is handled by separate gap zones between rows.
    return "subtask";
  }, []);

  useEffect(() => {
    if (!showMore && !showAssign && !showProyecto) return;
    function handle(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMore(false);
      if (
        assignRef.current && !assignRef.current.contains(e.target as Node) &&
        (!mobileAssignRef.current || !mobileAssignRef.current.contains(e.target as Node))
      ) setShowAssign(false);
      if (proyectoRef.current && !proyectoRef.current.contains(e.target as Node)) setShowProyecto(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showMore, showAssign, showProyecto]);

  async function toggleSubtareas(e: React.MouseEvent) {
    e.stopPropagation();
    if (!expanded && subtareasExp.length === 0) {
      setLoadingExp(true);
      const res  = await fetch(`/api/tareas?parentId=${tarea.id}`, { cache: "no-store" });
      const data = await res.json();
      setSubtareasExp(data.tareas ?? []);
      setLoadingExp(false);
    }
    setExpanded(prev => !prev);
  }

  async function handleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    if (isCompleted || completing) return;
    setCompleting(true);
    await onComplete(tarea.id);
  }

  const prio     = PRIO[tarea.prioridad] ?? PRIO.BAJA;
  const fecha = tarea.fecha ? formatFecha(tarea.fecha) : null;
  const showDrop = isDragOver;

  const recurrenciaDisplay = (() => {
    if (!tarea.recurrencia) return null;
    try { return formatearRecurrencia(JSON.parse(tarea.recurrencia)); } catch { return null; }
  })();

  const dropIndicatorAbove   = dropZone === "above"   && !isBeingDragged;
  const dropIndicatorBelow   = dropZone === "below"   && !isBeingDragged;
  const dropIndicatorSubtask = dropZone === "subtask" && !isBeingDragged;

  return (
  <>
    {/* ── Reorder strip: 12px invisible zone above the row ── */}
    {isDraggable && onReorder && !isBeingDragged && (
      <div
        className="relative h-3 -mb-1 z-20"
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); setAboveLine(true); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setAboveLine(false); }}
        onDrop={e => {
          e.preventDefault(); e.stopPropagation();
          setAboveLine(false);
          if (!draggingId || draggingId === tarea.id) return;
          onReorder(draggingId, tarea.id, "above");
        }}
      >
        {aboveLine && (
          <>
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#B3985B] rounded-full shadow-[0_0_6px_rgba(179,152,91,0.6)] pointer-events-none" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#B3985B] -ml-1 shadow-[0_0_6px_rgba(179,152,91,0.8)] pointer-events-none" />
          </>
        )}
      </div>
    )}

    <div
      ref={rowRef}
      role="button" tabIndex={0} aria-selected={isSelected}
      draggable={isDraggable}
      data-task-id={isDraggable ? tarea.id : undefined}
      className={`group relative flex items-start gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all duration-100 outline-none select-none ${
        isBeingDragged ? "opacity-30 scale-[0.98]" : ""
      } ${
        dropIndicatorSubtask
          ? "bg-[#B3985B]/[0.07] ring-2 ring-[#B3985B]/50 shadow-lg shadow-[#B3985B]/5 border-l-2 border-[#B3985B]/70"
          : showDrop
          ? "bg-[#B3985B]/[0.07] ring-2 ring-[#B3985B]/50 shadow-lg shadow-[#B3985B]/5 border-l-2 border-[#B3985B]/70"
          : multiSelected ? "bg-[#B3985B]/[0.07] ring-1 ring-[#B3985B]/30 border-l-2 border-[#B3985B]/50"
          : isSelected   ? "bg-[#111] ring-1 ring-[#B3985B]/20"
          : hovered      ? "bg-[#0d0d0d]" : ""
      }`}
      style={{ paddingLeft: depth > 0 ? `${12 + depth * 22}px` : undefined }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={e => {
        if (justDraggedRef.current) { justDraggedRef.current = false; return; }
        if ((e.metaKey || e.ctrlKey) && onMultiSelect) { onMultiSelect(tarea.id); return; }
        onSelect(tarea.id);
      }}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onSelect(tarea.id); }}
      onDragStart={isDraggable ? e => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", tarea.id); onDragStart?.(tarea.id); } : undefined}
      onDragEnd={isDraggable ? () => { onDragEnd?.(); setDropZone(null); } : undefined}
      onDragOver={e => {
        if (!onDrop && !onReorder) return;
        e.preventDefault(); e.stopPropagation();
        if (isBeingDragged) return;
        setDropZone(getDropZone(e));
      }}
      onDragLeave={e => {
        // Only reset if cursor truly left the row (not just entered a child element)
        if (rowRef.current?.contains(e.relatedTarget as Node)) return;
        setDropZone(null);
      }}
      onDrop={e => {
        e.preventDefault(); e.stopPropagation();
        setDropZone(null);
        if (!draggingId || draggingId === tarea.id) return;
        onDrop?.(tarea.id); // whole row = always make subtask
      }}
    >
      {isDraggable && (
        <div
          className="mt-[5px] shrink-0 w-4 flex flex-col gap-[3px] opacity-[0.18] group-hover:opacity-70 transition-opacity cursor-grab active:cursor-grabbing -ml-1"
          onClick={e => e.stopPropagation()}
          onMouseDown={e => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            justDraggedRef.current = true;
            setTimeout(() => { justDraggedRef.current = false; }, 600);
            onPtrDragStart?.(tarea.id, tarea.titulo);
          }}
        >
          {[0,1,2].map(i => (
            <span key={i} className="flex gap-[3px]">
              <span className="w-[3.5px] h-[3.5px] rounded-full bg-[#666]" />
              <span className="w-[3.5px] h-[3.5px] rounded-full bg-[#666]" />
            </span>
          ))}
        </div>
      )}

      {dropIndicatorSubtask && !isCompleted && (
        <span className="absolute top-1.5 right-2 flex items-center gap-1 text-[10px] font-semibold text-[#B3985B] bg-[#B3985B]/10 border border-[#B3985B]/20 rounded-full px-2 py-0.5 pointer-events-none z-10 select-none">
          ↳ subtarea
        </span>
      )}

      {multiSelected ? (
        <div
          onClick={e => { e.stopPropagation(); onMultiSelect?.(tarea.id); }}
          className="mt-[3px] w-[17px] h-[17px] shrink-0 rounded-full bg-[#B3985B] border-2 border-[#B3985B] flex items-center justify-center cursor-pointer"
        >
          <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="black" strokeWidth="2.5">
            <path d="M2 6l3 3 5-5"/>
          </svg>
        </div>
      ) : (
        <button
          onClick={handleComplete}
          className={`mt-[3px] w-[17px] h-[17px] shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
            isCompleted  ? "border-[#333] bg-[#1f1f1f]"
            : completing ? `${prio.ring} bg-[#B3985B]/10 animate-pulse`
            : `${prio.ring} hover:bg-[#111] ${(hovered || isSelected) ? "shadow-md " + prio.glow : ""}`
          }`}
          aria-label="Completar"
        >
          {isCompleted && (
            <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#555" strokeWidth="2.5">
              <path d="M2 6l3 3 5-5"/>
            </svg>
          )}
          {!isCompleted && !completing && (hovered || isSelected) && (
            <div className={`w-1.5 h-1.5 rounded-full ${prio.dot} opacity-50`} />
          )}
        </button>
      )}

      <div className="flex-1 min-w-0">
        <p className={`text-[15px] leading-snug transition-colors ${isCompleted ? "line-through text-[#333]" : "text-[#d0d0d0]"}`}>
          {tarea.titulo}
        </p>

        {tarea.descripcion && !isCompleted && (
          <p className="text-[13px] text-[#3a3a3a] leading-snug mt-0.5 line-clamp-2">
            {tarea.descripcion}
          </p>
        )}

        {/* Compact completeness dots — only if at least one context field has content */}
        {!isCompleted && (() => {
          const hasPasos = (() => {
            try {
              const p = tarea.pasos;
              if (!p) return false;
              const arr = Array.isArray(p) ? p : JSON.parse(p as string);
              return Array.isArray(arr) && arr.length > 0;
            } catch { return false; }
          })();
          const dots = [
            !!tarea.descripcion,
            !!tarea.paraQueSirve,
            !!tarea.quePasaSiNoSeHace,
            !!tarea.dondeSeEjecuta,
            hasPasos,
          ];
          const anyFilled = dots.some(Boolean);
          if (!anyFilled) return null;
          return (
            <div className="flex items-center gap-1 mt-1">
              {dots.map((filled, i) => (
                <span key={i}
                  className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
                  style={{ backgroundColor: filled ? "#C9A84C" : "#1e1e1e" }}
                />
              ))}
            </div>
          );
        })()}

        {(!isCompleted || showProject) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {showProject && tarea.proyectoTarea && (
              <span className="flex items-center gap-1 text-[13px] text-[#444] font-medium">
                <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: tarea.proyectoTarea.color ?? "#444" }} />
                {tarea.proyectoTarea.nombre}
              </span>
            )}

            {tarea.juntaOrigen && (
              <a href={`/juntas/${tarea.juntaOrigen.id}/reporte`} onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 text-[12px] text-[#B3985B]/60 hover:text-[#B3985B] transition-colors">
                <span>📋</span>
                <span>
                  {tarea.juntaOrigen.area === "GLOBAL" ? "Global" : tarea.juntaOrigen.area.charAt(0) + tarea.juntaOrigen.area.slice(1).toLowerCase()}
                  {" · "}
                  {new Date(tarea.juntaOrigen.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                </span>
              </a>
            )}

            {fecha && !isCompleted && (
              <span className="relative">
                <button onClick={e => { e.stopPropagation(); if (onDateChange) setEditingDate("fecha"); }}
                  className={`inline-flex items-center gap-1 text-[13px] px-1.5 py-0.5 rounded-md font-medium transition-all ${fecha.cls} ${onDateChange ? "hover:brightness-125 cursor-pointer" : "cursor-default"}`}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  {formatFecha(localFecha || tarea.fecha!).label}
                </button>
              </span>
            )}

            {recurrenciaDisplay && (
              <span className="inline-flex items-center gap-1 text-[13px] text-[#444] px-1.5 py-0.5 rounded-md bg-[#0f0f0f]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                  <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                </svg>
                {recurrenciaDisplay}
              </span>
            )}

            {tarea._count.comentarios > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[13px] text-[#444]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                {tarea._count.comentarios}
              </span>
            )}

            {tarea._count.archivos > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[13px] text-[#444]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
                {tarea._count.archivos}
              </span>
            )}

            {tarea.asignadoA && !isCompleted && (
              <span className="group/av relative inline-flex items-center cursor-default">
                <span className="w-[18px] h-[18px] rounded-full bg-[#B3985B]/20 border border-[#B3985B]/30 text-[10px] text-[#B3985B] flex items-center justify-center font-bold shrink-0 select-none">
                  {tarea.asignadoA.name.charAt(0).toUpperCase()}
                </span>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[12px] text-white whitespace-nowrap opacity-0 group-hover/av:opacity-100 transition-opacity duration-150 pointer-events-none z-50 shadow-xl">
                  {tarea.asignadoA.name}
                </span>
              </span>
            )}

            <BadgeDias inicio={tarea.createdAt} fin={tarea.fechaCompletada} tipo="tarea"
              cerrado={isCompleted} labelCerrado={isCompleted ? "completada" : undefined} />
          </div>
        )}

        {subtaskCount > 0 && (
          <button onClick={toggleSubtareas}
            className={`flex items-center gap-1.5 mt-1.5 text-[12px] font-medium transition-colors ${
              expanded ? "text-[#B3985B]" : "text-[#3a3a3a] hover:text-[#B3985B]"
            }`}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            {subtaskCount} subtarea{subtaskCount !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* MÓVIL */}
      <div className="flex md:hidden items-center shrink-0" ref={mobileAssignRef} onClick={e => e.stopPropagation()}>
        <div className="relative">
          <button onClick={() => setShowAssign(v => !v)} className="w-7 h-7 rounded-full flex items-center justify-center"
            title={tarea.asignadoA ? tarea.asignadoA.name : "Asignar"}>
            {tarea.asignadoA ? (
              <span className="w-6 h-6 rounded-full bg-[#B3985B]/20 border border-[#B3985B]/30 text-[11px] text-[#B3985B] flex items-center justify-center font-bold">
                {tarea.asignadoA.name.charAt(0).toUpperCase()}
              </span>
            ) : (
              <span className="w-6 h-6 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#444] flex items-center justify-center">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
            )}
          </button>
          {showAssign && (
            <div className="absolute right-0 top-8 z-50 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl py-1 min-w-[160px]">
              <p className="text-[10px] text-[#555] uppercase tracking-wider px-3 pt-1 pb-1.5">Asignar a</p>
              {tarea.asignadoA && (
                <button onClick={() => { onAssign?.(tarea.id, null); setShowAssign(false); }}
                  className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-[#1f1f1f] transition-colors">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Sin asignar
                </button>
              )}
              {users.length === 0 && !tarea.asignadoA && <p className="text-[11px] text-[#444] px-3 py-2">Sin usuarios disponibles</p>}
              {users.map(u => (
                <button key={u.id} onClick={() => { onAssign?.(tarea.id, u.id); setShowAssign(false); }}
                  className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-[#1f1f1f] ${tarea.asignadoA?.id === u.id ? "text-[#B3985B]" : "text-[#ccc]"}`}>
                  <span className="w-5 h-5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[10px] text-[#B3985B] flex items-center justify-center font-semibold shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                  {u.name}
                  {tarea.asignadoA?.id === u.id && (
                    <svg className="ml-auto shrink-0" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ESCRITORIO */}
      <div className={`hidden md:flex items-center gap-1 shrink-0 mt-0.5 transition-opacity duration-100 ${actionsVisible ? "opacity-100" : "opacity-0"}`}
        onClick={e => e.stopPropagation()}>

        {/* Fecha de realización — solo el botón, el picker es único al nivel del row */}
        <span className="relative">
          <ActionBtn
            title={localFecha ? `Fecha: ${formatFecha(localFecha).label}` : "Sin fecha"}
            active={!!localFecha}
            onClick={e => { e.stopPropagation(); if (onDateChange) setEditingDate("fecha"); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </ActionBtn>
        </span>

        <span className="relative" ref={assignRef}>
          <ActionBtn title={tarea.asignadoA ? `Asignado: ${tarea.asignadoA.name}` : "Asignar"} active={!!tarea.asignadoA}
            onClick={e => { e.stopPropagation(); setShowAssign(v => !v); setShowMore(false); }}>
            {tarea.asignadoA ? (
              <span className="w-5 h-5 rounded-full bg-[#B3985B]/20 text-[11px] text-[#B3985B] flex items-center justify-center font-semibold leading-none">
                {tarea.asignadoA.name.charAt(0).toUpperCase()}
              </span>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            )}
          </ActionBtn>
          {showAssign && (
            <div className="absolute right-0 top-8 z-50 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl py-1 min-w-[160px]">
              <p className="text-[10px] text-[#555] uppercase tracking-wider px-3 pt-1 pb-1.5">Asignar a</p>
              {tarea.asignadoA && (
                <button onClick={() => { onAssign?.(tarea.id, null); setShowAssign(false); }}
                  className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-[#1f1f1f] transition-colors">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Sin asignar
                </button>
              )}
              {users.length === 0 && !tarea.asignadoA && <p className="text-[11px] text-[#444] px-3 py-2">Sin usuarios disponibles</p>}
              {users.map(u => (
                <button key={u.id} onClick={() => { onAssign?.(tarea.id, u.id); setShowAssign(false); }}
                  className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-[#1f1f1f] ${tarea.asignadoA?.id === u.id ? "text-[#B3985B]" : "text-[#ccc]"}`}>
                  <span className="w-5 h-5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[10px] text-[#B3985B] flex items-center justify-center font-semibold shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                  {u.name}
                  {tarea.asignadoA?.id === u.id && (
                    <svg className="ml-auto shrink-0" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </span>

        <span className="relative" ref={proyectoRef}>
          <ActionBtn title={tarea.proyectoTarea ? tarea.proyectoTarea.nombre : "Asignar proyecto"} active={!!tarea.proyectoTarea}
            onClick={e => { e.stopPropagation(); setShowProyecto(v => !v); setShowMore(false); setShowAssign(false); }}>
            {tarea.proyectoTarea ? (
              <span className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: tarea.proyectoTarea.color ?? "#555" }} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            )}
          </ActionBtn>
          {showProyecto && (
            <div className="absolute right-0 top-8 z-50 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl py-1 min-w-[190px] max-h-60 overflow-y-auto">
              <p className="text-[10px] text-[#555] uppercase tracking-wider px-3 pt-1 pb-1.5">Proyecto</p>
              <button onClick={() => { onProjectChange?.(tarea.id, null); setShowProyecto(false); }}
                className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-[#1f1f1f] ${!tarea.proyectoTarea ? "text-[#B3985B]" : "text-[#555] hover:text-[#bbb]"}`}>
                <span className="w-3 h-3 rounded-sm bg-[#2a2a2a] shrink-0" />
                Bandeja de entrada
                {!tarea.proyectoTarea && <svg className="ml-auto shrink-0" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>}
              </button>
              {projects.map(p => (
                <button key={p.id} onClick={() => { onProjectChange?.(tarea.id, p.id); setShowProyecto(false); }}
                  className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-[#1f1f1f] ${tarea.proyectoTarea?.id === p.id ? "text-[#B3985B]" : "text-[#ccc] hover:text-white"}`}>
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: p.color ?? "#555" }} />
                  {p.nombre}
                  {tarea.proyectoTarea?.id === p.id && <svg className="ml-auto shrink-0" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>}
                </button>
              ))}
            </div>
          )}
        </span>

        <ActionBtn title={tarea._count.comentarios > 0 ? `${tarea._count.comentarios} comentario${tarea._count.comentarios !== 1 ? "s" : ""}` : "Comentar"}
          active={tarea._count.comentarios > 0} onClick={() => onSelect(tarea.id)}>
          <span className="relative flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {tarea._count.comentarios > 0 && (
              <span className="absolute -top-1.5 -right-1.5 text-[9px] text-[#B3985B] font-bold leading-none">{tarea._count.comentarios}</span>
            )}
          </span>
        </ActionBtn>

        <ActionBtn title="Editar tarea" onClick={() => onSelect(tarea.id)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </ActionBtn>

        <span className="relative" ref={moreRef}>
          <ActionBtn title="Más opciones" active={showMore}
            onClick={e => { e.stopPropagation(); setShowMore(v => !v); setShowAssign(false); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="5"  r="1" fill="currentColor"/>
              <circle cx="12" cy="12" r="1" fill="currentColor"/>
              <circle cx="12" cy="19" r="1" fill="currentColor"/>
            </svg>
          </ActionBtn>
          {showMore && (
            <div className="absolute right-0 top-8 z-50 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl py-1.5 min-w-[180px]">
              {onPriorityChange && (
                <>
                  <p className="text-[10px] text-[#555] uppercase tracking-wider px-3 pt-0.5 pb-1.5">Prioridad</p>
                  <div className="flex items-center gap-1 px-3 pb-2">
                    {PRIO_OPTIONS.map(p => (
                      <button key={p.key} title={p.label}
                        onClick={() => { onPriorityChange(tarea.id, p.key); setShowMore(false); }}
                        className={`flex-1 flex items-center justify-center py-1.5 rounded-lg border transition-all ${
                          tarea.prioridad === p.key ? "border-current bg-current/10" : "border-[#2a2a2a] hover:border-current/50 hover:bg-current/5"
                        }`} style={{ color: p.color }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                          <line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" strokeWidth="2" fill="none"/>
                        </svg>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-[#1f1f1f] my-1" />
                </>
              )}
              <button onClick={() => { onSelect(tarea.id); setShowMore(false); }}
                className="w-full text-left flex items-center gap-2.5 px-3 py-1.5 text-xs text-[#aaa] hover:bg-[#1f1f1f] hover:text-white transition-colors">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Abrir detalle
              </button>
              <div className="border-t border-[#1f1f1f] my-1" />
              {onExtract && (
                <>
                  <button onClick={() => { onExtract(); setShowMore(false); }}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-1.5 text-xs text-[#B3985B] hover:bg-[#B3985B]/10 transition-colors">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="18"/><path d="M5 20h14"/>
                    </svg>
                    Convertir en tarea independiente
                  </button>
                  <div className="border-t border-[#1f1f1f] my-1" />
                </>
              )}
              {onMoveToNoSection && tarea.seccion && (
                <>
                  <button onClick={() => { onMoveToNoSection(tarea.id); setShowMore(false); }}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-1.5 text-xs text-[#aaa] hover:bg-[#1f1f1f] hover:text-white transition-colors">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="18"/>
                    </svg>
                    Quitar de sección
                  </button>
                  <div className="border-t border-[#1f1f1f] my-1" />
                </>
              )}
              {onMoveToSection && availableSections && availableSections.length > 0 && (
                <>
                  <button
                    onClick={() => setShowSecciones(v => !v)}
                    className="w-full text-left flex items-center justify-between gap-2.5 px-3 py-1.5 text-xs text-[#aaa] hover:bg-[#1f1f1f] hover:text-white transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                      </svg>
                      Mover a sección
                    </span>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      style={{ transform: showSecciones ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                  {showSecciones && (
                    <div className="mx-2 mb-1 bg-[#0d0d0d] rounded-lg overflow-hidden border border-[#1f1f1f]">
                      {availableSections.map(s => (
                        <button key={s.id}
                          onClick={() => { onMoveToSection(tarea.id, s.id); setShowMore(false); setShowSecciones(false); }}
                          className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs text-[#ccc] hover:bg-[#1a1a1a] hover:text-white transition-colors"
                        >
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2.5">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                          {s.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="border-t border-[#1f1f1f] my-1" />
                </>
              )}
              <button onClick={() => { onDelete(tarea.id); setShowMore(false); }}
                className="w-full text-left flex items-center gap-2.5 px-3 py-1.5 text-xs text-red-500 hover:bg-red-950/20 hover:text-red-400 transition-colors">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
                Eliminar tarea
              </button>
            </div>
          )}
        </span>
      </div>

      {/* ── ÚNICO DatePicker de fecha — al nivel del row, fuera de mobile/desktop sections ── */}
      {editingDate === "fecha" && onDateChange && (
        <DatePicker
          value={localFecha}
          onChange={val => { setLocalFecha(val); onDateChange(tarea.id, val); }}
          onClose={() => setEditingDate(null)}
          autoOpen hideTrigger showClear
          className="absolute right-0 top-full mt-1 z-50"
        />
      )}
    </div>

    {dropIndicatorBelow && (
      <div
        className="relative h-3 mx-3 -mt-1 z-10 cursor-pointer"
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={e => {
          e.preventDefault(); e.stopPropagation();
          setDropZone(null);
          if (!draggingId || draggingId === tarea.id) return;
          onReorder?.(draggingId, tarea.id, "below");
        }}
      >
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#B3985B] rounded-full shadow-[0_0_6px_rgba(179,152,91,0.6)]" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#B3985B] -ml-1 shadow-[0_0_6px_rgba(179,152,91,0.8)]" />
      </div>
    )}

    {expanded && (
      <div className="ml-6 border-l border-[#1a1a1a] pl-2 mt-0.5">
        {/* ── Drop zone: extraer subtarea ── */}
        {subtaskDraggingId && (
          <div
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setExtractDropOver(true); }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setExtractDropOver(false); }}
            onDrop={async e => {
              e.preventDefault(); e.stopPropagation();
              const id = subtaskDraggingId;
              setSubtaskDraggingId(null); setExtractDropOver(false);
              const res = await fetch(`/api/tareas/${id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ parentId: null }),
              });
              if (!res.ok) return;
              const sub = subtareasExp.find(s => s.id === id);
              setSubtareasExp(prev => prev.filter(s => s.id !== id));
              setSubtaskCount(c => Math.max(0, c - 1));
              if (sub) onExtractChild?.({ ...sub, seccion: null });
            }}
            className={`flex items-center justify-center gap-1.5 h-8 rounded-lg border-2 border-dashed mb-2 text-[11px] font-medium transition-all select-none ${
              extractDropOver
                ? "border-[#B3985B]/60 bg-[#B3985B]/[0.07] text-[#B3985B]"
                : "border-[#1e1e1e] text-[#2a2a2a]"
            }`}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="18"/>
            </svg>
            {extractDropOver ? "Soltar para extraer como tarea independiente" : "↑ Arrastra aquí para sacar la subtarea"}
          </div>
        )}

        {loadingExp && <p className="text-[11px] text-[#333] px-4 py-1">Cargando…</p>}
        {subtareasExp.map(sub => (
          <TaskItem key={sub.id} tarea={sub} depth={(depth ?? 0) + 1} isSelected={false}
            onComplete={onComplete} onSelect={onSelect}
            onDelete={id => { onDelete(id); setSubtareasExp(prev => prev.filter(s => s.id !== id)); setSubtaskCount(c => Math.max(0, c - 1)); }}
            onDateChange={onDateChange} onPriorityChange={onPriorityChange}
            onAssign={onAssign} onProjectChange={onProjectChange}
            users={users} projects={projects}
            draggable
            onDragStart={id => setSubtaskDraggingId(id)}
            onDragEnd={() => { setSubtaskDraggingId(null); setExtractDropOver(false); }}
            onExtract={async () => {
              const res = await fetch(`/api/tareas/${sub.id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ parentId: null }),
              });
              if (!res.ok) return;
              setSubtareasExp(prev => prev.filter(s => s.id !== sub.id));
              setSubtaskCount(c => Math.max(0, c - 1));
              onExtractChild?.(sub);
            }}
          />
        ))}
      </div>
    )}
  </>
  );
}
