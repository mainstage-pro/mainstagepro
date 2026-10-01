"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/Toast";
import {
  cargaTotal,
  consumoPorCategoria,
  type ItemConsumo,
  type Voltaje,
} from "@/lib/consumo-electrico";
import { getEquipoDisplayName } from "@/lib/equipoNombre";

/**
 * Lo que va a jalar el evento, renglón por renglón del rider.
 *
 * Los amperes de 110 y los de 220 se cuentan por separado porque son dos líneas
 * distintas; lo que sí suma todo junto es la potencia, y ese es el número con el
 * que se pide la planta. El amperaje que falte se captura aquí mismo y se queda
 * en el catálogo: la próxima vez ya no hay que preguntarlo.
 */

export type EquipoConsumo = {
  id: string;
  equipoId: string;
  cantidad: number;
  voltajeUso: string | null;
  necesitaRevision: boolean;
  equipo: {
    descripcion: string;
    marca: string | null;
    modelo: string | null;
    amperajeRequerido?: number | null;
    amperajeRequerido220?: number | null;
    voltajeRequerido?: string | null;
    categoria: { nombre: string };
  };
};

const amp = (n: number) => `${n.toLocaleString("es-MX", { maximumFractionDigits: 1 })} A`;
const kw = (watts: number) => `${(watts / 1000).toLocaleString("es-MX", { maximumFractionDigits: 2 })} kW`;

export function PanelConsumoElectrico({ proyectoId, equipos }: { proyectoId: string; equipos: EquipoConsumo[] }) {
  const toast = useToast();
  const [filas, setFilas] = useState<EquipoConsumo[]>(equipos);
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<string | null>(null);

  useEffect(() => { setFilas(equipos); }, [equipos]);

  const items: ItemConsumo[] = useMemo(
    () => filas
      .filter(e => !e.necesitaRevision)
      .map(e => ({
        id: e.id,
        equipoId: e.equipoId,
        nombre: getEquipoDisplayName(e.equipo),
        categoria: e.equipo.categoria.nombre,
        cantidad: e.cantidad,
        voltajeUso: e.voltajeUso,
        equipo: e.equipo,
      })),
    [filas],
  );

  const grupos = useMemo(() => consumoPorCategoria(items), [items]);
  const total = useMemo(() => cargaTotal(grupos), [grupos]);

  if (items.length === 0) {
    return (
      <div className="ms-card py-10 text-center">
        <p className="text-gray-600 text-sm">Sin equipos en el rider</p>
        <p className="text-gray-700 text-xs mt-1">El consumo se calcula con el equipo de la cotización</p>
      </div>
    );
  }

  async function elegirVoltaje(id: string, voltaje: Voltaje) {
    setFilas(prev => prev.map(e => e.id === id ? { ...e, voltajeUso: voltaje } : e));
    const res = await fetch(`/api/proyectos/${proyectoId}/equipos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voltajeUso: voltaje }),
    });
    if (!res.ok) toast.error("No se pudo guardar el voltaje");
  }

  async function guardarAmperaje(equipoId: string, voltaje: Voltaje, valor: string) {
    const num = valor.trim() === "" ? null : parseFloat(valor);
    if (num != null && (isNaN(num) || num < 0)) { toast.error("Amperaje inválido"); return; }
    const esDual = filas.find(e => e.equipoId === equipoId)?.equipo.voltajeRequerido === "AMBOS";
    const campo = esDual && voltaje === "220" ? "amperajeRequerido220" : "amperajeRequerido";

    setGuardando(equipoId + voltaje);
    const res = await fetch(`/api/equipos/${equipoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [campo]: num }),
    });
    setGuardando(null);
    if (!res.ok) { toast.error("No se pudo guardar el amperaje"); return; }
    // Un mismo equipo puede estar en varios renglones del rider: todos cambian.
    setFilas(prev => prev.map(e => e.equipoId === equipoId ? { ...e, equipo: { ...e.equipo, [campo]: num } } : e));
    toast.success("Amperaje guardado en el catálogo");
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="ms-card p-4">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Carga a 110V</p>
          <p className="text-xl text-white font-semibold">{amp(total.amperaje110)}</p>
        </div>
        <div className="ms-card p-4">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Carga a 220V</p>
          <p className="text-xl text-white font-semibold">{amp(total.amperaje220)}</p>
        </div>
        <div className="ms-card p-4">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Potencia total</p>
          <p className="text-xl text-[#B3985B] font-semibold">{kw(total.watts)}</p>
        </div>
      </div>

      {total.sinDato > 0 && (
        <p className="text-xs text-amber-300/90 bg-amber-950/20 border border-amber-900/40 rounded-lg px-3 py-2">
          {total.sinDato} {total.sinDato === 1 ? "pieza" : "piezas"} sin amperaje capturado. El total se queda corto hasta que se registren.
        </p>
      )}

      <div className="ms-table-wrapper">
        <div className="hidden sm:grid grid-cols-[1fr_60px_110px_110px_90px_90px] gap-2 px-4 py-2 border-b border-[#1a1a1a]">
          {["Equipo", "Cant.", "Voltaje", "Amperes c/u", "Amperes", "Potencia"].map((h, i) => (
            <span key={h} className={`text-[10px] text-gray-600 uppercase tracking-widest ${i > 0 ? "text-right" : ""}`}>{h}</span>
          ))}
        </div>

        {grupos.map(grupo => (
          <div key={grupo.categoria}>
            <div className="px-4 py-1.5 bg-[#0a0a0a] border-b border-[#1a1a1a]">
              <span className="text-[10px] text-[#B3985B]/60 font-bold uppercase tracking-widest">{grupo.categoria}</span>
            </div>

            {grupo.filas.map(f => {
              const clave = `${f.equipoId}${f.voltaje}`;
              const valor = borrador[clave] ?? (f.amperajeUnitario != null ? String(f.amperajeUnitario) : "");
              return (
                <div key={f.id} className="grid grid-cols-2 sm:grid-cols-[1fr_60px_110px_110px_90px_90px] gap-2 items-center px-4 py-2.5 border-b border-[#0d0d0d]">
                  <p className="col-span-2 sm:col-span-1 text-sm text-white truncate" title={f.nombre}>{f.nombre}</p>

                  <span className="text-sm text-gray-400 sm:text-right">{f.cantidad}</span>

                  <div className="sm:flex sm:justify-end">
                    {f.aceptaAmbos ? (
                      <div className="flex gap-0.5 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-0.5">
                        {(["110", "220"] as Voltaje[]).map(v => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => elegirVoltaje(f.id, v)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                              f.voltaje === v ? "bg-[#B3985B]/15 text-[#B3985B]" : "text-gray-600 hover:text-gray-300"
                            }`}
                          >{v}V</button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">{f.voltaje}V</span>
                    )}
                  </div>

                  <div className="sm:flex sm:justify-end">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={valor}
                      disabled={guardando === clave}
                      onChange={e => setBorrador(prev => ({ ...prev, [clave]: e.target.value }))}
                      onBlur={e => {
                        setBorrador(prev => { const sig = { ...prev }; delete sig[clave]; return sig; });
                        const previo = f.amperajeUnitario != null ? String(f.amperajeUnitario) : "";
                        if (e.target.value.trim() !== previo) guardarAmperaje(f.equipoId, f.voltaje, e.target.value);
                      }}
                      placeholder="—"
                      className={`w-20 bg-[#0d0d0d] border rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:border-[#B3985B] ${
                        f.amperajeUnitario == null ? "border-amber-900/50 text-amber-300" : "border-[#2a2a2a] text-white"
                      }`}
                    />
                  </div>

                  <span className="text-sm text-white sm:text-right">{f.amperajeUnitario != null ? amp(f.amperajeTotal) : "—"}</span>
                  <span className="text-sm text-gray-400 sm:text-right">{f.amperajeUnitario != null ? kw(f.watts) : "—"}</span>
                </div>
              );
            })}

            <div className="grid grid-cols-2 sm:grid-cols-[1fr_60px_110px_110px_90px_90px] gap-2 px-4 py-2 bg-[#0a0a0a] border-b border-[#1a1a1a]">
              <span className="col-span-2 sm:col-span-4 text-[11px] text-gray-500 uppercase tracking-wider">
                Subtotal {grupo.categoria}
                {grupo.sinDato > 0 && <span className="text-amber-500/80 normal-case tracking-normal"> · {grupo.sinDato} sin dato</span>}
              </span>
              <span className="text-xs text-white sm:text-right">
                {grupo.amperaje110 > 0 && <>{amp(grupo.amperaje110)} <span className="text-gray-600">110V</span></>}
                {grupo.amperaje110 > 0 && grupo.amperaje220 > 0 && <br />}
                {grupo.amperaje220 > 0 && <>{amp(grupo.amperaje220)} <span className="text-gray-600">220V</span></>}
              </span>
              <span className="text-xs text-[#B3985B] sm:text-right">{kw(grupo.watts)}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-gray-600">
        Los amperes de 110V y de 220V no se suman entre sí: son dos líneas distintas. Para dimensionar la planta se usa la potencia total.
        El amperaje que captures aquí se guarda en el catálogo del equipo.
      </p>
    </div>
  );
}
