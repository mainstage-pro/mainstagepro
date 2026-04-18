import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DailyGreeting from "@/components/DailyGreeting";

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

function KpiCard({ label, value, sub, color = "text-white", href, alert }: { label: string; value: string; sub?: string; color?: string; href?: string; alert?: boolean }) {
  const content = (
    <div className={`bg-[#111] border rounded-xl p-4 transition-colors ${alert ? "border-yellow-800/40 hover:border-yellow-700/60" : "border-[#1e1e1e] hover:border-[#2a2a2a]"}`}>
      <p className="text-[10px] uppercase tracking-wider text-[#555] font-semibold mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-[#6b7280] mt-0.5">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

const ETAPA_LABELS: Record<string, string> = {
  DESCUBRIMIENTO: "Descubrimiento",
  OPORTUNIDAD: "Oportunidad",
  VENTA_CERRADA: "Venta Cerrada",
  VENTA_PERDIDA: "Venta Perdida",
};
const ETAPA_COLORS: Record<string, string> = {
  DESCUBRIMIENTO: "bg-blue-900/30 text-blue-300",
  OPORTUNIDAD: "bg-yellow-900/30 text-yellow-300",
  VENTA_CERRADA: "bg-green-900/30 text-green-300",
  VENTA_PERDIDA: "bg-red-900/30 text-red-400",
};

export default async function DashboardVentasPage() {
  const session = await getSession();
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
  const en3dias = new Date(ahora.getTime() + 3 * 86400000);
  const en7dias = new Date(ahora.getTime() + 7 * 86400000);
  const mes = ahora.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  const [
    tratosPorEtapa,
    cotizacionesMes,
    valorAprobadas,
    cotizacionesSinRespuesta,
    tratosSeguimiento,
    cotizacionesVencen3dias,
    tratosRecientes,
    ventasReporte,
  ] = await Promise.all([
    prisma.trato.groupBy({ by: ["etapa"], _count: { _all: true }, _sum: { presupuestoEstimado: true } }),
    prisma.cotizacion.count({ where: { createdAt: { gte: inicioMes, lte: finMes } } }),
    prisma.cotizacion.aggregate({
      _sum: { granTotal: true },
      where: { createdAt: { gte: inicioMes, lte: finMes }, estado: "APROBADA" },
    }),
    prisma.cotizacion.findMany({
      where: { estado: "ENVIADA" },
      include: { cliente: { select: { nombre: true, telefono: true } } },
      orderBy: { updatedAt: "asc" },
      take: 6,
    }),
    prisma.trato.findMany({
      where: {
        etapa: { in: ["DESCUBRIMIENTO", "OPORTUNIDAD"] },
        fechaProximaAccion: { gte: ahora, lte: en7dias },
      },
      include: { cliente: { select: { nombre: true } }, responsable: { select: { name: true } } },
      orderBy: { fechaProximaAccion: "asc" },
      take: 5,
    }),
    prisma.cotizacion.findMany({
      where: { estado: "ENVIADA", fechaVencimiento: { gte: ahora, lte: en3dias } },
      include: { cliente: { select: { nombre: true } } },
      orderBy: { fechaVencimiento: "asc" },
      take: 5,
    }),
    prisma.trato.findMany({
      where: { etapa: { in: ["DESCUBRIMIENTO", "OPORTUNIDAD"] } },
      include: { cliente: { select: { nombre: true } }, responsable: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.trato.count({ where: { etapa: "VENTA_CERRADA", updatedAt: { gte: inicioMes } } }),
  ]);

  // suppress unused variable warning
  void finMes;

  const etapasMap = Object.fromEntries(tratosPorEtapa.map(t => [t.etapa, { count: t._count._all, sum: t._sum.presupuestoEstimado ?? 0 }]));
  const pipeline = (etapasMap.DESCUBRIMIENTO?.count ?? 0) + (etapasMap.OPORTUNIDAD?.count ?? 0);
  const cerradas = etapasMap.VENTA_CERRADA?.count ?? 0;
  const perdidas = etapasMap.VENTA_PERDIDA?.count ?? 0;
  const tasa = (cerradas + perdidas) > 0 ? Math.round((cerradas / (cerradas + perdidas)) * 100) : 0;
  const valorPipeline = (etapasMap.DESCUBRIMIENTO?.sum ?? 0) + (etapasMap.OPORTUNIDAD?.sum ?? 0);
  const valorAprobado = valorAprobadas._sum.granTotal ?? 0;

  const fmtDate = (s: string | Date | null) => s ? new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) : "—";
  const diasSinRespuesta = (s: string | Date) => Math.floor((ahora.getTime() - new Date(s).getTime()) / 86400000);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-1">Dashboard · Ventas</p>
          <DailyGreeting nombre={session?.name ?? "Equipo"} />
        </div>
        <div className="flex gap-2 text-[10px]">
          {cotizacionesVencen3dias.length > 0 && (
            <span className="bg-orange-900/20 border border-orange-800/40 text-orange-400 px-3 py-1.5 rounded-lg font-semibold">
              ⚡ {cotizacionesVencen3dias.length} cots. vencen en 3 días
            </span>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Pipeline activo" value={String(pipeline)} sub={`${fmt(valorPipeline)} estimado`} color="text-[#B3985B]" href="/crm/tratos" />
        <KpiCard label="Cerradas este mes" value={String(ventasReporte)} sub={`${tasa}% tasa conversión`} color="text-green-400" href="/ventas" />
        <KpiCard label="Cotizaciones mes" value={String(cotizacionesMes)} sub="creadas este mes" href="/cotizaciones" />
        <KpiCard label="Valor aprobado" value={fmt(valorAprobado)} sub="cotizaciones aprobadas" color="text-green-400" href="/cotizaciones" />
        <KpiCard label="Sin respuesta" value={String(cotizacionesSinRespuesta.length)} sub="cotizaciones enviadas" color={cotizacionesSinRespuesta.length > 3 ? "text-yellow-400" : "text-white"} href="/cotizaciones" alert={cotizacionesSinRespuesta.length > 3} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Pipeline por etapa */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Pipeline</p>
            <Link href="/crm/tratos" className="text-xs text-[#B3985B] hover:underline">Ver todos →</Link>
          </div>
          <div className="space-y-2">
            {["DESCUBRIMIENTO", "OPORTUNIDAD", "VENTA_CERRADA", "VENTA_PERDIDA"].map(etapa => {
              const d = etapasMap[etapa];
              return (
                <div key={etapa} className="flex items-center justify-between py-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ETAPA_COLORS[etapa]}`}>{ETAPA_LABELS[etapa]}</span>
                  <div className="text-right">
                    <span className="text-white text-sm font-semibold">{d?.count ?? 0}</span>
                    {d?.sum ? <span className="text-gray-500 text-xs ml-1">{fmt(d.sum)}</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cotizaciones sin respuesta */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Sin respuesta</p>
            <Link href="/cotizaciones" className="text-xs text-[#B3985B] hover:underline">Ver →</Link>
          </div>
          {cotizacionesSinRespuesta.length === 0 ? (
            <p className="text-green-400 text-xs">✓ Todas con respuesta</p>
          ) : (
            <div className="space-y-2">
              {cotizacionesSinRespuesta.map(c => (
                <Link key={c.id} href={`/cotizaciones/${c.id}`} className="flex items-center justify-between py-1 border-b border-[#1a1a1a] last:border-0 hover:opacity-80">
                  <div>
                    <p className="text-white text-xs font-medium">{c.cliente.nombre}</p>
                    <p className="text-gray-600 text-[10px]">{c.numeroCotizacion}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#B3985B] text-xs font-semibold">{fmt(c.granTotal)}</p>
                    <p className={`text-[10px] ${diasSinRespuesta(c.updatedAt) > 5 ? "text-red-400" : "text-gray-500"}`}>
                      {diasSinRespuesta(c.updatedAt)}d sin respuesta
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Próximos seguimientos */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Seguimientos próximos</p>
            <Link href="/crm/tratos" className="text-xs text-[#B3985B] hover:underline">Ver →</Link>
          </div>
          {tratosSeguimiento.length === 0 ? (
            <p className="text-gray-600 text-xs italic">Sin seguimientos en 7 días</p>
          ) : (
            <div className="space-y-2">
              {tratosSeguimiento.map(t => (
                <Link key={t.id} href={`/crm/tratos/${t.id}`} className="flex items-center justify-between py-1.5 border-b border-[#1a1a1a] last:border-0 hover:opacity-80">
                  <div>
                    <p className="text-white text-xs font-medium">{t.cliente.nombre}</p>
                    <p className="text-gray-600 text-[10px]">{t.responsable?.name ?? "—"}</p>
                  </div>
                  <span className="text-[10px] text-[#B3985B] font-semibold">{fmtDate(t.fechaProximaAccion)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tratos activos */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Tratos activos recientes</p>
          <Link href="/crm/tratos" className="text-xs text-[#B3985B] hover:underline">Ver todos →</Link>
        </div>
        <table className="w-full min-w-[600px]">
          <tbody className="divide-y divide-[#1a1a1a]">
            {tratosRecientes.map(t => (
              <Link key={t.id} href={`/crm/tratos/${t.id}`} className="contents">
                <tr className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white text-sm font-medium">{t.cliente.nombre}</p>
                    <p className="text-gray-500 text-xs">{t.responsable?.name ?? "Sin responsable"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ETAPA_COLORS[t.etapa]}`}>
                      {ETAPA_LABELS[t.etapa]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-[#B3985B] text-sm font-semibold">{t.presupuestoEstimado ? fmt(t.presupuestoEstimado) : "—"}</p>
                    <p className="text-gray-600 text-xs">{fmtDate(t.updatedAt)}</p>
                  </td>
                </tr>
              </Link>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
