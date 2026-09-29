"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Package } from "lucide-react";
import { getEquipoDisplayName } from "@/lib/equipoNombre";
import { coincide } from "@/lib/buscar";

export interface EquipoCascada {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  imagenUrl: string | null;
  categoria: { nombre: string; orden?: number };
}

export function agruparEquiposPorCategoria<T extends EquipoCascada>(equipos: T[]): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const eq of equipos) {
    const cat = eq.categoria.nombre;
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(eq);
  }
  return Array.from(map.entries()).sort((a, b) => {
    const oa = a[1][0].categoria.orden ?? 99;
    const ob = b[1][0].categoria.orden ?? 99;
    return oa - ob || a[0].localeCompare(b[0]);
  });
}

export default function SelectorEquipoCascada<T extends EquipoCascada>({
  value,
  onChange,
  grupos,
  placeholder = "— Seleccionar equipo —",
  renderMeta,
}: {
  value: string;
  onChange: (id: string) => void;
  grupos: [string, T[]][];
  placeholder?: string;
  renderMeta?: (eq: T) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (activeCat) searchRef.current?.focus();
  }, [activeCat]);

  function abrirCategoria(cat: string) {
    setActiveCat(cat);
    setSearch("");
  }

  // Sin selección explícita cae en la primera categoría, incluso si el catálogo
  // todavía estaba cargando cuando se abrió el panel.
  const catActual = activeCat ?? grupos[0]?.[0] ?? null;

  const todos = grupos.flatMap(([, eqs]) => eqs);
  const selected = todos.find(e => e.id === value);

  const selectedLabel = selected
    ? [selected.marca, selected.modelo].filter(Boolean).join(" ") || selected.descripcion
    : null;
  const selectedSubLabel = selectedLabel && selectedLabel !== selected?.descripcion
    ? selected?.descripcion ?? null
    : null;

  // Con búsqueda activa se busca en todas las categorías, no solo en la abierta.
  const q = search.trim();
  const catEquipos = q
    ? todos.filter(eq => coincide(q, eq.descripcion, eq.marca, eq.modelo))
    : catActual
    ? grupos.find(([cat]) => cat === catActual)?.[1] ?? []
    : [];

  function handleSelect(id: string) {
    onChange(id);
    setOpen(false);
    setSearch("");
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between bg-[#1a1a1a] border ${
          open ? "border-[#B3985B]/60" : "border-[#2a2a2a]"
        } rounded-lg px-3 py-2 text-sm text-left focus:outline-none hover:border-[#B3985B]/60 transition-colors`}
      >
        <span className={selected ? "text-white truncate flex-1" : "text-gray-500 flex-1"}>
          {selectedLabel
            ? (selectedSubLabel ? `${selectedLabel}  ·  ${selectedSubLabel}` : selectedLabel)
            : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={e => e.key === "Enter" && handleClear(e as unknown as React.MouseEvent)}
              className="text-gray-600 hover:text-gray-300 text-sm leading-none px-0.5 cursor-pointer transition-colors"
            >×</span>
          )}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`text-gray-600 transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {open && (
        <div
          className="absolute z-50 top-full mt-1 left-0 min-w-[max(460px,100%)] bg-[#0d0d0d] border border-[#222] rounded-xl shadow-2xl overflow-hidden flex"
        >
          <div className="w-44 shrink-0 border-r border-[#1a1a1a] py-1 overflow-y-auto" style={{ maxHeight: 260 }}>
            {grupos.map(([cat, eqs]) => (
              <button
                key={cat}
                type="button"
                onMouseEnter={() => abrirCategoria(cat)}
                onClick={() => abrirCategoria(cat)}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between ${
                  catActual === cat ? "bg-[#1a1a1a] text-white" : "text-gray-500 hover:text-gray-300 hover:bg-[#111]"
                }`}
              >
                <span className="truncate">{cat}</span>
                <span className="text-gray-700 text-[10px] shrink-0 ml-1">({eqs.length})</span>
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col min-w-0" style={{ maxHeight: 260 }}>
            {catActual ? (
              <>
                <div className="px-3 py-2 border-b border-[#1a1a1a] shrink-0">
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar equipo..."
                    className="w-full bg-[#111] border border-[#1a1a1a] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]/50"
                  />
                </div>
                <div className="overflow-y-auto flex-1">
                  {catEquipos.length === 0 ? (
                    <p className="text-gray-600 text-xs px-3 py-4 text-center">Sin resultados</p>
                  ) : (
                    catEquipos.map(eq => {
                      const isSelected = value === eq.id;
                      return (
                        <button
                          key={eq.id}
                          type="button"
                          onClick={() => handleSelect(eq.id)}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                            isSelected ? "bg-[#B3985B]/10 text-[#B3985B]" : "text-gray-400 hover:bg-[#111] hover:text-white"
                          }`}
                        >
                          {eq.imagenUrl ? (
                            <img src={eq.imagenUrl} alt="" className="w-8 h-8 object-contain rounded bg-[#0a0a0a] p-0.5 shrink-0" />
                          ) : (
                            <span className="w-8 h-8 rounded bg-[#141414] shrink-0 flex items-center justify-center">
                              <Package className="w-3.5 h-3.5 text-gray-700" />
                            </span>
                          )}
                          <span className="flex-1 min-w-0">
                            <span className="block font-medium truncate">{getEquipoDisplayName(eq)}</span>
                            {(eq.marca || eq.modelo) && (
                              <span className="block text-[10px] text-gray-500 truncate">{eq.descripcion}</span>
                            )}
                          </span>
                          <span className="shrink-0 text-[10px] whitespace-nowrap flex items-center gap-1.5">
                            {q && <span className="text-[9px] text-gray-600 max-w-[60px] truncate font-normal">{eq.categoria.nombre}</span>}
                            {renderMeta?.(eq)}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <p className="text-gray-600 text-xs px-4 py-6 text-center">Pasa el cursor sobre una categoría</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
