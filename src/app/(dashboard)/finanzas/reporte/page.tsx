"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CatItem { nombre: string; total: number; count: number }

interface AgingBucket { total: number; items: { id: string; nombre: string; monto: number; fecha: string }[] }
interface AgingData {
  corriente: AgingBucket; dias30: AgingBucket; dias60: AgingBucket; dias90: AgingBucket;
  totalPendiente: number;
}

interface EstadoResultados {
  periodo: string;
  ingresos: number;
  ingresosPorCategoria: CatItem[];
  costosDirectos: {
    total: number; movimientos: number; tecnicosFreelance: number;
    detalleTecnicos: { nombre: string; monto: number }[];
    detalleMovimientos: CatItem[];
  };
  nomina: { total: number; detalle: { nombre: string; puesto: string; monto: number; tipoPeriodo: string }[] };
  gastosOperativos: { total: number; porCategoria: CatItem[] };
  impuestos: number;
  utilidadBruta: number;
  utilidadNeta: number;
  agingCxC: AgingData;
  agingCxP: AgingData;
  margenProyectos: { id: string; titulo: string; fecha: string | null; cobrado: number; costo: number; utilidad: number; margen: number }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}
function pct(n: number, total: number) {
  if (total === 0) return "—";
  return `${((n / total) * 100).toFixed(1)}%`;
}
function margenColor(m: number) {
  if (m >= 30) return "text-green-400";
  if (m >= 15) return "text-yellow-400";
  if (m >= 0)  return "text-orange-400";
  return "text-red-400";
}
function utilColor(n: number) {
  return n >= 0 ? "text-green-400" : "text-red-400";
}
function parseMes(mes: string): { year: number; month: number } {
  const [y, m] = mes.split("-").map(Number);
  return { year: y, month: m };
}
function prevMes(mes: string) {
  const { year, month } = parseMes(mes);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function nextMes(mes: string) {
  const { year, month } = parseMes(mes);
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function mesLabel(mes: string) {
  const { year, month } = parseMes(mes);
  return `${MESES[month - 1]} ${year}`;
}
function defaultMes() {
  const d = new Date();
  const p = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, open, onToggle, badge, children }: {
  title: string; open: boolean; onToggle: () => void;
  badge?: string; children: React.ReactNode;
}) {
  return (
    <div className="border border-[#1e1e1e] rounded-xl overflow-hidden print:border-gray-300">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#111] transition-colors print:hidden"
      >
        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">{title}</span>
        <div className="flex items-center gap-3">
          {badge && <span className="text-sm font-bold text-white">{badge}</span>}
          <span className={`text-gray-600 text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </div>
      </button>
      {open && <div className="border-t border-[#1a1a1a] print:border-gray-200">{children}</div>}
      {/* Print: always show */}
      <div className="hidden print:block print:border-t print:border-gray-200">{children}</div>
    </div>
  );
}

function CatBar({ items, total, color = "#B3985B" }: { items: CatItem[]; total: number; color?: string }) {
  if (items.length === 0) return <p className="text-gray-600 text-xs py-4 text-center">Sin datos</p>;
  const max = Math.max(...items.map(i => i.total), 1);
  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.nombre}>
          <div className="flex justify-between mb-1">
            <span className="text-xs text-gray-400">{item.nombre}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-600">{pct(item.total, total)}</span>
              <span className="text-xs font-semibold text-white">{fmt(item.total)}</span>
            </div>
          </div>
          <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${(item.total / max) * 100}%`, backgroundColor: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AgingTable({ data, label }: { data: AgingData; label: string }) {
  const buckets = [
    { key: "corriente", label: "Al corriente", color: "text-green-400", bg: "bg-green-400/5 border-green-400/20" },
    { key: "dias30",    label: "1–30 días",    color: "text-yellow-400", bg: "bg-yellow-400/5 border-yellow-400/20" },
    { key: "dias60",    label: "31–60 días",   color: "text-orange-400", bg: "bg-orange-400/5 border-orange-400/20" },
    { key: "dias90",    label: "60+ días",     color: "text-red-400",   bg: "bg-red-400/5 border-red-400/20" },
  ] as const;

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {buckets.map(b => {
          const bucket = data[b.key];
          return (
            <div key={b.key} className={`border rounded-xl p-4 ${b.bg}`}>
              <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">{b.label}</p>
              <p className={`text-xl font-bold ${b.color}`}>{fmt(bucket.total)}</p>
              <p className="text-[10px] text-gray-600 mt-1">{bucket.items.length} {label}</p>
            </div>
          );
        })}
      </div>
      {/* Detail list */}
      {data.totalPendiente > 0 && (
        <div className="space-y-1">
          {[...data.dias90.items, ...data.dias60.items, ...data.dias30.items, ...data.corriente.items]
            .slice(0, 15)
            .map((item, i) => {
              const dias = Math.floor((new Date().getTime() - new Date(item.fecha).getTime()) / 86_400_000);
              const color = dias > 60 ? "text-red-400" : dias > 30 ? "text-orange-400" : dias > 0 ? "text-yellow-400" : "text-green-400";
              return (
                <div key={item.id + i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#111] transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white truncate">{item.nombre}</p>
                    <p className={`text-[10px] ${color}`}>
                      {dias <= 0 ? "Vigente" : `${dias}d vencido`}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-white shrink-0 ml-3">{fmt(item.monto)}</span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function EstadoResultadosPage() {
  const [mes, setMes] = useState(defaultMes);
  const [data, setData] = useState<EstadoResultados | null>(null);
  const [loading, setLoading] = useState(true);

  // Collapsibles
  const [openIngCat,    setOpenIngCat]    = useState(false);
  const [openCostosDet, setOpenCostosDet] = useState(false);
  const [openNominaDet, setOpenNominaDet] = useState(false);
  const [openGastOp,    setOpenGastOp]    = useState(false);
  const [openAgingCxC,  setOpenAgingCxC]  = useState(false);
  const [openAgingCxP,  setOpenAgingCxP]  = useState(false);
  const [openMargen,    setOpenMargen]    = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/finanzas/estado-resultados?mes=${mes}`);
      if (r.ok) setData(await r.json());
    } finally {
      setLoading(false);
    }
  }, [mes]);

  useEffect(() => { cargar(); }, [cargar]);

  function handlePDF() {
    window.print();
  }

  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const canNext = mes < mesActual;

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          .sidebar, aside, header, nav { display: none !important; }
          main { padding: 0 !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 1.5cm; size: A4; }
        }
        @media screen {
          .print\\:block { display: none !important; }
        }
      `}</style>

      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pb-16">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-[10px] text-[#B3985B] uppercase tracking-[0.2em] font-bold mb-1">Finanzas</p>
            <h1 className="text-2xl font-bold text-white leading-tight">Estado de Resultados</h1>
            <p className="text-gray-500 text-sm mt-1">{mesLabel(mes)}</p>
          </div>

          <div className="flex items-center gap-3 print:hidden">
            {/* Month nav */}
            <div className="flex items-center gap-1 bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-1">
              <button
                onClick={() => setMes(prevMes(mes))}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-[#1a1a1a] transition-colors text-sm"
              >
                ←
              </button>
              <span className="text-white text-sm font-medium px-3 min-w-[140px] text-center">{mesLabel(mes)}</span>
              <button
                onClick={() => canNext && setMes(nextMes(mes))}
                disabled={!canNext}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 hover:text-white hover:bg-[#1a1a1a]"
              >
                →
              </button>
            </div>

            {/* PDF button */}
            <button
              onClick={handlePDF}
              className="flex items-center gap-2 px-4 py-2 bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold text-sm rounded-xl transition-all active:scale-95"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Descargar PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-16 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-gray-600">Error cargando datos</div>
        ) : (
          <>
            {/* ── P&L Waterfall ── */}
            <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl overflow-hidden">

              {/* Print header */}
              <div className="hidden print:block p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-black">Estado de Resultados — {mesLabel(mes)}</h2>
              </div>

              {/* Ingresos row */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#111] group hover:bg-[#0d0d0d] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-10 rounded-full bg-green-500/70 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider">Ingresos totales</p>
                    <p className="text-white text-sm font-medium mt-0.5">Cobros y movimientos de entrada</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-400 tabular-nums">{fmt(data.ingresos)}</p>
              </div>

              {/* Costos directos row */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#111] hover:bg-[#0d0d0d] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-10 rounded-full bg-red-500/50 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider">− Costos directos de proyectos</p>
                    <div className="flex items-center gap-4 mt-0.5">
                      <span className="text-[11px] text-gray-600">
                        Materiales/servicios <span className="text-gray-500">{fmt(data.costosDirectos.movimientos)}</span>
                      </span>
                      <span className="text-[11px] text-gray-600">
                        Técnicos freelance <span className="text-gray-500">{fmt(data.costosDirectos.tecnicosFreelance)}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xl font-bold text-red-400 tabular-nums">({fmt(data.costosDirectos.total)})</p>
              </div>

              {/* Utilidad Bruta row — highlighted */}
              <div className={`flex items-center justify-between px-6 py-5 border-b border-[#1a1a1a] ${data.utilidadBruta >= 0 ? "bg-green-950/20" : "bg-red-950/20"}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-1 h-10 rounded-full shrink-0 ${data.utilidadBruta >= 0 ? "bg-green-400" : "bg-red-400"}`} />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">= Utilidad Bruta</p>
                    <p className="text-[11px] text-gray-600 mt-0.5">Ingresos − Costos directos · Margen {pct(data.utilidadBruta, data.ingresos)}</p>
                  </div>
                </div>
                <p className={`text-2xl font-bold tabular-nums ${utilColor(data.utilidadBruta)}`}>{fmt(data.utilidadBruta)}</p>
              </div>

              {/* Nómina row */}
              {(data.nomina.total > 0 || true) && (
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#111] hover:bg-[#0d0d0d] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full bg-orange-500/50 shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider">− Nómina</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">
                        {data.nomina.detalle.length > 0
                          ? `${data.nomina.detalle.length} pago${data.nomina.detalle.length !== 1 ? "s" : ""} de personal interno`
                          : "Sin pagos de nómina registrados este mes"}
                      </p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-orange-400 tabular-nums">
                    {data.nomina.total > 0 ? `(${fmt(data.nomina.total)})` : "—"}
                  </p>
                </div>
              )}

              {/* Gastos operativos row */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#111] hover:bg-[#0d0d0d] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-10 rounded-full bg-yellow-500/50 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider">− Gastos operativos</p>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      {data.gastosOperativos.porCategoria.length} categoría{data.gastosOperativos.porCategoria.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <p className="text-xl font-bold text-yellow-400 tabular-nums">
                  {data.gastosOperativos.total > 0 ? `(${fmt(data.gastosOperativos.total)})` : "—"}
                </p>
              </div>

              {/* Impuestos row */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#111] hover:bg-[#0d0d0d] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-10 rounded-full bg-purple-500/50 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider">− Impuestos</p>
                    <p className="text-[11px] text-gray-600 mt-0.5">Categoría &quot;Impuestos&quot; en movimientos</p>
                  </div>
                </div>
                <p className="text-xl font-bold text-purple-400 tabular-nums">
                  {data.impuestos > 0 ? `(${fmt(data.impuestos)})` : "—"}
                </p>
              </div>

              {/* Utilidad Neta — final */}
              <div className={`flex items-center justify-between px-6 py-6 ${data.utilidadNeta >= 0 ? "bg-green-950/30" : "bg-red-950/30"}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-12 rounded-full shrink-0 ${data.utilidadNeta >= 0 ? "bg-green-400" : "bg-red-400"}`} />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-white">= UTILIDAD NETA</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Margen neto: <span className={`font-semibold ${utilColor(data.utilidadNeta)}`}>{pct(data.utilidadNeta, data.ingresos)}</span>
                      {data.ingresos === 0 && " · Sin ingresos registrados este mes"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-3xl font-bold tabular-nums ${utilColor(data.utilidadNeta)}`}>{fmt(data.utilidadNeta)}</p>
                  {data.ingresos > 0 && (
                    <p className="text-[10px] text-gray-600 mt-1">de {fmt(data.ingresos)} en ingresos</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Mini KPI summary ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "CxC Pendiente",  value: fmt(data.agingCxC.totalPendiente), sub: "por cobrar", color: "border-blue-500/30" },
                { label: "CxP Pendiente",  value: fmt(data.agingCxP.totalPendiente), sub: "por pagar",  color: "border-red-500/30" },
                { label: "Posición neta",  value: fmt(data.agingCxC.totalPendiente - data.agingCxP.totalPendiente), sub: "CxC − CxP", color: "border-[#B3985B]/30" },
                { label: "Margen bruto",   value: pct(data.utilidadBruta, data.ingresos), sub: "del período", color: "border-green-500/30" },
              ].map(k => (
                <div key={k.label} className={`bg-[#0a0a0a] border ${k.color} rounded-xl p-4`}>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{k.label}</p>
                  <p className="text-xl font-bold text-white">{k.value}</p>
                  <p className="text-[10px] text-gray-600 mt-1">{k.sub}</p>
                </div>
              ))}
            </div>

            {/* ── Collapsible detail sections ── */}
            <div className="space-y-3">

              {/* Ingresos por categoría */}
              <Section title="Ingresos por categoría" open={openIngCat} onToggle={() => setOpenIngCat(v => !v)} badge={fmt(data.ingresos)}>
                <div className="p-5">
                  <CatBar items={data.ingresosPorCategoria} total={data.ingresos} color="#4ade80" />
                </div>
              </Section>

              {/* Costos directos detalle */}
              <Section title="Costos directos — detalle" open={openCostosDet} onToggle={() => setOpenCostosDet(v => !v)} badge={fmt(data.costosDirectos.total)}>
                <div className="p-5 space-y-5">
                  {/* Técnicos freelance */}
                  {data.costosDirectos.detalleTecnicos.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-3">Técnicos freelance</p>
                      <div className="space-y-1">
                        {data.costosDirectos.detalleTecnicos.map((t, i) => (
                          <div key={i} className="flex justify-between items-center py-1.5 px-3 rounded-lg hover:bg-[#111] transition-colors">
                            <span className="text-sm text-gray-300">{t.nombre}</span>
                            <span className="text-sm font-semibold text-white">{fmt(t.monto)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Otros costos por categoría */}
                  {data.costosDirectos.detalleMovimientos.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-3">Otros costos de proyecto</p>
                      <CatBar items={data.costosDirectos.detalleMovimientos} total={data.costosDirectos.movimientos} color="#f87171" />
                    </div>
                  )}
                  {data.costosDirectos.total === 0 && (
                    <p className="text-gray-600 text-sm text-center py-4">Sin costos directos en este período</p>
                  )}
                </div>
              </Section>

              {/* Nómina detalle */}
              <Section title="Nómina — detalle" open={openNominaDet} onToggle={() => setOpenNominaDet(v => !v)} badge={data.nomina.total > 0 ? fmt(data.nomina.total) : "—"}>
                <div className="p-5">
                  {data.nomina.detalle.length === 0 ? (
                    <div className="text-center py-6 space-y-1">
                      <p className="text-gray-500 text-sm">Sin pagos de nómina registrados en {mesLabel(mes)}</p>
                      <p className="text-gray-700 text-xs">Los pagos a personal interno se registran en RRHH → Nómina</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {data.nomina.detalle.map((p, i) => (
                        <div key={i} className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-[#111] transition-colors">
                          <div>
                            <p className="text-sm text-white">{p.nombre}</p>
                            {p.puesto && <p className="text-[10px] text-gray-600">{p.puesto} · {p.tipoPeriodo}</p>}
                          </div>
                          <span className="text-sm font-semibold text-white">{fmt(p.monto)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Section>

              {/* Gastos operativos por categoría */}
              <Section title="Gastos operativos por categoría" open={openGastOp} onToggle={() => setOpenGastOp(v => !v)} badge={data.gastosOperativos.total > 0 ? fmt(data.gastosOperativos.total) : "—"}>
                <div className="p-5">
                  {data.gastosOperativos.porCategoria.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-4">Sin gastos operativos en {mesLabel(mes)}</p>
                  ) : (
                    <CatBar items={data.gastosOperativos.porCategoria} total={data.gastosOperativos.total} color="#facc15" />
                  )}
                </div>
              </Section>

              {/* Aging CxC */}
              <Section
                title="Aging — Cuentas por cobrar"
                open={openAgingCxC}
                onToggle={() => setOpenAgingCxC(v => !v)}
                badge={fmt(data.agingCxC.totalPendiente)}
              >
                <AgingTable data={data.agingCxC} label="facturas" />
              </Section>

              {/* Aging CxP */}
              <Section
                title="Aging — Cuentas por pagar"
                open={openAgingCxP}
                onToggle={() => setOpenAgingCxP(v => !v)}
                badge={fmt(data.agingCxP.totalPendiente)}
              >
                <AgingTable data={data.agingCxP} label="compromisos" />
              </Section>

              {/* Margen por proyecto */}
              <Section
                title="Margen por proyecto (cierres)"
                open={openMargen}
                onToggle={() => setOpenMargen(v => !v)}
                badge={`${data.margenProyectos.length} proyectos`}
              >
                <div className="overflow-x-auto">
                  {data.margenProyectos.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-8">Sin cierres financieros registrados</p>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-[#0a0a0a] border-b border-[#1a1a1a]">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-gray-600">Proyecto</th>
                          <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wider text-gray-600">Cobrado</th>
                          <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wider text-gray-600">Costo</th>
                          <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wider text-gray-600">Utilidad</th>
                          <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wider text-gray-600">Margen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#111]">
                        {data.margenProyectos.map(p => (
                          <tr key={p.id} className="hover:bg-[#0d0d0d] transition-colors">
                            <td className="px-4 py-3">
                              <p className="text-sm text-white truncate max-w-[200px]">{p.titulo}</p>
                              {p.fecha && (
                                <p className="text-[10px] text-gray-600">
                                  {new Date(p.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-white tabular-nums">{fmt(p.cobrado)}</td>
                            <td className="px-4 py-3 text-right text-sm text-gray-400 tabular-nums">{fmt(p.costo)}</td>
                            <td className={`px-4 py-3 text-right text-sm font-semibold tabular-nums ${utilColor(p.utilidad)}`}>
                              {fmt(p.utilidad)}
                            </td>
                            <td className={`px-4 py-3 text-right text-sm font-bold tabular-nums ${margenColor(p.margen)}`}>
                              {p.margen !== null ? `${p.margen.toFixed(1)}%` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Section>
            </div>

            {/* ── Footer note ── */}
            <p className="text-[10px] text-gray-700 text-center pb-4 print:hidden">
              Los datos reflejan movimientos registrados en Finanzas para {mesLabel(mes)}.
              Nómina incluye pagos de personal interno (RRHH → Nómina) pagados en el período.
            </p>
          </>
        )}
      </div>
    </>
  );
}
