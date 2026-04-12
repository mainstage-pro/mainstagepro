"use client";
import { useState } from "react";
import { parsearRecurrencia, formatearRecurrencia } from "@/lib/recurrencia";

interface Props {
  value: string | null;
  onChange: (raw: string | null, parsed: string | null) => void;
}

export default function RecurrenciaInput({ value, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");

  const cfg = value ? (() => { try { return JSON.parse(value); } catch { return null; } })() : null;
  const display = cfg ? formatearRecurrencia(cfg) : null;

  function confirmar() {
    if (!texto.trim()) {
      onChange(null, null);
      setEditing(false);
      return;
    }
    const cfg = parsearRecurrencia(texto.trim());
    if (!cfg) {
      setError("No entendí el patrón. Prueba: 'cada lunes', 'cada martes y jueves', 'cada tercer viernes'");
      return;
    }
    onChange(JSON.stringify(cfg), formatearRecurrencia(cfg));
    setTexto("");
    setError("");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-1">
        <input
          autoFocus
          value={texto}
          onChange={e => { setTexto(e.target.value); setError(""); }}
          onKeyDown={e => { if (e.key === "Enter") confirmar(); if (e.key === "Escape") { setEditing(false); setError(""); } }}
          placeholder="cada lunes, cada martes y jueves, cada mes…"
          className="w-full bg-[#111] border border-[#2a2a2a] rounded px-2 py-1 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]"
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex gap-2">
          <button onClick={confirmar} className="text-xs text-[#B3985B] hover:underline">Confirmar</button>
          <button onClick={() => { setEditing(false); setError(""); }} className="text-xs text-[#555] hover:text-white">Cancelar</button>
          {value && (
            <button onClick={() => { onChange(null, null); setEditing(false); }} className="text-xs text-red-400 hover:underline ml-auto">Quitar</button>
          )}
        </div>
        <p className="text-[10px] text-[#444]">
          Ejemplos: &quot;cada día&quot; · &quot;cada lunes&quot; · &quot;cada martes y jueves&quot; · &quot;cada tercer viernes&quot; · &quot;cada semana&quot; · &quot;cada mes&quot;
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setTexto(""); setEditing(true); }}
      className="flex items-center gap-1.5 text-sm text-[#555] hover:text-white transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 1l4 4-4 4" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <path d="M7 23l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
      {display ? (
        <span className="text-[#B3985B]">{display}</span>
      ) : (
        <span>Sin recurrencia</span>
      )}
    </button>
  );
}
