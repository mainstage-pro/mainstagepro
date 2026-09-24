"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/cotizador";
import { useToast } from "@/components/Toast";
import RowActions from "@/components/ui/RowActions";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function GastosRecurrentesPage() {
  const [gastos, setGastos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchGastos = async () => {
    try {
      const res = await fetch("/api/gastos-recurrentes");
      if (!res.ok) throw new Error("Error cargando gastos recurrentes");
      const data = await res.json();
      setGastos(data);
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGastos();
  }, []);

  const totalFijo = gastos.filter(g => g.estado === "ACTIVO" && g.tipoMonto === "FIJO").reduce((acc, g) => acc + (g.montoBase || 0), 0);
  const totalVariable = gastos.filter(g => g.estado === "ACTIVO" && g.tipoMonto === "VARIABLE").reduce((acc, g) => acc + (g.montoBase || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Gastos Recurrentes</h1>
          <p className="text-sm text-[#9ca3af]">Administra las suscripciones, rentas y servicios fijos/variables.</p>
        </div>
        <Link 
          href="/finanzas/gastos-recurrentes/nuevo"
          className="inline-flex items-center justify-center rounded-lg bg-[#B3985B] px-4 py-2 text-sm font-semibold text-black shadow hover:bg-[#c9a96a] transition-colors"
        >
          + Nuevo Gasto
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111] rounded-xl p-5 border border-[#222]">
          <p className="text-xs text-[#9ca3af] font-medium uppercase tracking-wider mb-1">Gasto Fijo Comprometido</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalFijo)}</p>
        </div>
        <div className="bg-[#111] rounded-xl p-5 border border-[#222]">
          <p className="text-xs text-[#9ca3af] font-medium uppercase tracking-wider mb-1">Variable Estimado (Base)</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalVariable)}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#333]">
          <p className="text-xs text-[#9ca3af] font-medium uppercase tracking-wider mb-1">Total Previsto</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalFijo + totalVariable)}</p>
        </div>
      </div>

      <div className="bg-[#111] rounded-xl border border-[#222] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#9ca3af]">Cargando...</div>
        ) : gastos.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#9ca3af]">No hay gastos recurrentes configurados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-white">
              <thead className="text-xs text-[#9ca3af] uppercase bg-[#0d0d0d] border-b border-[#222]">
                <tr>
                  <th className="px-4 py-3 font-medium">Concepto</th>
                  <th className="px-4 py-3 font-medium">Proveedor</th>
                  <th className="px-4 py-3 font-medium">Tipo / Frec</th>
                  <th className="px-4 py-3 font-medium text-right">Monto</th>
                  <th className="px-4 py-3 font-medium">Próximo Venc.</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {gastos.map((gasto) => {
                  const proveedorNombre = gasto.proveedor?.nombre || gasto.empresa?.nombre || gasto.acreedorLibre || "-";
                  const ultimoPeriodo = gasto.periodos?.[0];
                  
                  return (
                    <tr key={gasto.id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/finanzas/gastos-recurrentes/${gasto.id}`} className="hover:text-[#B3985B] transition-colors">
                          {gasto.nombre}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#d1d5db]">{proveedorNombre}</td>
                      <td className="px-4 py-3">
                        <div className="text-[#d1d5db]">{gasto.tipoMonto}</div>
                        <div className="text-[10px] text-[#9ca3af] uppercase tracking-wider">{gasto.frecuencia}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {gasto.tipoMonto === "VARIABLE" && <span className="text-xs text-[#9ca3af] mr-1">Est.</span>}
                        {formatCurrency(gasto.montoBase || 0)}
                      </td>
                      <td className="px-4 py-3 text-[#9ca3af]">
                        {ultimoPeriodo ? format(new Date(ultimoPeriodo.fechaVencimiento), "dd MMM yyyy", { locale: es }) : "-"}
                      </td>
                      <td className="px-4 py-3 text-[#9ca3af]">
                        {gasto.categoria?.nombre || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-full border ${
                          gasto.estado === "ACTIVO" ? "bg-green-900/30 text-green-400 border-green-800/50" :
                          gasto.estado === "PAUSADO" ? "bg-yellow-900/30 text-yellow-400 border-yellow-800/50" :
                          "bg-gray-800/50 text-gray-400 border-gray-700/50"
                        }`}>
                          {gasto.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <RowActions 
                          actions={[
                            { label: "Ver Detalle", href: `/finanzas/gastos-recurrentes/${gasto.id}` }
                          ]}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
