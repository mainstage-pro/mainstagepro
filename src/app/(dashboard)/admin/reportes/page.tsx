"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ── Print CSS ─────────────────────────────────────────────────────────────────
const PRINT_STYLES = `
@media print {
  @page { size: A4 landscape; margin: 10mm 15mm; }
  * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  body { background: white !important; color: black !important; }
  .no-print { display: none !important; }
  .screen-only { display: none !important; }
  .print-layout { display: block !important; background: white; color: black; }
  .print-page { page-break-after: always; }
  nav, aside, [data-sidebar] { display: none !important; }
  .screen-content { display: none !important; }
}
.print-layout { display: none; }
`;

// ── Types ──────────────────────────────────────────────────────────────────────
interface BalanceData {
  periodo: string;
  activos: {
    efectivoYBancos: { total: number; cuentas: { nombre: string; posicion: number; banco: string | null }[] };
    cuentasPorCobrar: { total: number };
    activosFijos: { total: number; etiqueta: string };
    activosIntangibles: { total: number; etiqueta: string };
    porCategoria: { categoria: string; propietario: string; total: number; count: number }[];
    totalActivos: number;
  };
  pasivos: {
    deudasEstructurales: { total: number; detalle: { nombre: string; montoTotal: number; montoPagado: number; categoria: string }[] };
    cuentasPorPagar: { total: number };
    repartosPendientes: { total: number };
    totalPasivos: number;
  };
  patrimonio: { utilidadAcumulada: number; patrimonioNeto: number };
  resMes: { ingresos: number; gastos: number; flujoNeto: number };
  estructura: { razonSocial: string; socios: { nombre: string; pctParticipacion: number | null; esRepresentante: boolean }[] };
}

interface FlujoData {
  periodo: string;
  entradas: {
    total: number;
    porCategoria: { nombre: string; total: number }[];
    detalle: { id: string; fecha: string; concepto: string; monto: number; categoria: string; cliente: string | null; cuenta: string | null; metodoPago: string }[];
  };
  salidas: {
    operativas: { total: number; porCategoria: { nombre: string; total: number }[]; detalle: { id: string; fecha: string; concepto: string; monto: number; categoria: string; proveedor: string | null; cuenta: string | null; metodoPago: string }[] };
    retiros: { total: number; detalle: { id: string; fecha: string; concepto: string; monto: number; categoria: string }[] };
    deudasPagadas: { total: number; detalle: { nombre: string; categoria: string; monto: number; numeroCuota: number }[] };
    repartosPagados: { total: number; detalle: { nombre: string; beneficiario: string; periodo: string; monto: number }[] };
  };
  resumen: { flujoOperativo: number; flujoNeto: number; totalIngresos: number; totalEgresos: number; compromisosPasivos: number };
  posicionBancaria: { nombre: string; banco: string | null; saldo: number }[];
  compromisosVigentes: {
    pasivos: { nombre: string; categoria: string; saldo: number; proximasCuotas: { monto: number; fechaVencimiento: string }[] }[];
    repartos: { nombre: string; beneficiario: string; montoBase: number; tipoPeriodo: string; socio: string | null; pct: number | null }[];
  };
}

interface AsistData {
  periodo: string;
  diasHabiles: string[];
  personal: {
    id: string; nombre: string; puesto: string;
    presentes: number; retardos: number; faltas: number; permisos: number; vacaciones: number;
    diasRegistrados: number; totalHabiles: number; pctAsistencia: number; minRetardoTotal: number;
    detalleDias: { fecha: string; estado: string; minutosRetardo: number | null; notas: string | null }[];
  }[];
  totales: {
    presentes: number; retardos: number; faltas: number; permisos: number; vacaciones: number;
    diasHabiles: number; totalPersonal: number; pctAsistenciaGeneral: number;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const MESES_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function fmt(n: number) {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
const fmtDate = (s: string) =>
  new Date(s + (s.length === 10 ? "T12:00:00" : "")).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
const fmtFull = (s: string) =>
  new Date(s + (s.length === 10 ? "T12:00:00" : "")).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
const colorNum = (n: number) => (n >= 0 ? "text-green-400" : "text-red-400");

function mesLabel(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} ${y}`;
}
function navMes(mes: string, delta: number) {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function defaultMes() {
  const d = new Date();
  const p = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}`;
}

// ── Chart Colors ──────────────────────────────────────────────────────────────
const CHART_COLORS = {
  primary: '#B3985B',
  green: '#22c55e',
  red: '#ef4444',
  blue: '#3b82f6',
  orange: '#f97316',
  purple: '#a855f7',
  gray: '#6b7280',
  yellow: '#eab308',
};

// ── PDF State ─────────────────────────────────────────────────────────────────
interface PDFState {
  analisis: string;
  propuesta1Titulo: string;
  propuesta1Desc: string;
  propuesta2Titulo: string;
  propuesta2Desc: string;
  propuesta3Titulo: string;
  propuesta3Desc: string;
  comentariosFinales: string;
  responsable: string;
  [key: string]: string;
}
const PDF_DEFAULT: PDFState = {
  analisis: '',
  propuesta1Titulo: '', propuesta1Desc: '',
  propuesta2Titulo: '', propuesta2Desc: '',
  propuesta3Titulo: '', propuesta3Desc: '',
  comentariosFinales: '',
  responsable: '',
};

// ── Sub-components ─────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, color = "text-white", borderColor,
}: {
  label: string; value: string; sub?: string; color?: string; borderColor?: string;
}) {
  return (
    <div
      className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 transition-all hover:border-[#2a2a2a]"
      style={borderColor ? { borderLeft: `3px solid ${borderColor}` } : undefined}
    >
      <p className="text-[#6b7280] text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[#555] text-[10px] mt-0.5">{sub}</p>}
    </div>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#151515] transition-colors"
      >
        <span className="text-white font-semibold text-sm">{title}</span>
        <span className="text-gray-600 text-xs screen-only">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

// Simple mini bar chart (not recharts) for categories
function MiniBarChart({ items, total, color = CHART_COLORS.primary }: { items: { nombre: string; total: number }[]; total: number; color?: string }) {
  return (
    <div className="space-y-2">
      {items.slice(0, 8).map(item => (
        <div key={item.nombre}>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-gray-400 truncate max-w-[60%]">{item.nombre}</span>
            <span className="text-white font-medium">{fmt(item.total)}</span>
          </div>
          <div className="bg-[#1e1e1e] rounded-full h-1.5">
            <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min((item.total / total) * 100, 100)}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── PESTAÑA: BALANCE GENERAL ──────────────────────────────────────────────────
function TabBalance({ mes, onDataLoad }: { mes: string; onDataLoad?: (d: BalanceData) => void }) {
  const [data, setData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/reportes/balance?mes=${mes}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
        onDataLoad?.(d);
      })
      .catch(() => setLoading(false));
  }, [mes, onDataLoad]);

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3">
      <div className="w-5 h-5 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin" />
      <span className="text-gray-600 text-sm">Calculando balance...</span>
    </div>
  );
  if (!data) return <div className="text-center py-16 text-red-500">Error al cargar el balance</div>;

  const balanceDiff = Math.abs(data.activos.totalActivos - data.pasivos.totalPasivos - data.patrimonio.patrimonioNeto);

  // Salud financiera
  const ratio = data.activos.totalActivos > 0 ? data.patrimonio.patrimonioNeto / data.activos.totalActivos : 0;
  const salud = data.patrimonio.patrimonioNeto > 0 && ratio > 0.1 ? 'SALUDABLE' : data.patrimonio.patrimonioNeto > 0 ? 'ATENCION' : 'CRITICO';
  const saludLabel = salud === 'SALUDABLE' ? '✓ Balance Saludable' : salud === 'ATENCION' ? '⚠ Requiere Atención' : '✗ Balance Crítico';
  const saludDesc = salud === 'SALUDABLE'
    ? `Patrimonio positivo (${(ratio * 100).toFixed(1)}% de activos)`
    : salud === 'ATENCION'
    ? `Patrimonio bajo — ${(ratio * 100).toFixed(1)}% de activos`
    : 'Pasivos superan activos — acción inmediata requerida';

  // Gráfica de dona
  const donaData = [
    { name: 'Efectivo', value: data.activos.efectivoYBancos.total, color: CHART_COLORS.blue },
    { name: 'CxC', value: data.activos.cuentasPorCobrar.total, color: CHART_COLORS.green },
    { name: 'Activos Físicos', value: data.activos.activosFijos.total, color: CHART_COLORS.primary },
    { name: 'Intangibles', value: data.activos.activosIntangibles.total, color: CHART_COLORS.purple },
  ].filter(d => d.value > 0);

  // Gráfica de barras comparativa
  const barData = [
    { name: 'Activos', valor: data.activos.totalActivos, fill: CHART_COLORS.blue },
    { name: 'Pasivos', valor: data.pasivos.totalPasivos, fill: CHART_COLORS.red },
    { name: 'Patrimonio', valor: Math.max(data.patrimonio.patrimonioNeto, 0), fill: CHART_COLORS.green },
  ];

  return (
    <div className="space-y-6">
      {/* Estructura societaria */}
      <div className="bg-[#0e0e0e] border border-[#B3985B]/20 rounded-2xl p-4 flex flex-wrap gap-6 items-center">
        <div>
          <p className="text-[#B3985B] text-xs font-semibold">Razón Social</p>
          <p className="text-white text-sm font-medium">{data.estructura.razonSocial}</p>
        </div>
        <div className="flex gap-4 flex-wrap">
          {data.estructura.socios.filter(s => s.pctParticipacion).map(s => (
            <div key={s.nombre} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#B3985B]" />
              <span className="text-gray-300 text-xs">{s.nombre}</span>
              <span className="text-[#B3985B] text-xs font-bold">{s.pctParticipacion}%</span>
              {s.esRepresentante && <span className="text-[10px] text-gray-500 bg-[#1a1a1a] px-1.5 py-0.5 rounded">Rep. Legal</span>}
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Activos" value={fmt(data.activos.totalActivos)} color="text-blue-400" borderColor={CHART_COLORS.blue} sub={`${data.activos.efectivoYBancos.cuentas.length} cuentas`} />
        <KpiCard label="Total Pasivos" value={fmt(data.pasivos.totalPasivos)} color="text-orange-400" borderColor={CHART_COLORS.orange} sub={`${data.pasivos.deudasEstructurales.detalle.length} deudas activas`} />
        <KpiCard
          label="Patrimonio Neto"
          value={fmt(data.patrimonio.patrimonioNeto)}
          color={colorNum(data.patrimonio.patrimonioNeto)}
          borderColor={data.patrimonio.patrimonioNeto >= 0 ? CHART_COLORS.green : CHART_COLORS.red}
          sub="Activos − Pasivos"
        />
        <KpiCard
          label="Flujo del Mes"
          value={fmt(data.resMes.flujoNeto)}
          color={colorNum(data.resMes.flujoNeto)}
          borderColor={data.resMes.flujoNeto >= 0 ? CHART_COLORS.green : CHART_COLORS.red}
          sub={`${fmt(data.resMes.ingresos)} ingresos`}
        />
      </div>

      {/* Indicador de salud */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 flex items-center gap-4">
        <div className={`w-4 h-4 rounded-full flex-shrink-0 ${salud === 'SALUDABLE' ? 'bg-green-500' : salud === 'ATENCION' ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ boxShadow: salud === 'SALUDABLE' ? '0 0 8px #22c55e66' : salud === 'ATENCION' ? '0 0 8px #eab30866' : '0 0 8px #ef444466' }} />
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">{saludLabel}</p>
          <p className="text-[#555] text-xs mt-0.5">{saludDesc}</p>
        </div>
        <div className="text-right">
          <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider">Salud Financiera</p>
          <p className="text-white text-sm font-bold">{(ratio * 100).toFixed(1)}%</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dona */}
        <div className="bg-[#0e0e0e] border border-[#1e1e1e] rounded-2xl p-5">
          <p className="text-white font-semibold text-sm mb-4">Composición de Activos</p>
          <div className="flex items-center gap-4">
            <PieChart width={200} height={200}>
              <Pie data={donaData} cx={100} cy={100} innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                {donaData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v: unknown) => fmt(v as number)} contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 8, fontSize: 11 }} />
            </PieChart>
            <div className="space-y-2 flex-1">
              {donaData.map(d => (
                <div key={d.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-gray-400 text-xs">{d.name}</span>
                  </div>
                  <span className="text-white text-xs font-medium">{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Barras comparativas */}
        <div className="bg-[#0e0e0e] border border-[#1e1e1e] rounded-2xl p-5">
          <p className="text-white font-semibold text-sm mb-4">Activos · Pasivos · Patrimonio</p>
          <ResponsiveContainer width="100%" height={200}>
            <RBarChart data={barData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: unknown) => fmt(v as number)} contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </RBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activos y Pasivos detalle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ACTIVOS */}
        <Section title="ACTIVOS — Detalle">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-gray-400 text-xs font-medium">Efectivo y Bancos</p>
                <p className="text-white text-sm font-semibold">{fmt(data.activos.efectivoYBancos.total)}</p>
              </div>
              <div className="space-y-1 ml-3">
                {data.activos.efectivoYBancos.cuentas.map(c => (
                  <div key={c.nombre} className="flex justify-between text-xs">
                    <span className="text-gray-500">{c.nombre} {c.banco ? `(${c.banco})` : ""}</span>
                    <span className={colorNum(c.posicion)}>{fmt(c.posicion)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center border-t border-[#1e1e1e] pt-3">
              <p className="text-gray-400 text-xs">Cuentas por Cobrar</p>
              <p className="text-blue-400 text-sm font-medium">{fmt(data.activos.cuentasPorCobrar.total)}</p>
            </div>
            <div className="border-t border-[#1e1e1e] pt-3">
              <p className="text-gray-400 text-xs font-medium mb-2">Activos de Mainstage Pro</p>
              <div className="space-y-1 ml-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Físicos ({data.activos.activosFijos.etiqueta || "OFICINA"})</span>
                  <span className="text-gray-300 font-medium">{fmt(data.activos.activosFijos.total)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Intangibles ({data.activos.activosIntangibles.etiqueta || "Plataforma"})</span>
                  <span className="text-gray-300 font-medium">{fmt(data.activos.activosIntangibles.total)}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center border-t-2 border-[#B3985B]/30 pt-3 mt-2">
              <p className="text-white text-sm font-bold">TOTAL ACTIVOS</p>
              <p className="text-blue-400 text-base font-bold">{fmt(data.activos.totalActivos)}</p>
            </div>
          </div>
        </Section>

        {/* PASIVOS + PATRIMONIO */}
        <div className="space-y-4">
          <Section title="PASIVOS — Detalle">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-gray-400 text-xs font-medium">Deudas Estructurales</p>
                  <p className="text-orange-400 text-sm font-semibold">{fmt(data.pasivos.deudasEstructurales.total)}</p>
                </div>
                {data.pasivos.deudasEstructurales.detalle.length > 0 && (
                  <div className="space-y-2 ml-3">
                    {data.pasivos.deudasEstructurales.detalle.map((d, i) => {
                      const pct = d.montoTotal > 0 ? (d.montoPagado / d.montoTotal) * 100 : 0;
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500 truncate max-w-[65%]">{d.nombre}</span>
                            <span className="text-orange-400">{fmt(d.montoTotal - d.montoPagado)}</span>
                          </div>
                          <div className="bg-[#1e1e1e] rounded-full h-1">
                            <div className="h-1 rounded-full bg-orange-500/60 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center border-t border-[#1e1e1e] pt-3">
                <p className="text-gray-400 text-xs">CxP Operativas</p>
                <p className="text-orange-300 text-sm font-medium">{fmt(data.pasivos.cuentasPorPagar.total)}</p>
              </div>
              <div className="flex justify-between items-center border-t border-[#1e1e1e] pt-3">
                <p className="text-gray-400 text-xs">Repartos Pendientes</p>
                <p className="text-yellow-400 text-sm font-medium">{fmt(data.pasivos.repartosPendientes.total)}</p>
              </div>
              <div className="flex justify-between items-center border-t-2 border-orange-900/40 pt-3 mt-2">
                <p className="text-white text-sm font-bold">TOTAL PASIVOS</p>
                <p className="text-orange-400 text-base font-bold">{fmt(data.pasivos.totalPasivos)}</p>
              </div>
            </div>
          </Section>

          <Section title="PATRIMONIO">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-gray-400 text-xs">Utilidad acumulada</p>
                <p className={`text-sm font-medium ${colorNum(data.patrimonio.utilidadAcumulada)}`}>{fmt(data.patrimonio.utilidadAcumulada)}</p>
              </div>
              <div className="flex justify-between items-center border-t-2 border-green-900/30 pt-3">
                <p className="text-white text-sm font-bold">PATRIMONIO NETO</p>
                <p className={`text-base font-bold ${colorNum(data.patrimonio.patrimonioNeto)}`}>{fmt(data.patrimonio.patrimonioNeto)}</p>
              </div>
              <p className="text-gray-600 text-[10px]">
                Activos ({fmt(data.activos.totalActivos)}) − Pasivos ({fmt(data.pasivos.totalPasivos)})
              </p>
              {data.estructura.socios.filter(s => s.pctParticipacion).length > 0 && (
                <div className="border-t border-[#1e1e1e] pt-3 space-y-1.5">
                  <p className="text-gray-500 text-xs font-medium mb-2">Valor por socio</p>
                  {data.estructura.socios.filter(s => s.pctParticipacion).map(s => (
                    <div key={s.nombre} className="flex justify-between text-xs">
                      <span className="text-gray-400">{s.nombre}</span>
                      <span className="text-[#B3985B] font-medium">{fmt(data.patrimonio.patrimonioNeto * (s.pctParticipacion! / 100))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>

      {/* Verificación */}
      <div className={`rounded-xl p-3 text-xs flex items-center gap-2 border ${balanceDiff < 1 ? "bg-green-900/10 border-green-900/30 text-green-400" : "bg-yellow-900/10 border-yellow-900/30 text-yellow-400"}`}>
        <span>{balanceDiff < 1 ? "✓" : "⚠"}</span>
        <span>
          Verificación: Activos ({fmt(data.activos.totalActivos)}) = Pasivos ({fmt(data.pasivos.totalPasivos)}) + Patrimonio ({fmt(data.patrimonio.patrimonioNeto)})
          {balanceDiff >= 1 && ` — diferencia: ${fmt(balanceDiff)}`}
        </span>
      </div>
    </div>
  );
}

// ── Acordeón de categoría con estado de cuenta ───────────────────────────────
type MovRow = { id: string; fecha: string; concepto: string; monto: number; categoria: string; cuenta?: string | null; metodoPago?: string; proveedor?: string | null; cliente?: string | null };

function CatAccordion({ nombre, total, movimientos, color, bgAccent, borderAccent }: {
  nombre: string; total: number; movimientos: MovRow[];
  color: string; bgAccent: string; borderAccent: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border ${borderAccent} rounded-xl overflow-hidden`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 ${bgAccent} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-sm transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>›</span>
          <div className="text-left min-w-0">
            <p className={`text-xs font-semibold ${color} truncate`}>{nombre}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">{movimientos.length} movimiento{movimientos.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <span className={`text-sm font-bold tabular-nums shrink-0 ${color}`}>{fmt(total)}</span>
      </button>
      {open && (
        <div className="bg-[#0a0a0a]">
          <div className="grid grid-cols-[72px_1fr_auto] gap-2 px-4 py-2 border-b border-[#1a1a1a]">
            <span className="text-[9px] text-gray-700 uppercase tracking-wider">Fecha</span>
            <span className="text-[9px] text-gray-700 uppercase tracking-wider">Concepto</span>
            <span className="text-[9px] text-gray-700 uppercase tracking-wider text-right">Importe</span>
          </div>
          {movimientos.map(m => (
            <div key={m.id} className="grid grid-cols-[72px_1fr_auto] gap-2 px-4 py-2.5 border-b border-[#111] last:border-0 hover:bg-[#111] transition-colors">
              <span className="text-[10px] text-gray-600 tabular-nums">{fmtDate(m.fecha)}</span>
              <div className="min-w-0">
                <p className="text-xs text-white truncate">{m.concepto}</p>
                {(m.cuenta || m.proveedor || m.cliente) && (
                  <p className="text-[10px] text-gray-600 truncate">
                    {m.cliente ?? m.proveedor ?? ''}{m.cuenta ? ` · ${m.cuenta}` : ''}
                  </p>
                )}
              </div>
              <span className={`text-xs font-semibold tabular-nums shrink-0 ${color}`}>{fmt(m.monto)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-2 border-t border-[#1e1e1e] bg-[#0d0d0d]">
            <span className="text-[9px] text-gray-600 uppercase tracking-wider">Subtotal {nombre}</span>
            <span className={`text-xs font-bold tabular-nums ${color}`}>{fmt(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PESTAÑA: FLUJO DE CAJA ────────────────────────────────────────────────────
function TabFlujo({ mes, onDataLoad }: { mes: string; onDataLoad?: (d: FlujoData) => void }) {
  const [data, setData] = useState<FlujoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/reportes/flujo?mes=${mes}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
        onDataLoad?.(d);
      })
      .catch(() => setLoading(false));
  }, [mes, onDataLoad]);

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3">
      <div className="w-5 h-5 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin" />
      <span className="text-gray-600 text-sm">Calculando flujo...</span>
    </div>
  );
  if (!data) return <div className="text-center py-16 text-red-500">Error al cargar el flujo</div>;

  const toggle = (k: string) => setExpandedSection(p => p === k ? null : k);

  const totalSalidas = data.salidas.operativas.total + data.salidas.retiros.total + data.salidas.deudasPagadas.total + data.salidas.repartosPagados.total;
  const pctOperativo = totalSalidas > 0 ? (data.salidas.operativas.total / totalSalidas) * 100 : 0;
  const pctEstructural = 100 - pctOperativo;

  // Comparativa ingresos vs gastos por categoría
  const ingresosTop = data.entradas.porCategoria.slice(0, 5);
  const gastosTop = data.salidas.operativas.porCategoria.slice(0, 5);
  const comparativaData = [
    ...ingresosTop.map(c => ({ name: c.nombre.length > 12 ? c.nombre.substring(0, 12) + '…' : c.nombre, Ingresos: c.total, Gastos: 0 })),
    ...gastosTop.map(c => ({ name: c.nombre.length > 12 ? c.nombre.substring(0, 12) + '…' : c.nombre, Ingresos: 0, Gastos: c.total })),
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Entradas Totales" value={fmt(data.resumen.totalIngresos)} color="text-green-400" borderColor={CHART_COLORS.green} sub={`${data.entradas.detalle.length} movimientos`} />
        <KpiCard label="Salidas Operativas" value={fmt(data.salidas.operativas.total)} color="text-red-400" borderColor={CHART_COLORS.red} sub={`${data.salidas.operativas.detalle.length} gastos`} />
        <KpiCard
          label="Compromisos Pasivos"
          value={fmt(data.resumen.compromisosPasivos)}
          color="text-orange-400"
          borderColor={CHART_COLORS.orange}
          sub="deudas + repartos"
        />
        <KpiCard
          label="Flujo Neto"
          value={fmt(data.resumen.flujoNeto)}
          color={colorNum(data.resumen.flujoNeto)}
          borderColor={data.resumen.flujoNeto >= 0 ? CHART_COLORS.green : CHART_COLORS.red}
          sub={`Operativo: ${fmt(data.resumen.flujoOperativo)}`}
        />
      </div>

      {/* Distribución del gasto */}
      <div className="bg-[#0e0e0e] border border-[#1e1e1e] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-semibold text-sm">Distribución del Gasto Total</p>
          <span className="text-gray-500 text-xs">{fmt(totalSalidas)}</span>
        </div>
        <div className="flex rounded-full overflow-hidden h-3 bg-[#1a1a1a]">
          <div className="h-3 bg-red-500 transition-all" style={{ width: `${pctOperativo}%` }} title={`Operativo ${pctOperativo.toFixed(1)}%`} />
          <div className="h-3 bg-orange-500 transition-all" style={{ width: `${pctEstructural}%` }} title={`Estructural ${pctEstructural.toFixed(1)}%`} />
        </div>
        <div className="flex gap-6 mt-2 text-xs">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-red-500" /><span className="text-gray-400">Operativo</span><span className="text-white font-medium ml-1">{pctOperativo.toFixed(1)}%</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-orange-500" /><span className="text-gray-400">Estructural</span><span className="text-white font-medium ml-1">{pctEstructural.toFixed(1)}%</span></div>
        </div>
      </div>

      {/* Gráfica comparativa */}
      {comparativaData.length > 0 && (
        <div className="bg-[#0e0e0e] border border-[#1e1e1e] rounded-2xl p-5">
          <p className="text-white font-semibold text-sm mb-4">Ingresos vs Gastos por Categoría</p>
          <ResponsiveContainer width="100%" height={220}>
            <RBarChart data={comparativaData} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} angle={-35} textAnchor="end" axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: unknown) => fmt(v as number)} contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ color: '#6b7280', fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="Ingresos" fill={CHART_COLORS.green} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Gastos" fill={CHART_COLORS.red} radius={[3, 3, 0, 0]} />
            </RBarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Posición bancaria */}
      <Section title="Posición bancaria actual">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.posicionBancaria.map(c => (
            <div key={c.nombre} className="bg-[#141414] rounded-xl p-3">
              <p className="text-gray-500 text-xs mb-0.5">{c.nombre}</p>
              <p className={`text-sm font-bold ${colorNum(c.saldo)}`}>{fmt(c.saldo)}</p>
              {c.banco && <p className="text-gray-600 text-[10px]">{c.banco}</p>}
            </div>
          ))}
        </div>
      </Section>

      {/* ── ENTRADAS por categoría (estado de cuenta) ── */}
      <Section title={`Entradas · ${fmt(data.entradas.total)}`}>
        <div className="space-y-3">
          <MiniBarChart items={data.entradas.porCategoria} total={data.entradas.total} color={CHART_COLORS.green} />
          <div className="space-y-2 pt-1">
            {data.entradas.porCategoria
              .filter(cat => cat.nombre !== 'Sin categoría')
              .map(cat => (
                <CatAccordion
                  key={cat.nombre}
                  nombre={cat.nombre}
                  total={cat.total}
                  movimientos={data.entradas.detalle.filter(m => m.categoria === cat.nombre)}
                  color="text-green-400"
                  bgAccent="bg-green-900/10"
                  borderAccent="border-green-900/20"
                />
              ))
            }
          </div>
          {/* Sin categorizar — entradas */}
          {data.entradas.detalle.filter(m => !m.categoria || m.categoria === 'Sin categoría').length > 0 && (
            <div className="border border-yellow-900/30 rounded-xl overflow-hidden mt-2">
              <div className="flex items-center justify-between px-4 py-3 bg-yellow-900/10">
                <div>
                  <p className="text-xs font-semibold text-yellow-400">⚠ Sin categorizar</p>
                  <p className="text-[10px] text-gray-600">{data.entradas.detalle.filter(m => !m.categoria || m.categoria === 'Sin categoría').length} movimiento(s)</p>
                </div>
                <span className="text-sm font-bold tabular-nums text-yellow-400">
                  {fmt(data.entradas.detalle.filter(m => !m.categoria || m.categoria === 'Sin categoría').reduce((s, m) => s + m.monto, 0))}
                </span>
              </div>
              {data.entradas.detalle.filter(m => !m.categoria || m.categoria === 'Sin categoría').map(m => (
                <div key={m.id} className="grid grid-cols-[72px_1fr_auto] gap-2 px-4 py-2.5 border-b border-[#111] last:border-0 bg-[#0a0a0a]">
                  <span className="text-[10px] text-gray-600">{fmtDate(m.fecha)}</span>
                  <p className="text-xs text-white truncate">{m.concepto}</p>
                  <span className="text-xs font-semibold text-green-400 tabular-nums">{fmt(m.monto)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* ── SALIDAS por categoría (estado de cuenta) ── */}
      <Section title={`Salidas operativas · ${fmt(data.salidas.operativas.total)}`}>
        <div className="space-y-3">
          <MiniBarChart items={data.salidas.operativas.porCategoria} total={data.salidas.operativas.total} color={CHART_COLORS.red} />
          <div className="space-y-2 pt-1">
            {data.salidas.operativas.porCategoria
              .filter(cat => cat.nombre !== 'Sin categoría')
              .map(cat => (
                <CatAccordion
                  key={cat.nombre}
                  nombre={cat.nombre}
                  total={cat.total}
                  movimientos={data.salidas.operativas.detalle.filter(m => m.categoria === cat.nombre)}
                  color="text-red-400"
                  bgAccent="bg-red-900/10"
                  borderAccent="border-red-900/20"
                />
              ))
            }
          </div>
          {/* Sin categorizar — salidas */}
          {data.salidas.operativas.detalle.filter(m => !m.categoria || m.categoria === 'Sin categoría').length > 0 && (
            <div className="border border-yellow-900/30 rounded-xl overflow-hidden mt-2">
              <div className="flex items-center justify-between px-4 py-3 bg-yellow-900/10">
                <div>
                  <p className="text-xs font-semibold text-yellow-400">⚠ Sin categorizar</p>
                  <p className="text-[10px] text-gray-600">{data.salidas.operativas.detalle.filter(m => !m.categoria || m.categoria === 'Sin categoría').length} movimiento(s) sin categoría</p>
                </div>
                <span className="text-sm font-bold tabular-nums text-yellow-400">
                  {fmt(data.salidas.operativas.detalle.filter(m => !m.categoria || m.categoria === 'Sin categoría').reduce((s, m) => s + m.monto, 0))}
                </span>
              </div>
              {data.salidas.operativas.detalle.filter(m => !m.categoria || m.categoria === 'Sin categoría').map(m => (
                <div key={m.id} className="grid grid-cols-[72px_1fr_auto] gap-2 px-4 py-2.5 border-b border-[#111] last:border-0 bg-[#0a0a0a]">
                  <span className="text-[10px] text-gray-600">{fmtDate(m.fecha)}</span>
                  <p className="text-xs text-white truncate">{m.concepto}</p>
                  <span className="text-xs font-semibold text-red-400 tabular-nums">{fmt(m.monto)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Compromisos estructurales */}
      {(data.salidas.retiros.total > 0 || data.salidas.deudasPagadas.total > 0 || data.salidas.repartosPagados.total > 0) && (
        <Section title="Compromisos estructurales (no operativo)" defaultOpen={true}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.salidas.retiros.total > 0 && (
              <div>
                <p className="text-gray-400 text-xs mb-2 font-medium">Retiros</p>
                {data.salidas.retiros.detalle.map((m, i) => (
                  <div key={i} className="flex justify-between text-xs py-1 border-b border-[#1a1a1a]">
                    <span className="text-gray-500 truncate max-w-[65%]">{m.concepto}</span>
                    <span className="text-yellow-400">{fmt(m.monto)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs pt-2 font-semibold">
                  <span className="text-gray-300">Total</span>
                  <span className="text-yellow-400">{fmt(data.salidas.retiros.total)}</span>
                </div>
              </div>
            )}
            {data.salidas.deudasPagadas.total > 0 && (
              <div>
                <p className="text-gray-400 text-xs mb-2 font-medium">Pagos a deudas</p>
                {data.salidas.deudasPagadas.detalle.map((d, i) => (
                  <div key={i} className="flex justify-between text-xs py-1 border-b border-[#1a1a1a]">
                    <span className="text-gray-500 truncate max-w-[65%]">{d.nombre} (cuota {d.numeroCuota})</span>
                    <span className="text-orange-400">{fmt(d.monto)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs pt-2 font-semibold">
                  <span className="text-gray-300">Total</span>
                  <span className="text-orange-400">{fmt(data.salidas.deudasPagadas.total)}</span>
                </div>
              </div>
            )}
            {data.salidas.repartosPagados.total > 0 && (
              <div>
                <p className="text-gray-400 text-xs mb-2 font-medium">Repartos de utilidades</p>
                {data.salidas.repartosPagados.detalle.map((r, i) => (
                  <div key={i} className="flex justify-between text-xs py-1 border-b border-[#1a1a1a]">
                    <span className="text-gray-500 truncate max-w-[65%]">{r.beneficiario} ({r.periodo})</span>
                    <span className="text-purple-400">{fmt(r.monto)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs pt-2 font-semibold">
                  <span className="text-gray-300">Total</span>
                  <span className="text-purple-400">{fmt(data.salidas.repartosPagados.total)}</span>
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Compromisos vigentes */}
      {(data.compromisosVigentes.pasivos.length > 0 || data.compromisosVigentes.repartos.length > 0) && (
        <Section title="Compromisos vigentes (próximos vencimientos)" defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.compromisosVigentes.pasivos.length > 0 && (
              <div>
                <p className="text-gray-400 text-xs mb-2 font-medium">Deudas activas</p>
                {data.compromisosVigentes.pasivos.map((p, i) => (
                  <div key={i} className="mb-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-white">{p.nombre}</span>
                      <span className="text-orange-400 font-medium">{fmt(p.saldo)}</span>
                    </div>
                    {p.proximasCuotas.slice(0, 2).map((c, j) => (
                      <div key={j} className="flex justify-between text-[10px] text-gray-500 ml-2">
                        <span>Cuota — {fmtFull(c.fechaVencimiento)}</span>
                        <span>{fmt(c.monto)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {data.compromisosVigentes.repartos.length > 0 && (
              <div>
                <p className="text-gray-400 text-xs mb-2 font-medium">Repartos periódicos</p>
                {data.compromisosVigentes.repartos.map((r, i) => (
                  <div key={i} className="flex justify-between text-xs py-1 border-b border-[#1a1a1a]">
                    <span className="text-gray-400">{r.beneficiario}</span>
                    <div className="text-right">
                      <p className="text-purple-400 font-medium">{fmt(r.montoBase)}</p>
                      <p className="text-gray-600 text-[10px]">{r.tipoPeriodo.toLowerCase()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── PESTAÑA: ASISTENCIAS ──────────────────────────────────────────────────────
const ESTADO_COLOR: Record<string, string> = {
  PRESENTE: "bg-green-500",
  RETARDO: "bg-yellow-500",
  FALTA: "bg-red-500",
  PERMISO: "bg-blue-400",
  VACACIONES: "bg-purple-400",
  SIN_REGISTRO: "bg-[#222]",
};
const ESTADO_LABEL: Record<string, string> = {
  PRESENTE: "P", RETARDO: "R", FALTA: "F", PERMISO: "PE", VACACIONES: "V", SIN_REGISTRO: "—",
};

function TabAsistencias({ mes, onDataLoad }: { mes: string; onDataLoad?: (d: AsistData) => void }) {
  const [data, setData] = useState<AsistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState<"resumen" | "calendario">("resumen");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/reportes/asistencias?mes=${mes}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
        onDataLoad?.(d);
      })
      .catch(() => setLoading(false));
  }, [mes, onDataLoad]);

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3">
      <div className="w-5 h-5 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin" />
      <span className="text-gray-600 text-sm">Calculando asistencias...</span>
    </div>
  );
  if (!data) return <div className="text-center py-16 text-red-500">Error al cargar asistencias</div>;

  // KPI data for Recharts bar chart
  const asistBarData = data.personal.map(p => ({
    name: p.nombre.split(' ')[0],
    P: p.presentes,
    R: p.retardos,
    F: p.faltas,
    pct: p.pctAsistencia,
  }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Días Hábiles" value={String(data.totales.diasHabiles)} sub="Lunes a viernes" />
        <KpiCard
          label="Asistencia General"
          value={`${data.totales.pctAsistenciaGeneral}%`}
          color={data.totales.pctAsistenciaGeneral >= 90 ? "text-green-400" : data.totales.pctAsistenciaGeneral >= 75 ? "text-yellow-400" : "text-red-400"}
          borderColor={data.totales.pctAsistenciaGeneral >= 90 ? CHART_COLORS.green : data.totales.pctAsistenciaGeneral >= 75 ? CHART_COLORS.yellow : CHART_COLORS.red}
          sub={`${data.totales.totalPersonal} colaboradores`}
        />
        <KpiCard label="Total Presentes" value={String(data.totales.presentes)} color="text-green-400" borderColor={CHART_COLORS.green} />
        <KpiCard label="Retardos · Faltas" value={`${data.totales.retardos} · ${data.totales.faltas}`} color="text-yellow-400" borderColor={CHART_COLORS.yellow} sub="en el período" />
      </div>

      {/* Gráfica de barras por empleado */}
      {asistBarData.length > 0 && (
        <div className="bg-[#0e0e0e] border border-[#1e1e1e] rounded-2xl p-5">
          <p className="text-white font-semibold text-sm mb-4">Asistencia por Colaborador</p>
          <ResponsiveContainer width="100%" height={220}>
            <RBarChart data={asistBarData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ color: '#6b7280', fontSize: 11 }} />
              <Bar dataKey="P" name="Presentes" fill={CHART_COLORS.green} radius={[3, 3, 0, 0]} />
              <Bar dataKey="R" name="Retardos" fill={CHART_COLORS.yellow} radius={[3, 3, 0, 0]} />
              <Bar dataKey="F" name="Faltas" fill={CHART_COLORS.red} radius={[3, 3, 0, 0]} />
            </RBarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Selector de vista */}
      <div className="flex gap-2 screen-only">
        <button
          onClick={() => setVista("resumen")}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors border ${vista === "resumen" ? "bg-[#B3985B] border-[#B3985B] text-black" : "border-[#2a2a2a] text-gray-400 hover:text-white"}`}
        >
          Resumen por persona
        </button>
        <button
          onClick={() => setVista("calendario")}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors border ${vista === "calendario" ? "bg-[#B3985B] border-[#B3985B] text-black" : "border-[#2a2a2a] text-gray-400 hover:text-white"}`}
        >
          Vista calendario
        </button>
      </div>

      {/* Resumen por persona */}
      {vista === "resumen" && (
        <div className="bg-[#0e0e0e] border border-[#1e1e1e] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Colaborador", "Puesto", "Presentes", "Retardos", "Faltas", "Permisos", "% Asistencia"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-gray-500 text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.personal.map((p, i) => (
                <tr key={p.id} className={`border-b border-[#1a1a1a] hover:bg-[#141414] transition-colors ${i % 2 === 0 ? "" : "bg-[#0a0a0a]"}`}>
                  <td className="px-4 py-3 text-white text-xs font-medium">{p.nombre}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.puesto}</td>
                  <td className="px-4 py-3 text-green-400 text-xs font-medium">{p.presentes}</td>
                  <td className="px-4 py-3 text-yellow-400 text-xs font-medium">{p.retardos}</td>
                  <td className="px-4 py-3 text-red-400 text-xs font-medium">{p.faltas}</td>
                  <td className="px-4 py-3 text-blue-400 text-xs font-medium">{p.permisos}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#1e1e1e] rounded-full h-1.5 min-w-[60px]">
                        <div
                          className={`h-1.5 rounded-full transition-all ${p.pctAsistencia >= 90 ? "bg-green-500" : p.pctAsistencia >= 75 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{ width: `${p.pctAsistencia}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${p.pctAsistencia >= 90 ? "text-green-400" : p.pctAsistencia >= 75 ? "text-yellow-400" : "text-red-400"}`}>
                        {p.pctAsistencia}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Vista calendario */}
      {vista === "calendario" && (
        <div className="space-y-4">
          {data.personal.map(p => (
            <div key={p.id} className="bg-[#0e0e0e] border border-[#1e1e1e] rounded-2xl p-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-white text-sm font-medium">{p.nombre}</p>
                  <p className="text-gray-500 text-xs">{p.puesto}</p>
                </div>
                <div className="flex gap-3 text-xs text-right">
                  <span className="text-green-400">{p.presentes} pres.</span>
                  <span className="text-yellow-400">{p.retardos} ret.</span>
                  <span className="text-red-400">{p.faltas} falt.</span>
                  <span className={`font-semibold ${p.pctAsistencia >= 90 ? "text-green-400" : p.pctAsistencia >= 75 ? "text-yellow-400" : "text-red-400"}`}>
                    {p.pctAsistencia}%
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {data.diasHabiles.map(dia => {
                  const reg = p.detalleDias.find(d => d.fecha === dia);
                  const estado = reg?.estado ?? "SIN_REGISTRO";
                  return (
                    <div
                      key={dia}
                      title={`${fmtDate(dia)} — ${estado}${reg?.minutosRetardo ? ` (${reg.minutosRetardo} min retardo)` : ""}`}
                      className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold cursor-default transition-opacity hover:opacity-80 ${ESTADO_COLOR[estado]}`}
                    >
                      {ESTADO_LABEL[estado]}
                    </div>
                  );
                })}
              </div>
              {p.minRetardoTotal > 0 && (
                <p className="text-yellow-500 text-[10px] mt-2">⚠ {p.minRetardoTotal} minutos de retardo acumulados</p>
              )}
            </div>
          ))}

          {/* Leyenda */}
          <div className="flex gap-4 flex-wrap">
            {Object.entries(ESTADO_LABEL).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className={`w-4 h-4 rounded ${ESTADO_COLOR[k]}`} />
                {k.replace("_", " ")}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
type Tab = "balance" | "flujo" | "asistencias";

export default function ReportesAdminPage() {
  const [tab, setTab] = useState<Tab>("balance");
  const [mes, setMes] = useState(defaultMes);
  const [pdfState, setPdfState] = useState<PDFState>(PDF_DEFAULT);
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadPDF() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/admin/reportes/pdf?mes=${mes}&tab=${tab}`);
      if (!res.ok) { alert('Error al generar el PDF'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte-Admin-${tab}-${mes}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Error al generar el PDF'); }
    finally { setDownloading(false); }
  }

  // Shared data for print layout
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [flujoData, setFlujoData] = useState<FlujoData | null>(null);
  const [asistData, setAsistData] = useState<AsistData | null>(null);

  const onBalanceLoad = useCallback((d: BalanceData) => setBalanceData(d), []);
  const onFlujoLoad = useCallback((d: FlujoData) => setFlujoData(d), []);
  const onAsistLoad = useCallback((d: AsistData) => setAsistData(d), []);

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "balance", label: "Balance General", icon: "⚖️" },
    { key: "flujo", label: "Flujo de Caja", icon: "💸" },
    { key: "asistencias", label: "Asistencias", icon: "📋" },
  ];

  const razonSocial = balanceData?.estructura.razonSocial ?? "Escenario Principal S.A. de C.V.";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      {/* ── SCREEN CONTENT ── */}
      <div className="screen-content p-3 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
          <div>
            <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-1">Administración</p>
            <h1 className="text-2xl font-bold text-white">Reportes de Administración</h1>
            <p className="text-gray-500 text-sm mt-0.5">Escenario Principal S.A. de C.V. · Consolidado ejecutivo</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Selector de mes */}
            <div className="flex items-center gap-2 bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-2">
              <button onClick={() => setMes(m => navMes(m, -1))} className="text-gray-400 hover:text-white px-1 transition-colors">‹</button>
              <span className="text-white text-sm font-medium min-w-[120px] text-center">{mesLabel(mes)}</span>
              <button onClick={() => setMes(m => navMes(m, 1))} className="text-gray-400 hover:text-white px-1 transition-colors">›</button>
              <input
                type="month"
                value={mes}
                onChange={e => setMes(e.target.value)}
                className="bg-transparent border-none outline-none text-gray-500 text-xs cursor-pointer w-5"
                title="Seleccionar mes"
              />
            </div>
            {/* Botón PDF */}
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#B3985B] hover:bg-[#c9a96e] disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-semibold rounded-lg transition-colors"
            >
              {downloading
                ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 15V3M7 10l5 5 5-5M20 21H4"/></svg>
              }
              {downloading ? 'Generando…' : 'Descargar PDF'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-[#1a1a1a] flex gap-0 no-print">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm border-b-2 transition-colors ${
                tab === t.key ? 'border-[#B3985B] text-white font-medium' : 'border-transparent text-white/40 hover:text-white/70'
              }`}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {tab === "balance" && <TabBalance mes={mes} onDataLoad={onBalanceLoad} />}
          {tab === "flujo" && <TabFlujo mes={mes} onDataLoad={onFlujoLoad} />}
          {tab === "asistencias" && <TabAsistencias mes={mes} onDataLoad={onAsistLoad} />}
        </div>

        {/* ── ANÁLISIS INLINE (siempre visible) ── */}
        <div className="no-print mt-8 space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-[#1e1e1e]">
            <span className="text-[#B3985B] text-xs font-semibold uppercase tracking-widest">Análisis ejecutivo</span>
            <span className="text-[#333] text-xs">· Se incluye en el PDF</span>
          </div>

          {/* Responsable */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
            <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider mb-1.5">Elaborado por</label>
            <input
              value={pdfState.responsable}
              onChange={e => setPdfState(p => ({ ...p, responsable: e.target.value }))}
              placeholder="Nombre del responsable"
              className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-white text-sm focus:border-[#B3985B]/50 outline-none transition-colors"
            />
          </div>

          {/* Análisis del período */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1e1e1e]">
              <h3 className="text-sm font-semibold text-[#B3985B]">Análisis del período</h3>
            </div>
            <div className="p-5">
              <textarea
                value={pdfState.analisis}
                onChange={e => setPdfState(p => ({ ...p, analisis: e.target.value }))}
                placeholder="Describe el desempeño financiero del período, puntos clave, anomalías..."
                rows={4}
                className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/40 resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* 3 Propuestas */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1e1e1e]">
              <h3 className="text-sm font-semibold text-purple-400">Propuestas de mejora</h3>
            </div>
            <div className="p-5 space-y-4">
              {([1, 2, 3] as const).map(n => (
                <div key={n} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4">
                  <p className="text-purple-400 text-[10px] uppercase tracking-wider font-semibold mb-3">Propuesta {n}</p>
                  <input
                    value={pdfState[`propuesta${n}Titulo`]}
                    onChange={e => setPdfState(p => ({ ...p, [`propuesta${n}Titulo`]: e.target.value }))}
                    placeholder="Título de la propuesta"
                    className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-white text-sm mb-2 focus:border-[#B3985B]/40 outline-none transition-colors"
                  />
                  <textarea
                    value={pdfState[`propuesta${n}Desc`]}
                    onChange={e => setPdfState(p => ({ ...p, [`propuesta${n}Desc`]: e.target.value }))}
                    placeholder="Descripción y acciones concretas..."
                    rows={2}
                    className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-white text-sm resize-none focus:border-[#B3985B]/40 outline-none transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Comentarios finales */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1e1e1e]">
              <h3 className="text-sm font-semibold text-[#B3985B]">Comentarios finales</h3>
            </div>
            <div className="p-5">
              <textarea
                value={pdfState.comentariosFinales}
                onChange={e => setPdfState(p => ({ ...p, comentariosFinales: e.target.value }))}
                placeholder="Conclusiones, próximos pasos, compromisos..."
                rows={3}
                className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/40 resize-none leading-relaxed"
              />
            </div>
          </div>
        </div>

      </div>



      {/* ── PRINT LAYOUT — visible SOLO al imprimir ── */}
      <div className="print-layout" id="print-report" style={{ background: 'white', color: 'black', padding: '0', fontFamily: 'system-ui, sans-serif' }}>
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #B3985B', paddingBottom: 16, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 'bold', color: '#000', letterSpacing: -0.5 }}>Reporte de Administración</div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{razonSocial}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Módulo: {tab === 'balance' ? 'Balance General' : tab === 'flujo' ? 'Flujo de Caja' : 'Asistencias'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#B3985B' }}>MAINSTAGE PRO</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Período: {mesLabel(mes)}</div>
            <div style={{ fontSize: 11, color: '#888' }}>Generado: {new Date().toLocaleDateString('es-MX')}</div>
          </div>
        </div>

        {/* DATOS FINANCIEROS según tab activo */}
        {tab === 'balance' && balanceData && (
          <div style={{ marginBottom: 24 }}>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total Activos', value: fmt(balanceData.activos.totalActivos), color: '#3b82f6' },
                { label: 'Total Pasivos', value: fmt(balanceData.pasivos.totalPasivos), color: '#f97316' },
                { label: 'Patrimonio Neto', value: fmt(balanceData.patrimonio.patrimonioNeto), color: balanceData.patrimonio.patrimonioNeto >= 0 ? '#22c55e' : '#ef4444' },
                { label: 'Flujo del Mes', value: fmt(balanceData.resMes.flujoNeto), color: balanceData.resMes.flujoNeto >= 0 ? '#22c55e' : '#ef4444' },
              ].map(kpi => (
                <div key={kpi.label} style={{ border: `1px solid #e5e5e5`, borderTop: `3px solid ${kpi.color}`, borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{kpi.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: kpi.color }}>{kpi.value}</div>
                </div>
              ))}
            </div>
            {/* Tabla balance */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 'bold', color: '#B3985B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>ACTIVOS</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                  <span style={{ color: '#555' }}>Efectivo y Bancos</span>
                  <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{fmt(balanceData.activos.efectivoYBancos.total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                  <span style={{ color: '#555' }}>Cuentas por Cobrar</span>
                  <span style={{ color: '#3b82f6' }}>{fmt(balanceData.activos.cuentasPorCobrar.total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                  <span style={{ color: '#555' }}>Activos Físicos</span>
                  <span style={{ color: '#555' }}>{fmt(balanceData.activos.activosFijos.total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                  <span style={{ color: '#555' }}>Intangibles</span>
                  <span style={{ color: '#555' }}>{fmt(balanceData.activos.activosIntangibles.total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ddd', marginTop: 8, paddingTop: 8, fontSize: 12 }}>
                  <span style={{ fontWeight: 'bold', color: '#000' }}>TOTAL ACTIVOS</span>
                  <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>{fmt(balanceData.activos.totalActivos)}</span>
                </div>
              </div>
              <div>
                <div style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 'bold', color: '#B3985B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>PASIVOS</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                    <span style={{ color: '#555' }}>Deudas Estructurales</span>
                    <span style={{ color: '#f97316' }}>{fmt(balanceData.pasivos.deudasEstructurales.total)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                    <span style={{ color: '#555' }}>CxP Operativas</span>
                    <span style={{ color: '#f97316' }}>{fmt(balanceData.pasivos.cuentasPorPagar.total)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                    <span style={{ color: '#555' }}>Repartos Pendientes</span>
                    <span style={{ color: '#eab308' }}>{fmt(balanceData.pasivos.repartosPendientes.total)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ddd', marginTop: 8, paddingTop: 8, fontSize: 12 }}>
                    <span style={{ fontWeight: 'bold', color: '#000' }}>TOTAL PASIVOS</span>
                    <span style={{ fontWeight: 'bold', color: '#f97316' }}>{fmt(balanceData.pasivos.totalPasivos)}</span>
                  </div>
                </div>
                <div style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 'bold', color: '#B3985B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>PATRIMONIO</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ fontWeight: 'bold', color: '#000' }}>Patrimonio Neto</span>
                    <span style={{ fontWeight: 'bold', color: balanceData.patrimonio.patrimonioNeto >= 0 ? '#22c55e' : '#ef4444' }}>{fmt(balanceData.patrimonio.patrimonioNeto)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'flujo' && flujoData && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Entradas Totales', value: fmt(flujoData.resumen.totalIngresos), color: '#22c55e' },
                { label: 'Salidas Operativas', value: fmt(flujoData.resumen.totalEgresos), color: '#ef4444' },
                { label: 'Compromisos Pasivos', value: fmt(flujoData.resumen.compromisosPasivos), color: '#f97316' },
                { label: 'Flujo Neto', value: fmt(flujoData.resumen.flujoNeto), color: flujoData.resumen.flujoNeto >= 0 ? '#22c55e' : '#ef4444' },
              ].map(kpi => (
                <div key={kpi.label} style={{ border: `1px solid #e5e5e5`, borderTop: `3px solid ${kpi.color}`, borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{kpi.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: kpi.color }}>{kpi.value}</div>
                </div>
              ))}
            </div>
            {/* Entradas top categorías */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 'bold', color: '#22c55e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>TOP ENTRADAS</div>
                {flujoData.entradas.porCategoria.slice(0, 5).map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, paddingBottom: 4, borderBottom: '1px solid #f5f5f5' }}>
                    <span style={{ color: '#555' }}>{c.nombre}</span>
                    <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{fmt(c.total)}</span>
                  </div>
                ))}
              </div>
              <div style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 'bold', color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>TOP GASTOS OPERATIVOS</div>
                {flujoData.salidas.operativas.porCategoria.slice(0, 5).map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, paddingBottom: 4, borderBottom: '1px solid #f5f5f5' }}>
                    <span style={{ color: '#555' }}>{c.nombre}</span>
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{fmt(c.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'asistencias' && asistData && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Días Hábiles', value: String(asistData.totales.diasHabiles), color: '#B3985B' },
                { label: 'Asistencia General', value: `${asistData.totales.pctAsistenciaGeneral}%`, color: asistData.totales.pctAsistenciaGeneral >= 90 ? '#22c55e' : '#eab308' },
                { label: 'Total Presentes', value: String(asistData.totales.presentes), color: '#22c55e' },
                { label: 'Retardos · Faltas', value: `${asistData.totales.retardos} · ${asistData.totales.faltas}`, color: '#eab308' },
              ].map(kpi => (
                <div key={kpi.label} style={{ border: `1px solid #e5e5e5`, borderTop: `3px solid ${kpi.color}`, borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{kpi.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: kpi.color }}>{kpi.value}</div>
                </div>
              ))}
            </div>
            <div style={{ border: '1px solid #e5e5e5', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9f9f9' }}>
                    {['Colaborador', 'Puesto', 'Presentes', 'Retardos', 'Faltas', '% Asistencia'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, color: '#888', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid #e5e5e5' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {asistData.personal.map((p, i) => (
                    <tr key={p.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '7px 12px', fontSize: 11, fontWeight: 600, color: '#000' }}>{p.nombre}</td>
                      <td style={{ padding: '7px 12px', fontSize: 11, color: '#666' }}>{p.puesto}</td>
                      <td style={{ padding: '7px 12px', fontSize: 11, color: '#22c55e', fontWeight: 600 }}>{p.presentes}</td>
                      <td style={{ padding: '7px 12px', fontSize: 11, color: '#eab308', fontWeight: 600 }}>{p.retardos}</td>
                      <td style={{ padding: '7px 12px', fontSize: 11, color: '#ef4444', fontWeight: 600 }}>{p.faltas}</td>
                      <td style={{ padding: '7px 12px', fontSize: 11, fontWeight: 700, color: p.pctAsistencia >= 90 ? '#22c55e' : p.pctAsistencia >= 75 ? '#eab308' : '#ef4444' }}>{p.pctAsistencia}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ANÁLISIS */}
        <div style={{ marginTop: 24, border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 'bold', color: '#B3985B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Análisis del Período</div>
          <div style={{ fontSize: 12, color: '#222', minHeight: 80, whiteSpace: 'pre-wrap' }}>
            {pdfState.analisis || '—'}
          </div>
        </div>

        {/* PROPUESTAS */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 'bold', color: '#B3985B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Propuestas de Mejora</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {([1, 2, 3] as const).map(n => (
              <div key={n} style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>Propuesta {n}</div>
                <div style={{ fontSize: 12, fontWeight: 'bold', color: '#000', marginBottom: 6 }}>
                  {pdfState[`propuesta${n}Titulo`] || 'Sin título'}
                </div>
                <div style={{ fontSize: 11, color: '#444', whiteSpace: 'pre-wrap' }}>
                  {pdfState[`propuesta${n}Desc`] || '—'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COMENTARIOS FINALES */}
        <div style={{ marginTop: 16, border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 'bold', color: '#B3985B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Comentarios Finales</div>
          <div style={{ fontSize: 12, color: '#222', minHeight: 60, whiteSpace: 'pre-wrap' }}>
            {pdfState.comentariosFinales || '—'}
          </div>
        </div>

        {/* FIRMA */}
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ borderTop: '1px solid #999', width: 200, paddingTop: 8, fontSize: 11, color: '#666' }}>
              {pdfState.responsable || 'Responsable'}
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#aaa', textAlign: 'right' }}>
            <div>Confidencial · Mainstage Pro</div>
            <div>{new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
          </div>
        </div>
      </div>
    </>
  );
}
