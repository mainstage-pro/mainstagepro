"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Users, Zap, Volume2, Clock, MapPin, Plus, X, Check } from "lucide-react";
import { VENUE_TIPOS, etiquetaTipoVenue } from "@/lib/venues";

export interface VenueOption {
  id: string;
  nombre: string;
  tipo: string | null;
  direccion: string | null;
  ciudad: string | null;
  estado: string | null;
  capacidadPersonas: number | null;
  voltajeDisponible: string | null;
  amperajeTotal: number | null;
  restriccionDecibeles: string | null;
  restriccionHorario: string | null;
}

interface Props {
  /** Nombre del venue ya seleccionado (espejo de Venue.nombre). */
  value: string;
  /** Id del venue del catálogo. Null = todavía no está ligado al catálogo. */
  venueId?: string | null;
  onChange: (nombre: string, venueId: string | null, venue?: VenueOption) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

export default function VenuePicker({ value, venueId = null, onChange, placeholder = "Busca el venue en el catálogo…", className = "", label }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VenueOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState({ nombre: "", tipo: "SALON", ciudad: "", estado: "", direccion: "" });
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setCreando(false); }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback((q: string) => {
    setLoading(true);
    fetch(`/api/venues${q.trim() ? `?q=${encodeURIComponent(q)}` : ""}`)
      .then(r => r.json())
      .then(d => setResults(d.venues ?? []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  function abrir() {
    setOpen(true);
    setCreando(false);
    setError(null);
    search(query);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(q), 280);
  }

  function select(venue: VenueOption) {
    setOpen(false);
    setCreando(false);
    setQuery("");
    onChange(venue.nombre, venue.id, venue);
  }

  function limpiar() {
    setQuery("");
    onChange("", null);
  }

  function abrirAlta() {
    setNuevo({ nombre: query.trim(), tipo: "SALON", ciudad: "", estado: "", direccion: "" });
    setCreando(true);
    setError(null);
  }

  async function crear() {
    if (!nuevo.nombre.trim()) { setError("El nombre es obligatorio."); return; }
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevo.nombre.trim(),
          tipo: nuevo.tipo,
          ciudad: nuevo.ciudad.trim() || null,
          estado: nuevo.estado.trim() || null,
          direccion: nuevo.direccion.trim() || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "No se pudo registrar el venue."); return; }
      select(d.venue);
    } catch {
      setError("No se pudo registrar el venue.");
    } finally {
      setGuardando(false);
    }
  }

  const exacto = results.some(v => v.nombre.trim().toLowerCase() === query.trim().toLowerCase());

  // Ya hay venue elegido y el panel está cerrado: se muestra como ficha, no como input.
  if (value && !open) {
    return (
      <div className={className}>
        {label && <label className="text-xs text-gray-400 block mb-1">{label}</label>}
        <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2">
          <MapPin strokeWidth={1.75} className={`w-4 h-4 shrink-0 ${venueId ? "text-[#B3985B]" : "text-orange-400"}`} />
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm truncate">{value}</p>
            {!venueId && <p className="text-orange-400/80 text-[10px]">Texto suelto — elige el venue del catálogo</p>}
          </div>
          <button type="button" onClick={abrir} className="shrink-0 text-xs text-[#B3985B] hover:text-white transition-colors">Cambiar</button>
          <button type="button" onClick={limpiar} className="shrink-0 text-gray-600 hover:text-white transition-colors" title="Quitar venue">
            <X strokeWidth={1.75} className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      {label && <label className="text-xs text-gray-400 block mb-1">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={abrir}
          placeholder={placeholder}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
        />
        <MapPin strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3 h-3 border border-[#B3985B] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden">
          {creando ? (
            <div className="p-3 space-y-2">
              <p className="text-xs text-[#B3985B] font-medium">Registrar venue nuevo</p>
              <input autoFocus value={nuevo.nombre} onChange={e => setNuevo(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Nombre del venue *"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              <select value={nuevo.tipo} onChange={e => setNuevo(p => ({ ...p, tipo: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                {VENUE_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input value={nuevo.ciudad} onChange={e => setNuevo(p => ({ ...p, ciudad: e.target.value }))} placeholder="Ciudad"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                <input value={nuevo.estado} onChange={e => setNuevo(p => ({ ...p, estado: e.target.value }))} placeholder="Estado"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <input value={nuevo.direccion} onChange={e => setNuevo(p => ({ ...p, direccion: e.target.value }))} placeholder="Dirección"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={crear} disabled={guardando}
                  className="flex-1 inline-flex items-center justify-center gap-1 bg-[#B3985B] hover:bg-[#c5a968] disabled:opacity-50 text-black text-xs font-medium rounded-lg px-3 py-2 transition-colors">
                  <Check strokeWidth={2} className="w-3.5 h-3.5" /> {guardando ? "Guardando…" : "Registrar y usar"}
                </button>
                <button type="button" onClick={() => setCreando(false)}
                  className="px-3 py-2 text-xs text-gray-500 hover:text-white transition-colors">Cancelar</button>
              </div>
              <p className="text-gray-600 text-[10px]">Los datos técnicos (capacidad, corriente, restricciones) se completan después en Directorio → Venues.</p>
            </div>
          ) : (
            <>
              <div className="max-h-64 overflow-y-auto">
                {results.map(v => (
                  <button
                    type="button"
                    key={v.id}
                    onClick={() => select(v)}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#1a1a1a] transition-colors border-b border-[#1a1a1a] last:border-0 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate group-hover:text-[#B3985B] transition-colors">{v.nombre}</p>
                        <p className="text-gray-500 text-xs truncate">
                          {etiquetaTipoVenue(v.tipo)}
                          {v.ciudad ? ` · ${v.ciudad}` : ""}
                          {v.estado && v.estado !== v.ciudad ? `, ${v.estado}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-0.5">
                        {v.capacidadPersonas && (
                          <span className="inline-flex items-center gap-1 text-gray-600 text-[10px]"><Users strokeWidth={1.75} className="w-3 h-3" /> {v.capacidadPersonas.toLocaleString()}</span>
                        )}
                        {v.amperajeTotal && (
                          <span className="inline-flex items-center gap-1 text-gray-600 text-[10px]"><Zap strokeWidth={1.75} className="w-3 h-3" /> {v.amperajeTotal}A</span>
                        )}
                      </div>
                    </div>
                    {(v.restriccionDecibeles || v.restriccionHorario) && (
                      <div className="mt-1 flex gap-2 flex-wrap">
                        {v.restriccionDecibeles && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-orange-400/70"><Volume2 strokeWidth={1.75} className="w-3 h-3" /> {v.restriccionDecibeles}</span>
                        )}
                        {v.restriccionHorario && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-orange-400/70"><Clock strokeWidth={1.75} className="w-3 h-3" /> {v.restriccionHorario}</span>
                        )}
                      </div>
                    )}
                  </button>
                ))}
                {!loading && results.length === 0 && (
                  <p className="px-4 py-3 text-gray-600 text-xs">
                    {query.trim() ? `Ningún venue coincide con «${query.trim()}».` : "El catálogo está vacío."}
                  </p>
                )}
              </div>
              {!exacto && (
                <button type="button" onClick={abrirAlta}
                  className="w-full flex items-center gap-2 px-4 py-2.5 border-t border-[#2a2a2a] text-[#B3985B] text-xs hover:bg-[#1a1a1a] transition-colors">
                  <Plus strokeWidth={2} className="w-3.5 h-3.5" />
                  {query.trim() ? `Registrar «${query.trim()}» como venue nuevo` : "Registrar un venue nuevo"}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
