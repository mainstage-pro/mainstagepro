"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Combobox } from "@/components/Combobox";

// ─── Types ────────────────────────────────────────────────────────────────────
interface EquipoStat {
  id: string; descripcion: string; marca: string | null; modelo: string | null;
  categoria: string; cantidadTotal: number; precioRenta: number;
  vecesCotizadas: number; vecesAprobadas: number;
  unidadesCotizadas: number; unidadesAprobadas: number;
  revenueGenerado: number; totalRentasHistoricas: number;
  ultimaRentaFecha: string | null; diasSinRenta: number | null;
  alerta: "NUNCA_RENTADO" | "INACTIVO_6M" | "INACTIVO_3M" | "INACTIVO_1M" | null;
}
interface ExternoStat {
  proveedorId: string | null; proveedorNombre: string; descripcion: string;
  vecesCotizadas: number; vecesAprobadas: number;
  unidadesCotizadas: number; unidadesAprobadas: number;
  revenueGenerado: number; costoTotal: number; margen: number; margenPct: number;
  inversionPotencial: boolean; cotizaciones: string[];
}
interface CustomStat {
  descripcion: string; vecesCotizadas: number; vecesAprobadas: number;
  unidadesCotizadas: number; revenueGenerado: number; cotizaciones: string[];
}
interface SocioActivo { id: string; nombre: string; categoria: string; precioDia: number; valorDeclarado: number }
interface Socio { id: string; nombre: string; activos: SocioActivo[] }
interface Resumen {
  totalEquiposPropio: number; equiposActivosMes: number; equiposInactivosMes: number;
  equiposNuncaRentados: number; revenueEquipoPropio: number;
  totalExternosUnicos: number; vecesSubarrendado: number;
  revenueExterno: number; costoExterno: number; margenExterno: number; costoOpportunityCost: number;
  cotizacionesMes: number; cotizacionesAprobadas: number;
}
interface ReporteData {
  mes: string; resumen: Resumen;
  inventarioPropio: EquipoStat[];
  proveedoresEquipo: ExternoStat[];
  itemsCustom: CustomStat[];
  socios: Socio[];
  topMasUsados: EquipoStat[];
  topMenosUsados: EquipoStat[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMXN(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(iso: string) {
  const [y, m, d] = iso.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}
function getMeses() {
  const list: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    list.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return list;
}
function alertaColor(alerta: EquipoStat["alerta"]) {
  if (!alerta) return "";
  if (alerta === "NUNCA_RENTADO") return "bg-red-950/20 border-red-900/30";
  if (alerta === "INACTIVO_6M") return "bg-red-950/20 border-red-900/30";
  if (alerta === "INACTIVO_3M") return "bg-orange-950/20 border-orange-900/30";
  return "bg-yellow-950/20 border-yellow-900/30";
}
function AlertaBadge({ alerta, diasSinRenta }: { alerta: EquipoStat["alerta"]; diasSinRenta: number | null }) {
  if (!alerta) return null;
  const cfg = {
    NUNCA_RENTADO: { text: "Nunca rentado", cls: "bg-red-900/40 text-red-400 border-red-800/50" },
    INACTIVO_6M: { text: `${diasSinRenta}d sin rentar`, cls: "bg-red-900/40 text-red-400 border-red-800/50" },
    INACTIVO_3M: { text: `${diasSinRenta}d sin rentar`, cls: "bg-orange-900/40 text-orange-400 border-orange-800/50" },
    INACTIVO_1M: { text: `${diasSinRenta}d sin rentar`, cls: "bg-yellow-900/30 text-yellow-400 border-yellow-800/50" },
  }[alerta];
  return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${cfg.cls}`}>{cfg.text}</span>;
}

type SortField = "vecesAprobadas" | "revenueGenerado" | "diasSinRenta" | "descripcion" | "totalRentasHistoricas";

export default function AnalisisInventarioPage() {
  const meses = getMeses();
  const [mes, setMes] = useState(meses[0].value);
  const [data, setData] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"propio" | "externo" | "custom" | "socios">("propio");
  const [search, setSearch] = useState("");
  const [soloAlertas, setSoloAlertas] = useState(false);
  const [sortField, setSortField] = useState<SortField>("vecesAprobadas");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const cargar = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventario/analisis?mes=${m}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(mes); }, [mes, cargar]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  }

  const equiposFiltrados = (data?.inventarioPropio ?? [])
    .filter(e => {
      if (soloAlertas && !e.alerta) return false;
      if (search && !e.descripcion.toLowerCase().includes(search.toLowerCase()) &&
          !e.marca?.toLowerCase().includes(search.toLowerCase()) &&
          !e.categoria.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      let va: number, vb: number;
      if (sortField === "descripcion") return sortDir === "asc" ? a.descripcion.localeCompare(b.descripcion) : b.descripcion.localeCompare(a.descripcion);
      if (sortField === "diasSinRenta") { va = a.diasSinRenta ?? 99999; vb = b.diasSinRenta ?? 99999; }
      else { va = a[sortField] as number; vb = b[sortField] as number; }
      return sortDir === "asc" ? va - vb : vb - va;
    });

  function generarWA() {
    if (!data) return;
    const r = data.resumen;
    const mesLabel = meses.find(m => m.value === mes)?.label ?? mes;
    const top = data.topMasUsados.map((e, i) => `${i + 1}. ${e.descripcion} — ${e.vecesAprobadas} evento(s) (${fmtMXN(e.revenueGenerado)})`).join("\n");
    const menos = data.topMenosUsados.slice(0, 5).map((e, i) => {
      const est = !e.ultimaRentaFecha ? "nunca rentado" : `${e.diasSinRenta}d sin rentar`;
      return `${i + 1}. ${e.descripcion} — ${est}`;
    }).join("\n");
    const externos = data.proveedoresEquipo.filter(e => e.inversionPotencial).slice(0, 3).map((e, i) =>
      `${i + 1}. ${e.descripcion} (${e.proveedorNombre}) — ${e.vecesAprobadas} eventos, revenue ${fmtMXN(e.revenueGenerado)}, margen ${Math.round(e.margenPct)}%`
    ).join("\n");
    const msg = `📊 *Análisis de inventario — ${mesLabel}*\n\n` +
      `Equipos activos: ${r.equiposActivosMes}/${r.totalEquiposPropio} | Revenue propio: ${fmtMXN(r.revenueEquipoPropio)}\n\n` +
      `🏆 *Top 5 más rentados:*\n${top || "Sin datos"}\n\n` +
      `⚠️ *Menos activos (oportunidad de ventas):*\n${menos || "Sin datos"}\n\n` +
      (externos ? `💡 *Equipos externos frecuentes (considerar invertir):*\n${externos}\n\n` : "") +
      `_Generado en Mainstage Pro_`;
    window.open(`https://wa.me/524461432565?text=${encodeURIComponent(msg)}`, "_blank");
  }

  const TABS = [
    { key: "propio", label: `Inventario propio${data ? ` (${data.inventarioPropio.length})` : ""}` },
    { key: "externo", label: `Subrentas${data ? ` (${data.proveedoresEquipo.length})` : ""}` },
    { key: "custom", label: `Sin catálogo${data ? ` (${data.itemsCustom.length})` : ""}` },
    { key: "socios", label: `Socios & Inversión` },
  ] as const;

  const SortBtn = ({ field, label }: { field: SortField; label: string }) => (
    <button onClick={() => toggleSort(field)} className={`text-left text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1 hover:text-white transition-colors ${sortField === field ? "text-[#B3985B]" : "text-gray-500"}`}>
      {label}
      {sortField === field && <span>{sortDir === "desc" ? "↓" : "↑"}</span>}
    </button>
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Análisis de uso de inventario</h1>
          <p className="text-gray-500 text-sm mt-0.5">Rentabilidad, demanda y oportunidades de inversión</p>
        </div>
        <div className="flex items-center gap-3">
          <Combobox
            value={mes}
            onChange={v => setMes(v)}
            options={meses.map(m => ({ value: m.value, label: m.label }))}
            className="bg-[#111] border border-[#333] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]"
          />
          <button onClick={generarWA} className="flex items-center gap-2 bg-green-900/30 hover:bg-green-900/50 border border-green-700/40 text-green-400 text-sm px-4 py-2 rounded-lg transition-colors font-medium">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Enviar a ventas
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Equipos activos", value: `${data.resumen.equiposActivosMes} / ${data.resumen.totalEquiposPropio}`, sub: `${data.resumen.equiposInactivosMes} inactivos este mes`, color: "text-white" },
            { label: "Revenue equipo propio", value: fmtMXN(data.resumen.revenueEquipoPropio), sub: `${data.resumen.cotizacionesAprobadas} cotizaciones aprobadas`, color: "text-[#B3985B]" },
            { label: "Revenue subrentas", value: fmtMXN(data.resumen.revenueExterno), sub: `Costo: ${fmtMXN(data.resumen.costoExterno)} · Margen: ${fmtMXN(data.resumen.margenExterno)}`, color: "text-blue-400" },
            { label: "Equipos nunca rentados", value: String(data.resumen.equiposNuncaRentados), sub: `De ${data.resumen.totalEquiposPropio} en inventario`, color: "text-red-400" },
          ].map(k => (
            <div key={k.label} className="bg-[#111] border border-[#222] rounded-xl p-4">
              <p className="text-gray-500 text-xs mb-1">{k.label}</p>
              <p className={`text-xl font-semibold ${k.color}`}>{k.value}</p>
              <p className="text-gray-600 text-[11px] mt-1">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#222]">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.key ? "border-[#B3985B] text-[#B3985B]" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── TAB: Inventario Propio ─────────────────────────────────────────── */}
      {!loading && data && tab === "propio" && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar equipo..."
              className="bg-[#111] border border-[#333] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] w-60"
            />
            <button onClick={() => setSoloAlertas(v => !v)}
              className={`text-sm px-3 py-2 rounded-lg border transition-colors ${soloAlertas ? "bg-red-900/30 border-red-700/40 text-red-400" : "bg-[#111] border-[#333] text-gray-400 hover:text-white"}`}>
              {soloAlertas ? "⚠ Solo alertas" : "Todas"}
            </button>
            <span className="text-gray-600 text-xs ml-auto">{equiposFiltrados.length} equipos</span>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-950/60 border border-red-900/30 inline-block" /> Sin actividad / nunca rentado</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-950/60 border border-orange-900/30 inline-block" /> +3 meses inactivo</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-950/60 border border-yellow-900/30 inline-block" /> +1 mes inactivo</span>
          </div>

          {/* Table */}
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  <th className="text-left p-3 pl-4 w-[30%]"><SortBtn field="descripcion" label="Equipo" /></th>
                  <th className="text-left p-3 hidden md:table-cell"><span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Categoría</span></th>
                  <th className="text-center p-3"><SortBtn field="vecesAprobadas" label="Aprobado" /></th>
                  <th className="text-center p-3 hidden lg:table-cell"><span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Cotizado</span></th>
                  <th className="text-right p-3"><SortBtn field="revenueGenerado" label="Revenue" /></th>
                  <th className="text-right p-3 hidden lg:table-cell"><SortBtn field="totalRentasHistoricas" label="Histórico" /></th>
                  <th className="text-left p-3 hidden xl:table-cell"><span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Última renta</span></th>
                  <th className="p-3 pr-4"><span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Estado</span></th>
                </tr>
              </thead>
              <tbody>
                {equiposFiltrados.map((e, i) => (
                  <tr key={e.id} className={`border-b border-[#1a1a1a] last:border-0 hover:bg-white/[0.02] transition-colors ${alertaColor(e.alerta)}`}>
                    <td className="p-3 pl-4">
                      <Link href={`/inventario/equipos/${e.id}`} className="hover:text-[#B3985B] transition-colors">
                        <p className="text-white font-medium text-sm leading-tight">{e.descripcion}</p>
                        {(e.marca || e.modelo) && <p className="text-gray-600 text-xs mt-0.5">{[e.marca, e.modelo].filter(Boolean).join(" · ")}</p>}
                      </Link>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <span className="text-gray-400 text-xs">{e.categoria}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`font-semibold ${e.vecesAprobadas > 0 ? "text-white" : "text-gray-600"}`}>{e.vecesAprobadas}</span>
                    </td>
                    <td className="p-3 text-center hidden lg:table-cell">
                      <span className="text-gray-500 text-xs">{e.vecesCotizadas}</span>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`font-medium text-sm ${e.revenueGenerado > 0 ? "text-[#B3985B]" : "text-gray-700"}`}>
                        {e.revenueGenerado > 0 ? fmtMXN(e.revenueGenerado) : "—"}
                      </span>
                    </td>
                    <td className="p-3 text-right hidden lg:table-cell">
                      <span className="text-gray-500 text-xs">{e.totalRentasHistoricas > 0 ? e.totalRentasHistoricas : "—"}</span>
                    </td>
                    <td className="p-3 hidden xl:table-cell">
                      <span className="text-gray-500 text-xs">
                        {e.ultimaRentaFecha ? fmtDate(e.ultimaRentaFecha) : "—"}
                      </span>
                    </td>
                    <td className="p-3 pr-4">
                      <AlertaBadge alerta={e.alerta} diasSinRenta={e.diasSinRenta} />
                    </td>
                  </tr>
                ))}
                {equiposFiltrados.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-gray-600 text-sm">Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Subrentas de proveedores ─────────────────────────────────── */}
      {!loading && data && tab === "externo" && (
        <div className="space-y-4">
          {data.proveedoresEquipo.length === 0 ? (
            <div className="bg-[#111] border border-[#222] rounded-xl p-12 text-center text-gray-500">Sin subrentas registradas este mes</div>
          ) : (
            <>
              {/* Quick insight */}
              <div className="bg-[#0a0a0a] border border-[#B3985B]/20 rounded-xl p-4 flex gap-4 flex-wrap">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Costo pagado a proveedores</p>
                  <p className="text-[#B3985B] font-semibold text-lg">{fmtMXN(data.resumen.costoExterno)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Revenue capturado</p>
                  <p className="text-white font-semibold text-lg">{fmtMXN(data.resumen.revenueExterno)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Margen neto</p>
                  <p className="text-green-400 font-semibold text-lg">{fmtMXN(data.resumen.margenExterno)}</p>
                </div>
                <div className="ml-auto flex items-center">
                  <p className="text-[11px] text-[#B3985B]/70 max-w-xs text-right">
                    El costo pagado a proveedores es el revenue potencial perdido si invirtieras en esos equipos.
                  </p>
                </div>
              </div>

              <div className="bg-[#111] border border-[#222] rounded-xl overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b border-[#1e1e1e]">
                      <th className="text-left p-3 pl-4">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Equipo / Proveedor</span>
                      </th>
                      <th className="text-center p-3"><span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Eventos</span></th>
                      <th className="text-right p-3"><span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Revenue</span></th>
                      <th className="text-right p-3 hidden md:table-cell"><span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Costo</span></th>
                      <th className="text-right p-3 hidden md:table-cell"><span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Margen</span></th>
                      <th className="text-center p-3 pr-4"><span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Inversión</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.proveedoresEquipo.map((e, i) => (
                      <tr key={i} className="border-b border-[#1a1a1a] last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="p-3 pl-4">
                          <p className="text-white font-medium">{e.descripcion}</p>
                          <p className="text-gray-600 text-xs mt-0.5">{e.proveedorNombre}</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {e.cotizaciones.slice(0, 3).map(c => (
                              <span key={c} className="text-[10px] bg-[#1a1a1a] text-gray-500 px-1.5 py-0.5 rounded">{c}</span>
                            ))}
                            {e.cotizaciones.length > 3 && <span className="text-[10px] text-gray-600">+{e.cotizaciones.length - 3}</span>}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-white font-semibold">{e.vecesAprobadas}</span>
                          {e.vecesCotizadas > e.vecesAprobadas && (
                            <p className="text-gray-600 text-[10px]">{e.vecesCotizadas} cotiz.</p>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <span className={`font-medium ${e.revenueGenerado > 0 ? "text-[#B3985B]" : "text-gray-600"}`}>
                            {e.revenueGenerado > 0 ? fmtMXN(e.revenueGenerado) : "—"}
                          </span>
                        </td>
                        <td className="p-3 text-right hidden md:table-cell">
                          <span className="text-red-400 text-sm">{e.costoTotal > 0 ? fmtMXN(e.costoTotal) : "—"}</span>
                        </td>
                        <td className="p-3 text-right hidden md:table-cell">
                          <span className="text-green-400 text-sm">{e.margen > 0 ? fmtMXN(e.margen) : "—"}</span>
                          {e.margenPct > 0 && <p className="text-gray-600 text-[10px]">{Math.round(e.margenPct)}%</p>}
                        </td>
                        <td className="p-3 pr-4 text-center">
                          {e.inversionPotencial ? (
                            <span className="text-[10px] bg-[#B3985B]/20 text-[#B3985B] border border-[#B3985B]/30 px-2 py-0.5 rounded-full font-medium">
                              💡 Considerar
                            </span>
                          ) : <span className="text-gray-700">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: Sin catálogo ────────────────────────────────────────────────── */}
      {!loading && data && tab === "custom" && (
        <div className="space-y-4">
          <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg px-4 py-3 text-sm text-gray-400">
            Estos items aparecieron en cotizaciones de este mes pero no están vinculados a ningún equipo del catálogo. Considera agregarlos al inventario.
          </div>
          {data.itemsCustom.length === 0 ? (
            <div className="bg-[#111] border border-[#222] rounded-xl p-12 text-center text-gray-500">Sin items personalizados este mes</div>
          ) : (
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-[#1e1e1e]">
                    <th className="text-left p-3 pl-4"><span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Descripción</span></th>
                    <th className="text-center p-3"><span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Cotizado</span></th>
                    <th className="text-center p-3"><span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Aprobado</span></th>
                    <th className="text-right p-3"><span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Revenue</span></th>
                    <th className="text-left p-3 pr-4 hidden md:table-cell"><span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Cotizaciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.itemsCustom.map((e, i) => (
                    <tr key={i} className="border-b border-[#1a1a1a] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 pl-4">
                        <p className="text-white font-medium">{e.descripcion}</p>
                        <p className="text-gray-600 text-xs mt-0.5">{e.unidadesCotizadas} unidades totales</p>
                      </td>
                      <td className="p-3 text-center text-gray-400">{e.vecesCotizadas}</td>
                      <td className="p-3 text-center">
                        <span className={e.vecesAprobadas > 0 ? "text-white font-medium" : "text-gray-600"}>{e.vecesAprobadas}</span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={e.revenueGenerado > 0 ? "text-[#B3985B] font-medium" : "text-gray-600"}>
                          {e.revenueGenerado > 0 ? fmtMXN(e.revenueGenerado) : "—"}
                        </span>
                      </td>
                      <td className="p-3 pr-4 hidden md:table-cell">
                        <div className="flex gap-1 flex-wrap">
                          {e.cotizaciones.slice(0, 4).map(c => (
                            <span key={c} className="text-[10px] bg-[#1a1a1a] text-gray-500 px-1.5 py-0.5 rounded">{c}</span>
                          ))}
                          {e.cotizaciones.length > 4 && <span className="text-[10px] text-gray-600">+{e.cotizaciones.length - 4}</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Socios & Inversión ──────────────────────────────────────────── */}
      {!loading && data && tab === "socios" && (() => {
        const d = data!;
        const mesLabel = meses.find(m => m.value === mes)?.label ?? mes;
        const oportunidades = d.proveedoresEquipo.filter(e => e.inversionPotencial);
        // Annualize based on this month's data (rough projection)
        const factorAnual = 10; // assume ~10 meses activos/año

        function waParaSocio(s: Socio) {
          const activos = s.activos.map(a => `  • ${a.nombre} (${a.categoria})`).join("\n");
          const opsSocio = oportunidades.filter(op =>
            s.activos.some(a =>
              a.categoria.toLowerCase() === op.descripcion.toLowerCase().split(" ")[0] ||
              op.descripcion.toLowerCase().includes(a.categoria.toLowerCase())
            )
          );
          const opsGlobal = oportunidades.slice(0, 3);
          const opsMsg = (opsSocio.length > 0 ? opsSocio : opsGlobal).map(op =>
            `  📦 ${op.descripcion}\n     ${op.vecesAprobadas} evento(s) este mes · Revenue ${fmtMXN(op.revenueGenerado)} · Costo prov. ${fmtMXN(op.costoTotal)}\n     Proyección anual: ${fmtMXN(op.costoTotal * factorAnual)} en ahorro si fuera propio`
          ).join("\n\n");

          const topRent = d.topMasUsados.slice(0, 3).map((e, i) =>
            `  ${i + 1}. ${e.descripcion} — ${e.vecesAprobadas} evento(s), ${fmtMXN(e.revenueGenerado)}`
          ).join("\n");

          const msg =
            `Hola ${s.nombre} 👋\n\n` +
            `Te compartimos el análisis de *${mesLabel}* de Mainstage Pro para orientar decisiones de inversión.\n\n` +
            `📊 *Resumen del mes:*\n` +
            `  • Cotizaciones aprobadas: ${d.resumen.cotizacionesAprobadas}\n` +
            `  • Revenue de equipo propio: ${fmtMXN(d.resumen.revenueEquipoPropio)}\n` +
            `  • Equipos activos: ${d.resumen.equiposActivosMes} de ${d.resumen.totalEquiposPropio}\n\n` +
            `🏆 *Equipos más rentados:*\n${topRent || "  Sin datos este mes"}\n\n` +
            `💡 *Oportunidades de inversión detectadas:*\n${opsMsg || "  Sin oportunidades destacadas este mes"}\n\n` +
            (s.activos.length > 0
              ? `🗂 *Tu portafolio actual:*\n${activos}\n\n`
              : "") +
            `El dinero que salió a proveedores externos este mes fue *${fmtMXN(d.resumen.costoExterno)}*. Con inversión propia, ese costo se convierte en utilidad.\n\n` +
            `_Mainstage Pro — Análisis de inventario_`;
          return `https://wa.me/?text=${encodeURIComponent(msg)}`;
        }

        return (
          <div className="space-y-6">

            {/* ── Reporte ejecutivo ──────────────────────────────────────────── */}
            <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div>
                  <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Reporte ejecutivo de inversión</p>
                  <p className="text-gray-500 text-xs mt-0.5">{mesLabel} · Listo para compartir con socios</p>
                </div>
                <button onClick={() => window.print()}
                  className="text-xs bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-gray-300 px-3 py-1.5 rounded-lg transition-colors">
                  🖨 Imprimir / PDF
                </button>
              </div>

              {/* KPI highlights */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Cotizaciones aprobadas", value: String(d.resumen.cotizacionesAprobadas), sub: `de ${d.resumen.cotizacionesMes} emitidas`, color: "text-white" },
                  { label: "Revenue equipo propio", value: fmtMXN(d.resumen.revenueEquipoPropio), sub: `${d.resumen.equiposActivosMes} equipos activos`, color: "text-[#B3985B]" },
                  { label: "Costo a proveedores externos", value: fmtMXN(d.resumen.costoExterno), sub: "Potencial de inversión mensual", color: "text-red-400" },
                  { label: "Proyección anual de ahorro", value: fmtMXN(d.resumen.costoExterno * factorAnual), sub: "Si se invierte en los equipos top", color: "text-green-400" },
                ].map(k => (
                  <div key={k.label} className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg p-3">
                    <p className="text-gray-600 text-[10px] mb-1">{k.label}</p>
                    <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                    <p className="text-gray-700 text-[10px] mt-0.5">{k.sub}</p>
                  </div>
                ))}
              </div>

              {/* Top rentados */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">🏆 Más rentados este mes</p>
                  <div className="space-y-1.5">
                    {d.topMasUsados.length === 0
                      ? <p className="text-gray-600 text-xs">Sin datos</p>
                      : d.topMasUsados.map((e, i) => (
                        <div key={e.id} className="flex items-center gap-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2">
                          <span className="text-[#B3985B] font-bold text-sm w-4">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-medium truncate">{e.descripcion}</p>
                            <p className="text-gray-600 text-[10px]">{e.categoria}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[#B3985B] text-xs font-semibold">{fmtMXN(e.revenueGenerado)}</p>
                            <p className="text-gray-600 text-[10px]">{e.vecesAprobadas} evento(s)</p>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">⚠️ Más subarrendados (costo externo)</p>
                  <div className="space-y-1.5">
                    {oportunidades.length === 0
                      ? <p className="text-gray-600 text-xs">Sin subrentas frecuentes este mes</p>
                      : oportunidades.slice(0, 5).map((e, i) => (
                        <div key={i} className="flex items-center gap-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2">
                          <span className="text-orange-400 font-bold text-sm w-4">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-medium truncate">{e.descripcion}</p>
                            <p className="text-gray-600 text-[10px]">{e.proveedorNombre}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-red-400 text-xs font-semibold">{fmtMXN(e.costoTotal)}</p>
                            <p className="text-gray-600 text-[10px]">{e.vecesAprobadas} evento(s)</p>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>

              {/* Narrative insight */}
              <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg px-4 py-3 text-sm text-gray-400 leading-relaxed">
                En {mesLabel}, Mainstage Pro generó{" "}
                <span className="text-white font-medium">{fmtMXN(d.resumen.revenueEquipoPropio)}</span> con su propio inventario
                ({d.resumen.equiposActivosMes} equipos activos de {d.resumen.totalEquiposPropio} disponibles) y pagó{" "}
                <span className="text-red-400 font-medium">{fmtMXN(d.resumen.costoExterno)}</span> a proveedores externos por{" "}
                {d.resumen.vecesSubarrendado} subrentas.{" "}
                {d.resumen.costoExterno > 0
                  ? `Proyectado a 10 meses activos, eso representa ${fmtMXN(d.resumen.costoExterno * factorAnual)} anuales en costo externo que podrían convertirse en utilidad con inversión directa en equipo.`
                  : "No se registraron subrentas externas este mes."}
              </div>
            </div>

            {/* ── Oportunidades de inversión con señal ROI ──────────────────── */}
            {oportunidades.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Oportunidades de inversión — señal de ROI</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {oportunidades.map((e, i) => {
                    const costoMensual = e.costoTotal;
                    const revenueMensual = e.revenueGenerado;
                    const ahorroAnual = costoMensual * factorAnual;
                    const prioridad = e.vecesAprobadas >= 4 ? "alta" : "media";
                    return (
                      <div key={i} className={`bg-[#0a0a0a] border rounded-xl p-4 ${prioridad === "alta" ? "border-[#B3985B]/40" : "border-[#1e1e1e]"}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm leading-tight">{e.descripcion}</p>
                            <p className="text-gray-600 text-[10px] mt-0.5">{e.proveedorNombre}</p>
                          </div>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ml-2 ${prioridad === "alta" ? "bg-[#B3985B]/20 text-[#B3985B] border border-[#B3985B]/30" : "bg-[#1a1a1a] text-gray-400 border border-[#222]"}`}>
                            {prioridad === "alta" ? "⚡ Alta prioridad" : "💡 Considerar"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <div className="bg-[#111] rounded-lg p-2 text-center">
                            <p className="text-[10px] text-gray-600">Eventos/mes</p>
                            <p className="text-white font-bold">{e.vecesAprobadas}</p>
                          </div>
                          <div className="bg-[#111] rounded-lg p-2 text-center">
                            <p className="text-[10px] text-gray-600">Revenue/mes</p>
                            <p className="text-[#B3985B] font-bold text-xs">{fmtMXN(revenueMensual)}</p>
                          </div>
                          <div className="bg-[#111] rounded-lg p-2 text-center">
                            <p className="text-[10px] text-gray-600">Costo a prov/mes</p>
                            <p className="text-red-400 font-bold text-xs">{fmtMXN(costoMensual)}</p>
                          </div>
                          <div className="bg-[#111] rounded-lg p-2 text-center">
                            <p className="text-[10px] text-gray-600">Ahorro anual est.</p>
                            <p className="text-green-400 font-bold text-xs">{fmtMXN(ahorroAnual)}</p>
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-600 mt-2 leading-snug">
                          Margen actual: <span className="text-white">{Math.round(e.margenPct)}%</span> — si fuera propio el margen sería del <span className="text-green-400">100%</span> sobre el revenue.
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Por socio: portafolio + WhatsApp ──────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Socios inversionistas — enviar reporte</p>
                {d.socios.length === 0 && (
                  <Link href="/socios" className="text-xs text-[#B3985B] hover:underline">Gestionar socios →</Link>
                )}
              </div>
              {d.socios.length === 0 ? (
                <div className="bg-[#111] border border-[#222] rounded-xl p-10 text-center text-gray-500 text-sm">
                  Sin socios inversionistas activos registrados.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {d.socios.map(s => {
                    const opsSocio = oportunidades.filter(op =>
                      s.activos.some(a =>
                        a.categoria.toLowerCase() === op.descripcion.toLowerCase().split(" ")[0] ||
                        op.descripcion.toLowerCase().includes(a.categoria.toLowerCase())
                      )
                    );
                    const opsAMostrar = opsSocio.length > 0 ? opsSocio : oportunidades.slice(0, 2);
                    return (
                      <div key={s.id} className="bg-[#111] border border-[#222] rounded-xl p-4">
                        {/* Header del socio */}
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-white font-medium text-sm">{s.nombre}</p>
                            <p className="text-gray-600 text-[10px]">{s.activos.length} activo(s) registrado(s)</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link href={`/socios/${s.id}`} className="text-[10px] text-gray-500 hover:text-[#B3985B] transition-colors">Ver perfil</Link>
                            <a href={waParaSocio(s)} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1.5 bg-green-900/30 hover:bg-green-900/50 border border-green-700/40 text-green-400 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium">
                              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                              Enviar reporte
                            </a>
                          </div>
                        </div>

                        {/* Activos del socio */}
                        {s.activos.length > 0 && (
                          <div className="mb-3">
                            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Portafolio actual</p>
                            <div className="space-y-1">
                              {s.activos.map(a => {
                                const matchSubrenta = d.proveedoresEquipo.find(p =>
                                  p.descripcion.toLowerCase().includes(a.nombre.toLowerCase().split(" ")[0]) ||
                                  a.nombre.toLowerCase().includes(p.descripcion.toLowerCase().split(" ")[0])
                                );
                                return (
                                  <div key={a.id} className="flex items-center justify-between py-1 border-b border-[#1a1a1a] last:border-0">
                                    <div>
                                      <p className="text-gray-300 text-xs">{a.nombre}</p>
                                      <p className="text-gray-600 text-[10px]">{a.categoria} · {fmtMXN(a.precioDia)}/día</p>
                                    </div>
                                    {matchSubrenta ? (
                                      <span className="text-[10px] bg-green-900/20 text-green-400 border border-green-800/30 px-1.5 py-0.5 rounded shrink-0">
                                        En demanda
                                      </span>
                                    ) : (
                                      <span className="text-gray-700 text-[10px]">{fmtMXN(a.valorDeclarado)}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Oportunidades para este socio */}
                        {opsAMostrar.length > 0 && (
                          <div>
                            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">
                              {opsSocio.length > 0 ? "Oportunidades afines a su perfil" : "Oportunidades del mes"}
                            </p>
                            <div className="space-y-1">
                              {opsAMostrar.slice(0, 3).map((op, i) => (
                                <div key={i} className="flex items-center justify-between py-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded px-2">
                                  <p className="text-gray-400 text-xs truncate flex-1">{op.descripcion}</p>
                                  <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <span className="text-[10px] text-red-400">{fmtMXN(op.costoTotal)}/mes</span>
                                    <span className="text-[10px] text-[#B3985B]">{op.vecesAprobadas}×</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Cierre: total oportunidad ──────────────────────────────────── */}
            <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl p-5 flex items-center gap-6 flex-wrap">
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">Potencial de inversión mensual</p>
                <p className="text-3xl font-bold text-[#B3985B] mt-1">{fmtMXN(d.resumen.costoExterno)}</p>
              </div>
              <div className="h-12 w-px bg-[#222] hidden md:block" />
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">Proyección anual (10 meses)</p>
                <p className="text-3xl font-bold text-green-400 mt-1">{fmtMXN(d.resumen.costoExterno * factorAnual)}</p>
              </div>
              <div className="flex gap-2 ml-auto">
                <Link href="/socios" className="text-sm bg-[#B3985B]/20 hover:bg-[#B3985B]/30 border border-[#B3985B]/30 text-[#B3985B] px-4 py-2 rounded-lg transition-colors">
                  Gestionar socios →
                </Link>
                <Link href="/inventario/equipos" className="text-sm bg-[#111] hover:bg-[#1a1a1a] border border-[#333] text-gray-300 px-4 py-2 rounded-lg transition-colors">
                  Agregar al inventario →
                </Link>
              </div>
            </div>

          </div>
        );
      })()}
    </div>
  );
}
