"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ESTADO_COTIZACION_LABELS, ESTADO_COTIZACION_COLORS, TIPO_EVENTO_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/cotizador";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { SkeletonPage } from "@/components/Skeleton";

type Cotizacion = {
  id: string;
  numeroCotizacion: string;
  estado: string;
  opcionLetra: string;
  grupoId: string | null;
  granTotal: number;
  nombreEvento: string | null;
  tipoEvento: string | null;
  createdAt: string;
  cliente: { id: string; nombre: string; empresa: string | null; tipoCliente: string };
  trato: { tipoEvento: string };
};

export default function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    fetch("/api/cotizaciones")
      .then(r => r.json())
      .then(data => setCotizaciones(data.cotizaciones ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function eliminar(id: string, numero: string) {
    const ok = await confirm({ message: `¿Eliminar cotización ${numero}? Esta acción no se puede deshacer.`, danger: true, confirmText: "Eliminar" });
    if (!ok) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/cotizaciones/${id}`, { method: "DELETE" });
      if (res.ok) { setCotizaciones(prev => prev.filter(c => c.id !== id)); toast.success("Cotización eliminada"); }
      else { const d = await res.json(); toast.error(d.error ?? "Error al eliminar"); }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Cotizaciones</h1>
          <p className="text-[#6b7280] text-sm">
            {loading ? "Cargando..." : `${cotizaciones.length} cotizaciones`}
          </p>
        </div>
      </div>

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        {loading ? (
          <SkeletonPage rows={5} cols={5} />
        ) : cotizaciones.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#6b7280] text-sm">No hay cotizaciones</p>
            <p className="text-[#444] text-xs mt-1">Crea una cotización desde un trato</p>
          </div>
        ) : (
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Número", "Cliente", "Evento", "Total", "Estado", "Fecha", ""].map((h) => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {cotizaciones.map((cot) => (
                <tr key={cot.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#B3985B] text-xs font-mono">{cot.numeroCotizacion}</span>
                      {cot.grupoId && (
                        <span className="text-[10px] font-bold text-[#B3985B] bg-[#B3985B]/10 border border-[#B3985B]/30 px-1.5 py-0.5 rounded-full leading-none">
                          {cot.opcionLetra}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/crm/clientes/${cot.cliente.id}`} className="text-white text-sm hover:text-[#B3985B] transition-colors">
                      {cot.cliente.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#9ca3af]">
                    {cot.nombreEvento || (cot.tipoEvento ? TIPO_EVENTO_LABELS[cot.tipoEvento] : "—")}
                  </td>
                  <td className="px-4 py-3 text-sm text-white font-medium">
                    {formatCurrency(cot.granTotal)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_COTIZACION_COLORS[cot.estado] ?? "bg-gray-800 text-gray-400"}`}>
                      {ESTADO_COTIZACION_LABELS[cot.estado] ?? cot.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6b7280]">
                    {new Date(cot.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/cotizaciones/${cot.id}`} className="text-[#B3985B] text-xs hover:underline">
                        Ver →
                      </Link>
                      <button
                        onClick={() => eliminar(cot.id, cot.numeroCotizacion)}
                        disabled={deletingId === cot.id}
                        className="text-[#444] hover:text-red-400 text-xs transition-colors disabled:opacity-50"
                        title="Eliminar cotización"
                      >
                        {deletingId === cot.id ? "..." : "Eliminar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
