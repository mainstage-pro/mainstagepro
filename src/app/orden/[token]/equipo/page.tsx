"use client";

import { useMemo, useState } from "react";
import { useOrden } from "../OrdenContext";
import { Cargando, Chip, Vacio } from "../ui";
import type { OrdenEquipo } from "@/lib/orden-produccion";

/**
 * Listado de equipo con accesorios y montaje. Es consulta, no verificación:
 * para marcar se usa la sección Carga.
 */
export default function EquipoPage() {
  const { orden, cargando } = useOrden();
  const [busqueda, setBusqueda] = useState("");

  const grupos = useMemo(() => {
    if (!orden) return [];
    const q = busqueda.trim().toLowerCase();
    const filtrados = q
      ? orden.equipos.filter(
          (e) =>
            e.descripcion.toLowerCase().includes(q) ||
            (e.marca ?? "").toLowerCase().includes(q) ||
            (e.modelo ?? "").toLowerCase().includes(q) ||
            e.categoria.toLowerCase().includes(q) ||
            e.accesorios.some((a) => a.nombre.toLowerCase().includes(q))
        )
      : orden.equipos;

    const mapa = new Map<string, OrdenEquipo[]>();
    for (const e of filtrados) {
      const lista = mapa.get(e.categoria);
      if (lista) lista.push(e);
      else mapa.set(e.categoria, [e]);
    }
    return [...mapa.entries()];
  }, [orden, busqueda]);

  if (cargando || !orden) return <Cargando />;

  const piezas = orden.equipos.reduce((n, e) => n + e.cantidad, 0);

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-white/30 text-xs">
          {orden.equipos.length} renglones · {piezas} piezas
        </p>
      </div>

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar equipo o accesorio…"
        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#B3985B]/40 mb-5"
      />

      {grupos.length === 0 ? (
        <Vacio>{busqueda ? "Nada coincide con esa búsqueda." : "Sin equipo cargado en el proyecto."}</Vacio>
      ) : (
        grupos.map(([categoria, equipos]) => (
          <section key={categoria} className="mb-5">
            <h2 className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-2">
              {categoria} <span className="text-white/20">({equipos.length})</span>
            </h2>
            <div className="bg-white/[0.025] border border-white/8 rounded-2xl divide-y divide-white/5">
              {equipos.map((e) => (
                <div key={e.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 min-w-[34px] h-[34px] px-1.5 flex items-center justify-center bg-[#B3985B]/10 border border-[#B3985B]/25 rounded-lg text-[#B3985B] text-sm font-bold tabular-nums">
                      {e.cantidad}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-white/85 text-sm font-medium leading-snug">{e.descripcion}</p>
                      {(e.marca || e.modelo) && (
                        <p className="text-white/35 text-xs mt-0.5">{[e.marca, e.modelo].filter(Boolean).join(" ")}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {e.tipo === "RENTA" && <Chip tono="ambar">Renta{e.proveedor ? ` · ${e.proveedor}` : ""}</Chip>}
                        {!e.confirmado && <Chip tono="rojo">Sin confirmar</Chip>}
                      </div>

                      {e.montaje && (
                        <p className="text-white/45 text-xs mt-2 leading-relaxed">
                          <span className="text-white/25">Montaje: </span>
                          {e.montaje}
                        </p>
                      )}
                      {e.notas && (
                        <p className="text-white/45 text-xs mt-1.5 leading-relaxed">
                          <span className="text-white/25">Nota: </span>
                          {e.notas}
                        </p>
                      )}

                      {e.accesorios.length > 0 && (
                        <ul className="mt-2.5 pt-2.5 border-t border-white/5 space-y-1">
                          {e.accesorios.map((a, i) => (
                            <li key={i} className="flex items-baseline gap-2 text-xs">
                              <span className="text-[#B3985B]/60 tabular-nums">{a.cantidad}×</span>
                              <span className="text-white/50">{a.nombre}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}
