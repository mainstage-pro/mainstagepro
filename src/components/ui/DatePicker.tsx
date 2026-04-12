"use client";
import { useState, useRef, useEffect, useCallback } from "react";

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const DIAS = ["Do","Lu","Ma","Mi","Ju","Vi","Sá"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}
function todayISO() {
  const n = new Date();
  return toISO(n.getFullYear(), n.getMonth(), n.getDate());
}
function parseISO(iso: string): { y: number; m: number; d: number } | null {
  const parts = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parts) return null;
  return { y: +parts[1], m: +parts[2] - 1, d: +parts[3] };
}
function displayDate(iso: string): string {
  const p = parseISO(iso);
  if (!p) return "";
  return `${String(p.d).padStart(2,"0")}/${String(p.m + 1).padStart(2,"0")}/${p.y}`;
}

// ── Calendar grid ─────────────────────────────────────────────────────────────

function buildGrid(year: number, month: number): (number | null)[] {
  const first   = new Date(year, month, 1).getDay();   // 0=Dom
  const days    = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(first).fill(null);
  for (let i = 1; i <= days; i++) cells.push(i);
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ── Quick date chips ──────────────────────────────────────────────────────────

function quickDates(): { label: string; iso: string }[] {
  const d = new Date();
  const fmt = (dt: Date) => toISO(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const man = new Date(d); man.setDate(d.getDate() + 1);
  const sem = new Date(d); sem.setDate(d.getDate() + 7);
  return [
    { label: "Hoy",          iso: fmt(d)   },
    { label: "Mañana",       iso: fmt(man) },
    { label: "En una semana",iso: fmt(sem) },
  ];
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface DatePickerProps {
  value: string;          // "YYYY-MM-DD" or ""
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  showClear?: boolean;
  size?: "sm" | "md";
}

export default function DatePicker({
  value, onChange, placeholder = "dd/mm/aaaa",
  className = "", showClear = true, size = "md",
}: DatePickerProps) {
  const today = todayISO();
  const parsed = parseISO(value);

  const [open, setOpen]         = useState(false);
  const [viewYear, setViewYear] = useState(() => parsed?.y ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parsed?.m ?? new Date().getMonth());
  const [above, setAbove]       = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const calRef       = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Position above/below
  useEffect(() => {
    if (!open || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setAbove(spaceBelow < 300);
  }, [open]);

  // Sync view when value changes externally
  useEffect(() => {
    if (parsed) { setViewYear(parsed.y); setViewMonth(parsed.m); }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevMonth = useCallback(() => {
    setViewMonth(m => { if (m === 0) { setViewYear(y => y - 1); return 11; } return m - 1; });
  }, []);
  const nextMonth = useCallback(() => {
    setViewMonth(m => { if (m === 11) { setViewYear(y => y + 1); return 0; } return m + 1; });
  }, []);

  function selectDay(day: number) {
    onChange(toISO(viewYear, viewMonth, day));
    setOpen(false);
  }

  function clearDate(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
  }

  const grid  = buildGrid(viewYear, viewMonth);
  const chips = quickDates();
  const szCls = size === "sm"
    ? "px-2.5 py-1.5 text-xs"
    : "px-3 py-2 text-sm";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`group w-full flex items-center gap-2 ${szCls} bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg text-left transition-all hover:border-[#2a2a2a] focus:outline-none ${open ? "border-[#B3985B]/50 ring-1 ring-[#B3985B]/10" : ""}`}
      >
        {/* Calendar icon */}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke={value ? "#B3985B" : "#444"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="shrink-0 transition-colors">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8"  y1="2" x2="8"  y2="6"/>
          <line x1="3"  y1="10" x2="21" y2="10"/>
        </svg>

        <span className={`flex-1 ${value ? "text-white" : "text-[#3a3a3a]"}`}>
          {value ? displayDate(value) : placeholder}
        </span>

        {/* Clear button */}
        {value && showClear && (
          <span onClick={clearDate}
            className="opacity-0 group-hover:opacity-100 text-[#555] hover:text-red-400 transition-all"
            role="button" aria-label="Quitar fecha">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </span>
        )}
      </button>

      {/* Calendar popup */}
      {open && (
        <div
          ref={calRef}
          className={`absolute z-50 ${above ? "bottom-full mb-1" : "top-full mt-1"} left-0 w-72 bg-[#0c0c0c] border border-[#1e1e1e] rounded-xl shadow-2xl shadow-black/70 overflow-hidden`}
        >
          {/* Quick chips */}
          <div className="flex gap-1.5 px-3 pt-3 pb-2 border-b border-[#141414]">
            {chips.map(c => (
              <button key={c.iso} onClick={() => { onChange(c.iso); setOpen(false); }}
                className={`flex-1 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                  value === c.iso
                    ? "bg-[#B3985B]/15 border-[#B3985B]/40 text-[#B3985B]"
                    : "border-[#1a1a1a] text-[#555] hover:border-[#252525] hover:text-[#999]"
                }`}>
                {c.label}
              </button>
            ))}
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between px-3 py-2.5">
            <button onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button onClick={() => { setViewYear(new Date().getFullYear()); setViewMonth(new Date().getMonth()); }}
              className="text-sm font-medium text-white hover:text-[#B3985B] transition-colors">
              {MESES[viewMonth]} {viewYear}
            </button>
            <button onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-3 pb-1">
            {DIAS.map(d => (
              <div key={d} className="text-center text-[10px] text-[#444] font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
            {grid.map((day, i) => {
              if (!day) return <div key={i} />;
              const iso      = toISO(viewYear, viewMonth, day);
              const isToday  = iso === today;
              const isSel    = iso === value;
              const isPast   = iso < today;
              return (
                <button key={i} onClick={() => selectDay(day)}
                  className={`aspect-square flex items-center justify-center rounded-lg text-[13px] transition-all font-medium ${
                    isSel
                      ? "bg-[#B3985B] text-[#0a0a0a] shadow-md shadow-[#B3985B]/30"
                      : isToday
                      ? "ring-1 ring-[#B3985B]/50 text-[#B3985B] hover:bg-[#B3985B]/10"
                      : isPast
                      ? "text-[#333] hover:text-[#666] hover:bg-[#111]"
                      : "text-[#ccc] hover:bg-[#1a1a1a] hover:text-white"
                  }`}>
                  {day}
                </button>
              );
            })}
          </div>

          {/* Clear footer */}
          {value && showClear && (
            <div className="border-t border-[#141414] px-3 py-2">
              <button onClick={() => { onChange(""); setOpen(false); }}
                className="text-xs text-[#444] hover:text-red-400 transition-colors">
                Quitar fecha
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
