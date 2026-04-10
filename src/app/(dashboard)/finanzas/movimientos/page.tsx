import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/cotizador";
import Link from "next/link";

export default async function MovimientosPage() {
  const movimientos = await prisma.movimientoFinanciero.findMany({
    include: {
      cliente: true,
      proveedor: true,
      proyecto: true,
      categoria: true,
      cuentaOrigen: true,
      cuentaDestino: true,
    },
    orderBy: { fecha: "desc" },
    take: 100,
  });

  const ingresos = movimientos.filter((m) => m.tipo === "INGRESO").reduce((s, m) => s + m.monto, 0);
  const gastos = movimientos.filter((m) => m.tipo === "GASTO").reduce((s, m) => s + m.monto, 0);

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Movimientos</h1>
          <p className="text-[#6b7280] text-sm">{movimientos.length} movimientos recientes</p>
        </div>
        <a
          href="/finanzas/movimientos/nuevo"
          className="bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors"
        >
          + Registrar movimiento
        </a>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">Ingresos</p>
          <p className="text-green-400 text-xl font-semibold">{formatCurrency(ingresos)}</p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">Gastos</p>
          <p className="text-red-400 text-xl font-semibold">{formatCurrency(gastos)}</p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">Balance</p>
          <p className={`text-xl font-semibold ${ingresos - gastos >= 0 ? "text-white" : "text-red-400"}`}>
            {formatCurrency(ingresos - gastos)}
          </p>
        </div>
      </div>

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        {movimientos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#6b7280] text-sm">Sin movimientos registrados</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Fecha", "Concepto", "Categoría", "Cuenta", "Tipo", "Monto"].map((h) => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {movimientos.map((mov) => (
                <tr key={mov.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3 text-xs text-[#6b7280] whitespace-nowrap">
                    {new Date(mov.fecha).toLocaleDateString("es-MX", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white text-sm">{mov.concepto}</p>
                    {mov.cliente && <Link href={`/crm/clientes/${mov.cliente.id}`} className="text-[#6b7280] text-xs hover:text-[#B3985B] transition-colors">{mov.cliente.nombre}</Link>}
                    {mov.proyecto && <Link href={`/proyectos/${mov.proyecto.id}`} className="text-[#555] text-xs hover:text-[#B3985B] transition-colors block">{mov.proyecto.nombre}</Link>}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6b7280]">
                    {mov.categoria?.nombre ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6b7280]">
                    {mov.cuentaDestino?.nombre ?? mov.cuentaOrigen?.nombre ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <TipoBadge tipo={mov.tipo} />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-right">
                    <span className={mov.tipo === "INGRESO" ? "text-green-400" : mov.tipo === "GASTO" ? "text-red-400" : "text-white"}>
                      {mov.tipo === "GASTO" ? "-" : "+"}{formatCurrency(mov.monto)}
                    </span>
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
  const map: Record<string, string> = {
    INGRESO: "bg-green-900/40 text-green-300",
    GASTO: "bg-red-900/40 text-red-300",
    TRANSFERENCIA: "bg-blue-900/40 text-blue-300",
    INVERSION: "bg-purple-900/40 text-purple-300",
    RETIRO: "bg-orange-900/40 text-orange-300",
  };
  const labels: Record<string, string> = {
    INGRESO: "Ingreso", GASTO: "Gasto", TRANSFERENCIA: "Transferencia",
    INVERSION: "Inversión", RETIRO: "Retiro",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${map[tipo] ?? "bg-gray-800 text-gray-400"}`}>
      {labels[tipo] ?? tipo}
    </span>
  );
}
