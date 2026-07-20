'use client';

import { useEffect, useState } from 'react';
import { BarChart2 } from 'lucide-react';
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar,
} from 'recharts';

// ── Types ────────────────────────────────────────────────────────────────────

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
    cpl: number | null;
    cac: number | null;
  };
  produccion: {
    totalEventos: number;
    eventosSinIncidencias: number | null;
    desviacionCostoPromedio: number | null;
    proyectosCerradosATiempo: number | null;
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
  slug: string | null;
  // NEW fields
  descripcion?: string | null;
  proposito?: string | null;
  tipoCalculo?: string; // 'automatico' | 'manual' | 'mixto'
  notaCalculo?: string | null;
  valorManual?: number | null;
  fechaValorManual?: string | null;
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

// ── Date helpers ─────────────────────────────────────────────────────────────

const year = new Date().getFullYear();

function todayStr() { return new Date().toISOString().split('T')[0]; }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0];
}
function firstOfMonth() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`;
}
function lastOfMonth() {
  const n = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
  return n.toISOString().split('T')[0];
}
function firstOfPrevMonth() {
  const n = new Date(); n.setDate(1); n.setMonth(n.getMonth() - 1);
  return n.toISOString().split('T')[0];
}
function lastOfPrevMonth() {
  const n = new Date(new Date().getFullYear(), new Date().getMonth(), 0);
  return n.toISOString().split('T')[0];
}
function fmtRange(d: string, h: string) {
  const fmt2 = (s: string) =>
    new Date(s + 'T12:00:00Z').toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
    });
  return `${fmt2(d)} → ${fmt2(h)}`;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

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
  verde:      <span className="text-emerald-400 text-sm">🟢</span>,
  rojo:       <span className="text-red-400 text-sm">🔴</span>,
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

// ── TipoBadge ────────────────────────────────────────────────────────────────

function TipoBadge({ tipo }: { tipo: string | undefined }) {
  if (tipo === 'automatico')
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded font-semibold">
        ● Auto
      </span>
    );
  if (tipo === 'mixto')
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-amber-900/30 text-amber-400 px-1.5 py-0.5 rounded font-semibold">
        ◐ Mixto
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded font-semibold">
      ✎ Manual
    </span>
  );
}

// ── Progress bar ─────────────────────────────────────────────────────────────

function progressPct(val: number, metaStr: string): number {
  const metaNum = parseFloat(metaStr.replace(/[^0-9.]/g, ''));
  if (!metaNum || isNaN(metaNum) || metaNum === 0) return 0;
  return Math.min(100, Math.max(0, (val / metaNum) * 100));
}

// ── Chart helpers ─────────────────────────────────────────────────────────────

const GOLD = '#c9a84c';
const CHART_RED = '#ef4444';
const CHART_GRAY = '#374151';

const chartTooltipStyle = {
  contentStyle: { background: '#111', border: '1px solid #222', color: '#fff', fontSize: 11, borderRadius: 8 },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
};

function fmtChartVal(val: number, isCurrency?: boolean): string {
  if (isCurrency) return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);
  return val.toLocaleString('es-MX');
}

// ── KPI value mapping ─────────────────────────────────────────────────────────

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
    return null;

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

// ── Main Component ────────────────────────────────────────────────────────────

export default function KpisDashboardPage() {
  const [me, setMe] = useState<{ id: string; name: string; role: string } | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Period state — new flat model
  const [periodoLabel, setPeriodoLabel] = useState<string>('Este mes');
  const [desde, setDesde] = useState<string>(firstOfMonth());
  const [hasta, setHasta] = useState<string>(lastOfMonth());

  // Data
  const [loading, setLoading] = useState(false);
  const [er, setEr] = useState<EstadoResultados | null>(null);
  const [fc, setFc] = useState<FlujoCaja | null>(null);
  const [kpisData, setKpisData] = useState<KpisData | null>(null);

  // SO catalog
  const [soData, setSoData] = useState<SOData | null>(null);
  const [soLoading, setSoLoading] = useState(false);
  const [soError, setSoError] = useState(false);

  // Area expand (show more/fewer KPIs per area)
  const [kpiExpandedAreas, setKpiExpandedAreas] = useState<Set<string>>(new Set());

  // Row expand (detail panel per KPI)
  const [expandedKpiId, setExpandedKpiId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<{ kpiId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingKpi, setSavingKpi] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState<Record<string, string>>({});

  // PDF
  const [generandoPDF, setGenerandoPDF] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<'resumen' | 'administracion' | 'marketing' | 'ventas' | 'produccion'>('resumen');

  const isAdmin = me?.role === 'ADMIN';

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

  // ── Data fetch — triggered whenever desde/hasta change ──────────────────
  function cargarDatos(d: string, h: string) {
    if (!me || !d || !h) return;
    setLoading(true);
    setEr(null); setFc(null); setKpisData(null);
    fetch(`/api/kpis/datos?desde=${d}&hasta=${h}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setEr(data.estadoResultados ?? null);
          setFc(data.flujoCaja ?? null);
          setKpisData(data.kpis ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  // Initial load when me is set
  useEffect(() => {
    if (!me) return;
    cargarDatos(desde, hasta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  // ── Helpers: save KPI field & valor manual ──────────────────────────────
  async function saveKpiField(kpiId: string, field: string, value: string | number) {
    setSavingKpi(kpiId);
    await fetch(`/api/plan-trabajo/kpis/${kpiId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    setSavingKpi(null);
    // Re-fetch SO data to reflect changes
    fetch('/api/plan-trabajo/sistema-operativo')
      .then(r => r.json())
      .then(d => { if (d?.areas) setSoData(d); });
  }

  async function saveValorManual(kpiId: string) {
    const val = parseFloat(manualInput[kpiId] ?? '');
    if (isNaN(val)) return;
    setSavingKpi(kpiId);
    await fetch(`/api/plan-trabajo/kpis/${kpiId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valorManual: val, fechaValorManual: new Date().toISOString() }),
    });
    setSavingKpi(null);
    fetch('/api/plan-trabajo/sistema-operativo')
      .then(r => r.json())
      .then(d => { if (d?.areas) setSoData(d); });
  }

  // ── PDF generator ───────────────────────────────────────────────────────
  async function generarPDF() {
    setGenerandoPDF(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { KpiReportePDF } = await import('@/components/KpiReportePDF');
      const R = await import('react');

      const areas = soData?.areas?.map((area: SOArea) => ({
        nombre: area.nombre,
        kpis: area.kpis.map((kpi: SOKpi) => ({
          nombre: kpi.nombre,
          meta: kpi.meta,
          valor: getKpiValue(kpi, kpisData, er, fc),
        })),
      })) ?? [];

      const blob = await pdf(
        // @react-pdf/renderer pdf() expects ReactElement<DocumentProps>, cast needed
        R.createElement(KpiReportePDF, {
          data: {
            periodoLabel,
            desde,
            hasta,
            er: er ? {
              ingresosDevengados: er.ingresosDevengados,
              costosDirectos: er.costosDirectos,
              costosFijos: er.costosFijos,
              costosTotales: er.costosTotales,
              utilidadBruta: er.utilidadBruta,
              margenBruto: er.margenBruto,
              utilidadNeta: er.utilidadNeta,
              margenNeto: er.margenNeto,
            } : null,
            fc: fc ? {
              cobrosReales: fc.cobrosReales,
              pagosReales: fc.pagosReales,
              flujoNeto: fc.flujoNeto,
              cxcTotal: fc.cxcTotal,
              cxcVencido: fc.cxcVencido,
              cxpTotal: fc.cxpTotal,
            } : null,
            areas,
          },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KPIs-Mainstage-${periodoLabel.replace(/\s/g, '-')}-${desde}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setGenerandoPDF(false);
    }
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── Header (unchanged) ─────────────────────────── */}
      <div className="px-6 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-1">
            <BarChart2 className="w-5 h-5 text-[#B3985B]" />
            <h1 className="ms-h1">KPIs y Resultados</h1>
          </div>
          {/* PDF button — unchanged */}
          <button
            onClick={generarPDF}
            disabled={generandoPDF || !kpisData}
            className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-[#222] text-gray-400 hover:text-white hover:border-[#333] rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {generandoPDF ? 'Generando...' : 'Reporte PDF'}
          </button>
        </div>
        <p className="text-gray-600 text-xs ml-8">Solo visible para administración</p>
      </div>

      {/* ── Period selector (unchanged) ─────────────────── */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-[#111] px-6 py-3">
        {/* Row 1 */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {([
            { label: 'Q1', desde: `${year}-01-01`, hasta: `${year}-03-31` },
            { label: 'Q2', desde: `${year}-04-01`, hasta: `${year}-06-30` },
            { label: 'Q3', desde: `${year}-07-01`, hasta: `${year}-09-30` },
            { label: 'Q4', desde: `${year}-10-01`, hasta: `${year}-12-31` },
            { label: 'S1', desde: `${year}-01-01`, hasta: `${year}-06-30` },
            { label: 'S2', desde: `${year}-07-01`, hasta: `${year}-12-31` },
            { label: 'Anual', desde: `${year}-01-01`, hasta: `${year}-12-31` },
          ] as const).map(p => (
            <button key={p.label}
              onClick={() => { setDesde(p.desde); setHasta(p.hasta); setPeriodoLabel(p.label); cargarDatos(p.desde, p.hasta); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                periodoLabel === p.label ? 'bg-[#B3985B] text-black' : 'bg-[#111] border border-[#222] text-gray-400 hover:text-white'
              }`}>{p.label}</button>
          ))}
        </div>
        {/* Row 2 */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: '7 días',    fn: () => { const h = todayStr(); const d = daysAgo(7);  setDesde(d); setHasta(h); cargarDatos(d, h); } },
            { label: '15 días',   fn: () => { const h = todayStr(); const d = daysAgo(15); setDesde(d); setHasta(h); cargarDatos(d, h); } },
            { label: 'Este mes',  fn: () => { const d = firstOfMonth(); const h = lastOfMonth(); setDesde(d); setHasta(h); cargarDatos(d, h); } },
            { label: 'Mes ant.',  fn: () => { const d = firstOfPrevMonth(); const h = lastOfPrevMonth(); setDesde(d); setHasta(h); cargarDatos(d, h); } },
            { label: 'Personalizado', fn: () => {} },
          ].map(p => (
            <button key={p.label}
              onClick={() => { p.fn(); setPeriodoLabel(p.label); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                periodoLabel === p.label ? 'bg-[#B3985B] text-black' : 'bg-[#111] border border-[#222] text-gray-400 hover:text-white'
              }`}>{p.label}</button>
          ))}
        </div>
        <p className="text-gray-500 text-xs mt-2">{fmtRange(desde, hasta)}</p>
        {periodoLabel === 'Personalizado' && (
          <div className="flex items-center gap-2 mt-3">
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="bg-[#111] border border-[#222] text-white text-xs px-2 py-1.5 rounded-lg" />
            <span className="text-gray-600">→</span>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="bg-[#111] border border-[#222] text-white text-xs px-2 py-1.5 rounded-lg" />
            <button onClick={() => cargarDatos(desde, hasta)} className="px-3 py-1.5 bg-[#B3985B] text-black text-xs font-semibold rounded-lg">Aplicar</button>
          </div>
        )}
      </div>

      {/* ── Main content ─────────────────────────────────── */}
      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <div className="w-3 h-3 border border-[#B3985B] border-t-transparent rounded-full animate-spin" />
            Calculando...
          </div>
        )}

        {/* ── ESTADO DE RESULTADOS — Big metrics row ───── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Ingresos */}
          <div className="ms-card-deep p-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#B3985B]/5 to-transparent pointer-events-none" />
            <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-3">Ingresos del período</p>
            <p className={`text-3xl font-bold tabular-nums leading-none mb-1 ${
              er ? (er.cumpleMetaIngresos ? 'text-emerald-400' : 'text-red-400') : 'text-gray-600'
            }`}>
              {er ? fmt(er.ingresosDevengados) : '—'}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              {er ? `${er.eventosEjecutados} evento${er.eventosEjecutados !== 1 ? 's' : ''} · Meta $500,000` : 'Sin datos'}
            </p>
            {er && (
              <div className="mt-3 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500/60" style={{ width: `${Math.min(100, er.ingresosDevengados / 500000 * 100)}%` }} />
              </div>
            )}
          </div>

          {/* Costos totales */}
          <div className="ms-card-deep p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-3">Costos totales</p>
            <p className="text-3xl font-bold tabular-nums leading-none mb-1 text-white">
              {er ? fmt(er.costosTotales) : '—'}
            </p>
            {er && (
              <p className="text-xs text-gray-600 mt-2">
                Dir. {fmt(er.costosDirectos)} · Fijos {fmt(er.costosFijos)}
              </p>
            )}
          </div>

          {/* Utilidad bruta */}
          <div className="ms-card-deep p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-3">Utilidad bruta</p>
            <p className={`text-3xl font-bold tabular-nums leading-none mb-1 ${
              er ? (er.margenBruto >= 65 ? 'text-emerald-400' : 'text-red-400') : 'text-gray-600'
            }`}>
              {er ? fmt(er.utilidadBruta) : '—'}
            </p>
            {er && (
              <>
                <p className="text-xs text-gray-600 mt-2">Margen: {er.margenBruto.toFixed(1)}% · Meta ≥ 65%</p>
                <div className="mt-3 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${
                    er.margenBruto >= 65 ? 'bg-emerald-500/60' : 'bg-red-500/60'
                  }`} style={{ width: `${Math.min(100, er.margenBruto / 65 * 100)}%` }} />
                </div>
              </>
            )}
          </div>

          {/* Utilidad neta */}
          <div className="ms-card-deep p-5 relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${
              er ? (er.cumpleMetaMargen ? 'from-emerald-900/10' : 'from-red-900/10') : 'from-transparent'
            } to-transparent pointer-events-none`} />
            <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-3">Utilidad neta</p>
            <p className={`text-3xl font-bold tabular-nums leading-none mb-1 ${
              er ? (er.cumpleMetaMargen ? 'text-emerald-400' : 'text-red-400') : 'text-gray-600'
            }`}>
              {er ? fmt(er.utilidadNeta) : '—'}
            </p>
            {er && (
              <>
                <p className="text-xs text-gray-600 mt-2">Margen: {er.margenNeto.toFixed(1)}% · Meta ≥ 30%</p>
                <div className="mt-3 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${
                    er.cumpleMetaMargen ? 'bg-emerald-500/60' : 'bg-red-500/60'
                  }`} style={{ width: `${Math.min(100, Math.max(0, er.margenNeto) / 30 * 100)}%` }} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── FLUJO DE CAJA — compact ──────────────────── */}
        <div className="ms-card-deep px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-3">Flujo de Caja · Efectivo real</p>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-1">Cobros reales</p>
              <p className="text-xl font-bold tabular-nums text-white">{fc ? fmt(fc.cobrosReales) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Pagos reales</p>
              <p className="text-xl font-bold tabular-nums text-white">{fc ? fmt(fc.pagosReales) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Flujo neto</p>
              <p className={`text-xl font-bold tabular-nums ${
                fc ? (fc.flujoNeto >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-gray-600'
              }`}>{fc ? fmt(fc.flujoNeto) : '—'}</p>
            </div>
          </div>
          {fc && (
            <p className="text-xs text-gray-600 mt-3 border-t border-[#111] pt-2">
              CxC vigentes {fmt(fc.cxcTotal)} · Vencidas {fmt(fc.cxcVencido)} · CxP {fmt(fc.cxpTotal)}
            </p>
          )}
        </div>

        {/* ── TABS ─────────────────────────────────────── */}
        <div>
          {/* Tab bar */}
          <div className="flex gap-1 border-b border-[#1a1a1a] mb-6">
            {([
              { key: 'resumen', label: 'Resumen' },
              { key: 'administracion', label: 'Administración' },
              { key: 'marketing', label: 'Marketing' },
              { key: 'ventas', label: 'Ventas' },
              { key: 'produccion', label: 'Producción' },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                  activeTab === t.key
                    ? 'text-[#B3985B]'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t.label}
                {activeTab === t.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B3985B] rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* ── TAB: RESUMEN ────────────────────────────── */}
          {activeTab === 'resumen' && (
            <ResumenTab
              soData={soData}
              soLoading={soLoading}
              soError={soError}
              kpisData={kpisData}
              er={er}
              fc={fc}
              setActiveTab={setActiveTab}
            />
          )}

          {/* ── TAB: ADMINISTRACIÓN ─────────────────────── */}
          {activeTab === 'administracion' && (
            <AreaTab
              area={soData?.areas?.find(a => a.nombre.toLowerCase().includes('administr'))}
              kpisData={kpisData} er={er} fc={fc}
              isAdmin={isAdmin}
              expandedKpiId={expandedKpiId} setExpandedKpiId={setExpandedKpiId}
              editingField={editingField} setEditingField={setEditingField}
              editValue={editValue} setEditValue={setEditValue}
              savingKpi={savingKpi}
              manualInput={manualInput} setManualInput={setManualInput}
              saveKpiField={saveKpiField} saveValorManual={saveValorManual}
              areaKey="administracion"
              charts={<AdministracionCharts er={er} />}
            />
          )}

          {/* ── TAB: MARKETING ──────────────────────────── */}
          {activeTab === 'marketing' && (
            <AreaTab
              area={soData?.areas?.find(a => a.nombre.toLowerCase().includes('market'))}
              kpisData={kpisData} er={er} fc={fc}
              isAdmin={isAdmin}
              expandedKpiId={expandedKpiId} setExpandedKpiId={setExpandedKpiId}
              editingField={editingField} setEditingField={setEditingField}
              editValue={editValue} setEditValue={setEditValue}
              savingKpi={savingKpi}
              manualInput={manualInput} setManualInput={setManualInput}
              saveKpiField={saveKpiField} saveValorManual={saveValorManual}
              areaKey="marketing"
              charts={<MarketingCharts kpisData={kpisData} />}
            />
          )}

          {/* ── TAB: VENTAS ─────────────────────────────── */}
          {activeTab === 'ventas' && (
            <AreaTab
              area={soData?.areas?.find(a => a.nombre.toLowerCase().includes('venta'))}
              kpisData={kpisData} er={er} fc={fc}
              isAdmin={isAdmin}
              expandedKpiId={expandedKpiId} setExpandedKpiId={setExpandedKpiId}
              editingField={editingField} setEditingField={setEditingField}
              editValue={editValue} setEditValue={setEditValue}
              savingKpi={savingKpi}
              manualInput={manualInput} setManualInput={setManualInput}
              saveKpiField={saveKpiField} saveValorManual={saveValorManual}
              areaKey="ventas"
              charts={<VentasCharts kpisData={kpisData} />}
            />
          )}

          {/* ── TAB: PRODUCCIÓN ─────────────────────────── */}
          {activeTab === 'produccion' && (
            <AreaTab
              area={soData?.areas?.find(a => a.nombre.toLowerCase().includes('produc'))}
              kpisData={kpisData} er={er} fc={fc}
              isAdmin={isAdmin}
              expandedKpiId={expandedKpiId} setExpandedKpiId={setExpandedKpiId}
              editingField={editingField} setEditingField={setEditingField}
              editValue={editValue} setEditValue={setEditValue}
              savingKpi={savingKpi}
              manualInput={manualInput} setManualInput={setManualInput}
              saveKpiField={saveKpiField} saveValorManual={saveValorManual}
              areaKey="produccion"
              charts={<ProduccionCharts kpisData={kpisData} soData={soData} er={er} fc={fc} />}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── KpiCard ───────────────────────────────────────────────────────────────────

function KpiCard({
  kpi, val, isAdmin, isExpanded, onToggle,
  editingField, setEditingField, editValue, setEditValue,
  savingKpi, manualInput, setManualInput,
  saveKpiField, saveValorManual,
}: {
  kpi: SOKpi;
  val: number | null;
  isAdmin: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  editingField: { kpiId: string; field: string } | null;
  setEditingField: (v: { kpiId: string; field: string } | null) => void;
  editValue: string;
  setEditValue: (v: string) => void;
  savingKpi: string | null;
  manualInput: Record<string, string>;
  setManualInput: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  saveKpiField: (id: string, field: string, value: string | number) => Promise<void>;
  saveValorManual: (id: string) => Promise<void>;
}) {
  const sem = semaforo(val, kpi.meta);
  const pct = val !== null ? progressPct(val, kpi.meta) : 0;

  const displayVal = val === null
    ? <span className="text-gray-600 text-lg">Sin dato</span>
    : <span className={`text-2xl font-bold tabular-nums ${
        sem === 'verde' ? 'text-emerald-400' : sem === 'rojo' ? 'text-red-400' : 'text-gray-400'
      }`}>
        {kpi.meta.includes('%')
          ? `${val.toFixed(1)}%`
          : kpi.meta.includes('$')
          ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val)
          : val.toLocaleString('es-MX')}
      </span>;

  return (
    <div className="relative">
      <div
        className={`bg-[#0d0d0d] border rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-[0_0_20px_rgba(179,152,91,0.08)] hover:scale-[1.01] ${
          isExpanded ? 'border-[#B3985B]/40' : 'border-[#1e1e1e] hover:border-[#2a2a2a]'
        }`}
        onClick={onToggle}
      >
        {/* Top row: badge + chevron */}
        <div className="flex items-center justify-between mb-3">
          <TipoBadge tipo={kpi.tipoCalculo} />
          <svg
            className={`w-3.5 h-3.5 text-gray-600 transition-transform ${
              isExpanded ? 'rotate-180 text-[#B3985B]' : ''
            }`}
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* KPI name */}
        <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-2 leading-tight">
          {kpi.nombre}
        </p>

        {/* Value */}
        <div className="mb-2">{displayVal}</div>

        {/* Meta */}
        <p className="text-[10px] text-gray-600 mb-3">Meta: {kpi.meta}</p>

        {/* Progress bar */}
        <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              val === null ? 'bg-gray-800'
              : sem === 'verde' ? 'bg-emerald-500/60'
              : 'bg-red-500/60'
            }`}
            style={{ width: val !== null ? `${pct}%` : '0%' }}
          />
        </div>
      </div>

      {/* Expansion panel — full-width, spans below the card */}
      {isExpanded && (
        <div className="mt-1 bg-[#0a0a0a] border border-[#B3985B]/20 rounded-xl px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Descripción */}
            <div>
              <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-1">📋 Descripción</p>
              {editingField?.kpiId === kpi.id && editingField.field === 'descripcion' ? (
                <div className="flex gap-2">
                  <textarea value={editValue} onChange={e => setEditValue(e.target.value)}
                    className="flex-1 bg-[#1a1a1a] border border-[#333] text-white text-sm px-3 py-2 rounded-lg resize-none focus:outline-none focus:border-[#B3985B]" rows={2} />
                  <div className="flex flex-col gap-1">
                    <button onClick={async e => { e.stopPropagation(); await saveKpiField(kpi.id, 'descripcion', editValue); setEditingField(null); }}
                      className="px-2 py-1 bg-[#B3985B] text-black text-xs rounded font-semibold">OK</button>
                    <button onClick={e => { e.stopPropagation(); setEditingField(null); }} className="px-2 py-1 bg-[#222] text-gray-400 text-xs rounded">✕</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <p className="text-gray-300 text-sm flex-1">{kpi.descripcion || <span className="text-gray-600 italic">Sin descripción definida</span>}</p>
                  {isAdmin && <button onClick={e => { e.stopPropagation(); setEditingField({ kpiId: kpi.id, field: 'descripcion' }); setEditValue(kpi.descripcion || ''); }}
                    className="text-gray-600 hover:text-[#B3985B] text-xs shrink-0">✏️</button>}
                </div>
              )}
            </div>
            {/* Propósito */}
            <div>
              <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-1">🎯 Propósito</p>
              {editingField?.kpiId === kpi.id && editingField.field === 'proposito' ? (
                <div className="flex gap-2">
                  <textarea value={editValue} onChange={e => setEditValue(e.target.value)}
                    className="flex-1 bg-[#1a1a1a] border border-[#333] text-white text-sm px-3 py-2 rounded-lg resize-none focus:outline-none focus:border-[#B3985B]" rows={2} />
                  <div className="flex flex-col gap-1">
                    <button onClick={async e => { e.stopPropagation(); await saveKpiField(kpi.id, 'proposito', editValue); setEditingField(null); }}
                      className="px-2 py-1 bg-[#B3985B] text-black text-xs rounded font-semibold">OK</button>
                    <button onClick={e => { e.stopPropagation(); setEditingField(null); }} className="px-2 py-1 bg-[#222] text-gray-400 text-xs rounded">✕</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <p className="text-gray-300 text-sm flex-1">{kpi.proposito || <span className="text-gray-600 italic">Sin propósito definido</span>}</p>
                  {isAdmin && <button onClick={e => { e.stopPropagation(); setEditingField({ kpiId: kpi.id, field: 'proposito' }); setEditValue(kpi.proposito || ''); }}
                    className="text-gray-600 hover:text-[#B3985B] text-xs shrink-0">✏️</button>}
                </div>
              )}
            </div>
          </div>

          {/* Fórmula + fuente + tipo */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-1">🔢 Fórmula</p>
              <p className="text-gray-300 text-sm">{kpi.formula || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-1">📊 Fuente</p>
              <p className="text-gray-300 text-sm">{kpi.fuente || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-1">⚙️ Tipo</p>
              <TipoBadge tipo={kpi.tipoCalculo} />
            </div>
          </div>

          {/* Nota de cálculo (admin editable) */}
          {isAdmin && (
            <div>
              <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-1">📝 Nota de cálculo</p>
              {editingField?.kpiId === kpi.id && editingField.field === 'notaCalculo' ? (
                <div className="flex gap-2">
                  <input value={editValue} onChange={e => setEditValue(e.target.value)}
                    className="flex-1 bg-[#1a1a1a] border border-[#333] text-white text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#B3985B]" />
                  <button onClick={async e => { e.stopPropagation(); await saveKpiField(kpi.id, 'notaCalculo', editValue); setEditingField(null); }}
                    className="px-2 py-1 bg-[#B3985B] text-black text-xs rounded font-semibold">OK</button>
                  <button onClick={e => { e.stopPropagation(); setEditingField(null); }} className="px-2 py-1 bg-[#222] text-gray-400 text-xs rounded">✕</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-gray-400 text-sm flex-1">{kpi.notaCalculo || <span className="italic text-gray-600">Sin nota</span>}</p>
                  <button onClick={e => { e.stopPropagation(); setEditingField({ kpiId: kpi.id, field: 'notaCalculo' }); setEditValue(kpi.notaCalculo || ''); }}
                    className="text-gray-600 hover:text-[#B3985B] text-xs">✏️</button>
                </div>
              )}
            </div>
          )}

          {/* Valor manual (if not automatico) */}
          {kpi.tipoCalculo !== 'automatico' && (
            <div className="border-t border-[#1a1a1a] pt-4">
              <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-2">✏️ Valor manual</p>
              <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                <input type="number"
                  value={manualInput[kpi.id] ?? ''}
                  onChange={e => setManualInput(prev => ({ ...prev, [kpi.id]: e.target.value }))}
                  placeholder={kpi.valorManual != null ? String(kpi.valorManual) : 'Valor...'}
                  className="w-32 bg-[#1a1a1a] border border-[#333] text-white text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#B3985B]"
                />
                <button
                  onClick={async e => { e.stopPropagation(); await saveValorManual(kpi.id); }}
                  disabled={savingKpi === kpi.id || !manualInput[kpi.id]}
                  className="px-3 py-1.5 bg-[#B3985B] text-black text-xs font-semibold rounded-lg disabled:opacity-50"
                >{savingKpi === kpi.id ? 'Guardando...' : 'Guardar'}</button>
                {kpi.valorManual != null && (
                  <p className="text-gray-500 text-xs">Último: <span className="text-white">{kpi.valorManual}</span>
                    {kpi.fechaValorManual && <> · {new Date(kpi.fechaValorManual).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</>}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Edit meta (admin) */}
          {isAdmin && (
            <div className="pt-1">
              {editingField?.kpiId === kpi.id && editingField.field === 'meta' ? (
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <span className="text-gray-500 text-xs">Meta:</span>
                  <input value={editValue} onChange={e => setEditValue(e.target.value)}
                    className="bg-[#1a1a1a] border border-[#333] text-white text-sm px-2 py-1 rounded-lg w-40 focus:outline-none focus:border-[#B3985B]" />
                  <button onClick={async e => { e.stopPropagation(); await saveKpiField(kpi.id, 'meta', editValue); setEditingField(null); }}
                    className="px-2 py-1 bg-[#B3985B] text-black text-xs rounded font-semibold">OK</button>
                  <button onClick={e => { e.stopPropagation(); setEditingField(null); }} className="px-2 py-1 bg-[#222] text-gray-400 text-xs rounded">✕</button>
                </div>
              ) : (
                <button onClick={e => { e.stopPropagation(); setEditingField({ kpiId: kpi.id, field: 'meta' }); setEditValue(kpi.meta); }}
                  className="text-gray-600 hover:text-[#B3985B] text-[10px]">🔧 Editar meta</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── AreaTab ───────────────────────────────────────────────────────────────────

function AreaTab({
  area, kpisData, er, fc, isAdmin,
  expandedKpiId, setExpandedKpiId,
  editingField, setEditingField, editValue, setEditValue,
  savingKpi, manualInput, setManualInput,
  saveKpiField, saveValorManual, areaKey, charts,
}: {
  area: SOArea | undefined;
  kpisData: KpisData | null;
  er: EstadoResultados | null;
  fc: FlujoCaja | null;
  isAdmin: boolean;
  expandedKpiId: string | null;
  setExpandedKpiId: (v: string | null) => void;
  editingField: { kpiId: string; field: string } | null;
  setEditingField: (v: { kpiId: string; field: string } | null) => void;
  editValue: string;
  setEditValue: (v: string) => void;
  savingKpi: string | null;
  manualInput: Record<string, string>;
  setManualInput: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  saveKpiField: (id: string, field: string, value: string | number) => Promise<void>;
  saveValorManual: (id: string) => Promise<void>;
  areaKey: string;
  charts: React.ReactNode;
}) {
  const [showAll, setShowAll] = useState(false);

  if (!area) return <p className="text-gray-600 text-sm py-8 text-center">Área no encontrada en el catálogo.</p>;

  const sortedKpis = [...(area.kpis ?? [])].filter(k => k.activo).sort((a, b) => a.orden - b.orden);
  const kpisConDato = sortedKpis.map(k => ({ kpi: k, val: getKpiValue(k, kpisData, er, fc) })).filter(x => x.val !== null);
  const cumplidos = kpisConDato.filter(x => semaforo(x.val, x.kpi.meta) === 'verde').length;
  const total = sortedKpis.length;

  const visibleKpis = showAll ? sortedKpis : sortedKpis.slice(0, 6);
  const hiddenCount = Math.max(0, sortedKpis.length - 6);

  const semColor = kpisConDato.length === 0 ? '⚪' : cumplidos >= kpisConDato.length / 2 ? '🟢' : '🔴';

  return (
    <div className="space-y-6">
      {/* Area semaphore */}
      <div className="flex items-center gap-3">
        {area.icono && <span className="text-2xl">{area.icono}</span>}
        <div>
          <h2 className="text-lg font-bold text-white">{area.nombre}</h2>
          <p className="text-sm text-gray-400">
            {semColor} {cumplidos} de {kpisConDato.length} KPIs con dato en meta
            {kpisConDato.length < total && <span className="text-gray-600"> · {total - kpisConDato.length} sin dato</span>}
          </p>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {charts}
      </div>

      {/* KPI cards grid */}
      <div>
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
          {visibleKpis.map(kpi => (
            <KpiCard
              key={kpi.id}
              kpi={kpi}
              val={getKpiValue(kpi, kpisData, er, fc)}
              isAdmin={isAdmin}
              isExpanded={expandedKpiId === kpi.id}
              onToggle={() => setExpandedKpiId(expandedKpiId === kpi.id ? null : kpi.id)}
              editingField={editingField}
              setEditingField={setEditingField}
              editValue={editValue}
              setEditValue={setEditValue}
              savingKpi={savingKpi}
              manualInput={manualInput}
              setManualInput={setManualInput}
              saveKpiField={saveKpiField}
              saveValorManual={saveValorManual}
            />
          ))}
        </div>
        {hiddenCount > 0 && !showAll && (
          <button onClick={() => setShowAll(true)}
            className="mt-4 w-full py-2.5 border border-[#222] rounded-xl text-gray-500 hover:text-white hover:border-[#333] text-sm transition-colors">
            Ver todos los KPIs (+{hiddenCount})
          </button>
        )}
      </div>
    </div>
  );
}

// ── ResumenTab ────────────────────────────────────────────────────────────────

function ResumenTab({
  soData, soLoading, soError, kpisData, er, fc, setActiveTab,
}: {
  soData: SOData | null;
  soLoading: boolean;
  soError: boolean;
  kpisData: KpisData | null;
  er: EstadoResultados | null;
  fc: FlujoCaja | null;
  setActiveTab: (tab: 'resumen' | 'administracion' | 'marketing' | 'ventas' | 'produccion') => void;
}) {
  if (soLoading) return <div className="flex items-center gap-2 text-gray-600 text-sm py-8"><div className="w-3 h-3 border border-gray-600 border-t-transparent rounded-full animate-spin" />Cargando KPIs...</div>;
  if (soError) return <p className="text-gray-600 text-sm py-8">No se pudo cargar el catálogo de KPIs.</p>;
  if (!soData) return null;

  const tabMap: Record<string, 'administracion' | 'marketing' | 'ventas' | 'produccion'> = {
    administr: 'administracion', market: 'marketing',
    venta: 'ventas', produc: 'produccion',
  };

  function getAreaTab(nombre: string): 'administracion' | 'marketing' | 'ventas' | 'produccion' {
    const n = nombre.toLowerCase();
    for (const [k, v] of Object.entries(tabMap)) if (n.includes(k)) return v;
    return 'administracion';
  }

  // Top alerts: KPIs in red with actual data, sorted by distance to meta (worst first)
  const todasAlertas: { kpi: SOKpi; val: number; distancia: number }[] = [];
  for (const area of soData.areas) {
    for (const kpi of area.kpis.filter(k => k.activo)) {
      const val = getKpiValue(kpi, kpisData, er, fc);
      if (val === null) continue;
      if (semaforo(val, kpi.meta) !== 'rojo') continue;
      const metaNum = parseFloat(kpi.meta.replace(/[^0-9.]/g, ''));
      const distancia = isNaN(metaNum) ? 0 : Math.abs(val - metaNum) / (metaNum || 1) * 100;
      todasAlertas.push({ kpi, val, distancia });
    }
  }
  todasAlertas.sort((a, b) => b.distancia - a.distancia);
  const topAlertas = todasAlertas.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Area semaphore cards 2x2 grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {soData.areas.map(area => {
          const sortedKpis = [...(area.kpis ?? [])].filter(k => k.activo).sort((a, b) => a.orden - b.orden);
          const kpisConDato = sortedKpis.map(k => ({ kpi: k, val: getKpiValue(k, kpisData, er, fc) })).filter(x => x.val !== null);
          const cumplidos = kpisConDato.filter(x => semaforo(x.val, x.kpi.meta) === 'verde').length;
          const semColor = kpisConDato.length === 0 ? '⚪' : cumplidos >= kpisConDato.length / 2 ? '🟢' : '🔴';
          const top3 = sortedKpis.slice(0, 3);
          const tabKey = getAreaTab(area.nombre);

          return (
            <div key={area.id} className="ms-card-deep p-5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {area.icono && <span>{area.icono}</span>}
                  <span className="font-semibold text-white">{area.nombre}</span>
                </div>
                <span className="text-lg">{semColor}</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {cumplidos} de {kpisConDato.length} KPIs en meta
              </p>
              <div className="space-y-2 flex-1">
                {top3.map(kpi => {
                  const val = getKpiValue(kpi, kpisData, er, fc);
                  const s = semaforo(val, kpi.meta);
                  return (
                    <div key={kpi.id} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 truncate flex-1 mr-2">{kpi.nombre}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-xs font-medium tabular-nums ${
                          s === 'verde' ? 'text-emerald-400' : s === 'rojo' ? 'text-red-400' : 'text-gray-600'
                        }`}>
                          {val === null ? '—' : kpi.meta.includes('%') ? `${val.toFixed(1)}%` : kpi.meta.includes('$')
                            ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val)
                            : val.toLocaleString('es-MX')}
                        </span>
                        <span className="text-[10px]">{s === 'verde' ? '🟢' : s === 'rojo' ? '🔴' : '⚪'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setActiveTab(tabKey)}
                className="mt-4 w-full py-1.5 border border-[#222] rounded-lg text-xs text-gray-500 hover:text-[#B3985B] hover:border-[#B3985B]/30 transition-colors"
              >Ver área →</button>
            </div>
          );
        })}
      </div>

      {/* Top alerts */}
      {topAlertas.length > 0 && (
        <div className="bg-[#0d0d0d] border border-red-900/30 rounded-xl p-5">
          <p className="text-[10px] uppercase tracking-[0.15em] text-red-400 font-semibold mb-4">⚠ Requieren atención</p>
          <div className="space-y-3">
            {topAlertas.map(({ kpi, val }) => (
              <div key={kpi.id} className="flex items-center justify-between">
                <span className="text-sm text-gray-300 flex-1">{kpi.nombre}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-500">Meta: {kpi.meta}</span>
                  <span className="text-sm font-semibold text-red-400 tabular-nums">
                    {kpi.meta.includes('%') ? `${val.toFixed(1)}%` : kpi.meta.includes('$')
                      ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val)
                      : val.toLocaleString('es-MX')}
                  </span>
                  <span>🔴</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Chart components ──────────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ms-card-deep p-4">
      <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-4">{title}</p>
      {children}
    </div>
  );
}

function AdministracionCharts({ er }: { er: EstadoResultados | null }) {
  const barData = [{
    name: 'Período',
    Ingresos: er?.ingresosDevengados ?? 0,
    'Costos Dir.': er?.costosDirectos ?? 0,
    'Costos Fijos': er?.costosFijos ?? 0,
  }];
  const margen = er?.margenNeto ?? 0;
  const radialData = [{ value: Math.max(0, margen), fill: margen >= 30 ? '#10b981' : '#ef4444' }];

  return (
    <>
      <ChartCard title="Ingresos vs Costos">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 20 }}>
            <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} width={50} />
            <Tooltip {...chartTooltipStyle} formatter={((v: number) => [`$${v.toLocaleString('es-MX')}`, '']) as never} />
            <Bar dataKey="Ingresos" fill={GOLD} radius={[0, 4, 4, 0]} />
            <Bar dataKey="Costos Dir." fill={CHART_RED} radius={[0, 4, 4, 0]} />
            <Bar dataKey="Costos Fijos" fill={CHART_GRAY} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Margen neto vs meta 30%">
        <ResponsiveContainer width="100%" height={160}>
          <RadialBarChart cx="50%" cy="80%" innerRadius="60%" outerRadius="100%" data={radialData} startAngle={180} endAngle={0}>
            <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#1a1a1a' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <p className="text-center -mt-4 text-xl font-bold tabular-nums" style={{ color: margen >= 30 ? '#10b981' : '#ef4444' }}>
          {margen.toFixed(1)}%
        </p>
        <p className="text-center text-xs text-gray-600">Meta: ≥ 30%</p>
      </ChartCard>
    </>
  );
}

function MarketingCharts({ kpisData }: { kpisData: KpisData | null }) {
  const leadsData = [{ name: 'Leads', Actual: kpisData?.marketing.leadsGenerados ?? 0, Meta: 50 }];
  const cplData = [{ name: 'CPL', Actual: kpisData?.marketing.cpl ?? 0 }];

  return (
    <>
      <ChartCard title="Leads generados vs meta">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={leadsData} margin={{ left: 10, right: 10 }}>
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
            <Tooltip {...chartTooltipStyle} />
            <Bar dataKey="Actual" fill={GOLD} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Meta" fill={CHART_GRAY} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Costo por lead (CPL)">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={cplData} margin={{ left: 10, right: 10 }}>
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `$${v}`} />
            <Tooltip {...chartTooltipStyle} formatter={((v: number) => [`$${v.toLocaleString('es-MX')}`, 'CPL']) as never} />
            <Bar dataKey="Actual" fill={kpisData?.marketing.cpl ? GOLD : CHART_GRAY} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {!kpisData?.marketing.cpl && <p className="text-center text-xs text-gray-600 -mt-4">Sin dato — ingresa valor manual</p>}
      </ChartCard>
    </>
  );
}

function VentasCharts({ kpisData }: { kpisData: KpisData | null }) {
  const ticketData = [{ name: 'Ticket', Actual: kpisData?.ventas.ticketPromedio ?? 0, Meta: 30000 }];
  const serviciosData = [{ name: 'Servicios', Actual: kpisData?.ventas.serviciosVendidos ?? 0, Meta: 8 }];

  return (
    <>
      <ChartCard title="Ticket promedio vs meta $30,000">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={ticketData} margin={{ left: 10, right: 10 }}>
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip {...chartTooltipStyle} formatter={((v: number) => [`$${v.toLocaleString('es-MX')}`, '']) as never} />
            <Bar dataKey="Actual" fill={GOLD} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Meta" fill={CHART_GRAY} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Servicios vendidos vs meta">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={serviciosData} margin={{ left: 10, right: 10 }}>
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
            <Tooltip {...chartTooltipStyle} />
            <Bar dataKey="Actual" fill={GOLD} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Meta" fill={CHART_GRAY} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  );
}

function ProduccionCharts({
  kpisData, soData, er, fc,
}: {
  kpisData: KpisData | null;
  soData: SOData | null;
  er: EstadoResultados | null;
  fc: FlujoCaja | null;
}) {
  const prodArea = soData?.areas?.find(a => a.nombre.toLowerCase().includes('produc'));
  const sortedKpis = [...(prodArea?.kpis ?? [])].filter(k => k.activo);
  const kpisConDato = sortedKpis.map(k => ({ kpi: k, val: getKpiValue(k, kpisData, er, fc) })).filter(x => x.val !== null);
  const cumplidos = kpisConDato.filter(x => semaforo(x.val, x.kpi.meta) === 'verde').length;
  const pctCumplidos = kpisConDato.length > 0 ? Math.round(cumplidos / kpisConDato.length * 100) : 0;
  const radialData = [{ value: pctCumplidos, fill: pctCumplidos >= 50 ? '#10b981' : '#ef4444' }];
  const eventosData = [{ name: 'Eventos', Actual: kpisData?.produccion.totalEventos ?? 0, Meta: 10 }];

  return (
    <>
      <ChartCard title="KPIs cumplidos del área">
        <ResponsiveContainer width="100%" height={160}>
          <RadialBarChart cx="50%" cy="80%" innerRadius="60%" outerRadius="100%" data={radialData} startAngle={180} endAngle={0}>
            <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#1a1a1a' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <p className="text-center -mt-4 text-xl font-bold" style={{ color: pctCumplidos >= 50 ? '#10b981' : '#ef4444' }}>
          {pctCumplidos}%
        </p>
        <p className="text-center text-xs text-gray-600">{cumplidos} de {kpisConDato.length} en meta</p>
      </ChartCard>
      <ChartCard title="Total eventos del período">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={eventosData} margin={{ left: 10, right: 10 }}>
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
            <Tooltip {...chartTooltipStyle} />
            <Bar dataKey="Actual" fill={GOLD} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Meta" fill={CHART_GRAY} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  );
}
