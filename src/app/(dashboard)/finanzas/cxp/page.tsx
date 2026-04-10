import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/cotizador";
import { ESTADO_CXC_LABELS, ESTADO_CXC_COLORS } from "@/lib/constants";

export default async function CxPPage() {
  const cxp = await prisma.cuentaPagar.findMany({
    include: { tecnico: true, proveedor: true, proyecto: true },
    orderBy: { fechaCompromiso: "asc" },
  });

  const pendiente = cxp.filter((c) => c.estado === "PENDIENTE").reduce((s, c) => s + c.monto, 0);
  const vencida = cxp.filter((c) => c.estado === "VENCIDO").reduce((s, c) => s + c.monto, 0);
  const pagado = cxp.filter((c) => c.estado === "LIQUIDADO").reduce((s, c) => s + c.monto, 0);
  const hoy = new Date();

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Cuentas por Pagar</h1>
          <p className="text-[#6b7280] text-sm">{cxp.length} cuentas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">Por pagar</p>
          <p className="text-yellow-400 text-xl font-semibold">{formatCurrency(pendiente)}</p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">Vencido</p>
          <p className="text-red-400 text-xl font-semibold">{formatCurrency(vencida)}</p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">Pagado total</p>
          <p className="text-green-400 text-xl font-semibold">{formatCurrency(pagado)}</p>
        </div>
      </div>

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        {cxp.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#6b7280] text-sm">Sin cuentas por pagar</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Beneficiario", "Proyecto", "Concepto", "Monto", "Vence", "Estado"].map((h) => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {cxp.map((c) => {
                const beneficiario = c.tecnico?.nombre ?? c.proveedor?.nombre ?? "—";
                const esVencida = c.estado !== "LIQUIDADO" && new Date(c.fechaCompromiso) < hoy;
                return (
                  <tr key={c.id} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-4 py-3 text-sm text-white">{beneficiario}</td>
                    <td className="px-4 py-3 text-xs text-[#6b7280]">{c.proyecto?.nombre ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-[#9ca3af]">{c.concepto}</td>
                    <td className="px-4 py-3 text-sm font-medium text-white">{formatCurrency(c.monto)}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={esVencida ? "text-red-400 font-medium" : "text-[#6b7280]"}>
                        {new Date(c.fechaCompromiso).toLocaleDateString("es-MX", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                        {esVencida && " ⚠"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_CXC_COLORS[c.estado] ?? "bg-gray-800 text-gray-400"}`}>
                        {ESTADO_CXC_LABELS[c.estado] ?? c.estado}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
