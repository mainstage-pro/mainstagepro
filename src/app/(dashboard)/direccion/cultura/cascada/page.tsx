"use client";

import { useState } from "react";
import {
  ESTADOS_TACTICA,
  ESTADO_OBJETIVO_META,
  formatValorMeta,
} from "@/lib/estrategia";
import { useEstrategia, cardCls } from "../useEstrategia";

export default function CascadaPage() {
  const { data, cargando, error } = useEstrategia();
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());

  function alternar(id: string) {
    const s = new Set(abiertas);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setAbiertas(s);
  }

  if (cargando) return <div className="p-6 text-gray-500 text-sm">Cargando…</div>;
  if (error) return <div className="p-6 text-red-400 text-sm">{error}</div>;
  if (!data) return null;

  const { meta, areas, resumen, usuarios } = data;
  const alertas = areas.flatMap(a =>
    a.objetivos.flatMap(o =>
      o.tacticas
        .filter(t => t.vencida)
        .map(t => ({ area: a.nombre, objetivo: o.descripcion, tactica: t }))
    )
  );

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-white">Cascada</h1>
        <p className="text-sm text-gray-500 mt-1">
          De la meta del periodo hasta la táctica que alguien tiene que hacer. El avance sube solo: se
          calcula desde las tácticas completadas, nunca se captura a mano.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Avance del periodo", valor: `${resumen.progreso}%` },
          { label: "Objetivos", valor: resumen.objetivos },
          { label: "Tácticas", valor: resumen.tacticas },
          {
            label: "Tácticas vencidas",
            valor: resumen.tacticasVencidas,
            alerta: resumen.tacticasVencidas > 0,
          },
        ].map(k => (
          <div key={k.label} className={cardCls}>
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${k.alerta ? "text-red-400" : "text-white"}`}>
              {k.valor}
            </p>
          </div>
        ))}
      </div>

      {alertas.length > 0 && (
        <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-5">
          <h2 className="text-base font-semibold text-red-300 mb-3">
            Desviaciones ({alertas.length})
          </h2>
          <ul className="space-y-2">
            {alertas.map(a => (
              <li key={a.tactica.id} className="text-sm border-b border-red-900/20 pb-2 last:border-0">
                <span className="text-gray-200">{a.tactica.descripcion}</span>
                <div className="text-xs text-gray-500 mt-0.5">
                  {a.area} ·{" "}
                  {a.tactica.fechaEjecucion &&
                    `vencía el ${new Date(a.tactica.fechaEjecucion).toLocaleDateString("es-MX")}`}
                  {a.tactica.responsableId && (
                    <> · {usuarios.find(u => u.id === a.tactica.responsableId)?.name ?? "—"}</>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {meta && (
        <div className={`${cardCls} border-[#B3985B]/30`}>
          <p className="text-xs text-[#B3985B]">Meta global {meta.periodo}</p>
          <h2 className="text-lg font-semibold text-white mt-1">{meta.titulo}</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-gray-500">
            {meta.indicadores.map(i => (
              <span key={i.id}>
                {i.nombre}: <span className="text-[#B3985B]">{formatValorMeta(i.valorMeta, i.unidad)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 pl-4 border-l border-[#222]">
        {areas.map(a => (
          <div key={a.id}>
            <div className={cardCls}>
              <button onClick={() => alternar(a.id)} className="w-full text-left">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white flex-1">{a.nombre}</span>
                  {a.enRiesgo > 0 && (
                    <span className="text-xs text-red-400">{a.enRiesgo} en riesgo</span>
                  )}
                  <span className="text-xs text-gray-500">{a.progreso}%</span>
                  <span className="text-gray-600 text-xs">{abiertas.has(a.id) ? "▾" : "▸"}</span>
                </div>
                <div className="h-1 bg-[#1a1a1a] rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-[#B3985B]" style={{ width: `${a.progreso}%` }} />
                </div>
              </button>

              {abiertas.has(a.id) && (
                <div className="mt-4 space-y-3 pl-4 border-l border-[#222]">
                  {a.objetivos.map(o => {
                    const est = ESTADO_OBJETIVO_META[o.estadoCalc];
                    return (
                      <div key={o.id}>
                        <button onClick={() => alternar(o.id)} className="w-full text-left">
                          <div className="flex items-start gap-3">
                            <span className="text-sm text-gray-300 flex-1">{o.descripcion}</span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full shrink-0"
                              style={{ background: `${est.color}22`, color: est.color }}
                            >
                              {o.progreso}%
                            </span>
                            <span className="text-gray-600 text-xs shrink-0">
                              {abiertas.has(o.id) ? "▾" : "▸"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {o.metrica} · meta {formatValorMeta(o.valorMeta, o.unidad)}
                            {o.fechaLimite &&
                              ` · ${new Date(o.fechaLimite).toLocaleDateString("es-MX")}`}
                          </p>
                        </button>

                        {abiertas.has(o.id) && (
                          <ul className="mt-2 space-y-1 pl-4 border-l border-[#222]">
                            {o.tacticas.map(t => {
                              const em = ESTADOS_TACTICA.find(e => e.value === t.estado);
                              return (
                                <li key={t.id} className="flex items-center gap-2 text-sm">
                                  <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ background: em?.color }}
                                  />
                                  <span
                                    className={
                                      t.estado === "COMPLETADO"
                                        ? "text-gray-600 line-through"
                                        : t.vencida
                                          ? "text-red-300"
                                          : "text-gray-400"
                                    }
                                  >
                                    {t.descripcion}
                                  </span>
                                  <span className="text-xs text-gray-700 ml-auto shrink-0">
                                    {usuarios.find(u => u.id === t.responsableId)?.name ?? ""}
                                  </span>
                                </li>
                              );
                            })}
                            {o.tacticas.length === 0 && (
                              <li className="text-xs text-gray-600">
                                Sin tácticas — este objetivo no avanza solo.
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
