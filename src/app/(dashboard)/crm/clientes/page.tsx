import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { TIPO_CLIENTE_LABELS, CLASIFICACION_LABELS, TIPO_SERVICIO_LABELS } from "@/lib/constants";

export default async function ClientesPage() {
  const clientes = await prisma.cliente.findMany({
    include: {
      _count: { select: { tratos: true, proyectos: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Clientes</h1>
          <p className="text-[#6b7280] text-sm">{clientes.length} clientes registrados</p>
        </div>
        <Link
          href="/crm/clientes/nuevo"
          className="bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors"
        >
          + Nuevo cliente
        </Link>
      </div>

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        {clientes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#6b7280] text-sm">No hay clientes registrados</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Cliente", "Tipo", "Clasificación", "Servicio usual", "Tratos", "Proyectos", ""].map(
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
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white text-sm font-medium">{cliente.nombre}</p>
                    {cliente.empresa && (
                      <p className="text-[#6b7280] text-xs">{cliente.empresa}</p>
                    )}
                    {cliente.correo && (
                      <p className="text-[#555] text-xs">{cliente.correo}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <TipoBadge tipo={cliente.tipoCliente} />
                  </td>
                  <td className="px-4 py-3">
                    <ClasificacionBadge clasificacion={cliente.clasificacion} />
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6b7280]">
                    {cliente.servicioUsual
                      ? TIPO_SERVICIO_LABELS[cliente.servicioUsual] ?? cliente.servicioUsual
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#9ca3af] text-center">
                    {cliente._count.tratos}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#9ca3af] text-center">
                    {cliente._count.proyectos}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/crm/clientes/${cliente.id}`}
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

function TipoBadge({ tipo }: { tipo: string }) {
  const colors: Record<string, string> = {
    B2B: "bg-blue-900/40 text-blue-300",
    B2C: "bg-purple-900/40 text-purple-300",
    POR_DESCUBRIR: "bg-gray-800 text-gray-400",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors[tipo] ?? "bg-gray-800 text-gray-400"}`}>
      {TIPO_CLIENTE_LABELS[tipo] ?? tipo}
    </span>
  );
}

function ClasificacionBadge({ clasificacion }: { clasificacion: string }) {
  const colors: Record<string, string> = {
    NUEVO: "text-[#6b7280]",
    BASIC: "text-blue-400",
    REGULAR: "text-yellow-400",
    PRIORITY: "text-[#B3985B]",
  };
  return (
    <span className={`text-xs font-medium ${colors[clasificacion] ?? "text-gray-400"}`}>
      {CLASIFICACION_LABELS[clasificacion] ?? clasificacion}
    </span>
  );
}
