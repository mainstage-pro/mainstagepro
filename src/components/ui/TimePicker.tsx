"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

// Genera slots de 30 min: ["12:00 AM","12:30 AM","1:00 AM",...,"11:30 PM"]
const SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    const period = h < 12 ? "AM" : "PM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    SLOTS.push(`${h12}:${String(m).padStart(2, "0")} ${period}`);
  }
}

// "HH:MM" (24h) ↔ "h:mm AM/PM"
function to12(val: string): string {
  if (!val) return "";
  const [hStr, mStr] = val.split(":");
  const h = parseInt(hStr);
  const m = parseInt(mStr);
  if (isNaN(h) || isNaN(m)) return "";
  const period = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
function to24(display: string): string {
  const match = display.match(/^(\d+):(\d+)\s+(AM|PM)$/i);
  if (!match) return "";
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === "AM") { if (h === 12) h = 0; }
  else { if (h !== 12) h += 12; }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface TimePickerProps {
  value: string;          // "HH:MM" 24h or ""
  onChange: (val: string) => void;
  placeholder?: string;
  size?: "sm" | "md";
}

export default function TimePicker({ value, onChange, placeholder = "HH:MM", size = "md" }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropRef    = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const display = to12(value);

  const computePos = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width });
  }, []);

  useEffect(() => {
    if (!open) return;
    computePos();
    const onScroll = () => computePos();
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [open, computePos]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Scroll selected into view
  useEffect(() => {
    if (!open || !dropRef.current) return;
    const sel = dropRef.current.querySelector("[data-selected]");
    if (sel) sel.scrollIntoView({ block: "center" });
  }, [open]);

  function select(slot: string) {
    onChange(to24(slot));
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
  }

  const sizeClass = size === "sm"
    ? "h-8 px-2 text-xs"
    : "h-10 px-3 text-sm";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`relative w-full flex items-center justify-between bg-[#111] border ${open ? "border-[#B3985B]" : "border-[#222]"} rounded-lg ${sizeClass} text-left transition-colors focus:outline-none hover:border-[#B3985B]/60`}
      >
        <span className={display ? "text-white" : "text-[#555]"}>
          {display || placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={clear}
              onKeyDown={e => e.key === "Enter" && clear(e as unknown as React.MouseEvent)}
              className="text-[#444] hover:text-[#B3985B] text-xs leading-none px-0.5 rounded transition-colors cursor-pointer"
              aria-label="Limpiar hora"
            >×</span>
          )}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-[#555] transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </button>

      {open && typeof window !== "undefined" && createPortal(
        <div
          ref={dropRef}
          style={{ position: "absolute", top: pos.top, left: pos.left, width: Math.max(pos.width, 140), zIndex: 9999 }}
          className="bg-[#0d0d0d] border border-[#222] rounded-xl shadow-xl overflow-hidden"
        >
          {/* AM/PM headers */}
          <div className="grid grid-cols-2 border-b border-[#1a1a1a] text-[10px] font-semibold text-[#555] uppercase tracking-widest">
            <span className="px-3 py-1.5 border-r border-[#1a1a1a]">AM</span>
            <span className="px-3 py-1.5">PM</span>
          </div>
          <div className="grid grid-cols-2 max-h-52 overflow-y-auto">
            {/* AM column */}
            <div className="border-r border-[#1a1a1a]">
              {SLOTS.filter(s => s.endsWith("AM")).map(slot => (
                <button
                  key={slot}
                  type="button"
                  data-selected={slot === display ? "" : undefined}
                  onClick={() => select(slot)}
                  className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                    slot === display
                      ? "bg-[#B3985B]/20 text-[#B3985B] font-semibold"
                      : "text-[#9ca3af] hover:bg-[#1a1a1a] hover:text-white"
                  }`}
                >
                  {slot.replace(" AM", "")}
                </button>
              ))}
            </div>
            {/* PM column */}
            <div>
              {SLOTS.filter(s => s.endsWith("PM")).map(slot => (
                <button
                  key={slot}
                  type="button"
                  data-selected={slot === display ? "" : undefined}
                  onClick={() => select(slot)}
                  className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                    slot === display
                      ? "bg-[#B3985B]/20 text-[#B3985B] font-semibold"
                      : "text-[#9ca3af] hover:bg-[#1a1a1a] hover:text-white"
                  }`}
                >
                  {slot.replace(" PM", "")}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
