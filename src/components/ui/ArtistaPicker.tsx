"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Mic2, Plus, X, Check } from "lucide-react";

export interface ArtistaOption {
  id: string;
  nombre: string;
  genero: string | null;
  origen: string | null;
}

interface Props {
  /** Artista ya seleccionado. Null = sin artista. */
  artistaId?: string | null;
  nombre?: string | null;
  onChange: (artistaId: string | null, artista?: ArtistaOption) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

export default function ArtistaPicker({
  artistaId = null, nombre = null, onChange,
  placeholder = "Busca el artista en el catálogo…", className = "", label,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArtistaOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState({ nombre: "", genero: "", origen: "" });
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
    fetch(`/api/artistas${q.trim() ? `?q=${encodeURIComponent(q)}` : ""}`)
      .then(r => r.json())
      .then(d => setResults(d.artistas ?? []))
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

  function select(artista: ArtistaOption) {
    setOpen(false);
    setCreando(false);
    setQuery("");
    onChange(artista.id, artista);
  }

  function abrirAlta() {
    setNuevo({ nombre: query.trim(), genero: "", origen: "" });
    setCreando(true);
    setError(null);
  }

  async function crear() {
    if (!nuevo.nombre.trim()) { setError("El nombre es obligatorio."); return; }
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch("/api/artistas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevo.nombre.trim(),
          genero: nuevo.genero.trim() || null,
          origen: nuevo.origen.trim() || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "No se pudo registrar el artista."); return; }
      select(d.artista);
    } catch {
      setError("No se pudo registrar el artista.");
    } finally {
      setGuardando(false);
    }
  }

  const exacto = results.some(a => a.nombre.trim().toLowerCase() === query.trim().toLowerCase());

  if (artistaId && nombre && !open) {
    return (
      <div className={className}>
        {label && <label className="text-xs text-gray-400 block mb-1">{label}</label>}
        <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2">
          <Mic2 strokeWidth={1.75} className="w-4 h-4 shrink-0 text-[#B3985B]" />
          <p className="min-w-0 flex-1 text-white text-sm truncate">{nombre}</p>
          <button type="button" onClick={abrir} className="shrink-0 text-xs text-[#B3985B] hover:text-white transition-colors">Cambiar</button>
          <button type="button" onClick={() => onChange(null)} className="shrink-0 text-gray-600 hover:text-white transition-colors" title="Quitar artista">
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
        <Mic2 strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
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
              <p className="text-xs text-[#B3985B] font-medium">Registrar artista nuevo</p>
              <input autoFocus value={nuevo.nombre} onChange={e => setNuevo(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Nombre del artista *"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              <div className="grid grid-cols-2 gap-2">
                <input value={nuevo.genero} onChange={e => setNuevo(p => ({ ...p, genero: e.target.value }))} placeholder="Género"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                <input value={nuevo.origen} onChange={e => setNuevo(p => ({ ...p, origen: e.target.value }))} placeholder="Origen"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={crear} disabled={guardando}
                  className="flex-1 inline-flex items-center justify-center gap-1 bg-[#B3985B] hover:bg-[#c5a968] disabled:opacity-50 text-black text-xs font-medium rounded-lg px-3 py-2 transition-colors">
                  <Check strokeWidth={2} className="w-3.5 h-3.5" /> {guardando ? "Guardando…" : "Registrar y usar"}
                </button>
                <button type="button" onClick={() => setCreando(false)}
                  className="px-3 py-2 text-xs text-gray-500 hover:text-white transition-colors">Cancelar</button>
              </div>
              <p className="text-gray-600 text-[10px]">El contacto de booking se completa después en Directorio → Artistas.</p>
            </div>
          ) : (
            <>
              <div className="max-h-64 overflow-y-auto">
                {results.map(a => (
                  <button type="button" key={a.id} onClick={() => select(a)}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#1a1a1a] transition-colors border-b border-[#1a1a1a] last:border-0 group">
                    <p className="text-white text-sm font-medium truncate group-hover:text-[#B3985B] transition-colors">{a.nombre}</p>
                    {(a.genero || a.origen) && (
                      <p className="text-gray-500 text-xs truncate">
                        {[a.genero, a.origen].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </button>
                ))}
                {!loading && results.length === 0 && (
                  <p className="px-4 py-3 text-gray-600 text-xs">
                    {query.trim() ? `Ningún artista coincide con «${query.trim()}».` : "El catálogo está vacío."}
                  </p>
                )}
              </div>
              {!exacto && (
                <button type="button" onClick={abrirAlta}
                  className="w-full flex items-center gap-2 px-4 py-2.5 border-t border-[#2a2a2a] text-[#B3985B] text-xs hover:bg-[#1a1a1a] transition-colors">
                  <Plus strokeWidth={2} className="w-3.5 h-3.5" />
                  {query.trim() ? `Registrar «${query.trim()}» como artista nuevo` : "Registrar un artista nuevo"}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
