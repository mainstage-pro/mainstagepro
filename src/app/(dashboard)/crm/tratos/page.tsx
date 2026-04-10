import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  ETAPA_LABELS,
  TIPO_EVENTO_LABELS,
  ORIGEN_LEAD_LABELS,
  CLASIFICACION_LABELS,
} from "@/lib/constants";

export default async function TratosPage() {
  const tratos = await prisma.trato.findMany({
    include: { cliente: true, responsable: true },
    orderBy: { createdAt: "desc" },
  });

  const etapas = ["DESCUBRIMIENTO", "OPORTUNIDAD", "VENTA_CERRADA", "VENTA_PERDIDA"];

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Tratos</h1>
          <p className="text-[#6b7280] text-sm">{tratos.length} tratos registrados</p>
        </div>
        <Link
          href="/crm/tratos/nuevo"
          className="bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors"
        >
          + Nuevo trato
        </Link>
      </div>

      {/* Filtros por etapa */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        <a
          href="/crm/tratos"
          className="shrink-0 px-3 py-1.5 rounded-full text-xs bg-[#B3985B] text-black font-medium"
        >
          Todos ({tratos.length})
        </a>
        {etapas.map((etapa) => {
          const count = tratos.filter((t) => t.etapa === etapa).length;
          return (
            <span
              key={etapa}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs bg-[#1a1a1a] text-[#6b7280]"
            >
              {ETAPA_LABELS[etapa]} ({count})
            </span>
          );
        })}
      </div>

      {/* Tabla */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        {tratos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#6b7280] text-sm">No hay tratos registrados</p>
            <Link
              href="/crm/tratos/nuevo"
              className="inline-block mt-4 text-[#B3985B] text-sm hover:underline"
            >
              Crear primer trato →
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Cliente", "Tipo evento", "Etapa", "Origen", "Próxima acción", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {tratos.map((trato) => (
                <tr key={trato.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/crm/clientes/${trato.cliente.id}`} className="text-white text-sm font-medium hover:text-[#B3985B] transition-colors">
                      {trato.cliente.nombre}
                    </Link>
                    {trato.cliente.empresa && (
                      <p className="text-[#6b7280] text-xs">{trato.cliente.empresa}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#9ca3af]">
                    {TIPO_EVENTO_LABELS[trato.tipoEvento]}
                  </td>
                  <td className="px-4 py-3">
                    <EtapaBadge etapa={trato.etapa} />
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6b7280]">
                    {ORIGEN_LEAD_LABELS[trato.origenLead]}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6b7280]">
                    {trato.fechaProximaAccion
                      ? new Date(trato.fechaProximaAccion).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/crm/tratos/${trato.id}`}
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

function EtapaBadge({ etapa }: { etapa: string }) {
  const colors: Record<string, string> = {
    DESCUBRIMIENTO: "bg-blue-900/40 text-blue-300",
    OPORTUNIDAD: "bg-yellow-900/40 text-yellow-300",
    VENTA_CERRADA: "bg-green-900/40 text-green-300",
    VENTA_PERDIDA: "bg-red-900/40 text-red-300",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors[etapa] ?? "bg-gray-800 text-gray-400"}`}>
      {ETAPA_LABELS[etapa] ?? etapa}
    </span>
  );
}
