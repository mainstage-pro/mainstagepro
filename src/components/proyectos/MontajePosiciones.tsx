"use client";

import { useState } from "react";
import { getPerfilMontaje, soportePideAltura, ZONAS } from "@/lib/montaje-vocabulario";

export type Posicion = {
  id?: string;
  cantidad: number;
  funcion: string | null;
  soporte: string | null;
  zona: string | null;
  alturaM: number | null;
  notas: string | null;
  esSugerencia?: boolean;
};

type Props = {
  proyectoId: string;
  equipoId: string;
  cantidadTotal: number;
  categoria: string | null;
  disciplina: string | null;
  posiciones: Posicion[];
  onSaved: (posiciones: Posicion[]) => void;
};

const selectCls =
  "bg-[#141414] border border-[#252525] rounded-md px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#B3985B]/50 w-full";

export function MontajePosiciones({ proyectoId, equipoId, cantidadTotal, categoria, disciplina, posiciones, onSaved }: Props) {
  const perfil = getPerfilMontaje(categoria, disciplina);
  const [filas, setFilas] = useState<Posicion[]>(
    posiciones.length > 0
      ? posiciones
      : [{ cantidad: cantidadTotal, funcion: null, soporte: null, zona: null, alturaM: null, notas: null }],
  );
  const [dirty, setDirty] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const asignadas = filas.reduce((s, f) => s + (Number(f.cantidad) || 0), 0);
  const restante = cantidadTotal - asignadas;

  const actualizar = (i: number, cambios: Partial<Posicion>) => {
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...cambios, esSugerencia: false } : f)));
    setDirty(true);
  };

  const agregar = () => {
    setFilas((prev) => [
      ...prev,
      { cantidad: Math.max(1, cantidadTotal - prev.reduce((s, f) => s + (Number(f.cantidad) || 0), 0)), funcion: null, soporte: null, zona: null, alturaM: null, notas: null },
    ]);
    setDirty(true);
  };

  const quitar = (i: number) => {
    setFilas((prev) => prev.filter((_, idx) => idx !== i));
    setDirty(true);
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/equipos/${equipoId}/posiciones`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posiciones: filas }),
      });
      if (res.ok) {
        const d = await res.json();
        setFilas(d.posiciones);
        setDirty(false);
        onSaved(d.posiciones);
      }
    } finally {
      setGuardando(false);
    }
  };

  const hayS = filas.some((f) => f.esSugerencia);

  return (
    <div className="mt-2 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#B3985B]/70 font-bold uppercase tracking-widest">Montaje</span>
          {hayS && (
            <span className="text-[9px] text-gray-500 bg-[#1a1a1a] px-1.5 py-0.5 rounded">sugerido — confirma o corrige</span>
          )}
        </div>
        <span className={`text-[10px] font-semibold ${restante === 0 ? "text-green-500" : "text-amber-500"}`}>
          {asignadas} de {cantidadTotal} asignadas
          {restante > 0 && ` · faltan ${restante}`}
          {restante < 0 && ` · sobran ${-restante}`}
        </span>
      </div>

      <div className="space-y-1.5">
        {filas.map((f, i) => {
          const pideAltura = soportePideAltura(f.soporte, categoria, disciplina);
          return (
            <div key={f.id ?? i} className="flex items-start gap-1.5">
              <input
                type="number"
                min={1}
                value={f.cantidad}
                onChange={(e) => actualizar(i, { cantidad: Math.max(1, Number(e.target.value) || 1) })}
                className={`${selectCls} w-14 shrink-0 text-center`}
                aria-label="Cantidad"
              />
              <select
                value={f.funcion ?? ""}
                onChange={(e) => actualizar(i, { funcion: e.target.value || null })}
                className={`${selectCls} flex-[2]`}
                aria-label="Función"
              >
                <option value="">— Función —</option>
                {perfil.funciones.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              <select
                value={f.soporte ?? ""}
                onChange={(e) => actualizar(i, { soporte: e.target.value || null })}
                className={`${selectCls} flex-[2]`}
                aria-label="Soporte"
              >
                <option value="">— Soporte —</option>
                {perfil.soportes.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              <select
                value={f.zona ?? ""}
                onChange={(e) => actualizar(i, { zona: e.target.value || null })}
                className={`${selectCls} flex-[2]`}
                aria-label="Zona"
              >
                <option value="">— Zona —</option>
                {ZONAS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              {pideAltura && (
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  placeholder="m"
                  value={f.alturaM ?? ""}
                  onChange={(e) => actualizar(i, { alturaM: e.target.value === "" ? null : Number(e.target.value) })}
                  className={`${selectCls} w-16 shrink-0 text-center`}
                  aria-label="Altura en metros"
                />
              )}
              <input
                type="text"
                placeholder="Notas"
                value={f.notas ?? ""}
                onChange={(e) => actualizar(i, { notas: e.target.value || null })}
                className={`${selectCls} flex-[2]`}
                aria-label="Notas"
              />
              <button
                onClick={() => quitar(i)}
                className="shrink-0 px-2 py-1.5 text-gray-600 hover:text-red-400 transition-colors"
                title="Quitar posición"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-2.5">
        <button onClick={agregar} className="text-[11px] text-[#B3985B] hover:text-[#d4b56f] transition-colors">
          + Agregar posición
        </button>
        {(dirty || hayS) && (
          <button
            onClick={guardar}
            disabled={guardando}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-md bg-[#B3985B] text-black hover:bg-[#c9ab68] disabled:opacity-50 transition-colors"
          >
            {guardando ? "Guardando…" : "Guardar montaje"}
          </button>
        )}
      </div>
    </div>
  );
}
