"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Shapes } from "lucide-react";
import type { ZonaAgrupada } from "@/lib/layout-zonas";

/**
 * Las zonas del evento y, dentro de cada una, las configuraciones de montaje.
 * Es a la vez índice, guía de colores y control para dibujar cada área en el plano.
 */
export default function ArbolZonasLayout({
  zonas,
  colocadas,
  seleccion,
  onSeleccionar,
  onColocar,
  onGenerar,
  onZonaLibre,
}: {
  zonas: ZonaAgrupada[];
  colocadas: Set<string>;
  seleccion: string | null;
  onSeleccionar: (clave: string) => void;
  onColocar: (clave: string) => void;
  onGenerar: () => void;
  onZonaLibre: (etiqueta: string) => void;
}) {
  const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set());
  const [libre, setLibre] = useState("");

  function alternar(clave: string) {
    setAbiertas(prev => {
      const s = new Set(prev);
      if (s.has(clave)) s.delete(clave);
      else s.add(clave);
      return s;
    });
  }

  return (
    <div className="ms-card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="ms-section-label">Zonas y configuraciones</p>
        <button
          onClick={onGenerar}
          className="text-[10px] px-2 py-1 rounded border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#444] transition-colors flex items-center gap-1"
          title="Dibuja en el plano todas las áreas que falten"
        >
          <Shapes size={11} /> Generar áreas
        </button>
      </div>

      {zonas.length === 0 ? (
        <p className="text-[11px] text-gray-600 mt-2 leading-tight">
          El rider de este escenario está vacío. En cuanto el equipo tenga zona y configuración de
          montaje, aquí aparecen las áreas para dibujarlas.
        </p>
      ) : (
        <p className="text-[10px] text-gray-600 mt-1 leading-tight">
          El color de cada renglón es el del plano. Haz clic para ver qué equipo lleva; con{" "}
          <span className="text-gray-400">+</span> la dibujas.
        </p>
      )}

      <div className="mt-2 space-y-1 max-h-[24rem] overflow-y-auto">
        {zonas.map(z => {
          const abierta = abiertas.has(z.clave);
          const activa = seleccion === z.clave;
          return (
            <div key={z.clave}>
              <div
                className={`flex items-center gap-1 rounded border px-1.5 py-1 transition-colors ${
                  activa ? "border-[#B3985B]/60 bg-[#B3985B]/5" : "border-[#1f1f1f]"
                }`}
              >
                <button
                  onClick={() => alternar(z.clave)}
                  className="text-gray-600 hover:text-white transition-colors shrink-0"
                >
                  {abierta ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: z.color }} />
                <button onClick={() => onSeleccionar(z.clave)} className="min-w-0 flex-1 text-left">
                  <span className="block text-[11px] text-white truncate">{z.etiqueta}</span>
                  <span className="block text-[10px] text-gray-600 truncate">
                    {z.unidades} uds · {z.pesoKg.toFixed(0)} kg
                    {z.carga.amperaje110 > 0 && ` · ${z.carga.amperaje110.toFixed(1)} A 110V`}
                    {z.carga.amperaje220 > 0 && ` · ${z.carga.amperaje220.toFixed(1)} A 220V`}
                  </span>
                </button>
                {!colocadas.has(z.clave) && (
                  <button
                    onClick={() => onColocar(z.clave)}
                    className="shrink-0 text-gray-500 hover:text-[#B3985B] transition-colors p-0.5"
                    title="Dibujar esta zona en el plano"
                  >
                    <Plus size={13} />
                  </button>
                )}
              </div>

              {abierta && (
                <div className="ml-4 mt-1 space-y-1">
                  {z.subzonas.map(s => {
                    const activaSub = seleccion === s.clave;
                    return (
                      <div
                        key={s.clave}
                        className={`flex items-center gap-1.5 rounded border px-1.5 py-1 transition-colors ${
                          activaSub ? "border-[#B3985B]/60 bg-[#B3985B]/5" : "border-[#161616]"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: s.color }} />
                        <button onClick={() => onSeleccionar(s.clave)} className="min-w-0 flex-1 text-left">
                          <span className="block text-[11px] text-gray-200 truncate">{s.etiqueta}</span>
                          <span className="block text-[10px] text-gray-600 truncate">
                            {s.unidades} uds · {s.pesoKg.toFixed(0)} kg
                            {s.carga.sinDato > 0 && ` · ${s.carga.sinDato} sin amperaje`}
                          </span>
                        </button>
                        {!colocadas.has(s.clave) && (
                          <button
                            onClick={() => onColocar(s.clave)}
                            className="shrink-0 text-gray-500 hover:text-[#B3985B] transition-colors p-0.5"
                            title="Dibujar esta configuración en el plano"
                          >
                            <Plus size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[#1a1a1a]">
        <input
          value={libre}
          onChange={e => setLibre(e.target.value)}
          onKeyDown={e => {
            if (e.key !== "Enter") return;
            onZonaLibre(libre);
            setLibre("");
          }}
          placeholder="Zona extra (humo, catering…)"
          className="flex-1 min-w-0 bg-[#0e0e0e] border border-[#1f1f1f] rounded px-2 py-1 text-white text-[11px] focus:outline-none focus:border-[#B3985B]"
        />
        <button
          onClick={() => { onZonaLibre(libre); setLibre(""); }}
          disabled={!libre.trim()}
          className="text-[10px] px-2 py-1 rounded border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#444] transition-colors disabled:opacity-40 shrink-0"
        >
          Agregar
        </button>
      </div>
      <p className="text-[10px] text-gray-600 mt-1 leading-tight">
        Una zona extra solo vive en el plano: sirve para marcar un área que el rider no nombra.
      </p>
    </div>
  );
}
