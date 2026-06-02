'use client';

import { useEffect, useState } from 'react';
import { BarChart2 } from 'lucide-react';
import React from 'react';

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
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-1">
            <BarChart2 className="w-5 h-5 text-[#B3985B]" />
            <h1 className="text-2xl font-bold tracking-tight">KPIs y Resultados</h1>
          </div>
          {/* PDF button */}
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

      {/* Period selector */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-[#111] px-6 py-3">
        {/* Row 1: Year quarters/halves/annual */}
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
            <button
              key={p.label}
              onClick={() => {
                setDesde(p.desde);
                setHasta(p.hasta);
                setPeriodoLabel(p.label);
                cargarDatos(p.desde, p.hasta);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                periodoLabel === p.label
                  ? 'bg-[#B3985B] text-black'
                  : 'bg-[#111] border border-[#222] text-gray-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Row 2: Relative periods */}
        <div className="flex flex-wrap gap-1.5">
          {[
            {
              label: '7 días',
              fn: () => { const h = todayStr(); const d = daysAgo(7); setDesde(d); setHasta(h); cargarDatos(d, h); },
            },
            {
              label: '15 días',
              fn: () => { const h = todayStr(); const d = daysAgo(15); setDesde(d); setHasta(h); cargarDatos(d, h); },
            },
            {
              label: 'Este mes',
              fn: () => { const d = firstOfMonth(); const h = lastOfMonth(); setDesde(d); setHasta(h); cargarDatos(d, h); },
            },
            {
              label: 'Mes ant.',
              fn: () => { const d = firstOfPrevMonth(); const h = lastOfPrevMonth(); setDesde(d); setHasta(h); cargarDatos(d, h); },
            },
            {
              label: 'Personalizado',
              fn: () => { /* just sets label, date pickers appear below */ },
            },
          ].map(p => (
            <button
              key={p.label}
              onClick={() => { p.fn(); setPeriodoLabel(p.label); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                periodoLabel === p.label
                  ? 'bg-[#B3985B] text-black'
                  : 'bg-[#111] border border-[#222] text-gray-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Active range display */}
        <p className="text-gray-500 text-xs mt-2">{fmtRange(desde, hasta)}</p>

        {/* Custom date pickers */}
        {periodoLabel === 'Personalizado' && (
          <div className="flex items-center gap-2 mt-3">
            <input
              type="date"
              value={desde}
              onChange={e => setDesde(e.target.value)}
              className="bg-[#111] border border-[#222] text-white text-xs px-2 py-1.5 rounded-lg"
            />
            <span className="text-gray-600">→</span>
            <input
              type="date"
              value={hasta}
              onChange={e => setHasta(e.target.value)}
              className="bg-[#111] border border-[#222] text-white text-xs px-2 py-1.5 rounded-lg"
            />
            <button
              onClick={() => cargarDatos(desde, hasta)}
              className="px-3 py-1.5 bg-[#B3985B] text-black text-xs font-semibold rounded-lg"
            >
              Aplicar
            </button>
          </div>
        )}
      </div>

      <div className="px-6 py-6 space-y-6 max-w-5xl">
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
                          {/* Expand toggle column */}
                          <th className="w-6 px-2 py-2" />
                          <th className="text-left px-3 py-2 text-gray-600 font-medium w-[30%]">Indicador</th>
                          <th className="text-left px-3 py-2 text-gray-600 font-medium w-[20%]">Meta</th>
                          <th className="text-left px-3 py-2 text-gray-600 font-medium w-[22%]">Cálculo</th>
                          <th className="text-right px-3 py-2 text-gray-600 font-medium w-[18%]">Valor actual</th>
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
                            <React.Fragment key={kpi.id}>
                              <tr className="hover:bg-[#111]/50">
                                {/* Expand toggle */}
                                <td className="px-2 py-2 w-6">
                                  <button
                                    onClick={() => setExpandedKpiId(expandedKpiId === kpi.id ? null : kpi.id)}
                                    className="text-gray-600 hover:text-white transition-colors"
                                  >
                                    <svg
                                      className={`w-3 h-3 transition-transform ${expandedKpiId === kpi.id ? 'rotate-90' : ''}`}
                                      fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                  </button>
                                </td>
                                <td className="px-3 py-2.5 text-gray-300">{kpi.nombre}</td>
                                <td className="px-3 py-2.5 text-gray-500">{kpi.meta}</td>
                                {/* Cálculo column */}
                                <td className="px-3 py-2 max-w-[200px]">
                                  <div className="flex items-center gap-1.5">
                                    <TipoBadge tipo={kpi.tipoCalculo} />
                                    {kpi.tipoCalculo !== 'manual' && kpi.formula && (
                                      <span className="text-gray-500 text-[10px] truncate max-w-[100px]" title={kpi.formula}>
                                        {kpi.formula}
                                      </span>
                                    )}
                                    {kpi.tipoCalculo === 'manual' && kpi.notaCalculo && (
                                      <span className="text-gray-500 text-[10px] truncate max-w-[100px]" title={kpi.notaCalculo}>
                                        {kpi.notaCalculo}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-right">{displayVal}</td>
                                <td className="px-3 py-2.5 text-center">{SEM[sem]}</td>
                              </tr>

                              {/* Detail expansion panel */}
                              {expandedKpiId === kpi.id && (
                                <tr>
                                  <td colSpan={6} className="px-0 py-0">
                                    <div className="bg-[#0d0d0d] border-t border-[#1a1a1a] px-6 py-4 space-y-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Descripción */}
                                        <div>
                                          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">📋 Descripción</p>
                                          {editingField?.kpiId === kpi.id && editingField.field === 'descripcion' ? (
                                            <div className="flex gap-2">
                                              <textarea
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                className="flex-1 bg-[#1a1a1a] border border-[#333] text-white text-sm px-3 py-2 rounded-lg resize-none focus:outline-none focus:border-[#B3985B]"
                                                rows={2}
                                              />
                                              <div className="flex flex-col gap-1">
                                                <button
                                                  onClick={async () => { await saveKpiField(kpi.id, 'descripcion', editValue); setEditingField(null); }}
                                                  className="px-2 py-1 bg-[#B3985B] text-black text-xs rounded font-semibold"
                                                >OK</button>
                                                <button onClick={() => setEditingField(null)} className="px-2 py-1 bg-[#222] text-gray-400 text-xs rounded">✕</button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="flex items-start gap-2">
                                              <p className="text-gray-300 text-sm flex-1">
                                                {kpi.descripcion || <span className="text-gray-600 italic">Sin descripción definida</span>}
                                              </p>
                                              {isAdmin && (
                                                <button
                                                  onClick={() => { setEditingField({ kpiId: kpi.id, field: 'descripcion' }); setEditValue(kpi.descripcion || ''); }}
                                                  className="text-gray-600 hover:text-[#B3985B] text-xs shrink-0"
                                                >✏️</button>
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        {/* Propósito */}
                                        <div>
                                          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">🎯 Propósito</p>
                                          {editingField?.kpiId === kpi.id && editingField.field === 'proposito' ? (
                                            <div className="flex gap-2">
                                              <textarea
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                className="flex-1 bg-[#1a1a1a] border border-[#333] text-white text-sm px-3 py-2 rounded-lg resize-none focus:outline-none focus:border-[#B3985B]"
                                                rows={2}
                                              />
                                              <div className="flex flex-col gap-1">
                                                <button
                                                  onClick={async () => { await saveKpiField(kpi.id, 'proposito', editValue); setEditingField(null); }}
                                                  className="px-2 py-1 bg-[#B3985B] text-black text-xs rounded font-semibold"
                                                >OK</button>
                                                <button onClick={() => setEditingField(null)} className="px-2 py-1 bg-[#222] text-gray-400 text-xs rounded">✕</button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="flex items-start gap-2">
                                              <p className="text-gray-300 text-sm flex-1">
                                                {kpi.proposito || <span className="text-gray-600 italic">Sin propósito definido</span>}
                                              </p>
                                              {isAdmin && (
                                                <button
                                                  onClick={() => { setEditingField({ kpiId: kpi.id, field: 'proposito' }); setEditValue(kpi.proposito || ''); }}
                                                  className="text-gray-600 hover:text-[#B3985B] text-xs shrink-0"
                                                >✏️</button>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Formula, fuente, tipo */}
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">🔢 Fórmula</p>
                                          <p className="text-gray-300 text-sm">{kpi.formula || '—'}</p>
                                        </div>
                                        <div>
                                          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">📊 Fuente</p>
                                          <p className="text-gray-300 text-sm">{kpi.fuente || '—'}</p>
                                        </div>
                                        <div>
                                          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">⚙️ Tipo de cálculo</p>
                                          <TipoBadge tipo={kpi.tipoCalculo} />
                                        </div>
                                      </div>

                                      {/* Nota de cálculo (editable, admin) */}
                                      {isAdmin && (
                                        <div>
                                          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">📝 Nota de cálculo</p>
                                          {editingField?.kpiId === kpi.id && editingField.field === 'notaCalculo' ? (
                                            <div className="flex gap-2">
                                              <input
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                className="flex-1 bg-[#1a1a1a] border border-[#333] text-white text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#B3985B]"
                                              />
                                              <button
                                                onClick={async () => { await saveKpiField(kpi.id, 'notaCalculo', editValue); setEditingField(null); }}
                                                className="px-2 py-1 bg-[#B3985B] text-black text-xs rounded font-semibold"
                                              >OK</button>
                                              <button onClick={() => setEditingField(null)} className="px-2 py-1 bg-[#222] text-gray-400 text-xs rounded">✕</button>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-2">
                                              <p className="text-gray-400 text-sm flex-1">
                                                {kpi.notaCalculo || <span className="italic text-gray-600">Sin nota</span>}
                                              </p>
                                              <button
                                                onClick={() => { setEditingField({ kpiId: kpi.id, field: 'notaCalculo' }); setEditValue(kpi.notaCalculo || ''); }}
                                                className="text-gray-600 hover:text-[#B3985B] text-xs"
                                              >✏️</button>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Valor manual — only if not automatico */}
                                      {kpi.tipoCalculo !== 'automatico' && (
                                        <div className="border-t border-[#1a1a1a] pt-4">
                                          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">✏️ Ingresar valor manual</p>
                                          <div className="flex items-center gap-3">
                                            <input
                                              type="number"
                                              value={manualInput[kpi.id] ?? ''}
                                              onChange={e => setManualInput(prev => ({ ...prev, [kpi.id]: e.target.value }))}
                                              placeholder={kpi.valorManual != null ? String(kpi.valorManual) : 'Valor...'}
                                              className="w-32 bg-[#1a1a1a] border border-[#333] text-white text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#B3985B]"
                                            />
                                            <button
                                              onClick={() => saveValorManual(kpi.id)}
                                              disabled={savingKpi === kpi.id || !manualInput[kpi.id]}
                                              className="px-3 py-1.5 bg-[#B3985B] text-black text-xs font-semibold rounded-lg disabled:opacity-50"
                                            >
                                              {savingKpi === kpi.id ? 'Guardando...' : 'Guardar'}
                                            </button>
                                            {kpi.valorManual != null && (
                                              <p className="text-gray-500 text-xs">
                                                Último valor: <span className="text-white">{kpi.valorManual}</span>
                                                {kpi.fechaValorManual && (
                                                  <> — {new Date(kpi.fechaValorManual).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</>
                                                )}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Edit meta (admin only) */}
                                      {isAdmin && (
                                        <div className="flex gap-4 pt-1">
                                          {editingField?.kpiId === kpi.id && editingField.field === 'meta' ? (
                                            <div className="flex items-center gap-2">
                                              <span className="text-gray-500 text-xs">Meta:</span>
                                              <input
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                className="bg-[#1a1a1a] border border-[#333] text-white text-sm px-2 py-1 rounded-lg w-40 focus:outline-none focus:border-[#B3985B]"
                                              />
                                              <button
                                                onClick={async () => { await saveKpiField(kpi.id, 'meta', editValue); setEditingField(null); }}
                                                className="px-2 py-1 bg-[#B3985B] text-black text-xs rounded font-semibold"
                                              >OK</button>
                                              <button onClick={() => setEditingField(null)} className="px-2 py-1 bg-[#222] text-gray-400 text-xs rounded">✕</button>
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() => { setEditingField({ kpiId: kpi.id, field: 'meta' }); setEditValue(kpi.meta); }}
                                              className="text-gray-600 hover:text-[#B3985B] text-xs"
                                            >🔧 Editar meta</button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
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
