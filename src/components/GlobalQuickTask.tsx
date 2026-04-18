"use client";
import { useState, useRef, useEffect } from "react";

export default function GlobalQuickTask() {
  const [open, setOpen]       = useState(false);
  const [titulo, setTitulo]   = useState("");
  const [saving, setSaving]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setTitulo("");
  }, [open]);

  async function crear() {
    const t = titulo.trim();
    if (!t) return;
    setSaving(true);
    await fetch("/api/tareas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: t, prioridad: "MEDIA", fecha: null, fechaVencimiento: null, recurrencia: null, proyectoTareaId: null, seccionId: null, parentId: null }),
    });
    setSaving(false);
    setTitulo("");
    setOpen(false);
  }

  return (
    <>
      {/* Botón flotante — círculo pequeño lado izquierdo */}
      <button
        onClick={() => setOpen(true)}
        title="Crear tarea (⌘K)"
        className="fixed bottom-6 left-[72px] md:left-[220px] z-[90] w-9 h-9 flex items-center justify-center bg-[#1a1a1a] border border-[#2a2a2a] text-[#B3985B] rounded-full shadow-lg hover:bg-[#222] hover:border-[#B3985B]/40 active:scale-95 transition-all"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[95] flex items-start justify-center pt-[20vh]"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop blur */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <div
            className="relative w-full max-w-lg mx-4 bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl shadow-2xl shadow-black/70 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Input row */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#141414]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              <input
                ref={inputRef}
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") crear(); }}
                placeholder="Nombre de la tarea…"
                className="flex-1 bg-transparent text-white text-[15px] placeholder-[#333] focus:outline-none"
              />
              {titulo && (
                <button onClick={() => setTitulo("")}
                  className="text-[#333] hover:text-[#666] transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2.5">
              <p className="text-[11px] text-[#333]">
                Se guardará en Bandeja de entrada · <span className="text-[#444]">Enter para crear</span>
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#444] hover:text-[#888] transition-colors">
                  Cancelar
                </button>
                <button onClick={crear} disabled={!titulo.trim() || saving}
                  className="px-3 py-1.5 bg-[#B3985B] text-black text-xs font-semibold rounded-lg hover:bg-[#c9aa6a] disabled:opacity-40 transition-all">
                  {saving ? "Guardando…" : "Crear tarea"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
