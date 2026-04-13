"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/cotizador";

// ── Types ──────────────────────────────────────────────────────────────────────

interface CxCItem {
  id: string;
  concepto: string;
  monto: number;
  estado: string;
  fechaCompromiso: string;
  tipoPago: string;
  cliente: { id: string; nombre: string };
  proyecto: { id: string; nombre: string; numeroProyecto: string } | null;
  cotizacion: { id: string; numeroCotizacion: string } | null;
}

interface CxPItem {
  id: string;
  concepto: string;
  monto: number;
  estado: string;
  fechaCompromiso: string;
  tipoAcreedor: string;
  tecnico: { id: string; nombre: string } | null;
  proveedor: { id: string; nombre: string } | null;
  proyecto: { id: string; nombre: string; numeroProyecto: string } | null;
}

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PARCIAL: "Parcial",
  LIQUIDADO: "Liquidado",
  VENCIDO: "Vencido",
};
const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: "bg-yellow-900/40 text-yellow-400",
  PARCIAL: "bg-blue-900/40 text-blue-400",
  LIQUIDADO: "bg-green-900/40 text-green-400",
  VENCIDO: "bg-red-900/40 text-red-400",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function CobrosPagosPage() {
  const [tab, setTab] = useState<"cobrar" | "pagar">("cobrar");
  const [cxc, setCxc] = useState<CxCItem[]>([]);
  const [cxp, setCxp] = useState<CxPItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [rc, rp] = await Promise.all([
      fetch("/api/cuentas-cobrar").then(r => r.json()),
      fetch("/api/cuentas-pagar").then(r => r.json()),
    ]);
    setCxc(Array.isArray(rc) ? rc : []);
    setCxp(Array.isArray(rp) ? rp : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const hoy = new Date();

  // ── CxC metrics
  const cxcPend  = cxc.filter(c => c.estado === "PENDIENTE").reduce((s, c) => s + c.monto, 0);
  const cxcVenc  = cxc.filter(c => c.estado === "VENCIDO").reduce((s, c) => s + c.monto, 0);
  const cxcCobr  = cxc.filter(c => c.estado === "LIQUIDADO").reduce((s, c) => s + c.monto, 0);

  // ── CxP metrics
  const cxpPend  = cxp.filter(c => c.estado === "PENDIENTE").reduce((s, c) => s + c.monto, 0);
  const cxpVenc  = cxp.filter(c => c.estado === "VENCIDO").reduce((s, c) => s + c.monto, 0);
  const cxpPagd  = cxp.filter(c => c.estado === "LIQUIDADO").reduce((s, c) => s + c.monto, 0);

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Cobros y Pagos</h1>
        <p className="text-[#6b7280] text-sm">Cuentas por cobrar y por pagar</p>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <div className="col-span-2 md:col-span-1 bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-[10px] uppercase tracking-wider mb-1">Por cobrar</p>
          <p className="text-yellow-400 text-lg font-semibold">{formatCurrency(cxcPend)}</p>
        </div>
        <div className="col-span-2 md:col-span-1 bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-[10px] uppercase tracking-wider mb-1">Cobro vencido</p>
          <p className="text-red-400 text-lg font-semibold">{formatCurrency(cxcVenc)}</p>
        </div>
        <div className="col-span-2 md:col-span-1 bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-[10px] uppercase tracking-wider mb-1">Cobrado</p>
          <p className="text-green-400 text-lg font-semibold">{formatCurrency(cxcCobr)}</p>
        </div>
        <div className="col-span-2 md:col-span-1 bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-[10px] uppercase tracking-wider mb-1">Por pagar</p>
          <p className="text-yellow-400 text-lg font-semibold">{formatCurrency(cxpPend)}</p>
        </div>
        <div className="col-span-2 md:col-span-1 bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-[10px] uppercase tracking-wider mb-1">Pago vencido</p>
          <p className="text-red-400 text-lg font-semibold">{formatCurrency(cxpVenc)}</p>
        </div>
        <div className="col-span-2 md:col-span-1 bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-[10px] uppercase tracking-wider mb-1">Pagado</p>
          <p className="text-green-400 text-lg font-semibold">{formatCurrency(cxpPagd)}</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-4 border-b border-[#1a1a1a]">
        {([["cobrar", "Por Cobrar", cxc.length], ["pagar", "Por Pagar", cxp.length]] as const).map(([key, label, count]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              tab === key
                ? "text-[#B3985B] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-[#B3985B]"
                : "text-[#555] hover:text-[#888]"
            }`}>
            {label}
            <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full ${tab === key ? "bg-[#B3985B]/15 text-[#B3985B]" : "bg-[#1a1a1a] text-[#444]"}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-5 h-5 border-2 border-[#B3985B]/30 border-t-[#B3985B] rounded-full animate-spin" />
        </div>
      ) : tab === "cobrar" ? (
        // ── CxC Table ──
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
          {cxc.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[#6b7280] text-sm">Sin cuentas por cobrar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1e1e1e]">
                    {["Cliente", "Proyecto", "Cotización", "Concepto", "Tipo", "Monto", "Vence", "Estado"].map(h => (
                      <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {cxc.map(c => {
                    const esVencida = c.estado !== "LIQUIDADO" && new Date(c.fechaCompromiso) < hoy;
                    return (
                      <tr key={c.id} className="hover:bg-[#1a1a1a] transition-colors">
                        <td className="px-4 py-3 text-sm">
                          <Link href={`/crm/clientes/${c.cliente.id}`} className="text-white hover:text-[#B3985B] transition-colors">{c.cliente.nombre}</Link>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {c.proyecto
                            ? <Link href={`/proyectos/${c.proyecto.id}`} className="text-[#6b7280] hover:text-[#B3985B] transition-colors">{c.proyecto.numeroProyecto}</Link>
                            : <span className="text-[#444]">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {c.cotizacion
                            ? <Link href={`/cotizaciones/${c.cotizacion.id}`} className="text-[#6b7280] hover:text-[#B3985B] transition-colors font-mono">{c.cotizacion.numeroCotizacion}</Link>
                            : <span className="text-[#444]">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#9ca3af]">{c.concepto}</td>
                        <td className="px-4 py-3 text-xs text-[#6b7280]">{c.tipoPago === "ANTICIPO" ? "Anticipo" : "Liquidación"}</td>
                        <td className="px-4 py-3 text-sm font-medium text-white whitespace-nowrap">{formatCurrency(c.monto)}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className={esVencida ? "text-red-400 font-medium" : "text-[#6b7280]"}>
                            {fmtDate(c.fechaCompromiso)}{esVencida && " ⚠"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[c.estado] ?? "bg-gray-800 text-gray-400"}`}>
                            {ESTADO_LABELS[c.estado] ?? c.estado}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        // ── CxP Table ──
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
          {cxp.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[#6b7280] text-sm">Sin cuentas por pagar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1e1e1e]">
                    {["Beneficiario", "Proyecto", "Concepto", "Monto", "Vence", "Estado"].map(h => (
                      <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {cxp.map(c => {
                    const esVencida = c.estado !== "LIQUIDADO" && new Date(c.fechaCompromiso) < hoy;
                    return (
                      <tr key={c.id} className="hover:bg-[#1a1a1a] transition-colors">
                        <td className="px-4 py-3 text-sm text-white">
                          {c.proveedor
                            ? <Link href={`/catalogo/proveedores`} className="hover:text-[#B3985B] transition-colors">{c.proveedor.nombre}</Link>
                            : c.tecnico
                              ? <Link href={`/catalogo/tecnicos`} className="hover:text-[#B3985B] transition-colors">{c.tecnico.nombre}</Link>
                              : <span className="text-[#6b7280]">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {c.proyecto
                            ? <Link href={`/proyectos/${c.proyecto.id}`} className="text-[#6b7280] hover:text-[#B3985B] transition-colors">{c.proyecto.numeroProyecto}</Link>
                            : <span className="text-[#444]">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#9ca3af]">{c.concepto}</td>
                        <td className="px-4 py-3 text-sm font-medium text-white whitespace-nowrap">{formatCurrency(c.monto)}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className={esVencida ? "text-red-400 font-medium" : "text-[#6b7280]"}>
                            {fmtDate(c.fechaCompromiso)}{esVencida && " ⚠"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[c.estado] ?? "bg-gray-800 text-gray-400"}`}>
                            {ESTADO_LABELS[c.estado] ?? c.estado}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
