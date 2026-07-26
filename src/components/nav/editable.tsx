"use client";

import { useCallback, useRef, useState } from "react";

// Distingue un clic simple (navegar) de un doble clic (renombrar) sobre un mismo
// elemento. Difiere la acción de clic simple ~220ms para poder cancelarla si
// llega el segundo clic.
export function useSingleDoubleClick(
  onSingle: () => void,
  onDouble: () => void,
  delay = 220,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (e: React.MouseEvent) => {
      // Respeta cmd/ctrl/click-medio como navegación inmediata del navegador.
      if (e.metaKey || e.ctrlKey || e.button === 1) return;
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
        onDouble();
      } else {
        timer.current = setTimeout(() => {
          timer.current = null;
          onSingle();
        }, delay);
      }
    },
    [onSingle, onDouble, delay],
  );
}

export function EditInput({
  initial,
  onCommit,
  onCancel,
  className,
}: {
  initial: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
  className?: string;
}) {
  const [val, setVal] = useState(initial);

  const commit = () => {
    const t = val.trim();
    if (t) onCommit(t);
    else onCancel();
  };

  return (
    <span
      className="inline-flex items-center gap-1 flex-1 min-w-0"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className={
          className ??
          "flex-1 min-w-0 bg-[#1a1a1a] border border-[#333] rounded px-1.5 py-0.5 text-sm text-white outline-none focus:border-[#B3985B]"
        }
      />
      <button
        type="button"
        aria-label="Guardar"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          commit();
        }}
        className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-green-400 hover:text-green-300 hover:bg-[#1a1a1a] text-xs"
      >
        ✓
      </button>
      <button
        type="button"
        aria-label="Cancelar"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        }}
        className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-red-400 hover:text-red-300 hover:bg-[#1a1a1a] text-xs"
      >
        ✕
      </button>
    </span>
  );
}
