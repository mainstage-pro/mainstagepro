"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Evento {
  id: string;
  dia: number;
  titulo: string;
  subtitulo: string;
  estado: string;
  url: string;
  tipoEvento: string | null;
  tipoServicio: string | null;
  lugarEvento: string | null;
  horaInicioEvento: string | null;
}

const ESTADO_COLORS: Record<string, { bar: string; dot: string; text: string }> = {
  PLANEACION: { bar: "border-l-blue-500",   dot: "bg-blue-500",   text: "text-blue-300"  },
  CONFIRMADO: { bar: "border-l-green-500",  dot: "bg-green-500",  text: "text-green-300" },
  EN_CURSO:   { bar: "border-l-yellow-400", dot: "bg-yellow-400", text: "text-yellow-300"},
  COMPLETADO: { bar: "border-l-gray-600",   dot: "bg-gray-600",   text: "text-gray-400"  },
};

const ESTADO_LABELS: Record<string, string> = {
  PLANEACION: "Planeación",
  CONFIRMADO: "Confirmado",
  EN_CURSO:   "En curso",
  COMPLETADO: "Completado",
};

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getMesData(year: number, month: number) {
  const primerDia = new Date(year, month, 1).getDay();
  const diasEnMes = new Date(year, month + 1, 0).getDate();
  const offset = primerDia === 0 ? 6 : primerDia - 1;
  return { offset, diasEnMes };
}

export default function CalendarioPage() {
  const ahora = new Date();
  const [year, setYear] = useState(ahora.getFullYear());
  const [month, setMonth] = useState(ahora.getMonth());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null);

  const mesStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  const cargar = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/calendario?mes=${mesStr}`, { cache: "no-store" });
    const d = await r.json();
    setEventos(d.eventos ?? []);
    setLoading(false);
  }, [mesStr]);

  useEffect(() => { cargar(); }, [cargar]);

  function navMes(delta: number) {
    setDiaSeleccionado(null);
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  const eventosPorDia: Record<number, Evento[]> = {};
  for (const e of eventos) {
    if (!eventosPorDia[e.dia]) eventosPorDia[e.dia] = [];
    eventosPorDia[e.dia].push(e);
  }

  const { offset, diasEnMes } = getMesData(year, month);
  const totalCeldas = Math.ceil((offset + diasEnMes) / 7) * 7;
  const esMesActual = year === ahora.getFullYear() && month === ahora.getMonth();
  const esMesPasado = year < ahora.getFullYear() || (year === ahora.getFullYear() && month < ahora.getMonth());

  function esPasado(dia: number) {
    if (esMesPasado) return true;
    if (!esMesActual) return false;
    return dia < ahora.getDate();
  }
  const nombreMes = new Date(year, month, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  const eventosPanel = diaSeleccionado !== null
    ? eventos.filter(e => e.dia === diaSeleccionado)
    : null;

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white capitalize">{nombreMes}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {loading ? "Cargando..." : eventos.length === 0
              ? "Sin eventos este mes"
              : `${eventos.length} evento${eventos.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navMes(-1)}
            className="bg-[#111] border border-[#222] text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm transition-colors">
            ← Anterior
          </button>
          {!esMesActual && (
            <button
              onClick={() => { setYear(ahora.getFullYear()); setMonth(ahora.getMonth()); setDiaSeleccionado(null); }}
              className="bg-[#1a1a1a] border border-[#333] text-[#B3985B] px-3 py-2 rounded-lg text-sm hover:bg-[#222] transition-colors">
              Hoy
            </button>
          )}
          <button onClick={() => navMes(1)}
            className="bg-[#111] border border-[#222] text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm transition-colors">
            Siguiente →
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Grilla */}
        <div className="flex-1 min-w-0">
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-x-auto">
            <div className="min-w-[320px]">
              <div className="grid grid-cols-7 border-b border-[#1a1a1a]">
                {DIAS_SEMANA.map(d => (
                  <div key={d} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: totalCeldas }).map((_, i) => {
                  const dia = i - offset + 1;
                  const esValido = dia >= 1 && dia <= diasEnMes;
                  const esHoy = esValido && esMesActual && dia === ahora.getDate();
                  const esSeleccionado = esValido && dia === diaSeleccionado;
                  const evs = esValido ? (eventosPorDia[dia] ?? []) : [];
                  const semana = Math.floor(i / 7);
                  const maxSemanas = Math.ceil(totalCeldas / 7);

                  return (
                    <div
                      key={i}
                      onClick={() => esValido && setDiaSeleccionado(dia === diaSeleccionado ? null : dia)}
                      className={`min-h-[90px] p-1 border-b border-r border-[#1a1a1a] transition-colors
                        ${!esValido ? "bg-[#0d0d0d]" : "cursor-pointer hover:bg-[#141414]"}
                        ${esSeleccionado ? "bg-[#1a1a1a]" : ""}
                        ${semana === maxSemanas - 1 ? "border-b-0" : ""}
                        ${i % 7 === 6 ? "border-r-0" : ""}
                      `}
                    >
                      {esValido && (
                        <>
                          <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs mb-1 mx-auto font-medium
                            ${esHoy ? "bg-[#B3985B] text-black font-bold" : esSeleccionado ? "bg-[#333] text-white" : "text-gray-500"}`}>
                            {dia}
                          </div>
                          {loading ? (
                            <div className="h-2 bg-[#1e1e1e] rounded animate-pulse mx-1" />
                          ) : (
                            <div className="space-y-0.5">
                              {evs.slice(0, 3).map(e => {
                                const colors = ESTADO_COLORS[e.estado] ?? { bar: "border-l-gray-600", text: "text-gray-400" };
                                return (
                                  <div
                                    key={e.id}
                                    className={`px-1 py-0.5 rounded text-[10px] truncate leading-tight bg-[#1a1a1a] border-l-2 ${colors.bar} ${colors.text}`}
                                    title={`${e.titulo} — ${e.subtitulo}`}
                                  >
                                    {e.titulo}
                                  </div>
                                );
                              })}
                              {evs.length > 3 && (
                                <div className="text-[10px] text-gray-600 px-1">+{evs.length - 3} más</div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Panel lateral — desktop */}
        <div className="w-72 shrink-0 hidden lg:block">
          {diaSeleccionado !== null ? (
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden sticky top-4">
              <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                <p className="text-white text-sm font-semibold capitalize">
                  {new Date(year, month, diaSeleccionado).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <button onClick={() => setDiaSeleccionado(null)} className="text-gray-600 hover:text-gray-300 text-xs">✕</button>
              </div>
              {eventosPanel && eventosPanel.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-8">Sin eventos</p>
              ) : (
                <div className="divide-y divide-[#1a1a1a] max-h-[60vh] overflow-y-auto">
                  {(eventosPanel ?? []).map(e => {
                    const colors = ESTADO_COLORS[e.estado] ?? { dot: "bg-gray-500", text: "text-gray-400" };
                    return (
                      <Link key={e.id} href={e.url}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors">
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${colors.dot}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-sm font-medium truncate">{e.titulo}</p>
                          <p className="text-gray-500 text-xs truncate">{e.subtitulo}</p>
                          {e.lugarEvento && <p className="text-gray-600 text-[10px] truncate mt-0.5">{e.lugarEvento}</p>}
                          {e.horaInicioEvento && <p className="text-[#B3985B] text-[10px] mt-0.5">{e.horaInicioEvento}</p>}
                          <span className={`text-[10px] ${colors.text}`}>{ESTADO_LABELS[e.estado] ?? e.estado}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden sticky top-4">
              <div className="px-4 py-3 border-b border-[#1a1a1a]">
                <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Eventos del mes</p>
              </div>
              {loading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map(i => <div key={i} className="h-10 bg-[#1a1a1a] rounded animate-pulse" />)}
                </div>
              ) : eventos.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-8">Sin eventos</p>
              ) : (() => {
                const sorted = [...eventos].sort((a, b) => a.dia - b.dia);
                const proximos = sorted.filter(e => !esPasado(e.dia));
                const pasados  = sorted.filter(e =>  esPasado(e.dia));
                const renderItem = (e: Evento, dimmed: boolean) => {
                  const colors = ESTADO_COLORS[e.estado] ?? { dot: "bg-gray-500", text: "text-gray-400" };
                  return (
                    <Link key={e.id} href={e.url}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors ${dimmed ? "opacity-50" : ""}`}>
                      <div className="text-center w-8 shrink-0">
                        <p className={`text-base font-bold leading-none ${dimmed ? "text-gray-500" : "text-[#B3985B]"}`}>{e.dia}</p>
                        <p className="text-gray-600 text-[10px]">
                          {new Date(year, month, e.dia).toLocaleDateString("es-MX", { weekday: "short" })}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
                          <p className="text-xs font-medium truncate text-white">{e.titulo}</p>
                        </div>
                        <p className="text-gray-500 text-[11px] truncate">{e.subtitulo}</p>
                      </div>
                    </Link>
                  );
                };
                return (
                  <div className="divide-y divide-[#1a1a1a] max-h-[70vh] overflow-y-auto">
                    {proximos.map(e => renderItem(e, false))}
                    {pasados.length > 0 && (
                      <>
                        {proximos.length > 0 && (
                          <div className="px-4 py-1.5 bg-[#0d0d0d]">
                            <p className="text-[10px] text-gray-600 uppercase tracking-wider">Pasados</p>
                          </div>
                        )}
                        {pasados.map(e => renderItem(e, true))}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Agenda móvil */}
      <div className="lg:hidden">
        {eventos.length > 0 && (
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1a1a1a]">
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Eventos del mes</p>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {(() => {
                const sorted = [...eventos].sort((a, b) => a.dia - b.dia);
                const proximos = sorted.filter(e => !esPasado(e.dia));
                const pasados  = sorted.filter(e =>  esPasado(e.dia));
                const renderItem = (e: Evento, dimmed: boolean) => {
                  const colors = ESTADO_COLORS[e.estado] ?? { dot: "bg-gray-500" };
                  return (
                    <Link key={e.id} href={e.url}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors ${dimmed ? "opacity-50" : ""}`}>
                      <div className="text-center w-8 shrink-0">
                        <p className={`text-base font-bold leading-none ${dimmed ? "text-gray-500" : "text-[#B3985B]"}`}>{e.dia}</p>
                        <p className="text-gray-600 text-[10px]">{new Date(year, month, e.dia).toLocaleDateString("es-MX", { weekday: "short" })}</p>
                      </div>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm truncate">{e.titulo}</p>
                        <p className="text-gray-500 text-xs truncate">{e.subtitulo}</p>
                      </div>
                    </Link>
                  );
                };
                return (
                  <>
                    {proximos.map(e => renderItem(e, false))}
                    {pasados.length > 0 && (
                      <>
                        {proximos.length > 0 && (
                          <div className="px-4 py-1.5 bg-[#0d0d0d]">
                            <p className="text-[10px] text-gray-600 uppercase tracking-wider">Pasados</p>
                          </div>
                        )}
                        {pasados.map(e => renderItem(e, true))}
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
