import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getCuentasScope } from "@/lib/estado-cuenta";

export const dynamic = "force-dynamic";

export default async function CuentasCorrientesPage() {
  // Obtener todas las empresas base
  const empresas = await prisma.empresa.findMany({
    orderBy: { nombre: "asc" }
  });

  const empresasProcesadas = [];
  
  for (const empresa of empresas) {
    const scope = await getCuentasScope({ empresaId: empresa.id });
    
    let totalFavorMS = 0;
    scope.cuentasCobrar.forEach(c => {
      const p = c.monto - c.montoCobrado - Number(c.montoCompensado || 0);
      if (p > 0 && c.estado !== "LIQUIDADO" && c.estado !== "COMPENSADO") totalFavorMS += p;
    });

    let totalFavorContra = 0;
    scope.cuentasPagar.forEach(c => {
      const p = c.monto - c.montoPagado - Number(c.montoCompensado || 0);
      if (p > 0 && c.estado !== "LIQUIDADO" && c.estado !== "COMPENSADO") totalFavorContra += p;
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Cuentas Corrientes</h1>
        <p className="text-gray-500 text-sm">Resumen de saldos cruzados con clientes y proveedores</p>
      </div>

      <div className="ms-card overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="ms-thead">
            <tr>
              <th className="ms-th">Empresa</th>
              <th className="ms-th text-right">A favor de Mainstage</th>
              <th className="ms-th text-right">A favor contraparte</th>
              <th className="ms-th text-right">Disponible compensar</th>
              <th className="ms-th text-right">Saldo Neto</th>
              <th className="ms-th"></th>
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
                    <Link 
                      href={`/catalogo/empresas/${emp.id}?tab=cuenta-corriente`}
                      className="text-xs font-semibold px-4 py-2 rounded-lg bg-[#222] hover:bg-[#B3985B] text-gray-300 hover:text-black transition-colors"
                    >
                      Ver cuenta
                    </Link>
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
