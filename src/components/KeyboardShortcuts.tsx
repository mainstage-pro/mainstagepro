"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: Shortcut[] = [
  // Navegación
  { keys: ["⌘", "K"], description: "Búsqueda global", category: "Navegación" },
  { keys: ["G", "D"], description: "Ir a Dashboard", category: "Navegación" },
  { keys: ["G", "C"], description: "Ir a Clientes", category: "Navegación" },
  { keys: ["G", "T"], description: "Ir a Tratos", category: "Navegación" },
  { keys: ["G", "Q"], description: "Ir a Cotizaciones", category: "Navegación" },
  { keys: ["G", "P"], description: "Ir a Proyectos", category: "Navegación" },
  // Acciones
  { keys: ["?"], description: "Mostrar atajos de teclado", category: "General" },
  { keys: ["Esc"], description: "Cerrar modal / panel", category: "General" },
];

const NAV_SEQUENCES: Record<string, string> = {
  "gd": "/dashboard",
  "gc": "/crm/clientes",
  "gt": "/crm/tratos",
  "gq": "/cotizaciones",
  "gp": "/proyectos",
};

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const seqRef = { current: "" };

  useEffect(() => {
    let seq = "";
    let seqTimer: ReturnType<typeof setTimeout> | null = null;

    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement).isContentEditable;

      // ? to open shortcuts
      if (!isInput && e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(v => !v);
        return;
      }

      // Esc to close
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }

      // g+letter sequences (only outside inputs)
      if (!isInput && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.length === 1) {
        seq += e.key.toLowerCase();
        if (seqTimer) clearTimeout(seqTimer);

        const match = NAV_SEQUENCES[seq];
        if (match) {
          router.push(match);
          seq = "";
          return;
        }

        // Reset if no partial match
        const hasPartial = Object.keys(NAV_SEQUENCES).some(k => k.startsWith(seq));
        if (!hasPartial) seq = "";

        seqTimer = setTimeout(() => { seq = ""; }, 1000);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (seqTimer) clearTimeout(seqTimer);
    };
  }, [router]);

  if (!open) return null;

  const categories = [...new Set(SHORTCUTS.map(s => s.category))];

  return (
    <div
      className="fixed inset-0 z-[9997] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold">Atajos de teclado</h2>
          <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white text-xl transition-colors">×</button>
        </div>
        <div className="space-y-5">
          {categories.map(cat => (
            <div key={cat}>
              <p className="text-[10px] font-bold text-[#B3985B] uppercase tracking-widest mb-2">{cat}</p>
              <div className="space-y-2">
                {SHORTCUTS.filter(s => s.category === cat).map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">{s.description}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, ki) => (
                        <span key={ki} className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 bg-[#1a1a1a] border border-[#333] rounded text-[11px] text-gray-300 font-mono">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-gray-600 text-xs mt-5 text-center">Presiona <kbd className="bg-[#1a1a1a] border border-[#333] rounded px-1 text-[10px]">?</kbd> para mostrar u ocultar</p>
      </div>
    </div>
  );
}
