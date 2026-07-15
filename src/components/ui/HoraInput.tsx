"use client";
import { useEffect, useRef, useState } from "react";
import { fmt24to12, parseHora } from "@/lib/hora";

interface HoraInputProps {
  value: string | null | undefined; // "HH:MM" 24h o ""
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  size?: "sm" | "md";
}

// Campo de hora escrito a mano. El usuario teclea libremente
// ("2:30 pm", "230pm", "14:30"…) y al salir se normaliza a "h:mm AM/PM".
// Al padre siempre se le entrega "HH:MM" en 24h.
export default function HoraInput({ value, onChange, placeholder = "ej. 2:30 PM", className, size = "md" }: HoraInputProps) {
  const [text, setText] = useState(() => fmt24to12(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(fmt24to12(value));
  }, [value]);

  function commit() {
    focused.current = false;
    const parsed = parseHora(text);
    setText(fmt24to12(parsed));
    if (parsed !== (value ?? "")) onChange(parsed);
  }

  const sizeClass = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm";

  return (
    <input
      type="text"
      value={text}
      inputMode="numeric"
      placeholder={placeholder}
      onFocus={() => { focused.current = true; }}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      className={
        className ??
        `w-full bg-[#1a1a1a] border border-[#2a2a2a] focus:border-[#B3985B] rounded-lg text-white focus:outline-none transition-colors ${sizeClass}`
      }
    />
  );
}
