"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  const selectedLabel = value ? (options.find(o => o.value === value)?.label ?? "") : "";
  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep display text in sync when value changes externally
  useEffect(() => {
    setQuery(value ? (options.find(o => o.value === value)?.label ?? "") : "");
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const isFiltering = query !== selectedLabel;
  const filtered = isFiltering && query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  function updatePosition() {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    setDropStyle({ position: "fixed", top: r.bottom + 4, left: r.left, width: r.width, zIndex: 9999 });
  }

  function handleFocus() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    updatePosition();
    setQuery("");
    setOpen(true);
  }

  function handleBlur() {
    closeTimer.current = setTimeout(() => {
      setOpen(false);
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

  const dropdown = open && !disabled && filtered.length > 0 && (
    <div style={dropStyle} className="bg-[#111] border border-[#333] rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto">
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
  );

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={className || defaultCls}
        autoComplete="off"
      />
      {typeof document !== "undefined" && dropdown && createPortal(dropdown, document.body)}
    </div>
  );
}
