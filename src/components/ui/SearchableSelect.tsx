"use client";
import { useState, useRef, useEffect } from "react";

interface Option {
  value: string;
  label: string;
  group?: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchableSelect({ options, value, onChange, placeholder = "— Buscar… —", className = "" }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  // Group by `group` if present
  const groups: { group: string; items: Option[] }[] = [];
  for (const opt of filtered) {
    const g = opt.group ?? "";
    const existing = groups.find(x => x.group === g);
    if (existing) existing.items.push(opt);
    else groups.push({ group: g, items: [opt] });
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {open ? (
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Escribe para buscar…"
          className="w-full bg-[#1a1a1a] border border-[#B3985B] rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-left focus:outline-none hover:border-[#555] flex items-center justify-between"
        >
          <span className={selected ? "text-white" : "text-gray-500"}>{selected?.label ?? placeholder}</span>
          <span className="text-gray-600 text-xs ml-2">▾</span>
        </button>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-[#111] border border-[#333] rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-gray-500 text-xs text-center py-3">Sin resultados</p>
          ) : (
            groups.map(({ group, items }) => (
              <div key={group}>
                {group && (
                  <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold px-3 pt-2 pb-1">{group}</p>
                )}
                {items.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); onChange(opt.value); setOpen(false); setQuery(""); }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${opt.value === value ? "bg-[#B3985B]/20 text-[#B3985B]" : "text-white hover:bg-[#1a1a1a]"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
