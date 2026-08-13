"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import CrearTareaModal from "@/components/calendarios/CrearTareaModal";
import { TAG_EVENTOS } from "@/lib/calendarios";

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
function mesLabelRpt(key: string) { const [,m] = key.split("-"); return MESES_RPT[parseInt(m)-1] ?? key; }

interface ReporteData {
  total: number; completados: number; confirmados: number; enCurso: number; planeacion: number;
  porTipoEvento: { tipo: string; count: number }[];
  porTipoServicio: { tipo: string; count: number }[];
  topClientes: { id: string; nombre: string; count: number }[];
  porMes: { mes: string; count: number }[];
}

type Nivel = 'por_confirmar' | 'confirmado';
const NIVEL_COLOR: Record<Nivel, { bar: string; dot: string; text: string }> = {
  por_confirmar: { bar: 'border-l-amber-600',   dot: 'bg-amber-500',   text: 'text-amber-300'   },
  confirmado:    { bar: 'border-l-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-300' },
};
const NIVEL_LABEL: Record<Nivel, string> = { por_confirmar: 'Por confirmar', confirmado: 'Confirmado' };

interface Evento {
  id: string; dia: number; mes: number; titulo: string; subtitulo: string;
  estado: string; nivel: Nivel; sinProyecto: boolean; url: string;
  tipoEvento: string | null; tipoServicio: string | null;
  lugarEvento: string | null; horaInicioEvento: string | null;
}

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES_LARGO = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function getMesData(year: number, month: number) {
  const primerDia = new Date(year, month, 1).getDay();
  const diasEnMes = new Date(year, month + 1, 0).getDate();
  const offset = primerDia === 0 ? 6 : primerDia - 1;
  return { offset, diasEnMes };
}
// Lunes de la semana que contiene `d`.
function lunesDe(d: Date) {
  const x = new Date(d);
  const dow = x.getDay(); // 0 dom
  const diff = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

type Vista = "semana" | "mes" | "anio";

export default function CalendarioEventosPage() {
  const ahora = new Date();
  const [vista, setVista] = useState<Vista>("mes");
  const [year, setYear] = useState(ahora.getFullYear());
  const [month, setMonth] = useState(ahora.getMonth());
  const [weekStart, setWeekStart] = useState(() => lunesDe(new Date()));
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null);
  const [tareaOpen, setTareaOpen] = useState(false);

  // Reporte
  const [reporteOpen, setReporteOpen] = useState(false);
  const [reporteYear, setReporteYear] = useState(ahora.getFullYear());
  const [reporteData, setReporteData] = useState<ReporteData | null>(null);
  const [reporteLoading, setReporteLoading] = useState(false);
  const [sessionRole, setSessionRole] = useState<string>("");
  const [sessionArea, setSessionArea] = useState<string>("");

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(d => {
      if (d.role) setSessionRole(d.role);
      if (d.area) setSessionArea(d.area);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!reporteOpen) return;
    setReporteLoading(true);
    fetch(`/api/proyectos/reporte?year=${reporteYear}`)
      .then(r => r.json()).then(d => { setReporteData(d); setReporteLoading(false); })
      .catch(() => setReporteLoading(false));
  }, [reporteOpen, reporteYear]);
  const maxMes = reporteData ? Math.max(...reporteData.porMes.map(m => m.count), 1) : 1;

  // Una sola carga anual; mes/semana/año se derivan en cliente.
  const cargar = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/calendario?anio=${year}`, { cache: "no-store" });
    const d = await r.json();
    setEventos(d.eventos ?? []);
    setLoading(false);
  }, [year]);
  useEffect(() => { cargar(); }, [cargar]);

  // Semana visible → si su año difiere, sincroniza year para recargar.
  useEffect(() => {
    if (vista === "semana" && weekStart.getFullYear() !== year) setYear(weekStart.getFullYear());
  }, [vista, weekStart, year]);

  const eventosDelMes = useMemo(() => eventos.filter(e => e.mes === month), [eventos, month]);

  function navMes(delta: number) {
    setDiaSeleccionado(null);
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear()); setMonth(d.getMonth());
  }
  function navSemana(delta: number) {
    const d = new Date(weekStart); d.setDate(d.getDate() + delta * 7); setWeekStart(d);
  }
  function irHoy() {
    const h = new Date();
    setYear(h.getFullYear()); setMonth(h.getMonth()); setWeekStart(lunesDe(h)); setDiaSeleccionado(null);
  }

  const esMesActual = year === ahora.getFullYear() && month === ahora.getMonth();

  const periodoLabel = vista === "anio" ? String(year)
    : vista === "semana"
      ? (() => {
          const fin = new Date(weekStart); fin.setDate(fin.getDate() + 6);
          return `${weekStart.getDate()} ${MESES_RPT[weekStart.getMonth()]} — ${fin.getDate()} ${MESES_RPT[fin.getMonth()]}`;
        })()
      : `${MESES_LARGO[month]} ${year}`;

  const totalPeriodo = vista === "anio" ? eventos.length
    : vista === "mes" ? eventosDelMes.length
    : eventos.filter(e => {
        const d = new Date(year, e.mes, e.dia);
        const fin = new Date(weekStart); fin.setDate(fin.getDate() + 6); fin.setHours(23,59,59);
        return d >= weekStart && d <= fin;
      }).length;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="ms-h1 capitalize">{periodoLabel}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {loading ? "Cargando…" : totalPeriodo === 0 ? "Sin eventos en este periodo" : `${totalPeriodo} evento${totalPeriodo !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle de vista */}
          <div className="flex items-center gap-1 bg-[#111] border border-[#222] rounded-lg p-1">
            {(["semana","mes","anio"] as Vista[]).map(v => (
              <button key={v} onClick={() => setVista(v)}
                className={`text-sm px-3 py-1 rounded capitalize transition-colors ${vista === v ? "bg-[#B3985B] text-black font-semibold" : "text-gray-500 hover:text-white"}`}>
                {v === "anio" ? "Año" : v}
              </button>
            ))}
          </div>
          {vista !== "anio" && (
            <div className="flex items-center gap-1">
              <button onClick={() => vista === "semana" ? navSemana(-1) : navMes(-1)} className="ms-btn-secondary">←</button>
              <button onClick={irHoy} className="bg-[#1a1a1a] border border-[#333] text-[#B3985B] px-3 py-2 rounded-lg text-sm hover:bg-[#222] transition-colors">Hoy</button>
              <button onClick={() => vista === "semana" ? navSemana(1) : navMes(1)} className="ms-btn-secondary">→</button>
            </div>
          )}
          {vista === "anio" && (
            <div className="flex items-center gap-1 bg-[#111] border border-[#222] rounded-lg p-1">
              <button onClick={() => setYear(y => y - 1)} className="px-2 py-1 text-gray-400 hover:text-white text-sm">←</button>
              <span className="px-2 text-white font-semibold text-sm tabular-nums">{year}</span>
              <button onClick={() => setYear(y => y + 1)} className="px-2 py-1 text-gray-400 hover:text-white text-sm">→</button>
            </div>
          )}
          <button onClick={() => setTareaOpen(true)} className="bg-[#1a1a1a] border border-[#333] text-gray-200 px-3 py-2 rounded-lg text-sm hover:bg-[#222] transition-colors">+ Tarea</button>
          {vista === "mes" && (
            <a href={`/api/produccion/agenda/pdf?mes=${year}-${String(month + 1).padStart(2, "0")}`} target="_blank" rel="noopener noreferrer"
              className="bg-[#B3985B] hover:bg-[#c9a96a] text-black px-3 py-2 rounded-lg text-sm font-medium transition-colors">PDF</a>
          )}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"/><span className="text-xs text-gray-400">Por confirmar</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"/><span className="text-xs text-gray-400">Confirmado</span></div>
      </div>

      {vista === "mes" && <VistaMes {...{ year, month, ahora, eventos: eventosDelMes, loading, esMesActual, diaSeleccionado, setDiaSeleccionado }} />}
      {vista === "semana" && <VistaSemana {...{ weekStart, year, ahora, eventos, loading }} />}
      {vista === "anio" && <VistaAnio {...{ year, ahora, eventos, onMes: (m: number) => { setMonth(m); setVista("mes"); } }} />}

      {/* Reporte anual */}
      {(sessionRole === "ADMIN" || (sessionArea && sessionArea !== "PRODUCCION")) && (
        <div className="border border-[#1e1e1e] rounded-xl overflow-hidden">
          <button onClick={() => setReporteOpen(v => !v)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#111] transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#B3985B]">Reporte anual de eventos</span>
              <span className="text-[10px] text-gray-600">{reporteYear}</span>
            </div>
            <span className={`text-gray-600 text-sm transition-transform ${reporteOpen ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {reporteOpen && (
            <div className="border-t border-[#1a1a1a] p-5 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-gray-500 text-xs">Distribución por tipo, servicio y clientes</p>
                <div className="flex items-center gap-1 ms-card rounded-lg p-1">
                  {[ahora.getFullYear() - 1, ahora.getFullYear(), ahora.getFullYear() + 1].map(y => (
                    <button key={y} onClick={() => setReporteYear(y)}
                      className={`text-sm px-3 py-1 rounded transition-colors ${reporteYear === y ? 'bg-[#B3985B] text-black font-semibold' : 'text-gray-500 hover:text-white'}`}>{y}</button>
                  ))}
                </div>
              </div>
              {reporteLoading ? (
                <div className="py-12 text-center text-gray-600 text-sm">Cargando...</div>
              ) : !reporteData || reporteData.total === 0 ? (
                <div className="py-12 text-center text-gray-600 text-sm">Sin eventos en {reporteYear}</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { label: "Total", value: reporteData.total, color: "text-white" },
                      { label: "Completados", value: reporteData.completados, color: "text-green-400" },
                      { label: "Confirmados", value: reporteData.confirmados, color: "text-blue-400" },
                      { label: "En curso", value: reporteData.enCurso, color: "text-yellow-400" },
                      { label: "Planeación", value: reporteData.planeacion, color: "text-gray-400" },
                    ].map(k => (
                      <div key={k.label} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4">
                        <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">{k.label}</p>
                        <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
                      </div>
                    ))}
                  </div>
                  {reporteData.porMes.length > 1 && (
                    <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-5">
                      <h3 className="text-white font-semibold text-sm mb-4">Eventos por mes</h3>
                      <div className="space-y-2.5">
                        {reporteData.porMes.map(m => (
                          <div key={m.mes} className="flex items-center gap-3">
                            <span className="text-gray-600 text-[10px] w-7 text-right shrink-0">{mesLabelRpt(m.mes)}</span>
                            <div className="flex-1 flex items-center gap-2">
                              <div className="h-5 bg-[#B3985B]/40 rounded flex items-center px-2 transition-all" style={{ width: `${pctRpt(m.count, maxMes)}%`, minWidth: '4px' }}>
                                {pctRpt(m.count, maxMes) > 15 && <span className="text-[10px] text-[#f0d090] font-semibold">{m.count}</span>}
                              </div>
                              {pctRpt(m.count, maxMes) <= 15 && <span className="text-[10px] text-[#B3985B]">{m.count}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-5">
                      <h3 className="text-white font-semibold text-sm mb-4">Por tipo de evento</h3>
                      <div className="space-y-3">
                        {reporteData.porTipoEvento.map(item => (
                          <div key={item.tipo}>
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-gray-300 text-sm">{TIPO_EVENTO_LABELS[item.tipo] ?? item.tipo}</span>
                              <div className="flex items-center gap-2"><span className="text-gray-600 text-xs">{pctRpt(item.count, reporteData.total)}%</span><span className="text-white font-semibold text-sm">{item.count}</span></div>
                            </div>
                            <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden"><div className={`h-full rounded-full ${TIPO_EVENTO_COLORS[item.tipo] ?? 'bg-gray-600/60'}`} style={{ width: `${pctRpt(item.count, reporteData.total)}%` }} /></div>
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
                              <div className="flex items-center gap-2"><span className="text-gray-600 text-xs">{pctRpt(item.count, reporteData.total)}%</span><span className="text-white font-semibold text-sm">{item.count}</span></div>
                            </div>
                            <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden"><div className={`h-full rounded-full ${TIPO_SERVICIO_COLORS[item.tipo] ?? 'bg-gray-600/60'}`} style={{ width: `${pctRpt(item.count, reporteData.total)}%` }} /></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
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

      <CrearTareaModal open={tareaOpen} onClose={() => setTareaOpen(false)} tag={TAG_EVENTOS} defaultArea="PRODUCCION" />
    </div>
  );
}

// ── Vista Mes ────────────────────────────────────────────────────────────────
function VistaMes({ year, month, ahora, eventos, loading, esMesActual, diaSeleccionado, setDiaSeleccionado }: {
  year: number; month: number; ahora: Date; eventos: Evento[]; loading: boolean; esMesActual: boolean;
  diaSeleccionado: number | null; setDiaSeleccionado: (d: number | null) => void;
}) {
  const eventosPorDia: Record<number, Evento[]> = {};
  for (const e of eventos) (eventosPorDia[e.dia] ??= []).push(e);
  const { offset, diasEnMes } = getMesData(year, month);
  const totalCeldas = Math.ceil((offset + diasEnMes) / 7) * 7;
  const eventosPanel = diaSeleccionado !== null ? eventos.filter(e => e.dia === diaSeleccionado) : null;

  return (
    <div className="flex gap-4">
      <div className="flex-1 min-w-0">
        <div className="ms-card overflow-x-auto">
          <div className="min-w-[320px]">
            <div className="grid grid-cols-7 border-b border-[#1a1a1a]">
              {DIAS_SEMANA.map(d => <div key={d} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{d}</div>)}
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
                  <div key={i} onClick={() => esValido && setDiaSeleccionado(dia === diaSeleccionado ? null : dia)}
                    className={`min-h-[104px] p-1.5 border-b border-r border-[#1a1a1a] transition-colors
                      ${!esValido ? "bg-[#0d0d0d]" : "cursor-pointer hover:bg-[#141414]"}
                      ${esSeleccionado ? "bg-[#1a1a1a]" : ""}
                      ${semana === maxSemanas - 1 ? "border-b-0" : ""} ${i % 7 === 6 ? "border-r-0" : ""}`}>
                    {esValido && (
                      <>
                        <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs mb-1 mx-auto font-medium
                          ${esHoy ? "bg-[#B3985B] text-black font-bold" : esSeleccionado ? "bg-[#333] text-white" : "text-gray-500"}`}>{dia}</div>
                        {loading ? <div className="h-2 bg-[#1e1e1e] rounded animate-pulse mx-1" /> : (
                          <div className="space-y-0.5">
                            {evs.slice(0, 3).map(e => {
                              const nc = NIVEL_COLOR[e.nivel ?? 'por_confirmar'];
                              return <div key={e.id} className={`px-1.5 py-0.5 rounded text-[10px] truncate leading-tight bg-[#1a1a1a] border-l-2 ${nc.bar} ${nc.text}`} title={`${e.titulo} — ${e.subtitulo}`}>{e.titulo}</div>;
                            })}
                            {evs.length > 3 && <div className="text-[10px] text-gray-600 px-1">+{evs.length - 3} más</div>}
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
      <div className="w-72 shrink-0 hidden lg:block">
        <div className="ms-table-wrapper sticky top-4">
          <div className="px-4 py-3 border-b border-[#1a1a1a]">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">
              {diaSeleccionado !== null ? new Date(year, month, diaSeleccionado).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }) : "Eventos del mes"}
            </p>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-[#1a1a1a] rounded animate-pulse" />)}</div>
          ) : (() => {
            const lista = (eventosPanel ?? [...eventos]).sort((a, b) => a.dia - b.dia);
            if (lista.length === 0) return <p className="text-gray-600 text-sm text-center py-8">Sin eventos</p>;
            return (
              <div className="divide-y divide-[#1a1a1a] max-h-[70vh] overflow-y-auto">
                {lista.map(e => {
                  const nc = NIVEL_COLOR[e.nivel ?? 'por_confirmar'];
                  return (
                    <Link key={e.id} href={e.url} className="flex items-start gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors">
                      <div className="text-center w-8 shrink-0">
                        <p className="text-base font-bold leading-none text-[#B3985B]">{e.dia}</p>
                        <p className="text-gray-600 text-[10px]">{new Date(year, month, e.dia).toLocaleDateString("es-MX", { weekday: "short" })}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5"><span className={`w-1.5 h-1.5 rounded-full shrink-0 ${nc.dot}`} /><p className="text-xs font-medium truncate text-white">{e.titulo}</p></div>
                        <p className="text-gray-500 text-[11px] truncate">{e.subtitulo}</p>
                        {e.horaInicioEvento && <p className="text-[#B3985B] text-[10px] mt-0.5">{e.horaInicioEvento}</p>}
                        <span className={`text-[10px] ${nc.text}`}>{NIVEL_LABEL[e.nivel ?? 'por_confirmar']}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ── Vista Semana ─────────────────────────────────────────────────────────────
function VistaSemana({ weekStart, year, ahora, eventos, loading }: {
  weekStart: Date; year: number; ahora: Date; eventos: Evento[]; loading: boolean;
}) {
  const dias = Array.from({ length: 7 }).map((_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });
  const eventosDe = (d: Date) => eventos.filter(e => e.mes === d.getMonth() && e.dia === d.getDate() && year === d.getFullYear());
  const esHoy = (d: Date) => d.toDateString() === ahora.toDateString();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
      {dias.map((d, i) => {
        const evs = eventosDe(d);
        return (
          <div key={i} className="ms-card p-2 min-h-[180px]">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] uppercase text-gray-500">{DIAS_SEMANA[i]}</span>
              <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold ${esHoy(d) ? "bg-[#B3985B] text-black" : "text-gray-400"}`}>{d.getDate()}</span>
            </div>
            {loading ? <div className="h-8 bg-[#1a1a1a] rounded animate-pulse" /> : evs.length === 0 ? (
              <p className="text-gray-700 text-[11px] text-center pt-6">—</p>
            ) : (
              <div className="space-y-1">
                {evs.map(e => {
                  const nc = NIVEL_COLOR[e.nivel ?? 'por_confirmar'];
                  return (
                    <Link key={e.id} href={e.url} className={`block px-2 py-1.5 rounded-md bg-[#141414] border-l-2 ${nc.bar} hover:bg-[#1c1c1c] transition-colors`}>
                      <p className="text-[11px] font-medium text-white truncate">{e.titulo}</p>
                      <p className="text-[10px] text-gray-500 truncate">{e.subtitulo}</p>
                      {e.horaInicioEvento && <p className="text-[9px] text-[#B3985B] mt-0.5">{e.horaInicioEvento}</p>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Vista Año ────────────────────────────────────────────────────────────────
function VistaAnio({ year, ahora, eventos, onMes }: {
  year: number; ahora: Date; eventos: Evento[]; onMes: (m: number) => void;
}) {
  const porDia: Record<string, Evento[]> = {};
  for (const e of eventos) (porDia[`${e.mes}-${e.dia}`] ??= []).push(e);
  const DIAS_INI = ["L","M","M","J","V","S","D"];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {MESES_LARGO.map((nombre, m) => {
        const { offset, diasEnMes } = getMesData(year, m);
        const celdas = Math.ceil((offset + diasEnMes) / 7) * 7;
        const count = eventos.filter(e => e.mes === m).length;
        return (
          <button key={m} onClick={() => onMes(m)} className="ms-card p-3 text-left hover:border-[#B3985B]/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-white">{nombre}</p>
              {count > 0 && <span className="text-[10px] text-[#B3985B]">{count}</span>}
            </div>
            <div className="grid grid-cols-7 gap-0.5 mb-1">{DIAS_INI.map((d, i) => <div key={i} className="text-center text-[9px] text-gray-600">{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: celdas }).map((_, i) => {
                const dia = i - offset + 1;
                const valido = dia >= 1 && dia <= diasEnMes;
                if (!valido) return <div key={i} />;
                const evs = porDia[`${m}-${dia}`] ?? [];
                const esHoy = year === ahora.getFullYear() && m === ahora.getMonth() && dia === ahora.getDate();
                return (
                  <div key={i} className={`relative aspect-square rounded-[4px] flex items-center justify-center text-[10px] ${esHoy ? "bg-[#B3985B] text-black font-bold" : "text-gray-400"}`} title={evs.map(e => e.titulo).join(", ")}>
                    <span>{dia}</span>
                    {evs.length > 0 && !esHoy && (
                      <span className="absolute bottom-0.5 flex gap-0.5">
                        {evs.slice(0, 3).map(e => <span key={e.id} className={`w-1 h-1 rounded-full ${NIVEL_COLOR[e.nivel ?? 'por_confirmar'].dot}`} />)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}
