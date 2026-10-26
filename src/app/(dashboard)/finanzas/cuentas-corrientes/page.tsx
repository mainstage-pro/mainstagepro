import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { esEmpresaParticular, getCuentasScope } from "@/lib/estado-cuenta";

export const dynamic = "force-dynamic";

export default async function CuentasCorrientesPage() {
  // Obtener todas las empresas base
  const empresas = await prisma.empresa.findMany({
    orderBy: { nombre: "asc" }
  });

  const empresasProcesadas = [];
  const yaIncluidas = new Set<string>();
  
  for (const empresa of empresas) {
    if (esEmpresaParticular(empresa.nombre) || yaIncluidas.has(empresa.id)) continue;

    const scope = await getCuentasScope({ empresaId: empresa.id });
    for (const eid of scope.empresaIds) yaIncluidas.add(eid);
    
    let totalFavorMS = 0;
    scope.cuentasCobrar.forEach(c => {
      const p = c.monto - c.montoCobrado - Number(c.montoCompensado || 0);
      if (p > 0 && c.estado !== "LIQUIDADO" && c.estado !== "COMPENSADO" && c.estado !== "CANCELADO" && c.estado !== "ANULADO") {
        totalFavorMS += p;
      }
    });

    let totalFavorContra = 0;
    scope.cuentasPagar.forEach(c => {
      const p = c.monto - c.montoPagado - Number(c.montoCompensado || 0);
      if (p > 0 && c.estado !== "LIQUIDADO" && c.estado !== "COMPENSADO" && c.estado !== "CANCELADO" && c.estado !== "ANULADO") {
        totalFavorContra += p;
      }
    });

    if (totalFavorMS > 0 || totalFavorContra > 0) {
      empresasProcesadas.push({
        ...empresa,
        totalFavorMS,
        totalFavorContra,
        compensable: Math.min(totalFavorMS, totalFavorContra),
        neto: totalFavorMS - totalFavorContra
      });
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Cuentas Corrientes y Rentas Mutuas</h1>
        <p className="text-gray-500 text-sm">Resumen de saldos a favor, en contra y rentas mutuas con clientes y proveedores</p>
      </div>

      <div className="ms-card overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="ms-thead">
            <tr>
              <th className="ms-th">Empresa</th>
              <th className="ms-th text-right">Saldo a favor (Por cobrar)</th>
              <th className="ms-th text-right">Saldo en contra (Rentas mutuas)</th>
              <th className="ms-th text-right">Disponible compensar</th>
              <th className="ms-th text-right">Saldo Neto</th>
              <th className="ms-th text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a1a]">
            {empresasProcesadas.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500 text-sm">
                  No hay cuentas corrientes pendientes de liquidación
                </td>
              </tr>
            ) : (
              empresasProcesadas.map(emp => (
                <tr key={emp.id} className="ms-tr">
                  <td className="ms-td font-medium text-white">{emp.nombre}</td>
                  <td className="ms-td text-right text-green-400 font-mono">
                    ${emp.totalFavorMS.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="ms-td text-right text-red-400 font-mono">
                    ${emp.totalFavorContra.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="ms-td text-right text-[#B3985B] font-mono">
                    ${emp.compensable.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="ms-td text-right font-mono font-bold">
                    <span className={emp.neto > 0 ? "text-green-500" : emp.neto < 0 ? "text-red-500" : "text-gray-400"}>
                      {emp.neto > 0 ? "+" : ""}${emp.neto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="ms-td text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/api/empresas/${emp.id}/estado-cuenta/pdf`}
                        className="text-xs font-medium px-3 py-2 rounded-lg border border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B]/10 transition-colors"
                      >
                        Estado de cuenta PDF
                      </a>
                      <Link 
                        href={`/catalogo/empresas/${emp.id}?tab=cuenta-corriente`}
                        className="text-xs font-semibold px-4 py-2 rounded-lg bg-[#222] hover:bg-[#B3985B] text-gray-300 hover:text-black transition-colors"
                      >
                        Ver cuenta
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
