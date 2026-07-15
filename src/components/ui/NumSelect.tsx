"use client";
import { useState } from "react";

interface Props {
  value: string | number;
  onChange: (v: string) => void;
  max?: number;
  className?: string;
  title?: string;
}

// Al elegir "Más…" la lista se extiende de STEP en STEP (50 → 70 → 90 …).
const STEP = 20;

export default function NumSelect({ value, onChange, max = 50, className = "", title }: Props) {
  const num = parseInt(String(value)) || 1;
  const [extra, setExtra] = useState(0);

  // El tope siempre cubre el valor actual (p. ej. al cargar una cotización existente).
  let tope = max + extra;
  while (num > tope) tope += STEP;

  return (
    <select
      value={String(num)}
      onChange={e => {
        if (e.target.value === "mas") { setExtra(extra + STEP); return; }
        onChange(e.target.value);
      }}
      title={title}
      className={`bg-[#1a1a1a] border border-[#333] rounded-lg px-1 text-white text-sm text-center focus:outline-none focus:border-[#B3985B] ${className}`}
    >
      {Array.from({ length: tope }, (_, i) => i + 1).map(n => (
        <option key={n} value={n}>{n}</option>
      ))}
      <option value="mas">Más…</option>
    </select>
  );
}
