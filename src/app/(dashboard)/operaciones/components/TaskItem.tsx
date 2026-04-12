"use client";
import { useState } from "react";
import { formatearRecurrencia } from "@/lib/recurrencia";

export interface TareaItem {
  id: string;
  titulo: string;
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

const PRIO_COLOR: Record<string, string> = {
  URGENTE: "text-red-400",
  ALTA:    "text-orange-400",
  MEDIA:   "text-yellow-500",
  BAJA:    "text-[#444]",
};

function formatFecha(iso: string): { label: string; color: string } {
  const d = new Date(iso);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
  const semana = new Date(hoy); semana.setDate(hoy.getDate() + 7);

  if (d < hoy)    return { label: d.toLocaleDateString("es-MX", { month: "short", day: "numeric" }), color: "text-red-400" };
  if (d < manana) return { label: "Hoy", color: "text-green-400" };
  if (d < new Date(manana.getTime() + 86400000)) return { label: "Mañana", color: "text-yellow-400" };
  if (d <= semana) return { label: d.toLocaleDateString("es-MX", { weekday: "short" }), color: "text-[#888]" };
  return { label: d.toLocaleDateString("es-MX", { month: "short", day: "numeric" }), color: "text-[#888]" };
}

interface Props {
  tarea: TareaItem;
  onComplete: (id: string) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
  showProject?: boolean;
  depth?: number;
}

export default function TaskItem({ tarea, onComplete, onSelect, onDelete, isSelected, showProject = false, depth = 0 }: Props) {
  const [hovered, setHovered] = useState(false);
  const [completing, setCompleting] = useState(false);
  const isCompleted = tarea.estado === "COMPLETADA";

  const recurrenciaDisplay = (() => {
    if (!tarea.recurrencia) return null;
    try { return formatearRecurrencia(JSON.parse(tarea.recurrencia)); }
    catch { return null; }
  })();

  async function handleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    if (isCompleted || completing) return;
    setCompleting(true);
    await onComplete(tarea.id);
  }

  return (
    <div
      className={`group flex items-start gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
        isSelected ? "bg-[#1a1a1a]" : hovered ? "bg-[#111]" : ""
      }`}
      style={{ paddingLeft: depth > 0 ? `${12 + depth * 20}px` : undefined }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(tarea.id)}
    >
      {/* Circle checkbox */}
      <button
        onClick={handleComplete}
        className={`mt-0.5 w-4 h-4 shrink-0 rounded-full border transition-all ${
          isCompleted
            ? "bg-[#444] border-[#444]"
            : completing
            ? "border-[#B3985B] bg-[#B3985B]/20 animate-pulse"
            : `border-[#333] hover:border-[#B3985B] ${PRIO_COLOR[tarea.prioridad] ?? ""}`
        } flex items-center justify-center`}
        aria-label="Completar tarea"
      >
        {isCompleted && (
          <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2">
            <path d="M2 6l3 3 5-5" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${isCompleted ? "line-through text-[#444]" : "text-[#d4d4d4]"}`}>
          {tarea.titulo}
        </p>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
          {showProject && tarea.proyectoTarea && (
            <span className="flex items-center gap-1 text-[11px] text-[#555]">
              <span
                className="w-2 h-2 rounded-full inline-block shrink-0"
                style={{ backgroundColor: tarea.proyectoTarea.color ?? "#555" }}
              />
              {tarea.proyectoTarea.nombre}
            </span>
          )}

          {tarea.fecha && !isCompleted && (
            <span className={`text-[11px] flex items-center gap-0.5 ${formatFecha(tarea.fecha).color}`}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {formatFecha(tarea.fecha).label}
            </span>
          )}

          {tarea.fechaVencimiento && !isCompleted && (
            <span className={`text-[11px] flex items-center gap-0.5 ${new Date(tarea.fechaVencimiento) < new Date() ? "text-red-400" : "text-[#666]"}`}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {new Date(tarea.fechaVencimiento).toLocaleDateString("es-MX", { month: "short", day: "numeric" })}
            </span>
          )}

          {recurrenciaDisplay && (
            <span className="text-[11px] text-[#555] flex items-center gap-0.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
              {recurrenciaDisplay}
            </span>
          )}

          {tarea._count.subtareas > 0 && (
            <span className="text-[11px] text-[#555]">
              ↳ {tarea._count.subtareas}
            </span>
          )}

          {tarea._count.comentarios > 0 && (
            <span className="text-[11px] text-[#555]">
              💬 {tarea._count.comentarios}
            </span>
          )}

          {tarea._count.archivos > 0 && (
            <span className="text-[11px] text-[#555]">
              📎 {tarea._count.archivos}
            </span>
          )}
        </div>
      </div>

      {/* Assignee */}
      {tarea.asignadoA && (
        <span className="hidden group-hover:flex items-center justify-center w-5 h-5 rounded-full bg-[#1a1a1a] text-[10px] text-[#B3985B] shrink-0 mt-0.5">
          {tarea.asignadoA.name.charAt(0).toUpperCase()}
        </span>
      )}

      {/* Delete on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(tarea.id); }}
        className="opacity-0 group-hover:opacity-100 mt-0.5 shrink-0 text-[#333] hover:text-red-400 transition-all"
        aria-label="Eliminar"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}
