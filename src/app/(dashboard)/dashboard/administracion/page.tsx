import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DailyGreeting from "@/components/DailyGreeting";

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

function KpiCard({ label, value, sub, color = "text-white", href }: { label: string; value: string; sub?: string; color?: string; href?: string }) {
  const content = (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 hover:border-[#2a2a2a] transition-colors">
      <p className="text-[10px] uppercase tracking-wider text-[#555] font-semibold mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-[#6b7280] mt-0.5">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default async function DashboardAdminPage() {
  const session = await getSession();
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
  const en7dias = new Date(ahora.getTime() + 7 * 86400000);
  const mes = ahora.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  const [
    movimientosMes,
    cuentasBancarias,
    cxcPendiente,
    cxcVencidas,
    cxcVence7dias,
    cxpPendiente,
    cxpVence7dias,
    nominaPendiente,
    personalCount,
    incidenciasMes,
    hervamPagoMes,
    hervamConfig,
    proyectosActivos,
  ] = await Promise.all([
    prisma.movimientoFinanciero.groupBy({
      by: ["tipo"],
      _sum: { monto: true },
      where: { fecha: { gte: inicioMes, lte: finMes } },
    }),
    prisma.cuentaBancaria.findMany({
      where: { activa: true },
      select: {
        id: true, nombre: true, banco: true,
        movimientosEntrada: { select: { monto: true } },
        movimientosSalida: { select: { monto: true } },
      },
    }),
    prisma.cuentaCobrar.aggregate({
      _sum: { monto: true },
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] } },
    }),
    prisma.cuentaCobrar.count({
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] }, fechaCompromiso: { lt: ahora } },
    }),
    prisma.cuentaCobrar.findMany({
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] }, fechaCompromiso: { gte: ahora, lte: en7dias } },
      include: { cliente: { select: { nombre: true } } },
      orderBy: { fechaCompromiso: "asc" },
      take: 6,
    }),
    prisma.cuentaPagar.aggregate({
      _sum: { monto: true },
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] } },
    }),
    prisma.cuentaPagar.findMany({
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] }, fechaCompromiso: { gte: ahora, lte: en7dias } },
      orderBy: { fechaCompromiso: "asc" },
      take: 6,
    }),
    prisma.pagoNomina.aggregate({
      _sum: { monto: true },
      where: { estado: "PENDIENTE" },
    }),
    prisma.personalInterno.count({ where: { activo: true } }).catch(() => 0),
    prisma.incidencia.count({
      where: { fecha: { gte: inicioMes, lte: finMes } },
    }).catch(() => 0),
    prisma.hervamPago.findFirst({
      where: { mes: ahora.getMonth() + 1, anio: ahora.getFullYear() },
    }),
    prisma.hervamConfig.findFirst(),
    prisma.proyecto.count({ where: { estado: { in: ["PLANEACION", "CONFIRMADO", "EN_CURSO"] } } }),
  ]);

  const ingresos = movimientosMes.find((m) => m.tipo === "INGRESO")?._sum.monto ?? 0;
  const egresos = movimientosMes.find((m) => m.tipo === "GASTO")?._sum.monto ?? 0;
  const utilidad = ingresos - egresos;
  const disponible = cuentasBancarias.reduce((s: number, c) => {
    return s + c.movimientosEntrada.reduce((x: number, mv: { monto: number }) => x + mv.monto, 0)
             - c.movimientosSalida.reduce((x: number, mv: { monto: number }) => x + mv.monto, 0);
  }, 0);
  const cxcTotal = cxcPendiente._sum.monto ?? 0;
  const cxpTotal = cxpPendiente._sum.monto ?? 0;
  const nominaTotal = nominaPendiente._sum.monto ?? 0;

  const fmtDate = (s: string | Date | null) => s ? new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) : "—";

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-1">Dashboard · Administración</p>
          <DailyGreeting nombre={session?.name ?? "Equipo"} />
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          {cxcVencidas > 0 && (
            <Link href="/finanzas/cobros-pagos" className="bg-red-900/20 border border-red-800/40 text-red-400 px-3 py-1.5 rounded-lg font-semibold">
              ⚠ {cxcVencidas} cobros vencidos
            </Link>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Ingresos del mes" value={fmt(ingresos)} sub="movimientos registrados" color="text-green-400" href="/finanzas/movimientos" />
        <KpiCard label="Egresos del mes" value={fmt(egresos)} sub="movimientos registrados" color="text-red-400" href="/finanzas/movimientos" />
        <KpiCard label="Utilidad neta" value={fmt(utilidad)} sub={utilidad >= 0 ? "flujo positivo" : "flujo negativo"} color={utilidad >= 0 ? "text-[#B3985B]" : "text-red-400"} href="/finanzas/reporte" />
        <KpiCard label="Disponible" value={fmt(disponible)} sub={`${cuentasBancarias.length} cuentas activas`} color="text-white" href="/finanzas/cuentas" />
        <KpiCard label="Nómina pendiente" value={fmt(nominaTotal)} sub={`${personalCount} colaboradores activos`} color={nominaTotal > 0 ? "text-yellow-400" : "text-white"} href="/rrhh/nomina" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Cobros próximos 7 días */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Cobros próximos</p>
              <p className="text-white font-bold">{fmt(cxcTotal)} <span className="text-gray-500 text-sm font-normal">por cobrar</span></p>
            </div>
            <Link href="/finanzas/cobros-pagos" className="text-xs text-[#B3985B] hover:underline">Ver todos →</Link>
          </div>
          {cxcVence7dias.length === 0 ? (
            <p className="text-gray-600 text-xs italic">Sin cobros en los próximos 7 días</p>
          ) : (
            <div className="space-y-2">
              {cxcVence7dias.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-[#1a1a1a] last:border-0">
                  <div>
                    <p className="text-white text-sm font-medium">{c.cliente?.nombre ?? "—"}</p>
                    <p className="text-gray-500 text-xs">{fmtDate(c.fechaCompromiso)}</p>
                  </div>
                  <span className="text-green-400 text-sm font-semibold">{fmt(c.monto)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagos próximos 7 días */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Pagos próximos</p>
              <p className="text-white font-bold">{fmt(cxpTotal)} <span className="text-gray-500 text-sm font-normal">por pagar</span></p>
            </div>
            <Link href="/finanzas/cobros-pagos" className="text-xs text-[#B3985B] hover:underline">Ver todos →</Link>
          </div>
          {cxpVence7dias.length === 0 ? (
            <p className="text-gray-600 text-xs italic">Sin pagos en los próximos 7 días</p>
          ) : (
            <div className="space-y-2">
              {cxpVence7dias.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-[#1a1a1a] last:border-0">
                  <p className="text-white text-sm">{c.concepto ?? "Pago"}</p>
                  <div className="text-right">
                    <p className="text-red-400 text-sm font-semibold">{fmt(c.monto)}</p>
                    <p className="text-gray-600 text-xs">{fmtDate(c.fechaCompromiso)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* HERVAM */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Capital HERVAM · {mes}</p>
            <Link href="/finanzas/hervam" className="text-xs text-[#B3985B] hover:underline">Ver →</Link>
          </div>
          {hervamPagoMes ? (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Acordado</p>
                <p className="text-white font-bold text-lg">{fmt(hervamPagoMes.montoAcordado)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Pagado</p>
                <p className={`font-bold text-lg ${hervamPagoMes.montoPagado >= hervamPagoMes.montoAcordado ? "text-green-400" : "text-yellow-400"}`}>
                  {fmt(hervamPagoMes.montoPagado)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Estado</p>
                <p className="text-white font-semibold mt-1 text-sm">{hervamPagoMes.estado}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-gray-500 text-sm">Pago de {mes} no registrado</p>
              {hervamConfig && (
                <p className="text-[#B3985B] text-sm font-semibold">
                  Base: {fmt((hervamConfig.valorTotalActivos * hervamConfig.tasaAnualRendimiento / 100) / 12)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Personal & Incidencias */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Recursos Humanos</p>
            <Link href="/rrhh/personal" className="text-xs text-[#B3985B] hover:underline">Ver equipo →</Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Colaboradores</p>
              <p className="text-white font-bold text-xl">{personalCount}</p>
              <p className="text-gray-600 text-[10px]">activos</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Incidencias</p>
              <p className={`font-bold text-xl ${incidenciasMes > 0 ? "text-yellow-400" : "text-white"}`}>{incidenciasMes}</p>
              <p className="text-gray-600 text-[10px]">este mes</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Proyectos activos</p>
              <p className="text-white font-bold text-xl">{proyectosActivos}</p>
              <p className="text-gray-600 text-[10px]">en producción</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Link href="/rrhh/nomina" className="text-xs text-gray-400 hover:text-[#B3985B] transition-colors border border-[#2a2a2a] px-3 py-1.5 rounded-lg">Nómina</Link>
            <Link href="/rrhh/asistencia" className="text-xs text-gray-400 hover:text-[#B3985B] transition-colors border border-[#2a2a2a] px-3 py-1.5 rounded-lg">Asistencia</Link>
            <Link href="/rrhh/incidencias" className="text-xs text-gray-400 hover:text-[#B3985B] transition-colors border border-[#2a2a2a] px-3 py-1.5 rounded-lg">Incidencias</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
