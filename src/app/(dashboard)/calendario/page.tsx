"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Evento {
  id: string; dia: number; tipo: string; titulo: string;
  subtitulo: string; estado: string; url: string;
}

const CAPAS = [
  { key: "EVENTO",      label: "Eventos",         color: "bg-green-500",   textColor: "text-green-200",  bg: "bg-green-900/60 border-l-2 border-green-500" },
  { key: "MONTAJE",     label: "Montajes",         color: "bg-[#B3985B]",   textColor: "text-[#B3985B]",  bg: "bg-[#B3985B]/20 border-l-2 border-[#B3985B]" },
  { key: "CXC",         label: "Cobros",           color: "bg-blue-400",    textColor: "text-blue-200",   bg: "bg-blue-900/50 border-l-2 border-blue-400" },
  { key: "SEGUIMIENTO", label: "Seguimientos",     color: "bg-purple-500",  textColor: "text-purple-200", bg: "bg-purple-900/40 border-l-2 border-purple-500" },
  { key: "MARKETING",   label: "Marketing",        color: "bg-pink-500",    textColor: "text-pink-200",   bg: "bg-pink-900/40 border-l-2 border-pink-500" },
] as const;

const CAPA_MAP = Object.fromEntries(CAPAS.map(c => [c.key, c]));

const ESTADO_COLORS: Record<string, string> = {
  PLANEACION: "bg-blue-900/60 border-l-2 border-blue-500",
  CONFIRMADO: "bg-green-900/60 border-l-2 border-green-500",
  EN_CURSO:   "bg-yellow-900/60 border-l-2 border-yellow-500",
  COMPLETADO: "bg-[#1e1e1e] border-l-2 border-gray-600",
  CANCELADO:  "bg-red-900/30 border-l-2 border-red-700",
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
  const [capasActivas, setCapasActivas] = useState<Set<string>>(
    new Set(["EVENTO", "MONTAJE", "CXC", "SEGUIMIENTO", "MARKETING"])
  );
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

  function toggleCapa(key: string) {
    setCapasActivas(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const eventosFiltrados = eventos.filter(e => capasActivas.has(e.tipo));
  const eventosPorDia: Record<number, Evento[]> = {};
  for (const e of eventosFiltrados) {
    if (!eventosPorDia[e.dia]) eventosPorDia[e.dia] = [];
    eventosPorDia[e.dia].push(e);
  }

  const { offset, diasEnMes } = getMesData(year, month);
  const totalCeldas = Math.ceil((offset + diasEnMes) / 7) * 7;
  const esMesActual = year === ahora.getFullYear() && month === ahora.getMonth();
  const nombreMes = new Date(year, month, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  const totalEventos = eventosFiltrados.filter(e => e.tipo === "EVENTO").length;
  const totalCobros = eventosFiltrados.filter(e => e.tipo === "CXC").length;

  // Eventos del día seleccionado o resumen del mes
  const eventosPanel = diaSeleccionado !== null
    ? eventosFiltrados.filter(e => e.dia === diaSeleccionado)
    : null;

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white capitalize">{nombreMes}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {totalEventos > 0 && <span>{totalEventos} evento{totalEventos !== 1 ? "s" : ""}</span>}
            {totalEventos > 0 && totalCobros > 0 && <span className="mx-1">·</span>}
            {totalCobros > 0 && <span>{totalCobros} cobro{totalCobros !== 1 ? "s" : ""} pendiente{totalCobros !== 1 ? "s" : ""}</span>}
            {totalEventos === 0 && totalCobros === 0 && <span>Sin elementos en el mes</span>}
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

      {/* Filtros de capas */}
      <div className="flex items-center gap-2 flex-wrap">
        {CAPAS.map(capa => (
          <button
            key={capa.key}
            onClick={() => toggleCapa(capa.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              capasActivas.has(capa.key)
                ? "border-transparent text-white bg-[#1e1e1e]"
                : "border-[#222] text-gray-600 bg-transparent opacity-50"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${capa.color}`} />
            {capa.label}
          </button>
        ))}
        <button
          onClick={() => setCapasActivas(new Set(CAPAS.map(c => c.key)))}
          className="text-gray-600 hover:text-gray-400 text-xs px-2 transition-colors"
        >
          Mostrar todo
        </button>
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
                              const capa = CAPA_MAP[e.tipo as keyof typeof CAPA_MAP];
                              const bgClass = e.tipo === "EVENTO" ? (ESTADO_COLORS[e.estado] ?? "bg-[#222] border-l-2 border-gray-600") : capa?.bg ?? "bg-[#222]";
                              return (
                                <div
                                  key={e.id}
                                  className={`px-1 py-0.5 rounded text-[10px] truncate leading-tight ${bgClass} ${capa?.textColor ?? "text-gray-300"}`}
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

        {/* Panel lateral: día seleccionado o agenda del mes */}
        <div className="w-72 shrink-0 hidden lg:block">
          {diaSeleccionado !== null ? (
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden sticky top-4">
              <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                <p className="text-white text-sm font-semibold">
                  {new Date(year, month, diaSeleccionado).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <button onClick={() => setDiaSeleccionado(null)} className="text-gray-600 hover:text-gray-300 text-xs">✕</button>
              </div>
              {eventosPanel && eventosPanel.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-8">Sin elementos</p>
              ) : (
                <div className="divide-y divide-[#1a1a1a] max-h-[60vh] overflow-y-auto">
                  {(eventosPanel ?? []).map(e => {
                    const capa = CAPA_MAP[e.tipo as keyof typeof CAPA_MAP];
                    return (
                      <Link key={e.id} href={e.url}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors">
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${capa?.color ?? "bg-gray-500"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-sm font-medium truncate">{e.titulo}</p>
                          <p className="text-gray-500 text-xs truncate">{e.subtitulo}</p>
                          {e.estado === "VENCIDO" && <span className="text-red-400 text-[10px]">Vencido</span>}
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
                <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Agenda del mes</p>
              </div>
              {loading ? (
                <div className="p-4 space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-10 bg-[#1a1a1a] rounded animate-pulse" />)}
                </div>
              ) : eventosFiltrados.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-8">Sin elementos</p>
              ) : (
                <div className="divide-y divide-[#1a1a1a] max-h-[70vh] overflow-y-auto">
                  {eventosFiltrados
                    .sort((a, b) => a.dia - b.dia)
                    .map(e => {
                      const capa = CAPA_MAP[e.tipo as keyof typeof CAPA_MAP];
                      return (
                        <Link key={e.id} href={e.url}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors">
                          <div className="text-center w-8 shrink-0">
                            <p className="text-[#B3985B] text-base font-bold leading-none">{e.dia}</p>
                            <p className="text-gray-600 text-[10px]">
                              {new Date(year, month, e.dia).toLocaleDateString("es-MX", { weekday: "short" })}
                            </p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${capa?.color ?? "bg-gray-500"}`} />
                              <p className="text-white text-xs font-medium truncate">{e.titulo}</p>
                            </div>
                            <p className="text-gray-500 text-[11px] truncate">{e.subtitulo}</p>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Agenda móvil (< lg) */}
      <div className="lg:hidden">
        {eventosFiltrados.length > 0 && (
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1a1a1a]">
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Agenda del mes</p>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {eventosFiltrados
                .sort((a, b) => a.dia - b.dia)
                .map(e => {
                  const capa = CAPA_MAP[e.tipo as keyof typeof CAPA_MAP];
                  return (
                    <Link key={e.id} href={e.url}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors">
                      <div className="text-center w-8 shrink-0">
                        <p className="text-[#B3985B] text-base font-bold leading-none">{e.dia}</p>
                        <p className="text-gray-600 text-[10px]">{new Date(year, month, e.dia).toLocaleDateString("es-MX", { weekday: "short" })}</p>
                      </div>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${capa?.color ?? "bg-gray-500"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm truncate">{e.titulo}</p>
                        <p className="text-gray-500 text-xs truncate">{e.subtitulo}</p>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
