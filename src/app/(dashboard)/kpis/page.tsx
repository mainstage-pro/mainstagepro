'use client';

import { useEffect, useState } from 'react';
import { BarChart2 } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type PeriodoKey = '7d' | '15d' | 'mes' | 'trimestre' | 'semestre' | 'anio' | 'custom';

interface Periodo {
  key: PeriodoKey;
  label: string;
  desde: string;
  hasta: string;
}

interface EstadoResultados {
  ingresosDevengados: number;
  eventosEjecutados: number;
  costosDirectos: number;
  costosFijos: number;
  costosTotales: number;
  utilidadBruta: number;
  margenBruto: number;
  utilidadNeta: number;
  margenNeto: number;
  cumpleMetaIngresos: boolean;
  cumpleMetaMargen: boolean;
}

interface FlujoCaja {
  cobrosReales: number;
  pagosReales: number;
  flujoNeto: number;
  cxcTotal: number;
  cxcVencido: number;
  cxpTotal: number;
}

interface KpisData {
  ventas: {
    ticketPromedio: number | null;
    totalVentas: number;
    tasaConversion: number | null;
    serviciosVendidos: number;
  };
  marketing: {
    leadsGenerados: number;
    leadsOrigenMeta: number;
    conversionLeadVenta: number | null;
    cpl: null;
    cac: null;
  };
  produccion: {
    totalEventos: number;
    eventosSinIncidencias: null;
    desviacionCostoPromedio: null;
    proyectosCerradosATiempo: null;
  };
}

interface SOKpi {
  id: string;
  nombre: string;
  meta: string;
  formula: string;
  fuente: string;
  orden: number;
  activo: boolean;
  esTransversal: boolean;
  areaId: string | null;
}

interface SOArea {
  id: string;
  nombre: string;
  color: string;
  icono: string | null;
  objetivo: string | null;
  kpis: SOKpi[];
}

interface SOData {
  areas: SOArea[];
  kpisTransversales: SOKpi[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pad(n: number) { return n.toString().padStart(2, '0'); }
function fmtDate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function getPresetPeriodos(): Periodo[] {
  const hoy = new Date();
  const hoyStr = fmtDate(hoy);
  const yr = hoy.getFullYear();
  const mo = hoy.getMonth();
  const dy = hoy.getDay();

  // 7 días: lunes de esta semana → hoy
  const lunes = new Date(hoy);
  const diffToMonday = dy === 0 ? -6 : 1 - dy;
  lunes.setDate(hoy.getDate() + diffToMonday);

  // 15 días
  const hace15 = new Date(hoy);
  hace15.setDate(hoy.getDate() - 14);

  // Este mes — día 1 al último día del mes (no hoy)
  const primerMes = new Date(yr, mo, 1);
  const ultimoMes = new Date(yr, mo + 1, 0);

  // Trimestre actual → hasta hoy
  const q = Math.floor(mo / 3);
  const primerQ = new Date(yr, q * 3, 1);

  // Semestre actual → hasta hoy
  const s = mo < 6 ? 0 : 1;
  const primerS = new Date(yr, s * 6, 1);

  // Este año
  const primerAnio = new Date(yr, 0, 1);
  const ultimoAnio = new Date(yr, 11, 31);

  return [
    { key: '7d',        label: '7 días',    desde: fmtDate(lunes),      hasta: hoyStr },
    { key: '15d',       label: '15 días',   desde: fmtDate(hace15),     hasta: hoyStr },
    { key: 'mes',       label: 'Este mes',  desde: fmtDate(primerMes),  hasta: fmtDate(ultimoMes) },
    { key: 'trimestre', label: 'Trimestre', desde: fmtDate(primerQ),    hasta: hoyStr },
    { key: 'semestre',  label: 'Semestre',  desde: fmtDate(primerS),    hasta: hoyStr },
    { key: 'anio',      label: 'Este año',  desde: fmtDate(primerAnio), hasta: fmtDate(ultimoAnio) },
  ];
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(n);
}

function semaforo(
  valor: number | null,
  meta: string,
  invertido = false,
): 'verde' | 'rojo' | 'sin-dato' {
  if (valor === null) return 'sin-dato';
  const metaNum = parseFloat(meta.replace(/[^0-9.]/g, ''));
  if (isNaN(metaNum)) return 'sin-dato';
  const cumple = invertido ? valor <= metaNum : valor >= metaNum;
  return cumple ? 'verde' : 'rojo';
}

const SEM: Record<'verde' | 'rojo' | 'sin-dato', React.ReactNode> = {
  verde:    <span className="text-emerald-400 text-sm">🟢</span>,
  rojo:     <span className="text-red-400 text-sm">🔴</span>,
  'sin-dato': <span className="text-gray-600 text-sm">⚪</span>,
};

function Separador() {
  return <div className="border-t border-[#1e1e1e] my-1" />;
}

function Row({
  label, valor, extra, semColor,
}: {
  label: string;
  valor: string;
  extra?: string;
  semColor?: 'verde' | 'rojo' | 'sin-dato';
}) {
  return (
    <div className="flex items-baseline justify-between py-2 border-b border-[#111] last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <div className="flex items-center gap-3">
        {extra && <span className="text-xs text-gray-600">{extra}</span>}
        <span className="text-sm font-medium text-white tabular-nums">{valor}</span>
        {semColor && SEM[semColor]}
      </div>
    </div>
  );
}

// ── KPI value mapping ─────────────────────────────────────────────────────────

/**
 * Maps a PTKPI (by nombre slug) to a calculated numeric value.
 * Returns null = "Sin dato".
 */
function getKpiValue(
  kpi: SOKpi,
  kpisData: KpisData | null,
  er: EstadoResultados | null,
  fc: FlujoCaja | null,
): number | null {
  const raw = kpi.nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // ── Ventas ────────────────────────────────────────────────────────────────
  if (raw.includes('ticket-promedio')) return kpisData?.ventas.ticketPromedio ?? null;
  if (raw.includes('tasa-de-conversion') || raw.includes('conversion-a-venta'))
    return kpisData?.ventas.tasaConversion ?? null;
  if (raw.includes('servicios-vendidos') || raw.includes('servicios-por-mes'))
    return kpisData?.ventas.serviciosVendidos ?? null;
  if (raw.includes('total-ventas') || raw.includes('ventas-totales'))
    return kpisData?.ventas.totalVentas ?? null;

  // ── Marketing ─────────────────────────────────────────────────────────────
  if (raw.includes('leads-calificados') || raw.includes('leads-generados'))
    return kpisData?.marketing.leadsGenerados ?? null;
  if (raw.includes('conversion-leads') || raw.includes('leads-a-ventas'))
    return kpisData?.marketing.conversionLeadVenta ?? null;
  if (raw.includes('cpl') || raw.includes('costo-por-lead'))
    return kpisData?.marketing.cpl ?? null;
  if (raw.includes('cac') || raw.includes('costo-de-adquisicion') || raw.includes('costo-adquisicion'))
    return kpisData?.marketing.cac ?? null;
  if (raw.includes('roi'))
    return null; // no calculable automáticamente

  // ── Producción ────────────────────────────────────────────────────────────
  if (raw.includes('total-eventos') || raw.includes('eventos-ejecutados'))
    return kpisData?.produccion.totalEventos ?? null;
  if (raw.includes('eventos-sin-incidencias') || raw.includes('exito-tecnico'))
    return kpisData?.produccion.eventosSinIncidencias ?? null;
  if (raw.includes('desviacion-costo'))
    return kpisData?.produccion.desviacionCostoPromedio ?? null;
  if (raw.includes('proyectos-cerrados') || raw.includes('cierre'))
    return kpisData?.produccion.proyectosCerradosATiempo ?? null;

  // ── Administración ────────────────────────────────────────────────────────
  if (raw.includes('utilidad-neta') || raw.includes('margen-neto'))
    return er?.margenNeto ?? null;
  if (raw.includes('utilidad-bruta') || raw.includes('margen-bruto'))
    return er?.margenBruto ?? null;
  if (raw.includes('flujo-de-efectivo') || raw.includes('flujo-caja') || raw.includes('flujo-neto'))
    return fc ? fc.flujoNeto : null;
  if (raw.includes('ingresos-totales') || raw.includes('ventas-del-periodo'))
    return er?.ingresosDevengados ?? null;

  return null;
}

import React from 'react';

// ── Main Component ────────────────────────────────────────────────────────────

export default function KpisDashboardPage() {
  const [me, setMe] = useState<{ id: string; name: string; role: string } | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Periodos preset (computed once)
  const [presets] = useState<Periodo[]>(getPresetPeriodos);
  const [periodoKey, setPeriodoKey] = useState<PeriodoKey>('mes');

  // Custom dates
  const [customDraft, setCustomDraft] = useState({ desde: '', hasta: '' });
  const [customApplied, setCustomApplied] = useState({ desde: '', hasta: '' });

  // Data
  const [loading, setLoading] = useState(false);
  const [er, setEr] = useState<EstadoResultados | null>(null);
  const [fc, setFc] = useState<FlujoCaja | null>(null);
  const [kpisData, setKpisData] = useState<KpisData | null>(null);

  // SO catalog
  const [soData, setSoData] = useState<SOData | null>(null);
  const [soLoading, setSoLoading] = useState(false);
  const [soError, setSoError] = useState(false);

  const [kpiExpandedAreas, setKpiExpandedAreas] = useState<Set<string>>(new Set());

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d || d.role !== 'ADMIN') { setAccessDenied(true); return; }
        setMe(d);
      })
      .catch(() => setAccessDenied(true));
  }, []);

  // ── SO catalog ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!me) return;
    setSoLoading(true);
    setSoError(false);
    fetch('/api/plan-trabajo/sistema-operativo')
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(d => {
        if (d?.areas) setSoData(d);
        else setSoError(true);
      })
      .catch(() => setSoError(true))
      .finally(() => setSoLoading(false));
  }, [me]);

  // ── Data fetch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!me) return;

    let desde: string;
    let hasta: string;

    if (periodoKey === 'custom') {
      if (!customApplied.desde || !customApplied.hasta) return;
      desde = customApplied.desde;
      hasta = customApplied.hasta;
    } else {
      const p = presets.find(x => x.key === periodoKey);
      if (!p) return;
      desde = p.desde;
      hasta = p.hasta;
    }

    setLoading(true);
    setEr(null); setFc(null); setKpisData(null);

    fetch(`/api/kpis/datos?desde=${desde}&hasta=${hasta}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setEr(d.estadoResultados ?? null);
          setFc(d.flujoCaja ?? null);
          setKpisData(d.kpis ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [me, periodoKey, customApplied, presets]);

  // ── Apply custom dates ──────────────────────────────────────────────────────
  function applyCustom() {
    if (!customDraft.desde || !customDraft.hasta) return;
    setCustomApplied(customDraft);
    setPeriodoKey('custom');
  }

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-gray-500 text-sm">Acceso restringido</p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Label for current period
  const periodoLabel = periodoKey === 'custom'
    ? `${customApplied.desde} → ${customApplied.hasta}`
    : (() => {
        const p = presets.find(x => x.key === periodoKey);
        return p ? `${p.desde} → ${p.hasta}` : '';
      })();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <BarChart2 className="w-5 h-5 text-[#B3985B]" />
          <h1 className="text-2xl font-bold tracking-tight">KPIs y Resultados</h1>
        </div>
        <p className="text-gray-600 text-xs ml-8">Solo visible para administración</p>
      </div>

      {/* Period selector */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-[#111] px-6 py-3">
        <div className="flex gap-1 flex-wrap items-center">
          {presets.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriodoKey(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                periodoKey === p.key
                  ? 'bg-[#B3985B] text-black border-[#B3985B]'
                  : 'bg-transparent text-gray-500 border-[#1e1e1e] hover:border-[#B3985B]/30 hover:text-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}

          {/* Custom button */}
          <button
            onClick={() => {
              if (periodoKey !== 'custom') {
                // Pre-fill with current period's dates
                const cur = presets.find(x => x.key === periodoKey);
                if (cur) setCustomDraft({ desde: cur.desde, hasta: cur.hasta });
              }
              setPeriodoKey('custom');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              periodoKey === 'custom'
                ? 'bg-[#B3985B] text-black border-[#B3985B]'
                : 'bg-transparent text-gray-500 border-[#1e1e1e] hover:border-[#B3985B]/30 hover:text-gray-300'
            }`}
          >
            Personalizado
          </button>

          <span className="ml-auto text-[10px] text-gray-600 self-center">
            {periodoLabel}
          </span>
        </div>

        {/* Custom date pickers */}
        {periodoKey === 'custom' && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-gray-500">Desde</label>
              <input
                type="date"
                value={customDraft.desde}
                onChange={e => setCustomDraft(p => ({ ...p, desde: e.target.value }))}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-gray-500">Hasta</label>
              <input
                type="date"
                value={customDraft.hasta}
                onChange={e => setCustomDraft(p => ({ ...p, hasta: e.target.value }))}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
              />
            </div>
            <button
              onClick={applyCustom}
              disabled={!customDraft.desde || !customDraft.hasta}
              className="px-3 py-1 rounded-lg bg-[#B3985B] text-black text-xs font-semibold disabled:opacity-40 transition-opacity"
            >
              Aplicar
            </button>
          </div>
        )}
      </div>

      <div className="px-6 py-6 space-y-6 max-w-4xl">
        {loading && (
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <div className="w-3 h-3 border border-[#B3985B] border-t-transparent rounded-full animate-spin" />
            Calculando...
          </div>
        )}

        {/* BLOQUE 1: Estado de Resultados */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#B3985B] font-semibold">Estado de Resultados</p>
            <p className="text-xs text-gray-600 mt-0.5">Devengado — por fecha del evento</p>
          </div>

          {er ? (
            <div>
              <Row
                label={`Ingresos del período (${er.eventosEjecutados} evento${er.eventosEjecutados !== 1 ? 's' : ''})`}
                valor={fmt(er.ingresosDevengados)}
                extra="Meta: $500,000"
                semColor={er.cumpleMetaIngresos ? 'verde' : 'rojo'}
              />
              <div className="mt-2 mb-2" />
              <Row label="Costos directos (eventos)" valor={fmt(er.costosDirectos)} />
              <Row label="Costos fijos del período" valor={fmt(er.costosFijos)} />
              <Separador />
              <Row label="Costos totales" valor={fmt(er.costosTotales)} />
              <Separador />
              <Row
                label="Utilidad bruta"
                valor={fmt(er.utilidadBruta)}
                extra={`Margen: ${er.margenBruto.toFixed(1)}%`}
                semColor={er.margenBruto >= 65 ? 'verde' : 'rojo'}
              />
              <Row
                label="Utilidad neta"
                valor={fmt(er.utilidadNeta)}
                extra={`Margen: ${er.margenNeto.toFixed(1)}%`}
                semColor={er.cumpleMetaMargen ? 'verde' : 'rojo'}
              />
              <p className="text-[10px] text-gray-600 mt-3 border-t border-[#111] pt-2">
                Los ingresos se calculan por fecha del evento, no por fecha de cobro.
              </p>
            </div>
          ) : !loading ? (
            <p className="text-gray-600 text-sm">Sin datos para el período seleccionado.</p>
          ) : null}
        </div>

        {/* BLOQUE 2: KPIs por área */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#B3985B] font-semibold mb-4">
            KPIs por Área
          </p>

          {soLoading ? (
            <div className="flex items-center gap-2 text-gray-600 text-sm py-4">
              <div className="w-3 h-3 border border-gray-600 border-t-transparent rounded-full animate-spin" />
              Cargando KPIs...
            </div>
          ) : soError ? (
            <p className="text-gray-600 text-sm py-4">
              No se pudo cargar el catálogo de KPIs.{' '}
              <button
                onClick={() => {
                  setSoError(false);
                  setSoLoading(true);
                  fetch('/api/plan-trabajo/sistema-operativo')
                    .then(r => r.ok ? r.json() : null)
                    .then(d => { if (d?.areas) setSoData(d); else setSoError(true); })
                    .catch(() => setSoError(true))
                    .finally(() => setSoLoading(false));
                }}
                className="text-[#B3985B] hover:underline"
              >
                Reintentar
              </button>
            </p>
          ) : soData?.areas && soData.areas.length > 0 ? (
            soData.areas.map(area => {
              const sortedKpis = [...(area.kpis ?? [])]
                .sort((a, b) => a.orden - b.orden)
                .filter(k => k.activo);
              const isExpanded = kpiExpandedAreas.has(area.id);
              const visibleKpis = isExpanded ? sortedKpis : sortedKpis.slice(0, 3);
              const hiddenCount = Math.max(0, sortedKpis.length - 3);

              // Area-level semaphore
              const kpisConDato = sortedKpis
                .map(k => ({ kpi: k, val: getKpiValue(k, kpisData, er, fc) }))
                .filter(x => x.val !== null);
              const cumplidos = kpisConDato.filter(
                x => semaforo(x.val, x.kpi.meta) === 'verde',
              ).length;
              const areaSemColor: 'verde' | 'rojo' | 'sin-dato' =
                kpisConDato.length === 0
                  ? 'sin-dato'
                  : cumplidos >= kpisConDato.length / 2
                  ? 'verde'
                  : 'rojo';

              return (
                <div key={area.id} className="mb-5 last:mb-0">
                  <div className="flex items-center gap-2 mb-2">
                    {area.icono && <span className="text-sm">{area.icono}</span>}
                    <span className="text-sm font-semibold text-white">{area.nombre}</span>
                    {SEM[areaSemColor]}
                  </div>
                  <div className="rounded-lg overflow-hidden border border-[#1e1e1e]">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-[#111]">
                          <th className="text-left px-3 py-2 text-gray-600 font-medium w-[40%]">Indicador</th>
                          <th className="text-left px-3 py-2 text-gray-600 font-medium w-[25%]">Meta</th>
                          <th className="text-right px-3 py-2 text-gray-600 font-medium w-[25%]">Valor actual</th>
                          <th className="text-center px-3 py-2 text-gray-600 font-medium w-[10%]">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#111]">
                        {visibleKpis.map(kpi => {
                          const val = getKpiValue(kpi, kpisData, er, fc);
                          const sem = semaforo(val, kpi.meta);
                          const displayVal =
                            val === null ? (
                              <span className="text-gray-600">— Sin dato —</span>
                            ) : (
                              <span className="text-white tabular-nums">
                                {kpi.meta.includes('%')
                                  ? `${val.toFixed(1)}%`
                                  : kpi.meta.includes('$')
                                  ? fmt(val)
                                  : val.toLocaleString('es-MX')}
                              </span>
                            );
                          return (
                            <tr key={kpi.id} className="hover:bg-[#111]/50">
                              <td className="px-3 py-2.5 text-gray-300">{kpi.nombre}</td>
                              <td className="px-3 py-2.5 text-gray-500">{kpi.meta}</td>
                              <td className="px-3 py-2.5 text-right">{displayVal}</td>
                              <td className="px-3 py-2.5 text-center">{SEM[sem]}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {hiddenCount > 0 && (
                      <button
                        onClick={() =>
                          setKpiExpandedAreas(prev => {
                            const next = new Set(prev);
                            if (next.has(area.id)) next.delete(area.id);
                            else next.add(area.id);
                            return next;
                          })
                        }
                        className="w-full flex items-center gap-1.5 justify-center py-2 text-[10px] text-gray-600 hover:text-gray-400 transition-colors bg-[#111] border-t border-[#1e1e1e]"
                      >
                        <svg
                          className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                        {isExpanded ? 'Ver menos' : `Ver todos los indicadores (+${hiddenCount} más)`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-gray-600 text-sm py-4">No hay áreas configuradas.</p>
          )}
        </div>

        {/* BLOQUE 3: Flujo de Caja */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-semibold">Flujo de Caja</p>
            <p className="text-xs text-gray-600 mt-0.5">Por fecha de movimiento — dinero real</p>
          </div>

          {fc ? (
            <div>
              <Row label="Cobros reales del período" valor={fmt(fc.cobrosReales)} />
              <Row label="Pagos reales del período" valor={fmt(fc.pagosReales)} />
              <Separador />
              <Row
                label="Flujo neto"
                valor={fmt(fc.flujoNeto)}
                semColor={fc.flujoNeto >= 0 ? 'verde' : 'rojo'}
              />
              <div className="mt-3 pt-3 border-t border-[#111] space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">CxC vigentes</span>
                  <span className="text-white tabular-nums">{fmt(fc.cxcTotal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">CxC vencidas</span>
                  <span className={`tabular-nums ${fc.cxcVencido > 0 ? 'text-red-400' : 'text-white'}`}>
                    {fmt(fc.cxcVencido)}
                    {fc.cxcVencido > 0 && ' 🔴'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">CxP vigentes</span>
                  <span className="text-white tabular-nums">{fmt(fc.cxpTotal)}</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-600 mt-3 border-t border-[#111] pt-2">
                El flujo de caja refleja movimientos reales de dinero. Puede diferir del Estado de Resultados.
              </p>
            </div>
          ) : !loading ? (
            <p className="text-gray-600 text-sm">Sin datos para el período seleccionado.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
