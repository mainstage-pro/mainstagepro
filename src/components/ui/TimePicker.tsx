"use client";
import HoraInput from "@/components/ui/HoraInput";

interface TimePickerProps {
  value: string;          // "HH:MM" 24h or ""
  onChange: (val: string) => void;
  placeholder?: string;
  size?: "sm" | "md";
}

// Campo de hora escrito a mano en formato de 12h (AM/PM).
// Se mantiene el nombre TimePicker por compatibilidad con los usos existentes.
export default function TimePicker({ value, onChange, placeholder, size = "md" }: TimePickerProps) {
  return (
    <HoraInput
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? "ej. 2:30 PM"}
      size={size}
    />
  );
}
