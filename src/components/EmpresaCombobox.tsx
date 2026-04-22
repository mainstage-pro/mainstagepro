"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface EmpresaOption {
  id: string;
  nombre: string;
}

interface Props {
  value: EmpresaOption | null;
  onChange: (empresa: EmpresaOption | null) => void;
  tipoDefault?: "CLIENTE" | "PROVEEDOR" | "AMBOS";
  placeholder?: string;
  className?: string;
}

export function EmpresaCombobox({ value, onChange, tipoDefault = "AMBOS", placeholder = "Buscar o crear empresa...", className = "" }: Props) {
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [query, setQuery] = useState(value?.nombre ?? "");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/empresas", { cache: "no-store" })
      .then(r => r.json())
      .then(d => setEmpresas(d.empresas ?? []));
  }, []);

  // Keep query in sync when value is set externally
  useEffect(() => {
    setQuery(value?.nombre ?? "");
  }, [value?.nombre]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = query.trim()
    ? empresas.filter(e => e.nombre.toLowerCase().includes(query.toLowerCase()))
    : empresas;

  const exactMatch = empresas.some(e => e.nombre.toLowerCase() === query.trim().toLowerCase());

  function handleFocus() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function handleBlur() {
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      // If user typed something but didn't select, restore previous value name
      if (value && query !== value.nombre) setQuery(value.nombre);
      if (!value) setQuery("");
    }, 150);
  }

  function select(emp: EmpresaOption) {
    onChange(emp);
    setQuery(emp.nombre);
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.preventDefault();
    onChange(null);
    setQuery("");
    inputRef.current?.focus();
  }

  async function createAndSelect() {
    const nombre = query.trim();
    if (!nombre || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, tipo: tipoDefault }),
      });
      const d = await res.json();
      if (res.ok && d.empresa) {
        setEmpresas(prev => [...prev, d.empresa].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        select(d.empresa);
      }
    } finally {
      setCreating(false);
    }
  }

  const baseCls = `w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] ${className}`;

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={baseCls}
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            onMouseDown={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 text-xs px-1"
            tabIndex={-1}
          >
            ✕
          </button>
        )}
      </div>

      {/* Selected empresa link */}
      {value && (
        <Link
          href={`/catalogo/empresas`}
          className="text-[10px] text-[#B3985B] hover:underline mt-0.5 block"
          tabIndex={-1}
        >
          Ver empresa →
        </Link>
      )}

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-[#111] border border-[#333] rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto">
          {filtered.length === 0 && !query.trim() && (
            <p className="text-gray-600 text-xs px-3 py-2">Sin empresas registradas</p>
          )}
          {filtered.map(emp => (
            <button
              key={emp.id}
              type="button"
              onMouseDown={() => select(emp)}
              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#1a1a1a] transition-colors border-b border-[#1a1a1a] last:border-0"
            >
              {emp.nombre}
            </button>
          ))}
          {query.trim() && !exactMatch && (
            <button
              type="button"
              onMouseDown={createAndSelect}
              disabled={creating}
              className="w-full text-left px-3 py-2 text-sm text-[#B3985B] hover:bg-[#1a1a1a] transition-colors border-t border-[#222] font-medium"
            >
              {creating ? "Creando..." : `+ Crear "${query.trim()}"`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
