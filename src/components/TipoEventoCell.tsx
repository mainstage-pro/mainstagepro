"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type TipoEventoOpcion = { slug: string; nombre: string };

// Celda inline reutilizable para clasificar por tipo de evento (equipos, productos,
// paquetes). Guarda de forma optimista vía onSave; el padre decide el endpoint.
// Máximo 3 selecciones. Un clic abre un popover con los tipos como toggles; sin
// modal, sin botón de guardar. Enter/Escape cierran; al cerrar enfoca el
// siguiente disparador (nextFocusId) para clasificar de corrido con el teclado.
export function TipoEventoCell({
  value,
  tipos,
  onSave,
  max = 3,
  triggerId,
  nextFocusId,
  disabled,
}: {
  value: string[];
  tipos: TipoEventoOpcion[];
  onSave: (next: string[]) => void | Promise<void>;
  max?: number;
  triggerId?: string;
  nextFocusId?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<string[]>(value);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocal(value); }, [value]);

  function abrir() {
    if (disabled) return;
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: r.left });
    setOpen(true);
  }

  function cerrar(focusNext = false) {
    setOpen(false);
    if (focusNext && nextFocusId) {
      requestAnimationFrame(() => document.getElementById(nextFocusId)?.focus());
    }
  }

  // Guardado optimista con reversión si falla.
  async function toggle(token: string) {
    const has = local.includes(token);
    if (!has && local.length >= max) return;
    const next = has ? local.filter((t) => t !== token) : [...local, token];
    const prev = local;
    setLocal(next);
    try {
      await onSave(next);
    } catch {
      setLocal(prev);
    }
  }

  useEffect(() => {
    if (!open) return;
    function onDoc(ev: MouseEvent) {
      if (popRef.current?.contains(ev.target as Node) || btnRef.current?.contains(ev.target as Node)) return;
      cerrar();
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") { ev.preventDefault(); cerrar(); }
      if (ev.key === "Enter") { ev.preventDefault(); cerrar(true); }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const abrev = (slug: string) => slug.slice(0, 3).toUpperCase();
  const lleno = local.length >= max;

  return (
    <>
      <button
        ref={btnRef}
        id={triggerId}
        type="button"
        onClick={(ev) => { ev.stopPropagation(); abrir(); }}
        disabled={disabled}
        className="inline-flex flex-wrap items-center gap-1 text-left disabled:opacity-40"
      >
        {local.length === 0 ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#B3985B]/40 text-[#B3985B]/70 hover:text-[#B3985B] hover:border-[#B3985B] transition-colors">
            + Clasificar
          </span>
        ) : (
          local.map((t) => (
            <span key={t} className="text-[9px] uppercase font-medium px-1.5 py-0.5 rounded bg-[#B3985B]/15 text-[#B3985B]">
              {abrev(t)}
            </span>
          ))
        )}
      </button>

      {open && pos && createPortal(
        <div
          ref={popRef}
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-[80] w-56 rounded-lg border border-[#2b241c] bg-[#0e0b08] shadow-xl p-2"
          onClick={(ev) => ev.stopPropagation()}
        >
          <p className="text-[10px] text-gray-500 px-1 pb-1.5">Tipo de evento (máx. {max})</p>
          <div className="space-y-0.5">
            {tipos.map((t) => {
              const token = t.slug.toUpperCase();
              const on = local.includes(token);
              const bloqueado = !on && lleno;
              return (
                <button
                  key={token}
                  type="button"
                  onClick={() => toggle(token)}
                  disabled={bloqueado}
                  title={bloqueado ? `Máximo ${max} tipos` : undefined}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                    on ? "bg-[#B3985B]/15 text-[#B3985B]" : bloqueado ? "text-gray-700 cursor-not-allowed" : "text-gray-300 hover:bg-[#1a150e]"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${on ? "border-[#B3985B] bg-[#B3985B]" : "border-[#444]"}`}>
                    {on && <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-black"><path fill="currentColor" d="M4.5 8.3 2.2 6l-.9.9 3.2 3.2 6-6-.9-.9z" /></svg>}
                  </span>
                  {t.nombre}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
