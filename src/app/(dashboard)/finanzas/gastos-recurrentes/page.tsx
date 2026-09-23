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
          <h1 className="text-2xl font-bold tracking-tight">Gastos Recurrentes</h1>
          <p className="text-sm text-gray-500">Administra las suscripciones, rentas y servicios fijos/variables.</p>
        </div>
        <Link 
          href="/finanzas/gastos-recurrentes/nuevo"
          className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white shadow hover:bg-gray-800"
        >
          + Nuevo Gasto
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Gasto Fijo Comprometido</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalFijo)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Variable Estimado (Base)</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalVariable)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-100 bg-gray-50">
          <p className="text-sm text-gray-500 font-medium">Total Previsto</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalFijo + totalVariable)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Cargando...</div>
        ) : gastos.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No hay gastos recurrentes configurados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3">Concepto</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Tipo / Frec</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3">Próximo Venc.</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {gastos.map((gasto) => {
                  const proveedorNombre = gasto.proveedor?.nombre || gasto.empresa?.nombre || gasto.acreedorLibre || "-";
                  const ultimoPeriodo = gasto.periodos?.[0];
                  
                  return (
                    <tr key={gasto.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/finanzas/gastos-recurrentes/${gasto.id}`} className="hover:underline">
                          {gasto.nombre}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{proveedorNombre}</td>
                      <td className="px-4 py-3">
                        <div>{gasto.tipoMonto}</div>
                        <div className="text-xs text-gray-500">{gasto.frecuencia}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {gasto.tipoMonto === "VARIABLE" && <span className="text-xs text-gray-400 mr-1">Est.</span>}
                        {formatCurrency(gasto.montoBase || 0)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {ultimoPeriodo ? format(new Date(ultimoPeriodo.fechaVencimiento), "dd MMM yyyy", { locale: es }) : "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {gasto.categoria?.nombre || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          gasto.estado === "ACTIVO" ? "bg-green-100 text-green-800" :
                          gasto.estado === "PAUSADO" ? "bg-yellow-100 text-yellow-800" :
                          "bg-gray-100 text-gray-800"
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
