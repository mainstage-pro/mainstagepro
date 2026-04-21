"use client";
import { useState } from "react";

interface Props {
  value: string | number;
  onChange: (v: string) => void;
  max?: number;
  className?: string;
  title?: string;
}

export default function NumSelect({ value, onChange, max = 20, className = "", title }: Props) {
  const num = parseInt(String(value)) || 1;
  const [custom, setCustom] = useState(num > max);

  if (custom || num > max) {
    return (
      <input
        type="number" min="1"
        value={value}
        autoFocus
        onChange={e => onChange(e.target.value)}
        onBlur={() => { if (parseInt(String(value)) <= max) setCustom(false); }}
        title={title}
        className={`bg-[#1a1a1a] border border-[#B3985B] rounded-lg px-2 text-white text-sm text-center focus:outline-none ${className}`}
      />
    );
  }

  return (
    <select
      value={String(num)}
      onChange={e => {
        if (e.target.value === "mas") { setCustom(true); return; }
        onChange(e.target.value);
      }}
      title={title}
      className={`bg-[#1a1a1a] border border-[#333] rounded-lg px-1 text-white text-sm text-center focus:outline-none focus:border-[#B3985B] ${className}`}
    >
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <option key={n} value={n}>{n}</option>
      ))}
      <option value="mas">Más…</option>
    </select>
  );
}
