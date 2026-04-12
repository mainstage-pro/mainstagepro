"use client";
import { useEffect, useState } from "react";

export interface UndoState {
  id: string;
  titulo: string;
  expiresAt: number;   // Date.now() + 4000
}

interface Props {
  undo: UndoState | null;
  onUndo: () => void;
  onDismiss: () => void;
}

export default function UndoToast({ undo, onUndo, onDismiss }: Props) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!undo) { setProgress(100); return; }
    setProgress(100);

    const DURATION = 4000;
    const start = Date.now();
    const raf = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(pct);
      if (pct <= 0) clearInterval(raf);
    }, 50);

    return () => clearInterval(raf);
  }, [undo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!undo) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-0 rounded-xl overflow-hidden shadow-2xl shadow-black/60"
      style={{ minWidth: 320, maxWidth: 400 }}
    >
      {/* Progress bar */}
      <div className="h-0.5 bg-[#1a1a1a] w-full">
        <div
          className="h-full bg-[#B3985B] transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#111] border border-[#1e1e1e]">
        {/* Check icon */}
        <div className="w-6 h-6 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#B3985B" strokeWidth="2.5">
            <path d="M2 6l3 3 5-5"/>
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium truncate">Tarea completada</p>
          <p className="text-xs text-[#555] truncate">{undo.titulo}</p>
        </div>

        {/* Undo */}
        <button
          onClick={onUndo}
          className="px-3 py-1.5 text-xs font-semibold text-[#B3985B] border border-[#B3985B]/30 rounded-lg hover:bg-[#B3985B]/10 transition-all shrink-0"
        >
          Deshacer
        </button>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="text-[#444] hover:text-[#888] transition-colors shrink-0"
          aria-label="Cerrar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
