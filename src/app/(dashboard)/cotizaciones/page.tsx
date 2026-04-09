import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ESTADO_COTIZACION_LABELS, ESTADO_COTIZACION_COLORS, TIPO_EVENTO_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/cotizador";

export default async function CotizacionesPage() {
  const cotizaciones = await prisma.cotizacion.findMany({
    include: { cliente: true, trato: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Cotizaciones</h1>
          <p className="text-[#6b7280] text-sm">{cotizaciones.length} cotizaciones</p>
        </div>
      </div>

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        {cotizaciones.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#6b7280] text-sm">No hay cotizaciones</p>
            <p className="text-[#444] text-xs mt-1">Crea una cotización desde un trato</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Número", "Cliente", "Evento", "Total", "Estado", "Fecha", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {cotizaciones.map((cot) => (
                <tr key={cot.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-[#B3985B] text-xs font-mono">{cot.numeroCotizacion}</span>
                    {cot.version > 1 && (
                      <span className="text-[#555] text-[10px] ml-1">v{cot.version}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white text-sm">{cot.cliente.nombre}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#9ca3af]">
                    {cot.nombreEvento || (cot.tipoEvento ? TIPO_EVENTO_LABELS[cot.tipoEvento] : "—")}
                  </td>
                  <td className="px-4 py-3 text-sm text-white font-medium">
                    {formatCurrency(cot.granTotal)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        ESTADO_COTIZACION_COLORS[cot.estado] ?? "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {ESTADO_COTIZACION_LABELS[cot.estado] ?? cot.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6b7280]">
                    {new Date(cot.createdAt).toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/cotizaciones/${cot.id}`}
                      className="text-[#B3985B] text-xs hover:underline"
                    >
                      Ver →
                    </Link>
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
