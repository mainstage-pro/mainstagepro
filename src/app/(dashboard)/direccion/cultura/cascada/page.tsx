"use client";

import { useState } from "react";
import {
  GitBranch,
  Gauge,
  Target,
  ListChecks,
  AlarmClock,
  Flag,
  ChevronDown,
  ChevronRight,
  User,
  AlertTriangle,
} from "lucide-react";
import { ESTADOS_TACTICA, ESTADO_OBJETIVO_META, formatValorMeta } from "@/lib/estrategia";
import { useEstrategia } from "../useEstrategia";
import { Lienzo, Encabezado, Panel, Metrica, Anillo, Rotulo, GOLD, oro } from "../ui";

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
      o.tacticas.filter(t => t.vencida).map(t => ({ area: a.nombre, objetivo: o.descripcion, tactica: t }))
    )
  );

  return (
    <Lienzo ancho="max-w-5xl">
      <Encabezado
        titulo="Cascada"
        bajada="De la meta del periodo hasta la táctica que alguien tiene que hacer. El avance sube solo: se calcula desde las tácticas completadas, nunca se captura a mano."
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metrica icono={Gauge} label="Avance del periodo" valor={`${resumen.progreso}%`} />
        <Metrica icono={Target} label="Objetivos" valor={resumen.objetivos} />
        <Metrica icono={ListChecks} label="Tácticas" valor={resumen.tacticas} />
        <Metrica
          icono={AlarmClock}
          label="Tácticas vencidas"
          valor={resumen.tacticasVencidas}
          alerta={resumen.tacticasVencidas > 0}
        />
      </div>

      {alertas.length > 0 && (
        <Panel peligro>
          <div className="flex items-center gap-2.5 mb-4">
            <AlertTriangle strokeWidth={1.8} className="w-4 h-4 shrink-0 text-red-400" />
            <h2 className="text-[15px] font-semibold text-red-300">
              Lo que ya se pasó de fecha ({alertas.length})
            </h2>
          </div>
          <ul className="space-y-2.5">
            {alertas.map(a => (
              <li
                key={a.tactica.id}
                className="pb-2.5 last:pb-0"
                style={{ borderBottom: "1px solid rgba(153,27,27,0.22)" }}
              >
                <span className="text-[13px] text-gray-200">{a.tactica.descripcion}</span>
                <div className="text-[11px] text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>{a.area}</span>
                  {a.tactica.fechaEjecucion && (
                    <span className="flex items-center gap-1.5">
                      <AlarmClock strokeWidth={1.7} className="w-3 h-3" />
                      vencía el{" "}
                      {new Date(a.tactica.fechaEjecucion).toLocaleDateString("es-MX", {
                        dateStyle: "medium",
                      })}
                    </span>
                  )}
                  {a.tactica.responsableId && (
                    <span className="flex items-center gap-1.5">
                      <User strokeWidth={1.7} className="w-3 h-3" />
                      {usuarios.find(u => u.id === a.tactica.responsableId)?.name ?? "—"}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {meta && (
        <Panel acento>
          <div className="flex items-start gap-3">
            <Flag strokeWidth={1.6} className="w-4 h-4 mt-1 shrink-0" style={{ color: GOLD }} />
            <div className="min-w-0 flex-1">
              <p
                className="text-[10px] font-medium uppercase"
                style={{ color: GOLD, letterSpacing: "0.22em" }}
              >
                Meta global {meta.periodo}
              </p>
              <h2 className="text-xl font-semibold text-white mt-2 leading-snug tracking-tight">
                {meta.titulo}
              </h2>
              <div className="flex flex-wrap gap-x-7 gap-y-2 mt-4">
                {meta.indicadores.map(i => (
                  <div key={i.id}>
                    <p className="text-[10px] text-gray-600">{i.nombre}</p>
                    <p
                      className="text-[15px] font-semibold tabular-nums tracking-tight"
                      style={{ color: i.valorMeta == null ? "rgba(255,255,255,0.28)" : GOLD }}
                    >
                      {i.valorMeta == null ? "Sin meta" : formatValorMeta(i.valorMeta, i.unidad)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <Anillo pct={resumen.progreso} tam={52} />
          </div>
        </Panel>
      )}

      <div className="space-y-4">
        <Rotulo icono={GitBranch}>Cómo baja la meta hasta el lunes</Rotulo>

        <div className="space-y-3 pl-5" style={{ borderLeft: `1px solid ${oro(0.16)}` }}>
          {areas.map(a => {
            const areaAbierta = abiertas.has(a.id);
            return (
              <div key={a.id} className="relative">
                <span
                  className="absolute -left-[26px] top-6 w-2.5 h-2.5 rounded-full"
                  style={{
                    background: a.progreso > 0 ? GOLD : "#1c1c1c",
                    border: `1px solid ${a.progreso > 0 ? GOLD : oro(0.3)}`,
                  }}
                />
                <Panel acento={areaAbierta}>
                  <button onClick={() => alternar(a.id)} className="w-full text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-[15px] font-semibold text-white flex-1 tracking-tight">
                        {a.nombre}
                      </span>
                      {a.enRiesgo > 0 && (
                        <span className="text-[11px] text-red-400 flex items-center gap-1.5 shrink-0">
                          <AlertTriangle strokeWidth={1.8} className="w-3 h-3" />
                          {a.enRiesgo} en riesgo
                        </span>
                      )}
                      <Anillo pct={a.progreso} tam={38} />
                      {areaAbierta ? (
                        <ChevronDown strokeWidth={1.8} className="w-4 h-4 text-gray-600 shrink-0" />
                      ) : (
                        <ChevronRight strokeWidth={1.8} className="w-4 h-4 text-gray-600 shrink-0" />
                      )}
                    </div>
                  </button>

                  {areaAbierta && (
                    <div
                      className="mt-5 space-y-4 pl-5"
                      style={{ borderLeft: `1px solid ${oro(0.14)}` }}
                    >
                      {a.objetivos.map(o => {
                        const est = ESTADO_OBJETIVO_META[o.estadoCalc];
                        const objAbierto = abiertas.has(o.id);
                        return (
                          <div key={o.id} className="relative">
                            <span
                              className="absolute -left-[26px] top-2 w-2 h-2 rounded-full"
                              style={{ background: est.color }}
                            />
                            <button onClick={() => alternar(o.id)} className="w-full text-left">
                              <div className="flex items-start gap-3">
                                <span className="text-[13px] text-gray-200 flex-1 leading-relaxed">
                                  {o.descripcion}
                                </span>
                                <span
                                  className="text-[11px] px-2 py-0.5 rounded-full shrink-0 tabular-nums"
                                  style={{ background: `${est.color}1f`, color: est.color }}
                                >
                                  {o.progreso}%
                                </span>
                                {objAbierto ? (
                                  <ChevronDown
                                    strokeWidth={1.8}
                                    className="w-3.5 h-3.5 text-gray-600 shrink-0 mt-0.5"
                                  />
                                ) : (
                                  <ChevronRight
                                    strokeWidth={1.8}
                                    className="w-3.5 h-3.5 text-gray-600 shrink-0 mt-0.5"
                                  />
                                )}
                              </div>
                              <p className="text-[11px] text-gray-600 mt-1">
                                {o.metrica} · meta{" "}
                                <span style={{ color: oro(0.85) }}>
                                  {formatValorMeta(o.valorMeta, o.unidad)}
                                </span>
                                {o.fechaLimite &&
                                  ` · ${new Date(o.fechaLimite).toLocaleDateString("es-MX", { dateStyle: "medium" })}`}
                              </p>
                            </button>

                            {objAbierto && (
                              <ul
                                className="mt-2.5 space-y-1.5 pl-5"
                                style={{ borderLeft: `1px solid rgba(255,255,255,0.07)` }}
                              >
                                {o.tacticas.map(t => {
                                  const em = ESTADOS_TACTICA.find(e => e.value === t.estado);
                                  return (
                                    <li key={t.id} className="flex items-center gap-2.5 text-[13px]">
                                      <span
                                        className="w-1.5 h-1.5 rounded-full shrink-0"
                                        style={{
                                          background: em?.color,
                                          boxShadow: `0 0 6px ${em?.color}66`,
                                        }}
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
                                      <span className="text-[11px] text-gray-700 ml-auto shrink-0">
                                        {usuarios.find(u => u.id === t.responsableId)?.name ?? ""}
                                      </span>
                                    </li>
                                  );
                                })}
                                {o.tacticas.length === 0 && (
                                  <li className="text-[11px] text-gray-600">
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
                </Panel>
              </div>
            );
          })}
        </div>
      </div>
    </Lienzo>
  );
}
