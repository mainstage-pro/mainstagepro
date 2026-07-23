"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ── Reporte constants ────────────────────────────────────────────────────────
const MESES_RPT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const TIPO_EVENTO_LABELS: Record<string, string> = {
  MUSICAL: "Musical", SOCIAL: "Social", EMPRESARIAL: "Empresarial", OTRO: "Otro", SIN_DEFINIR: "Sin definir",
};
const TIPO_SERVICIO_LABELS: Record<string, string> = {
  RENTA: "Renta", PRODUCCION_TECNICA: "Producción técnica", DIRECCION_TECNICA: "Dirección técnica",
  MULTISERVICIO: "Multiservicio", SIN_DEFINIR: "Sin definir",
};
const TIPO_EVENTO_COLORS: Record<string, string> = {
  MUSICAL: "bg-purple-600/60", SOCIAL: "bg-blue-600/60", EMPRESARIAL: "bg-amber-600/60",
  OTRO: "bg-gray-600/60", SIN_DEFINIR: "bg-gray-700/60",
};
const TIPO_SERVICIO_COLORS: Record<string, string> = {
  RENTA: "bg-green-600/60", PRODUCCION_TECNICA: "bg-cyan-600/60", DIRECCION_TECNICA: "bg-orange-600/60",
  MULTISERVICIO: "bg-pink-600/60", SIN_DEFINIR: "bg-gray-700/60",
};
const PODIUM_COLORS = ["text-[#B3985B]", "text-gray-300", "text-orange-700"];
const PODIUM_BG    = ["border-[#B3985B]/40 bg-[#B3985B]/5", "border-gray-600/40 bg-gray-800/20", "border-orange-800/40 bg-orange-900/10"];
const PODIUM_LABEL = ["1°", "2°", "3°"];
function pctRpt(v: number, t: number) { return t === 0 ? 0 : Math.round((v / t) * 100); }
function mesLabel(key: string) { const [,m] = key.split("-"); return MESES_RPT[parseInt(m)-1] ?? key; }

interface ReporteData {
  total: number; completados: number; confirmados: number; enCurso: number; planeacion: number;
  porTipoEvento: { tipo: string; count: number }[];
  porTipoServicio: { tipo: string; count: number }[];
  topClientes: { id: string; nombre: string; count: number }[];
  porMes: { mes: string; count: number }[];
}

type Nivel = 'tentativo' | 'confirmado' | 'operativo';

const NIVEL_COLOR: Record<Nivel, { bar: string; dot: string; text: string; bg: string }> = {
  tentativo:  { bar: 'border-l-amber-600',   dot: 'bg-amber-500',   text: 'text-amber-300',   bg: 'bg-amber-900/30'  },
  confirmado: { bar: 'border-l-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-300', bg: 'bg-emerald-900/30' },
  operativo:  { bar: 'border-l-blue-500',    dot: 'bg-blue-500',    text: 'text-blue-300',    bg: 'bg-blue-900/30'   },
};

interface Evento {
  id: string;
  dia: number;
  titulo: string;
  subtitulo: string;
  estado: string;
  nivel: Nivel;
  url: string;
  tipoEvento: string | null;
  tipoServicio: string | null;
  lugarEvento: string | null;
  horaInicioEvento: string | null;
}

const ESTADO_COLORS: Record<string, { bar: string; dot: string; text: string }> = {
  PLANEACION:    { bar: "border-l-blue-500",   dot: "bg-blue-500",   text: "text-blue-300"  },
  CONFIRMADO:    { bar: "border-l-green-500",  dot: "bg-green-500",  text: "text-green-300" },
  EN_CURSO:      { bar: "border-l-yellow-400", dot: "bg-yellow-400", text: "text-yellow-300"},
  COMPLETADO:    { bar: "border-l-gray-600",   dot: "bg-gray-600",   text: "text-gray-400"  },
  VENTA_CERRADA: { bar: "border-l-amber-400",  dot: "bg-amber-400",  text: "text-amber-300" },
  // Etapas de trato
  PROSPECCION:    { bar: "border-l-amber-600",  dot: "bg-amber-500",  text: "text-amber-300" },
  DESCUBRIMIENTO: { bar: "border-l-amber-600",  dot: "bg-amber-500",  text: "text-amber-300" },
  OPORTUNIDAD:    { bar: "border-l-amber-600",  dot: "bg-amber-500",  text: "text-amber-300" },
};

const ESTADO_LABELS: Record<string, string> = {
  PLANEACION:    "Planeación",
  CONFIRMADO:    "Confirmado",
  EN_CURSO:      "En curso",
  COMPLETADO:    "Completado",
  VENTA_CERRADA: "Venta cerrada",
  // Etapas de trato
  PROSPECCION:    "Prospección",
  DESCUBRIMIENTO: "Descubrimiento",
  OPORTUNIDAD:    "Oportunidad",
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
  // Reporte section state
  const [reporteOpen, setReporteOpen] = useState(false);
  const [reporteYear, setReporteYear] = useState(ahora.getFullYear());
  const [reporteData, setReporteData] = useState<ReporteData | null>(null);
  const [reporteLoading, setReporteLoading] = useState(false);
  const [sessionRole, setSessionRole] = useState<string>("");
  const [sessionArea, setSessionArea] = useState<string>("");

  useEffect(() => {
    fetch("/api/me")
      .then(r => r.json())
      .then(d => {
        if (d.role) setSessionRole(d.role);
        if (d.area) setSessionArea(d.area);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!reporteOpen) return;
    setReporteLoading(true);
    fetch(`/api/proyectos/reporte?year=${reporteYear}`)
      .then(r => r.json())
      .then(d => { setReporteData(d); setReporteLoading(false); })
      .catch(() => setReporteLoading(false));
  }, [reporteOpen, reporteYear]);

  const maxMes = reporteData ? Math.max(...reporteData.porMes.map(m => m.count), 1) : 1;

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
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="ms-h1 capitalize">{nombreMes}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {loading ? "Cargando..." : eventos.length === 0
              ? "Sin eventos este mes"
              : `${eventos.length} evento${eventos.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navMes(-1)}
            className="ms-btn-secondary">
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
            className="ms-btn-secondary">
            Siguiente →
          </button>
          <a href={`/api/produccion/agenda/pdf?mes=${year}-${String(month + 1).padStart(2, "0")}`}
            target="_blank" rel="noopener noreferrer"
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black px-3 py-2 rounded-lg text-sm font-medium transition-colors">
            Descargar PDF
          </a>
        </div>
      </div>

      {/* Leyenda de niveles */}
      <div className="flex items-center gap-4 mb-1">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"/><span className="text-xs text-gray-400">Tentativo</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"/><span className="text-xs text-gray-400">Confirmado</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"/><span className="text-xs text-gray-400">Operativo</span></div>
      </div>

      <div className="flex gap-4">
        {/* Grilla */}
        <div className="flex-1 min-w-0">
          <div className="ms-card overflow-x-auto">
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
                                const nc = NIVEL_COLOR[e.nivel ?? 'tentativo'] ?? NIVEL_COLOR.tentativo;
                                return (
                                  <div
                                    key={e.id}
                                    className={`px-1 py-0.5 rounded text-[10px] truncate leading-tight bg-[#1a1a1a] border-l-2 ${nc.bar} ${nc.text}`}
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
            <div className="ms-table-wrapper sticky top-4">
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
                    const nc = NIVEL_COLOR[e.nivel ?? 'tentativo'] ?? NIVEL_COLOR.tentativo;
                    return (
                      <Link key={e.id} href={e.url}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors">
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${nc.dot}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-sm font-medium truncate">{e.titulo}</p>
                          <p className="text-gray-500 text-xs truncate">{e.subtitulo}</p>
                          {e.lugarEvento && <p className="text-gray-600 text-[10px] truncate mt-0.5">{e.lugarEvento}</p>}
                          {e.horaInicioEvento && <p className="text-[#B3985B] text-[10px] mt-0.5">{e.horaInicioEvento}</p>}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[10px] ${nc.text}`}>{ESTADO_LABELS[e.estado] ?? e.estado}</span>
                            {e.estado === "VENTA_CERRADA" && (
                              <span className="text-[10px] bg-amber-900/30 text-amber-400 px-1.5 py-0.5 rounded font-medium">Sin proyecto</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="ms-table-wrapper sticky top-4">
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
                  const nc = NIVEL_COLOR[e.nivel ?? 'tentativo'] ?? NIVEL_COLOR.tentativo;
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
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${nc.dot}`} />
                          <p className="text-xs font-medium truncate text-white">{e.titulo}</p>
                        </div>
                        <p className="text-gray-500 text-[11px] truncate">{e.subtitulo}</p>
                        {e.estado === "VENTA_CERRADA" && (
                          <p className="text-amber-400/70 text-[10px] mt-0.5">Sin proyecto · Pendiente</p>
                        )}
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
          <div className="ms-table-wrapper">
            <div className="px-4 py-3 border-b border-[#1a1a1a]">
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Eventos del mes</p>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {(() => {
                const sorted = [...eventos].sort((a, b) => a.dia - b.dia);
                const proximos = sorted.filter(e => !esPasado(e.dia));
                const pasados  = sorted.filter(e =>  esPasado(e.dia));
                const renderItem = (e: Evento, dimmed: boolean) => {
                  const nc = NIVEL_COLOR[e.nivel ?? 'tentativo'] ?? NIVEL_COLOR.tentativo;
                  return (
                    <Link key={e.id} href={e.url}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors ${dimmed ? "opacity-50" : ""}`}>
                      <div className="text-center w-8 shrink-0">
                        <p className={`text-base font-bold leading-none ${dimmed ? "text-gray-500" : "text-[#B3985B]"}`}>{e.dia}</p>
                        <p className="text-gray-600 text-[10px]">{new Date(year, month, e.dia).toLocaleDateString("es-MX", { weekday: "short" })}</p>
                      </div>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${nc.dot}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm truncate">{e.titulo}</p>
                        <p className="text-gray-500 text-xs truncate">{e.subtitulo}</p>
                        {e.estado === "VENTA_CERRADA" && (
                          <p className="text-amber-400/70 text-[10px]">Sin proyecto · Pendiente</p>
                        )}
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

      {/* ── Reporte de eventos (colapsable) ── */}
      {(sessionRole === "ADMIN" || (sessionArea && sessionArea !== "PRODUCCION")) && (
        <div className="border border-[#1e1e1e] rounded-xl overflow-hidden">
        <button
          onClick={() => setReporteOpen(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#111] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#B3985B]">Reporte anual de eventos</span>
            <span className="text-[10px] text-gray-600">{reporteYear}</span>
          </div>
          <span className={`text-gray-600 text-sm transition-transform ${reporteOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {reporteOpen && (
          <div className="border-t border-[#1a1a1a] p-5 space-y-6">
            {/* Year selector */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-gray-500 text-xs">Distribución por tipo, servicio y clientes</p>
              <div className="flex items-center gap-1 ms-card rounded-lg p-1">
                {[ahora.getFullYear() - 1, ahora.getFullYear(), ahora.getFullYear() + 1].map(y => (
                  <button key={y} onClick={() => setReporteYear(y)}
                    className={`text-sm px-3 py-1 rounded transition-colors ${reporteYear === y ? 'bg-[#B3985B] text-black font-semibold' : 'text-gray-500 hover:text-white'}`}>
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {reporteLoading ? (
              <div className="py-12 text-center text-gray-600 text-sm">Cargando...</div>
            ) : !reporteData || reporteData.total === 0 ? (
              <div className="py-12 text-center text-gray-600 text-sm">Sin eventos en {reporteYear}</div>
            ) : (
              <>
                {/* KPI cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: "Total",        value: reporteData.total,        color: "text-white" },
                    { label: "Completados",  value: reporteData.completados,  color: "text-green-400" },
                    { label: "Confirmados",  value: reporteData.confirmados,  color: "text-blue-400" },
                    { label: "En curso",     value: reporteData.enCurso,      color: "text-yellow-400" },
                    { label: "Planeación",   value: reporteData.planeacion,   color: "text-gray-400" },
                  ].map(k => (
                    <div key={k.label} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4">
                      <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">{k.label}</p>
                      <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
                    </div>
                  ))}
                </div>

                {/* Por mes */}
                {reporteData.porMes.length > 1 && (
                  <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-5">
                    <h3 className="text-white font-semibold text-sm mb-4">Eventos por mes</h3>
                    <div className="space-y-2.5">
                      {reporteData.porMes.map(m => (
                        <div key={m.mes} className="flex items-center gap-3">
                          <span className="text-gray-600 text-[10px] w-7 text-right shrink-0">{mesLabel(m.mes)}</span>
                          <div className="flex-1 flex items-center gap-2">
                            <div
                              className="h-5 bg-[#B3985B]/40 rounded flex items-center px-2 transition-all"
                              style={{ width: `${pctRpt(m.count, maxMes)}%`, minWidth: '4px' }}
                            >
                              {pctRpt(m.count, maxMes) > 15 && (
                                <span className="text-[10px] text-[#f0d090] font-semibold">{m.count}</span>
                              )}
                            </div>
                            {pctRpt(m.count, maxMes) <= 15 && (
                              <span className="text-[10px] text-[#B3985B]">{m.count}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tipo evento + tipo servicio */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-5">
                    <h3 className="text-white font-semibold text-sm mb-4">Por tipo de evento</h3>
                    <div className="space-y-3">
                      {reporteData.porTipoEvento.map(item => (
                        <div key={item.tipo}>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-gray-300 text-sm">{TIPO_EVENTO_LABELS[item.tipo] ?? item.tipo}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600 text-xs">{pctRpt(item.count, reporteData.total)}%</span>
                              <span className="text-white font-semibold text-sm">{item.count}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${TIPO_EVENTO_COLORS[item.tipo] ?? 'bg-gray-600/60'}`}
                              style={{ width: `${pctRpt(item.count, reporteData.total)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-5">
                    <h3 className="text-white font-semibold text-sm mb-4">Por tipo de servicio</h3>
                    <div className="space-y-3">
                      {reporteData.porTipoServicio.map(item => (
                        <div key={item.tipo}>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-gray-300 text-sm">{TIPO_SERVICIO_LABELS[item.tipo] ?? item.tipo}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600 text-xs">{pctRpt(item.count, reporteData.total)}%</span>
                              <span className="text-white font-semibold text-sm">{item.count}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${TIPO_SERVICIO_COLORS[item.tipo] ?? 'bg-gray-600/60'}`}
                              style={{ width: `${pctRpt(item.count, reporteData.total)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top clientes */}
                {reporteData.topClientes.length > 0 && (
                  <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-5">
                    <h3 className="text-white font-semibold text-sm mb-4">Top clientes del año</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {reporteData.topClientes.map((c, i) => (
                        <div key={c.id} className={`border rounded-xl p-5 text-center ${PODIUM_BG[i]}`}>
                          <p className={`text-3xl font-bold mb-1 ${PODIUM_COLORS[i]}`}>{PODIUM_LABEL[i]}</p>
                          <p className="text-white font-semibold text-sm">{c.nombre}</p>
                          <p className={`text-2xl font-bold mt-3 ${PODIUM_COLORS[i]}`}>{c.count}</p>
                          <p className="text-gray-600 text-xs">evento{c.count !== 1 ? 's' : ''}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
