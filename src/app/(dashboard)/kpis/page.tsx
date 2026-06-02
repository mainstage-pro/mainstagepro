'use client';

import { useEffect, useState } from 'react';
import { BarChart2 } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type PeriodoKey = '7d' | '15d' | 'mes' | 'trimestre' | 'semestre' | 'anio';

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
  ventas: { ticketPromedio: number | null; totalVentas: number; tasaConversion: number | null; serviciosVendidos: number };
  marketing: { leadsGenerados: number; leadsOrigenMeta: number; conversionLeadVenta: number | null; cpl: null; cac: null };
  produccion: { totalEventos: number; eventosSinIncidencias: null; desviacionCostoPromedio: null; proyectosCerradosATiempo: null };
}

interface SOKpi { id: string; nombre: string; meta: string; formula: string; fuente: string; orden: number; activo: boolean; esTransversal: boolean; areaId: string | null; }
interface SOArea { id: string; nombre: string; color: string; icono: string | null; objetivo: string | null; kpis: SOKpi[]; }
interface SOData { areas: SOArea[]; kpisTransversales: SOKpi[]; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function pad(n: number) { return n.toString().padStart(2, '0'); }
function fmtDate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function getPeriodos(): Periodo[] {
  const hoy = new Date();
  const hoyStr = fmtDate(hoy);
  const yr = hoy.getFullYear();
  const mo = hoy.getMonth(); // 0-indexed
  const dy = hoy.getDay(); // 0=Sunday

  // 7 días: lunes de esta semana → hoy
  const lunes = new Date(hoy);
  const diffToMonday = dy === 0 ? -6 : 1 - dy;
  lunes.setDate(hoy.getDate() + diffToMonday);

  // 15 días
  const hace15 = new Date(hoy);
  hace15.setDate(hoy.getDate() - 14);

  // Este mes
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
    { key: '7d',        label: '7 días',    desde: fmtDate(lunes),     hasta: hoyStr },
    { key: '15d',       label: '15 días',   desde: fmtDate(hace15),    hasta: hoyStr },
    { key: 'mes',       label: 'Este mes',  desde: fmtDate(primerMes), hasta: fmtDate(ultimoMes) },
    { key: 'trimestre', label: 'Trimestre', desde: fmtDate(primerQ),   hasta: hoyStr },
    { key: 'semestre',  label: 'Semestre',  desde: fmtDate(primerS),   hasta: hoyStr },
    { key: 'anio',      label: 'Este año',  desde: fmtDate(primerAnio), hasta: fmtDate(ultimoAnio) },
  ];
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
}

function semaforo(valor: number | null, meta: string): 'verde' | 'rojo' | 'sin-dato' {
  if (valor === null) return 'sin-dato';
  const metaNum = parseFloat(meta.replace(/[^0-9.]/g, ''));
  if (isNaN(metaNum)) return 'sin-dato';
  return valor >= metaNum ? 'verde' : 'rojo';
}

const SEM = {
  verde:    <span className="text-emerald-400 text-sm">🟢</span>,
  rojo:     <span className="text-red-400 text-sm">🔴</span>,
  'sin-dato': <span className="text-gray-600 text-sm">⚪</span>,
};

function Separador() {
  return <div className="border-t border-[#1e1e1e] my-1" />;
}

function Row({ label, valor, extra, semColor }: { label: string; valor: string; extra?: string; semColor?: 'verde' | 'rojo' | 'sin-dato' }) {
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

function getKpiValue(kpi: SOKpi, kpisData: KpisData | null): number | null {
  if (!kpisData) return null;
  const slug = kpi.nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  // Ventas
  if (slug.includes('ticket-promedio')) return kpisData.ventas.ticketPromedio;
  if (slug.includes('tasa-de-conversion') || slug.includes('conversion-a-venta')) return kpisData.ventas.tasaConversion;
  // Marketing
  if (slug.includes('leads-calificados') || slug.includes('leads-generados')) return kpisData.marketing.leadsGenerados;
  if (slug.includes('conversion-leads')) return kpisData.marketing.conversionLeadVenta;
  if (slug.includes('cpl') || slug.includes('costo-por-lead')) return kpisData.marketing.cpl;
  if (slug.includes('cac') || slug.includes('costo-de-adquisicion')) return kpisData.marketing.cac;
  return null;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function KpisDashboardPage() {
  const [me, setMe] = useState<{ id: string; name: string; role: string } | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [periodos] = useState<Periodo[]>(getPeriodos);
  const [periodoKey, setPeriodoKey] = useState<PeriodoKey>('mes');
  const [loading, setLoading] = useState(false);
  const [er, setEr] = useState<EstadoResultados | null>(null);
  const [fc, setFc] = useState<FlujoCaja | null>(null);
  const [kpisData, setKpisData] = useState<KpisData | null>(null);
  const [soData, setSoData] = useState<SOData | null>(null);
  const [kpiExpandedAreas, setKpiExpandedAreas] = useState<Set<string>>(new Set());

  // Auth check
  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => {
      if (!d || d.role !== 'ADMIN') { setAccessDenied(true); return; }
      setMe(d);
    });
  }, []);

  // Fetch SO catalog once
  useEffect(() => {
    if (!me) return;
    fetch('/api/plan-trabajo/sistema-operativo')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSoData(d); })
      .catch(() => {});
  }, [me]);

  // Fetch datos on period change
  useEffect(() => {
    if (!me) return;
    const p = periodos.find(x => x.key === periodoKey);
    if (!p) return;
    setLoading(true);
    setEr(null); setFc(null); setKpisData(null);
    fetch(`/api/kpis/datos?desde=${p.desde}&hasta=${p.hasta}`)
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
  }, [me, periodoKey, periodos]);

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm">Acceso restringido</p>
        </div>
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

  const periodoActual = periodos.find(x => x.key === periodoKey)!;

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
        <div className="flex gap-1 flex-wrap">
          {periodos.map(p => (
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
          <span className="ml-auto text-[10px] text-gray-600 self-center">
            {periodoActual.desde} → {periodoActual.hasta}
          </span>
        </div>
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#B3985B] font-semibold">Estado de Resultados</p>
              <p className="text-xs text-gray-600 mt-0.5">Devengado — por fecha del evento</p>
            </div>
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
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#B3985B] font-semibold mb-4">KPIs por Área</p>

          {soData?.areas.map(area => {
            const sortedKpis = [...(area.kpis ?? [])].sort((a, b) => a.orden - b.orden).filter(k => k.activo);
            const isExpanded = kpiExpandedAreas.has(area.id);
            const visibleKpis = isExpanded ? sortedKpis : sortedKpis.slice(0, 3);
            const hiddenCount = sortedKpis.length - 3;

            // Global semaphore for area
            const kpisConDato = sortedKpis.map(k => ({ kpi: k, val: getKpiValue(k, kpisData) })).filter(x => x.val !== null);
            const cumplidos = kpisConDato.filter(x => semaforo(x.val, x.kpi.meta) === 'verde').length;
            const areaSemColor: 'verde' | 'rojo' | 'sin-dato' = kpisConDato.length === 0 ? 'sin-dato' : cumplidos >= kpisConDato.length / 2 ? 'verde' : 'rojo';

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
                        <th className="text-left px-3 py-2 text-gray-600 font-medium">Indicador</th>
                        <th className="text-left px-3 py-2 text-gray-600 font-medium">Meta</th>
                        <th className="text-right px-3 py-2 text-gray-600 font-medium">Valor actual</th>
                        <th className="text-center px-3 py-2 text-gray-600 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#111]">
                      {visibleKpis.map(kpi => {
                        const val = getKpiValue(kpi, kpisData);
                        const sem = semaforo(val, kpi.meta);
                        const displayVal = val === null
                          ? <span className="text-gray-600">Sin dato</span>
                          : <span className="text-white tabular-nums">
                              {kpi.meta.includes('%') ? `${val.toFixed(1)}%` :
                               kpi.meta.includes('$') ? fmt(val) :
                               val.toLocaleString('es-MX')}
                            </span>;
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
                      onClick={() => setKpiExpandedAreas(prev => {
                        const next = new Set(prev);
                        if (next.has(area.id)) next.delete(area.id); else next.add(area.id);
                        return next;
                      })}
                      className="w-full flex items-center gap-1.5 justify-center py-2 text-[10px] text-gray-600 hover:text-gray-400 transition-colors bg-[#111] border-t border-[#1e1e1e]"
                    >
                      <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                      {isExpanded ? 'Ver menos' : `Ver todos (+${hiddenCount} más)`}
                    </button>
                  )}
                </div>
              </div>
            );
          }) ?? <p className="text-gray-600 text-sm">Cargando KPIs...</p>}
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
              <div className="mt-3 pt-3 border-t border-[#111] space-y-1">
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
