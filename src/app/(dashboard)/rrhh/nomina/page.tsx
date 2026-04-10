import { prisma } from "@/lib/prisma";
import Link from "next/link";

function fmt(n: number) { return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n); }

export default async function NominaPage() {
  const [pagos, personal] = await Promise.all([
    prisma.pagoNomina.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        personal: { select: { id: true, nombre: true, puesto: true, departamento: true } },
        cuentaOrigen: { select: { nombre: true } },
      },
    }),
    prisma.personalInterno.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, salario: true, periodoPago: true, departamento: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const pendiente = pagos.filter(p => p.estado === "PENDIENTE").reduce((s, p) => s + p.monto, 0);
  const pagado = pagos.filter(p => p.estado === "PAGADO").reduce((s, p) => s + p.monto, 0);
  const mesActual = new Date().toISOString().slice(0, 7);
  const nominaMes = pagos.filter(p => p.periodo === mesActual);

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Nómina</h1>
          <p className="text-[#6b7280] text-sm">{pagos.length} registros · {personal.length} activos</p>
        </div>
        <Link href="/rrhh/personal" className="bg-[#1a1a1a] border border-[#333] hover:bg-[#222] text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors">
          Ver personal
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">Pendiente de pago</p>
          <p className="text-yellow-400 text-xl font-semibold">{fmt(pendiente)}</p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">Pagado (histórico)</p>
          <p className="text-green-400 text-xl font-semibold">{fmt(pagado)}</p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">Este mes ({mesActual})</p>
          <p className="text-white text-xl font-semibold">{fmt(nominaMes.reduce((s, p) => s + p.monto, 0))}</p>
        </div>
      </div>

      {/* Estimado mensual */}
      {personal.length > 0 && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1a1a1a]">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Estimado mensual — personal activo</p>
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {personal.map(p => (
              <Link key={p.id} href={`/rrhh/personal/${p.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-[#1a1a1a] transition-colors">
                <div>
                  <p className="text-white text-sm">{p.nombre}</p>
                  <p className="text-gray-500 text-xs">{p.departamento}</p>
                </div>
                <div className="text-right">
                  {p.salario ? (
                    <>
                      <p className="text-white text-sm font-medium">{fmt(p.salario)}</p>
                      <p className="text-gray-500 text-xs">/{p.periodoPago.toLowerCase()}</p>
                    </>
                  ) : (
                    <p className="text-gray-600 text-xs">Sin tarifa base</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-[#1a1a1a] flex justify-between">
            <p className="text-gray-500 text-sm">Total mensual estimado</p>
            <p className="text-white font-semibold">
              {fmt(personal.filter(p => p.periodoPago === "MENSUAL").reduce((s, p) => s + (p.salario ?? 0), 0))}
            </p>
          </div>
        </div>
      )}

      {/* Historial */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1a1a1a]">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Historial de pagos</p>
        </div>
        {pagos.length === 0 ? (
          <div className="py-10 text-center text-gray-600 text-sm">Sin pagos registrados</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Persona", "Periodo", "Concepto", "Monto", "Estado", "Cuenta"].map(h => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {pagos.map(p => (
                <tr key={p.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/rrhh/personal/${p.personal.id}`} className="text-white text-sm hover:text-[#B3985B] transition-colors">{p.personal.nombre}</Link>
                    <p className="text-gray-600 text-xs">{p.personal.puesto}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{p.periodo}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{p.concepto ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-white font-medium">{fmt(p.monto)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${p.estado === "PAGADO" ? "bg-green-900/50 text-green-300" : "bg-yellow-900/50 text-yellow-300"}`}>
                      {p.estado === "PAGADO" ? "Pagado" : "Pendiente"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.cuentaOrigen?.nombre ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
