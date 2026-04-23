"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Combobox } from "@/components/Combobox";

interface Vendedor { id: string; name: string }
interface DetalleComision {
  tratoId: string;
  cliente: { nombre: string; empresa: string | null };
  nombreEvento: string | null;
  fechaCierre: string | null;
  origenVenta: string;
  notaOrigen: string;
  vendedorOrigen: { id: string; name: string } | null;
  numeroCotizacion: string | null;
  granTotal: number;
  baseCalculo: number;
  pctComision: number;
  montoComision: number;
  liquidado100: boolean;
  tienAnticipo: boolean;
  estadoPago: string;
}
interface Resumen {
  totalTratos: number;
  baseLiquidada: number;
  totalComisiones: number;
  alcanzaPiso: boolean;
  montoBono: number;
  totalAPagar: number;
}
interface PagoRegistrado {
  id: string;
  mes: string;
  montoTotal: number;
  notas: string | null;
  pagadoEn: string;
}
interface Config {
  metaMes1: number; metaMes2: number; metaMes3: number; metaMesNormal: number;
  pctClientePropio: number; pctPublicidad: number;
  pctAsignadoVendedor: number; pctAsignadoOrigen: number; pctBono: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  const [y, m, d] = s.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

const ESTADO_COLOR: Record<string, string> = {
  LIQUIDADO: "bg-green-900/30 text-green-400",
  PARCIAL: "bg-yellow-900/30 text-yellow-400",
  PENDIENTE: "bg-gray-800 text-gray-400",
};
const ORIGEN_COLOR: Record<string, string> = {
  CLIENTE_PROPIO: "bg-purple-900/30 text-purple-300",
  PUBLICIDAD: "bg-blue-900/30 text-blue-300",
  ASIGNADO: "bg-orange-900/30 text-orange-300",
};

export default function ReporteComisionesPage() {
  const searchParams = useSearchParams();
  const [session, setSession] = useState<{ id: string; role: string } | null>(null);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [vendedorId, setVendedorId] = useState(searchParams.get("vendedorId") ?? "");
  const [mes, setMes] = useState(searchParams.get("mes") ?? new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<{
    vendedor: Vendedor;
    mesTrabajo: number;
    piso: number;
    config: Config;
    detalles: DetalleComision[];
    resumen: Resumen;
    pagosRegistrados: PagoRegistrado[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [registrandoPago, setRegistrandoPago] = useState(false);
  const [notasPago, setNotasPago] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) {
        setSession(d.user);
        if (d.user.role !== "ADMIN") setVendedorId(d.user.id);
      }
    });
    fetch("/api/vendedores").then(r => r.json()).then(d => setVendedores(d.vendedores ?? []));
  }, []);

  const cargar = useCallback(() => {
    const vid = vendedorId || (session?.role !== "ADMIN" ? session?.id : "");
    if (!vid || !mes) return;
    setLoading(true);
    fetch(`/api/ventas/reporte?mes=${mes}&vendedorId=${vid}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [vendedorId, mes, session]);

  useEffect(() => { cargar(); }, [cargar]);

  async function registrarPago() {
    if (!data || !vendedorId) return;
    setRegistrandoPago(true);
    await fetch("/api/ventas/reporte", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendedorId,
        mes,
        montoTotal: data.resumen.totalAPagar,
        notas: notasPago || null,
      }),
    });
    setNotasPago("");
    setRegistrandoPago(false);
    cargar();
  }

  return (
    <div className="p-3 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/ventas" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">← Ventas</Link>
          <h1 className="text-2xl font-bold text-white mt-1">Reporte de Comisiones</h1>
        </div>
        {session?.role === "ADMIN" && (
          <Link href="/ventas/config" className="text-xs text-[#B3985B] hover:text-white transition-colors">
            Configurar parámetros →
          </Link>
        )}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-4 bg-[#111] border border-[#222] rounded-xl p-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Mes</label>
          <input
            type="month"
            value={mes}
            onChange={e => setMes(e.target.value)}
            className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
          />
        </div>
        {session?.role === "ADMIN" && (
          <div>
            <label className="text-xs text-gray-500 block mb-1">Vendedor</label>
            <Combobox
              value={vendedorId}
              onChange={setVendedorId}
              options={[{ value: "", label: "— Selecciona vendedor —" }, ...vendedores.map(v => ({ value: v.id, label: v.name }))]}
              className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
            />
          </div>
        )}
      </div>

      {loading && <div className="text-gray-500 text-sm text-center py-10">Calculando...</div>}

      {data && !loading && (
        <>
          {/* Info vendedor + piso */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#111] border border-[#222] rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Vendedor</p>
              <p className="text-white font-semibold">{data.vendedor.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                Mes {data.mesTrabajo} de operación
              </p>
            </div>
            <div className="bg-[#111] border border-[#222] rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Piso del mes (ramp-up)</p>
              <p className="text-white font-semibold text-lg">{fmt(data.piso)}</p>
              <p className={`text-xs mt-1 font-medium ${data.resumen.alcanzaPiso ? "text-green-400" : "text-red-400"}`}>
                {data.resumen.alcanzaPiso ? "✓ Alcanzado" : "✗ No alcanzado"} · base liquidada: {fmt(data.resumen.baseLiquidada)}
              </p>
            </div>
            <div className={`bg-[#111] border rounded-xl p-4 ${data.pagosRegistrados.length > 0 ? "border-green-700" : "border-[#222]"}`}>
              <p className="text-xs text-gray-500 mb-1">Total a pagar</p>
              <p className="text-[#B3985B] font-bold text-xl">{fmt(data.resumen.totalAPagar)}</p>
              {data.pagosRegistrados.length > 0 && (
                <p className="text-green-400 text-xs mt-1">
                  ✓ Pagado · {fmtDate(data.pagosRegistrados[0].pagadoEn)}
                </p>
              )}
            </div>
          </div>

          {/* Desglose */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{data.resumen.totalTratos}</p>
              <p className="text-xs text-gray-500 mt-1">Tratos cerrados</p>
            </div>
            <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{fmt(data.resumen.baseLiquidada)}</p>
              <p className="text-xs text-gray-500 mt-1">Base liquidada (equipos)</p>
            </div>
            <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{fmt(data.resumen.totalComisiones)}</p>
              <p className="text-xs text-gray-500 mt-1">Comisión base</p>
            </div>
            <div className={`bg-[#111] border rounded-xl p-4 text-center ${data.resumen.alcanzaPiso ? "border-green-800" : "border-[#222]"}`}>
              <p className={`text-2xl font-bold ${data.resumen.alcanzaPiso ? "text-green-400" : "text-gray-600"}`}>
                {fmt(data.resumen.montoBono)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Bono {data.config.pctBono}% {data.resumen.alcanzaPiso ? "✓" : "(no aplica)"}
              </p>
            </div>
          </div>

          {/* Tabla de tratos */}
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">
                Tratos cerrados en {mes}
              </h2>
              <span className="text-xs text-gray-500">Base = monto equipos rentados c/descuento · solo libera cuando 100% liquidado</span>
            </div>

            {data.detalles.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Sin tratos cerrados en este mes</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b border-[#1a1a1a]">
                      {["Evento / Cliente", "Cierre", "Origen", "Cotización", "Gran Total", "Base Equipos", "%", "Comisión", "Estado"].map(h => (
                        <th key={h} className="text-left text-xs text-gray-500 px-4 py-2 font-normal">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.detalles.map((d, i) => (
                      <tr key={d.tratoId} className={`border-b border-[#1a1a1a] hover:bg-[#161616] ${i % 2 === 0 ? "" : "bg-[#0e0e0e]"}`}>
                        <td className="px-4 py-3">
                          <Link href={`/crm/tratos/${d.tratoId}`} className="text-white hover:text-[#B3985B] transition-colors font-medium">
                            {d.nombreEvento || d.cliente.nombre}
                          </Link>
                          <p className="text-gray-500 text-xs">{d.cliente.nombre}{d.cliente.empresa ? ` · ${d.cliente.empresa}` : ""}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{fmtDate(d.fechaCierre)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${ORIGEN_COLOR[d.origenVenta] ?? "bg-gray-800 text-gray-400"}`}>
                            {d.notaOrigen}
                          </span>
                          {d.vendedorOrigen && (
                            <p className="text-gray-600 text-[10px] mt-0.5">orig: {d.vendedorOrigen.name}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{d.numeroCotizacion ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-300 text-xs">{fmt(d.granTotal)}</td>
                        <td className="px-4 py-3 text-white text-xs font-medium">{fmt(d.baseCalculo)}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{d.pctComision}%</td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${d.liquidado100 ? "text-[#B3985B]" : "text-gray-600"}`}>
                            {d.liquidado100 ? fmt(d.montoComision) : "—"}
                          </span>
                          {!d.liquidado100 && (
                            <p className="text-gray-600 text-[10px]">pendiente {fmt((d.baseCalculo * d.pctComision) / 100)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${ESTADO_COLOR[d.estadoPago] ?? ""}`}>
                            {d.estadoPago === "LIQUIDADO" ? "Liquidado" : d.estadoPago === "PARCIAL" ? "Parcial" : "Pendiente"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-[#333] bg-[#0d0d0d]">
                      <td colSpan={5} className="px-4 py-3 text-gray-500 text-xs">Total</td>
                      <td className="px-4 py-3 text-white font-semibold text-sm">{fmt(data.resumen.baseLiquidada)}</td>
                      <td></td>
                      <td className="px-4 py-3 text-[#B3985B] font-bold">{fmt(data.resumen.totalComisiones)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Resumen pago */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider mb-4">Resumen de pago</h2>
            <div className="space-y-2 max-w-sm">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Comisión base</span>
                <span className="text-white">{fmt(data.resumen.totalComisiones)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">
                  Bono {data.config.pctBono}% {!data.resumen.alcanzaPiso && <span className="text-red-500 text-xs">(no aplica)</span>}
                </span>
                <span className={data.resumen.alcanzaPiso ? "text-green-400" : "text-gray-600"}>
                  {fmt(data.resumen.montoBono)}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t border-[#333] pt-2 font-semibold">
                <span className="text-white">Total a pagar</span>
                <span className="text-[#B3985B] text-lg">{fmt(data.resumen.totalAPagar)}</span>
              </div>
            </div>

            {/* Historial de pagos */}
            {data.pagosRegistrados.length > 0 && (
              <div className="mt-4 space-y-1">
                <p className="text-xs text-gray-500 mb-2">Pagos registrados este mes:</p>
                {data.pagosRegistrados.map(p => (
                  <div key={p.id} className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="text-green-400">✓</span>
                    <span>{fmt(p.montoTotal)}</span>
                    <span>·</span>
                    <span>{fmtDate(p.pagadoEn)}</span>
                    {p.notas && <span className="text-gray-600">· {p.notas}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Registrar pago (solo admin) */}
            {session?.role === "ADMIN" && data.resumen.totalAPagar > 0 && (
              <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
                <p className="text-xs text-gray-500 mb-2">Registrar pago de comisiones</p>
                <div className="flex gap-3 items-end">
                  <input
                    value={notasPago}
                    onChange={e => setNotasPago(e.target.value)}
                    placeholder="Nota (opcional)"
                    className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] flex-1"
                  />
                  <button
                    onClick={registrarPago}
                    disabled={registrandoPago}
                    className="px-4 py-2 bg-[#B3985B] text-black text-sm font-semibold rounded-lg hover:bg-[#c9a96a] transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {registrandoPago ? "Registrando..." : `Marcar pagado ${fmt(data.resumen.totalAPagar)}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
