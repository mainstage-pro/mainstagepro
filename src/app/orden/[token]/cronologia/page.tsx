"use client";

import { useState } from "react";
import { useOrden } from "../OrdenContext";
import { Cargando, Vacio } from "../ui";

/**
 * Las tres cronologías del proyecto en un selector. En sitio casi siempre se
 * mira una sola a la vez, así que apilarlas todas solo agrega scroll.
 */
export default function CronologiaPage() {
  const { orden, cargando } = useOrden();
  const [vista, setVista] = useState(0);

  if (cargando || !orden) return <Cargando />;

  const crono = orden.cronologias[vista];
  const conContenido = crono?.bloques.some((b) => b.items.length > 0);

  return (
    <>
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
        {orden.cronologias.map((c, i) => {
          const items = c.bloques.reduce((n, b) => n + b.items.length, 0);
          return (
            <button
              key={c.vista}
              onClick={() => setVista(i)}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                i === vista
                  ? "bg-[#B3985B]/15 border-[#B3985B]/40 text-[#B3985B]"
                  : "bg-white/[0.025] border-white/8 text-white/40"
              }`}
            >
              {c.titulo}
              {items > 0 && <span className="ml-1.5 opacity-50">{items}</span>}
            </button>
          );
        })}
      </div>

      <p className="text-white/30 text-xs mb-5 leading-relaxed">{crono?.descripcion}</p>

      {!conContenido ? (
        <Vacio>Sin horarios capturados en esta vista.</Vacio>
      ) : (
        crono.bloques
          .filter((b) => b.items.length > 0)
          .map((bloque, bi) => (
            <section key={bi} className="mb-6">
              <div className="flex items-baseline gap-2 mb-3">
                <h2 className="text-white font-bold text-sm">{bloque.titulo}</h2>
                {bloque.subtitulo && <span className="text-white/30 text-xs">{bloque.subtitulo}</span>}
              </div>

              {/* Línea de tiempo: la hora manda, por eso va en columna fija a la izquierda. */}
              <div className="relative pl-[68px]">
                <div className="absolute left-[60px] top-2 bottom-2 w-px bg-white/8" />
                {bloque.items.map((it, i) => (
                  <div key={i} className="relative py-2.5">
                    <div className="absolute left-[-68px] top-2.5 w-[52px] text-right">
                      <span className="text-[#B3985B] text-xs font-bold tabular-nums">{it.hora}</span>
                      {it.horaFin && (
                        <span className="block text-white/25 text-[10px] tabular-nums">a {it.horaFin}</span>
                      )}
                    </div>
                    <div className="absolute left-[-10px] top-[15px] w-1.5 h-1.5 rounded-full bg-[#B3985B]" />
                    <p className="text-white/85 text-sm font-medium leading-snug">{it.label}</p>
                    {(it.nota || it.proveedor || it.responsable || it.fecha) && (
                      <p className="text-white/30 text-xs mt-0.5 leading-relaxed">
                        {[it.proveedor, it.responsable, it.nota, it.fecha].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))
      )}
    </>
  );
}
