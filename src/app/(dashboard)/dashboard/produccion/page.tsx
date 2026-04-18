import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DailyGreeting from "@/components/DailyGreeting";

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

function KpiCard({ label, value, sub, color = "text-white", href, alert }: { label: string; value: string; sub?: string; color?: string; href?: string; alert?: boolean }) {
  const content = (
    <div className={`bg-[#111] border rounded-xl p-4 transition-colors ${alert ? "border-yellow-800/40" : "border-[#1e1e1e] hover:border-[#2a2a2a]"}`}>
      <p className="text-[10px] uppercase tracking-wider text-[#555] font-semibold mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-[#6b7280] mt-0.5">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

const ESTADO_COLORS: Record<string, string> = {
  PLANEACION: "bg-blue-900/30 text-blue-300",
  CONFIRMADO: "bg-yellow-900/30 text-yellow-300",
  EN_CURSO: "bg-green-900/30 text-green-300",
  COMPLETADO: "bg-gray-800 text-gray-400",
};

export default async function DashboardProduccionPage() {
  const session = await getSession();
  const ahora = new Date();
  const en7dias = new Date(ahora.getTime() + 7 * 86400000);
  const en30dias = new Date(ahora.getTime() + 30 * 86400000);
  const mes = ahora.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  // suppress unused variable warning
  void fmt;

  const [
    proyectosPorEstado,
    proyectosProximos,
    equiposMantenimiento,
    proyectosSinPersonal,
    proximoEvento,
  ] = await Promise.all([
    prisma.proyecto.groupBy({ by: ["estado"], _count: { _all: true } }),
    prisma.proyecto.findMany({
      where: { estado: { in: ["PLANEACION", "CONFIRMADO", "EN_CURSO"] }, fechaEvento: { gte: ahora, lte: en30dias } },
      include: {
        cliente: { select: { nombre: true } },
        personal: { select: { confirmado: true } },
        checklist: { select: { completado: true } },
      },
      orderBy: { fechaEvento: "asc" },
      take: 10,
    }),
    prisma.equipo.count({ where: { estado: "EN_MANTENIMIENTO" } }),
    prisma.proyecto.count({
      where: {
        estado: { in: ["PLANEACION", "CONFIRMADO"] },
        personal: { none: { confirmado: true } },
        fechaEvento: { lte: en30dias, gte: ahora },
      },
    }),
    prisma.proyecto.findFirst({
      where: { estado: { in: ["PLANEACION", "CONFIRMADO", "EN_CURSO"] }, fechaEvento: { gte: ahora } },
      include: { cliente: { select: { nombre: true } } },
      orderBy: { fechaEvento: "asc" },
    }),
  ]);

  // suppress unused
  void en7dias;

  const estadosMap = Object.fromEntries(proyectosPorEstado.map(p => [p.estado, p._count._all]));
  const activos = (estadosMap.PLANEACION ?? 0) + (estadosMap.CONFIRMADO ?? 0) + (estadosMap.EN_CURSO ?? 0);

  const diasHasta = proximoEvento?.fechaEvento
    ? Math.max(0, Math.floor((new Date(proximoEvento.fechaEvento).getTime() - ahora.getTime()) / 86400000))
    : null;

  const fmtDate = (s: string | Date | null) => s ? new Date(s).toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" }) : "—";

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-1">Dashboard · Producción</p>
          <DailyGreeting nombre={session?.name ?? "Equipo"} />
        </div>
        <div className="flex gap-2 text-[10px]">
          {proyectosSinPersonal > 0 && (
            <Link href="/proyectos" className="bg-red-900/20 border border-red-800/40 text-red-400 px-3 py-1.5 rounded-lg font-semibold">
              ⚠ {proyectosSinPersonal} sin personal confirmado
            </Link>
          )}
          {equiposMantenimiento > 0 && (
            <span className="bg-yellow-900/20 border border-yellow-800/40 text-yellow-400 px-3 py-1.5 rounded-lg font-semibold">
              🔧 {equiposMantenimiento} equipos en mantenimiento
            </span>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Proyectos activos" value={String(activos)} sub="en planeación/confirmados/curso" color="text-[#B3985B]" href="/proyectos" />
        <KpiCard label="Próximo evento" value={diasHasta !== null ? `${diasHasta}d` : "—"} sub={proximoEvento?.nombre ?? "Sin eventos próximos"} color={diasHasta !== null && diasHasta <= 7 ? "text-orange-400" : "text-white"} href="/proyectos" />
        <KpiCard label="Equipos mantenimiento" value={String(equiposMantenimiento)} sub="fuera de circulación" color={equiposMantenimiento > 0 ? "text-yellow-400" : "text-white"} href="/inventario/mantenimiento" alert={equiposMantenimiento > 0} />
        <KpiCard label="Sin personal" value={String(proyectosSinPersonal)} sub="en próximos 30 días" color={proyectosSinPersonal > 0 ? "text-red-400" : "text-white"} href="/proyectos" alert={proyectosSinPersonal > 0} />
      </div>

      {/* Próximos proyectos */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Proyectos próximos 30 días</p>
          <Link href="/proyectos" className="text-xs text-[#B3985B] hover:underline">Ver todos →</Link>
        </div>
        {proyectosProximos.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-600 text-sm">Sin proyectos en los próximos 30 días</div>
        ) : (
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                {["Evento", "Cliente", "Fecha", "Personal", "Checklist", "Estado"].map(h => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {proyectosProximos.map(p => {
                const totalPersonal = p.personal.length;
                const confirmados = p.personal.filter(x => x.confirmado).length;
                const checkOk = p.checklist.filter(x => x.completado).length;
                const checkTotal = p.checklist.length;
                const dias = Math.max(0, Math.floor((new Date(p.fechaEvento).getTime() - ahora.getTime()) / 86400000));
                return (
                  <Link key={p.id} href={`/proyectos/${p.id}`} className="contents">
                    <tr className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white text-sm font-medium">{p.nombre}</p>
                        <p className="text-gray-600 text-xs">en {dias}d</p>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">{p.cliente.nombre}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{fmtDate(p.fechaEvento)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${confirmados === totalPersonal && totalPersonal > 0 ? "text-green-400" : confirmados === 0 ? "text-red-400" : "text-yellow-400"}`}>
                          {confirmados}/{totalPersonal}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${checkOk === checkTotal && checkTotal > 0 ? "text-green-400" : "text-gray-500"}`}>
                          {checkOk}/{checkTotal}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_COLORS[p.estado] ?? "bg-gray-800 text-gray-400"}`}>
                          {p.estado}
                        </span>
                      </td>
                    </tr>
                  </Link>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/inventario/disponibilidad", label: "Disponibilidad", desc: "Ver equipos disponibles" },
          { href: "/inventario/recolecciones", label: "Recolecciones", desc: "Pendientes de recolectar" },
          { href: "/inventario/mantenimiento", label: "Mantenimiento", desc: "Estado de equipos" },
          { href: "/inventario/checklist", label: "Checklist semanal", desc: "Revisión de inventario" },
        ].map(a => (
          <Link key={a.href} href={a.href} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 hover:border-[#2a2a2a] hover:bg-[#141414] transition-all">
            <p className="text-white text-sm font-semibold">{a.label}</p>
            <p className="text-gray-500 text-xs mt-0.5">{a.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
