"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

type TipoResultado = "cliente" | "trato" | "cotizacion" | "proyecto" | "tecnico" | "proveedor";

interface Resultado {
  tipo: TipoResultado;
  id: string;
  titulo: string;
  subtitulo?: string;
  href: string;
}

const TIPO_LABELS: Record<TipoResultado, string> = {
  cliente:    "Cliente",
  trato:      "Trato",
  cotizacion: "Cotización",
  proyecto:   "Proyecto",
  tecnico:    "Técnico",
  proveedor:  "Proveedor",
};

const TIPO_COLORS: Record<TipoResultado, string> = {
  cliente:    "bg-blue-900/40 text-blue-300",
  trato:      "bg-yellow-900/40 text-yellow-300",
  cotizacion: "bg-purple-900/40 text-purple-300",
  proyecto:   "bg-green-900/40 text-green-300",
  tecnico:    "bg-orange-900/40 text-orange-300",
  proveedor:  "bg-gray-800 text-gray-400",
};

export default function BusquedaGlobal() {
  const [open, setOpen]         = useState(false);
  const [query, setQuery]       = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [activo, setActivo]     = useState(0);
  const [cargando, setCargando] = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router    = useRouter();

  // Abrir con Cmd+K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(p => !p);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus al abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResultados([]);
      setActivo(0);
    }
  }, [open]);

  // Debounce de búsqueda
  const buscar = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 2) { setResultados([]); return; }
    timerRef.current = setTimeout(async () => {
      setCargando(true);
      try {
        const res = await fetch(`/api/busqueda?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResultados(data.resultados ?? []);
        setActivo(0);
      } finally {
        setCargando(false);
      }
    }, 250);
  }, []);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    buscar(e.target.value);
  }

  function navegar(href: string) {
    router.push(href);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActivo(p => Math.min(p + 1, resultados.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActivo(p => Math.max(p - 1, 0)); }
    if (e.key === "Enter" && resultados[activo]) navegar(resultados[activo].href);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#222] text-gray-500 hover:text-gray-300 transition-colors text-xs"
        title="Buscar (⌘K)"
      >
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
        </svg>
        <span className="flex-1 text-left">Buscar...</span>
        <kbd className="hidden md:inline text-[10px] bg-[#111] border border-[#333] px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4" onClick={() => setOpen(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1a1a1a]">
          <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder="Buscar cliente, trato, cotización, proyecto..."
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
          />
          {cargando && (
            <div className="w-4 h-4 border-2 border-[#B3985B]/30 border-t-[#B3985B] rounded-full animate-spin shrink-0" />
          )}
          <kbd className="hidden md:inline text-[10px] text-gray-600 border border-[#333] px-1.5 py-0.5 rounded font-mono shrink-0">Esc</kbd>
        </div>

        {/* Resultados */}
        {resultados.length > 0 && (
          <ul className="max-h-[60vh] overflow-y-auto py-2">
            {resultados.map((r, i) => (
              <li key={`${r.tipo}-${r.id}`}>
                <button
                  onClick={() => navegar(r.href)}
                  onMouseEnter={() => setActivo(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === activo ? "bg-[#1a1a1a]" : "hover:bg-[#161616]"}`}
                >
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${TIPO_COLORS[r.tipo]}`}>
                    {TIPO_LABELS[r.tipo]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{r.titulo}</p>
                    {r.subtitulo && <p className="text-gray-500 text-xs truncate">{r.subtitulo}</p>}
                  </div>
                  <svg className="w-3.5 h-3.5 text-gray-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Estado vacío */}
        {query.length >= 2 && !cargando && resultados.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-gray-600 text-sm">Sin resultados para &ldquo;{query}&rdquo;</p>
          </div>
        )}

        {/* Tip inicial */}
        {query.length < 2 && (
          <div className="px-4 py-4 flex items-center gap-4 text-[11px] text-gray-600">
            <span>↑↓ navegar</span>
            <span>↵ abrir</span>
            <span>Esc cerrar</span>
          </div>
        )}
      </div>
    </div>
  );
}
