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

function Campo({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="block text-[9px] text-gray-500 uppercase tracking-wider mb-1">{label}</span>
      {children}
    </label>
  );
}

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
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...cambios } : f)));
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

  return (
    <div className="mt-2 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-[#B3985B]/70 font-bold uppercase tracking-widest">Montaje</span>
        <span className={`text-[10px] font-semibold ${restante === 0 ? "text-green-500" : "text-amber-500"}`}>
          {asignadas} de {cantidadTotal} asignadas
          {restante > 0 && ` · faltan ${restante}`}
          {restante < 0 && ` · sobran ${-restante}`}
        </span>
      </div>

      <div className="space-y-2">
        {filas.map((f, i) => {
          const pideAltura = soportePideAltura(f.soporte, categoria, disciplina);
          return (
            <div key={f.id ?? i} className="rounded-md border border-[#1a1a1a] bg-[#101010] p-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider">Posición {i + 1}</span>
                <button
                  onClick={() => quitar(i)}
                  className="text-[10px] text-gray-500 hover:text-red-400 transition-colors"
                >
                  Eliminar
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-12 gap-1.5">
                <Campo label="Cantidad" className="lg:col-span-1">
                  <input
                    type="number"
                    min={1}
                    value={f.cantidad}
                    onChange={(e) => actualizar(i, { cantidad: Math.max(1, Number(e.target.value) || 1) })}
                    className={`${selectCls} text-center`}
                  />
                </Campo>
                <Campo label="Configuración" className="lg:col-span-4">
                  <select
                    value={f.funcion ?? ""}
                    onChange={(e) => actualizar(i, { funcion: e.target.value || null })}
                    className={selectCls}
                  >
                    <option value="">— Elegir —</option>
                    {perfil.configuraciones.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </Campo>
                <Campo label="Soporte" className="lg:col-span-4">
                  <select
                    value={f.soporte ?? ""}
                    onChange={(e) => actualizar(i, { soporte: e.target.value || null })}
                    className={selectCls}
                  >
                    <option value="">— Elegir —</option>
                    {perfil.soportes.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </Campo>
                <Campo label="Zona" className={pideAltura ? "lg:col-span-2" : "lg:col-span-3"}>
                  <select
                    value={f.zona ?? ""}
                    onChange={(e) => actualizar(i, { zona: e.target.value || null })}
                    className={selectCls}
                  >
                    <option value="">— Elegir —</option>
                    {ZONAS.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </Campo>
                {pideAltura && (
                  <Campo label="Altura m" className="lg:col-span-1">
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      value={f.alturaM ?? ""}
                      onChange={(e) => actualizar(i, { alturaM: e.target.value === "" ? null : Number(e.target.value) })}
                      className={`${selectCls} text-center`}
                    />
                  </Campo>
                )}
                <Campo label="Notas" className="col-span-2 lg:col-span-12">
                  <input
                    type="text"
                    placeholder="Indicación para el técnico (opcional)"
                    value={f.notas ?? ""}
                    onChange={(e) => actualizar(i, { notas: e.target.value || null })}
                    className={selectCls}
                  />
                </Campo>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-2.5">
        <button onClick={agregar} className="text-[11px] text-[#B3985B] hover:text-[#d4b56f] transition-colors">
          + Agregar posición
        </button>
        {dirty && (
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
