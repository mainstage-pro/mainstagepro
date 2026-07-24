"use client";
import { useState } from "react";
import { formatearRecurrencia } from "@/lib/recurrencia";
import RecurrenciaPicker from "./RecurrenciaPicker";

interface Props {
  value: string | null;
  onChange: (raw: string | null, parsed: string | null) => void;
}

export default function RecurrenciaInput({ value, onChange }: Props) {
  const [editing, setEditing] = useState(false);

  const cfg = value ? (() => { try { return JSON.parse(value); } catch { return null; } })() : null;
  const display = cfg ? formatearRecurrencia(cfg) : null;

  if (editing || value) {
    return (
      <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-2.5">
        <RecurrenciaPicker
          value={value}
          onChange={(raw) => {
            const parsed = raw ? (() => { try { return formatearRecurrencia(JSON.parse(raw)); } catch { return null; } })() : null;
            onChange(raw, parsed);
            if (!raw) setEditing(false);
          }}
          onClose={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
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
