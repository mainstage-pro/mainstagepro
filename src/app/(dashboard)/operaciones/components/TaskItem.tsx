"use client";
import { useState } from "react";
import { formatearRecurrencia } from "@/lib/recurrencia";
import DatePicker from "@/components/ui/DatePicker";

export interface TareaItem {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: string;
  area: string;
  estado: string;
  fecha: string | null;
  fechaVencimiento: string | null;
  recurrencia: string | null;
  proyectoTarea: { id: string; nombre: string; color: string | null } | null;
  seccion: { id: string; nombre: string } | null;
  asignadoA: { id: string; name: string } | null;
  _count: { subtareas: number; comentarios: number; archivos: number };
}

const PRIO: Record<string, { ring: string; dot: string; glow: string }> = {
  URGENTE: { ring: "border-red-500/70",    dot: "bg-red-500",    glow: "shadow-red-500/30" },
  ALTA:    { ring: "border-orange-500/70", dot: "bg-orange-500", glow: "shadow-orange-500/30" },
  MEDIA:   { ring: "border-[#B3985B]/60",  dot: "bg-[#B3985B]",  glow: "shadow-[#B3985B]/20" },
  BAJA:    { ring: "border-[#2a2a2a]",     dot: "bg-[#333]",     glow: "" },
};

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
  onComplete: (id: string) => void;
  onSelect:   (id: string) => void;
  onDelete:   (id: string) => void;
  onDateChange?: (id: string, field: "fecha" | "fechaVencimiento", value: string) => void;
  isSelected: boolean;
  showProject?: boolean;
  depth?: number;
  draggable?: boolean;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  onDrop?: (targetId: string) => void;
  isDragOver?: boolean;
}

export default function TaskItem({ tarea, onComplete, onSelect, onDelete, onDateChange, isSelected, showProject = false, depth = 0, draggable: isDraggable = false, onDragStart, onDragEnd, onDrop, isDragOver = false }: Props) {
  const [hovered,       setHovered]       = useState(false);
  const [completing,    setCompleting]    = useState(false);
  const [dragOver,      setDragOver]      = useState(false);
  const [editingDate,   setEditingDate]   = useState<"fecha" | "fechaVencimiento" | null>(null);
  const [localFecha,    setLocalFecha]    = useState(tarea.fecha    ? tarea.fecha.substring(0, 10)            : "");
  const [localFechaVen, setLocalFechaVen] = useState(tarea.fechaVencimiento ? tarea.fechaVencimiento.substring(0, 10) : "");
  const [expanded,      setExpanded]      = useState(false);
  const [subtareasExp,  setSubtareasExp]  = useState<TareaItem[]>([]);
  const [loadingExp,    setLoadingExp]    = useState(false);
  const isCompleted = tarea.estado === "COMPLETADA";

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
  const prio = PRIO[tarea.prioridad] ?? PRIO.BAJA;

  const recurrenciaDisplay = (() => {
    if (!tarea.recurrencia) return null;
    try { return formatearRecurrencia(JSON.parse(tarea.recurrencia)); } catch { return null; }
  })();

  async function handleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    if (isCompleted || completing) return;
    setCompleting(true);
    await onComplete(tarea.id);
  }

  const fecha    = tarea.fecha            ? formatFecha(tarea.fecha) : null;
  const fechaVen = tarea.fechaVencimiento ? formatFecha(tarea.fechaVencimiento) : null;

  const showDrop = dragOver || isDragOver;

  return (
  <>
    <div
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      className={`group flex items-start gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all duration-100 outline-none select-none ${
        showDrop
          ? "bg-[#B3985B]/8 ring-1 ring-[#B3985B]/30"
          : isSelected
          ? "bg-[#111] ring-1 ring-[#B3985B]/20"
          : hovered
          ? "bg-[#0d0d0d]"
          : ""
      }`}
      style={{ paddingLeft: depth > 0 ? `${12 + depth * 22}px` : undefined }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(tarea.id)}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onSelect(tarea.id); }}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false); onDrop?.(tarea.id); }}
    >
      {/* ── Drag handle (visible on hover when draggable) ──────────────── */}
      {isDraggable && (
        <div
          draggable
          onDragStart={e => { e.stopPropagation(); onDragStart?.(tarea.id); }}
          onDragEnd={() => { onDragEnd?.(); setDragOver(false); }}
          className="mt-[4px] shrink-0 w-3 flex flex-col gap-[3px] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing -ml-1"
          onClick={e => e.stopPropagation()}
        >
          {[0,1,2].map(i => (
            <span key={i} className="flex gap-[3px]">
              <span className="w-[3px] h-[3px] rounded-full bg-[#444]" />
              <span className="w-[3px] h-[3px] rounded-full bg-[#444]" />
            </span>
          ))}
        </div>
      )}

      {/* ── Circle checkbox ────────────────────────────────────────────── */}
      <button
        onClick={handleComplete}
        className={`mt-[3px] w-[17px] h-[17px] shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
          isCompleted
            ? "border-[#333] bg-[#1f1f1f]"
            : completing
            ? `${prio.ring} bg-[#B3985B]/10 animate-pulse`
            : `${prio.ring} hover:bg-[#111] ${hovered || isSelected ? "shadow-md " + prio.glow : ""}`
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

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <p className={`text-[15px] leading-snug transition-colors ${
          isCompleted ? "line-through text-[#333]" : "text-[#d0d0d0]"
        }`}>
          {tarea.titulo}
        </p>

        {tarea.descripcion && !isCompleted && (
          <p className="text-[13px] text-[#3a3a3a] leading-snug mt-0.5 line-clamp-2">
            {tarea.descripcion}
          </p>
        )}

        {/* Meta row */}
        {(!isCompleted || showProject) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {showProject && tarea.proyectoTarea && (
              <span className="flex items-center gap-1 text-[12px] text-[#444] font-medium">
                <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: tarea.proyectoTarea.color ?? "#444" }} />
                {tarea.proyectoTarea.nombre}
              </span>
            )}

            {fecha && !isCompleted && (
              <span className="relative">
                {editingDate === "fecha" ? (
                  <DatePicker
                    value={localFecha}
                    onChange={val => {
                      setLocalFecha(val);
                      onDateChange?.(tarea.id, "fecha", val);
                    }}
                    onClose={() => setEditingDate(null)}
                    autoOpen hideTrigger showClear
                    className="absolute"
                  />
                ) : null}
                <button
                  onClick={e => { e.stopPropagation(); if (onDateChange) setEditingDate("fecha"); }}
                  className={`inline-flex items-center gap-1 text-[12px] px-1.5 py-0.5 rounded-md font-medium transition-all ${fecha.cls} ${onDateChange ? "hover:brightness-125 cursor-pointer" : "cursor-default"}`}
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  {formatFecha(localFecha || tarea.fecha!).label}
                </button>
              </span>
            )}

            {fechaVen && !isCompleted && (
              <span className="relative">
                {editingDate === "fechaVencimiento" ? (
                  <DatePicker
                    value={localFechaVen}
                    onChange={val => {
                      setLocalFechaVen(val);
                      onDateChange?.(tarea.id, "fechaVencimiento", val);
                    }}
                    onClose={() => setEditingDate(null)}
                    autoOpen hideTrigger showClear
                    className="absolute"
                  />
                ) : null}
                <button
                  onClick={e => { e.stopPropagation(); if (onDateChange) setEditingDate("fechaVencimiento"); }}
                  className={`inline-flex items-center gap-1 text-[12px] px-1.5 py-0.5 rounded-md font-medium transition-all ${fechaVen.cls} ${onDateChange ? "hover:brightness-125 cursor-pointer" : "cursor-default"}`}
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {formatFecha(localFechaVen || tarea.fechaVencimiento!).label}
                </button>
              </span>
            )}

            {recurrenciaDisplay && (
              <span className="inline-flex items-center gap-1 text-[12px] text-[#444] px-1.5 py-0.5 rounded-md bg-[#0f0f0f]">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                  <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                </svg>
                {recurrenciaDisplay}
              </span>
            )}

            {tarea._count.subtareas > 0 && (
              <button onClick={toggleSubtareas}
                className="inline-flex items-center gap-1 text-[12px] text-[#444] hover:text-[#B3985B] transition-colors">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                {tarea._count.subtareas}
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
            )}

            {tarea._count.comentarios > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[12px] text-[#444]">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                {tarea._count.comentarios}
              </span>
            )}

            {tarea._count.archivos > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[12px] text-[#444]">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
                {tarea._count.archivos}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Right actions ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mt-0.5 shrink-0">
        {tarea.asignadoA && (
          <span className="w-5 h-5 rounded-full bg-[#1a1a1a] border border-[#222] text-[11px] text-[#B3985B] flex items-center justify-center font-medium">
            {tarea.asignadoA.name.charAt(0).toUpperCase()}
          </span>
        )}
        <button
          onClick={e => { e.stopPropagation(); onDelete(tarea.id); }}
          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-md text-[#2a2a2a] hover:text-red-400 hover:bg-red-950/20 transition-all"
          aria-label="Eliminar"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>

    {/* ── Expanded subtareas ────────────────────────────────────────── */}
    {expanded && (
      <div>
        {loadingExp && (
          <p className="text-[11px] text-[#333] px-4 py-1">Cargando…</p>
        )}
        {subtareasExp.map(sub => (
          <TaskItem
            key={sub.id}
            tarea={sub}
            depth={(depth ?? 0) + 1}
            isSelected={false}
            onComplete={onComplete}
            onSelect={onSelect}
            onDelete={id => { onDelete(id); setSubtareasExp(prev => prev.filter(s => s.id !== id)); }}
            onDateChange={onDateChange}
          />
        ))}
      </div>
    )}
  </>
  );
}
