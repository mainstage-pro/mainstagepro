"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface VenueOption {
  id: string;
  nombre: string;
  direccion: string | null;
  ciudad: string | null;
  capacidadPersonas: number | null;
  voltajeDisponible: string | null;
  amperajeTotal: number | null;
  restriccionDecibeles: string | null;
  restriccionHorario: string | null;
}

interface Props {
  value: string;
  onChange: (value: string, venue?: VenueOption) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

export default function VenuePicker({ value, onChange, placeholder = "Escribe o busca un venue…", className = "", label }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<VenueOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync prop → local state when parent changes value externally
  useEffect(() => { setQuery(value); }, [value]);

  // Click outside → close
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    fetch(`/api/venues?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(d => { setResults(d.venues ?? []); setOpen(true); })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    setSelectedId(null);
    onChange(v, undefined);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(v), 280);
  }

  function select(venue: VenueOption) {
    setQuery(venue.nombre);
    setSelectedId(venue.id);
    setOpen(false);
    onChange(venue.nombre, venue);
  }

  const inputBase = `w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] ${className}`;

  return (
    <div ref={ref} className="relative">
      {label && <label className="text-xs text-gray-400 block mb-1">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder={placeholder}
          className={inputBase}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3 h-3 border border-[#B3985B] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {selectedId && !loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B3985B] text-xs">✓</div>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
          {results.map(v => (
            <button
              key={v.id}
              onClick={() => select(v)}
              className="w-full text-left px-4 py-3 hover:bg-[#1a1a1a] transition-colors border-b border-[#1a1a1a] last:border-0 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate group-hover:text-[#B3985B] transition-colors">{v.nombre}</p>
                  {v.ciudad && <p className="text-gray-500 text-xs">{v.ciudad}{v.direccion ? ` · ${v.direccion}` : ""}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-0.5">
                  {v.capacidadPersonas && (
                    <span className="text-gray-600 text-[10px]">👥 {v.capacidadPersonas.toLocaleString()}</span>
                  )}
                  {v.amperajeTotal && (
                    <span className="text-gray-600 text-[10px]">⚡ {v.amperajeTotal}A</span>
                  )}
                </div>
              </div>
              {(v.restriccionDecibeles || v.restriccionHorario) && (
                <div className="mt-1 flex gap-2 flex-wrap">
                  {v.restriccionDecibeles && (
                    <span className="text-[10px] text-orange-400/70">🔊 {v.restriccionDecibeles}</span>
                  )}
                  {v.restriccionHorario && (
                    <span className="text-[10px] text-orange-400/70">🕐 {v.restriccionHorario}</span>
                  )}
                </div>
              )}
            </button>
          ))}
          <button
            onClick={() => { setOpen(false); }}
            className="w-full text-center py-2 text-gray-600 text-xs hover:text-gray-400 transition-colors">
            Usar "{query}" como texto libre
          </button>
        </div>
      )}
    </div>
  );
}
