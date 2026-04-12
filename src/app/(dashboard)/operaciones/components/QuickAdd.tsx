"use client";
import { useState, useRef } from "react";
import { parsearRecurrencia, formatearRecurrencia } from "@/lib/recurrencia";

interface Props {
  proyectoTareaId?: string | null;
  seccionId?: string | null;
  parentId?: string | null;
  onAdd: (tarea: {
    titulo: string;
    fecha: string | null;
    fechaVencimiento: string | null;
    prioridad: string;
    recurrencia: string | null;
    proyectoTareaId: string | null;
    seccionId: string | null;
    parentId: string | null;
  }) => void;
  placeholder?: string;
  compact?: boolean;
}

export default function QuickAdd({
  proyectoTareaId = null,
  seccionId = null,
  parentId = null,
  onAdd,
  placeholder = "Agregar tarea…",
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [fecha, setFecha] = useState("");
  const [fechaVen, setFechaVen] = useState("");
  const [prioridad, setPrioridad] = useState("MEDIA");
  const [recTexto, setRecTexto] = useState("");
  const [recError, setRecError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTitulo(""); setExpanded(false); setFecha(""); setFechaVen("");
    setPrioridad("MEDIA"); setRecTexto(""); setRecError(""); setOpen(false);
  }

  function submit() {
    if (!titulo.trim()) return;

    let recurrencia: string | null = null;
    if (recTexto.trim()) {
      const cfg = parsearRecurrencia(recTexto.trim());
      if (!cfg) { setRecError("Patrón no reconocido"); return; }
      recurrencia = JSON.stringify(cfg);
      setRecError("");
    }

    onAdd({
      titulo: titulo.trim(),
      fecha: fecha || null,
      fechaVencimiento: fechaVen || null,
      prioridad,
      recurrencia,
      proyectoTareaId,
      seccionId,
      parentId,
    });
    reset();
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => titleRef.current?.focus(), 50); }}
        className={`flex items-center gap-2 text-[#444] hover:text-[#888] transition-colors text-sm ${compact ? "py-1 px-3" : "py-2 px-3"}`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        {placeholder}
      </button>
    );
  }

  return (
    <div className="mx-3 my-1 border border-[#2a2a2a] rounded-md bg-[#0d0d0d] p-2 space-y-2">
      <input
        ref={titleRef}
        value={titulo}
        onChange={e => setTitulo(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && !e.shiftKey) submit();
          if (e.key === "Escape") reset();
        }}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-white placeholder-[#444] focus:outline-none"
      />

      {expanded && (
        <div className="space-y-2 pt-1 border-t border-[#1a1a1a]">
          <div className="flex flex-wrap gap-2">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-[#555]">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="bg-[#111] border border-[#2a2a2a] rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-[#555]">Fecha límite</label>
              <input type="date" value={fechaVen} onChange={e => setFechaVen(e.target.value)}
                className="bg-[#111] border border-[#2a2a2a] rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-[#555]">Prioridad</label>
              <select value={prioridad} onChange={e => setPrioridad(e.target.value)}
                className="bg-[#111] border border-[#2a2a2a] rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-[#B3985B]">
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-[#555]">Recurrencia (texto libre)</label>
            <input
              value={recTexto}
              onChange={e => { setRecTexto(e.target.value); setRecError(""); }}
              placeholder='cada lunes · cada martes y jueves · cada tercer viernes'
              className="w-full bg-[#111] border border-[#2a2a2a] rounded px-2 py-0.5 text-xs text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]"
            />
            {recError && <p className="text-xs text-red-400">{recError}</p>}
            {recTexto && !recError && (() => {
              const cfg = parsearRecurrencia(recTexto);
              return cfg ? <p className="text-xs text-green-400">{formatearRecurrencia(cfg)}</p> : null;
            })()}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button onClick={submit}
          className="px-3 py-1 bg-[#B3985B] text-black text-xs font-medium rounded hover:bg-[#c9aa6a] transition-colors">
          Agregar
        </button>
        <button onClick={reset} className="px-2 py-1 text-[#555] text-xs hover:text-white">Cancelar</button>
        <button onClick={() => setExpanded(!expanded)}
          className="ml-auto text-[#444] hover:text-[#888] text-xs flex items-center gap-1">
          {expanded ? "Menos opciones ↑" : "Más opciones ↓"}
        </button>
      </div>
    </div>
  );
}
