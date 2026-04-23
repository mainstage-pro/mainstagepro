"use client";

import { useEffect, useRef, useState } from "react";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  className = "",
  disabled = false,
}: Props) {
  const selectedLabel = options.find(o => o.value === value)?.label ?? "";
  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep display text in sync when value changes externally
  useEffect(() => {
    setQuery(options.find(o => o.value === value)?.label ?? "");
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const isFiltering = query !== selectedLabel;
  const filtered = isFiltering && query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  function handleFocus() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function handleBlur() {
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      // Restore display to the current value's label if user didn't pick anything
      setQuery(options.find(o => o.value === value)?.label ?? "");
    }, 150);
  }

  function select(opt: ComboboxOption) {
    onChange(opt.value);
    setQuery(opt.label);
    setOpen(false);
  }

  const defaultCls =
    "w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] disabled:opacity-50";

  return (
    <div className="relative">
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={className || defaultCls}
        autoComplete="off"
      />

      {open && !disabled && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-[#111] border border-[#333] rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto">
          {filtered.map(opt => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={() => select(opt)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-[#1a1a1a] transition-colors border-b border-[#1a1a1a] last:border-0 ${
                opt.value === value ? "text-[#B3985B] font-medium" : "text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
