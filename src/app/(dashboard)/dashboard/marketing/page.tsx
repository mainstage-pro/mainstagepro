import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DailyGreeting from "@/components/DailyGreeting";

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

const PUB_COLORS: Record<string, string> = {
  PENDIENTE: "bg-gray-800 text-gray-400",
  EN_PROCESO: "bg-blue-900/40 text-blue-300",
  LISTO: "bg-yellow-900/40 text-yellow-300",
  PUBLICADO: "bg-green-900/40 text-green-300",
  CANCELADO: "bg-red-900/40 text-red-400",
};

export default async function DashboardMarketingPage() {
  const session = await getSession();
  const ahora = new Date();
  const en7dias = new Date(ahora.getTime() + 7 * 86400000);
  const en14dias = new Date(ahora.getTime() + 14 * 86400000);
  const mesISO = ahora.toISOString().slice(0, 7);
  const mes = ahora.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  const mesStart = new Date(`${mesISO}-01`);
  const mesEnd = new Date(mesStart);
  mesEnd.setMonth(mesEnd.getMonth() + 1);

  const [
    pubsPorEstado,
    pubsProximas7,
    campanasActivas,
    proyectosContenido,
  ] = await Promise.all([
    prisma.publicacion.groupBy({
      by: ["estado"],
      _count: { _all: true },
      where: { fecha: { gte: mesStart, lt: mesEnd } },
    }),
    prisma.publicacion.findMany({
      where: {
        fecha: { gte: ahora, lte: en7dias },
        estado: { in: ["PENDIENTE", "EN_PROCESO", "LISTO"] },
      },
      include: { tipo: { select: { nombre: true } } },
      orderBy: { fecha: "asc" },
      take: 8,
    }),
    prisma.metaCampana.count({ where: { estado: "ACTIVA" } }).catch(() => 0),
    prisma.proyecto.findMany({
      where: { estado: { in: ["PLANEACION", "CONFIRMADO", "EN_CURSO"] }, fechaEvento: { gte: ahora, lte: en14dias } },
      select: { id: true, nombre: true, fechaEvento: true, cliente: { select: { nombre: true } } },
      orderBy: { fechaEvento: "asc" },
      take: 5,
    }),
  ]);

  const pubsMap = Object.fromEntries(pubsPorEstado.map((p) => [p.estado, p._count._all]));
  const totalPubs = Object.values(pubsMap).reduce((s, v) => s + v, 0);
  const publicadas = pubsMap.PUBLICADO ?? 0;
  const pendientes = (pubsMap.PENDIENTE ?? 0) + (pubsMap.EN_PROCESO ?? 0);
  const listos = pubsMap.LISTO ?? 0;
  const pctCumplimiento = totalPubs > 0 ? Math.round((publicadas / totalPubs) * 100) : 0;

  const fmtDate = (s: string | Date | null) => s ? new Date(s).toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" }) : "—";

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-1">Dashboard · Marketing</p>
          <DailyGreeting nombre={session?.name ?? "Equipo"} />
        </div>
        {pubsProximas7.length > 0 && (
          <Link href="/marketing/calendario" className="bg-orange-900/20 border border-orange-800/40 text-orange-400 text-[10px] px-3 py-1.5 rounded-lg font-semibold">
            📅 {pubsProximas7.length} publicaciones esta semana
          </Link>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Publicadas mes" value={String(publicadas)} sub={`${pctCumplimiento}% cumplimiento`} color="text-green-400" href="/marketing/reporte" />
        <KpiCard label="Pendientes" value={String(pendientes)} sub="por publicar" color={pendientes > 5 ? "text-yellow-400" : "text-white"} href="/marketing/calendario" />
        <KpiCard label="Listas para publicar" value={String(listos)} sub="esperando aprobación" color={listos > 0 ? "text-[#B3985B]" : "text-white"} href="/marketing/calendario" />
        <KpiCard label="Campañas activas" value={String(campanasActivas)} sub="Meta Ads en curso" href="/marketing/campanas" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Publicaciones próximas 7 días */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Próximos 7 días</p>
            <Link href="/marketing/calendario" className="text-xs text-[#B3985B] hover:underline">Calendario →</Link>
          </div>
          {pubsProximas7.length === 0 ? (
            <p className="text-gray-600 text-xs italic">Sin publicaciones en los próximos 7 días</p>
          ) : (
            <div className="space-y-2">
              {pubsProximas7.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-[#1a1a1a] last:border-0">
                  <div>
                    <p className="text-white text-sm font-medium">{p.descripcion ?? p.tipo?.nombre ?? "Publicación"}</p>
                    <p className="text-gray-500 text-xs">{p.tipo?.nombre ?? "Sin tipo"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${PUB_COLORS[p.estado] ?? "bg-gray-800 text-gray-400"}`}>
                      {p.estado}
                    </span>
                    <span className="text-gray-400 text-xs">{fmtDate(p.fecha)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Eventos próximos para contenido */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Eventos para contenido (14 días)</p>
            <Link href="/proyectos" className="text-xs text-[#B3985B] hover:underline">Ver proyectos →</Link>
          </div>
          {proyectosContenido.length === 0 ? (
            <p className="text-gray-600 text-xs italic">Sin eventos en los próximos 14 días</p>
          ) : (
            <div className="space-y-2">
              {proyectosContenido.map((p) => (
                <Link key={p.id} href={`/proyectos/${p.id}`} className="flex items-center justify-between py-1.5 border-b border-[#1a1a1a] last:border-0 hover:opacity-80">
                  <div>
                    <p className="text-white text-sm font-medium">{p.nombre}</p>
                    <p className="text-gray-500 text-xs">{p.cliente.nombre}</p>
                  </div>
                  <span className="text-[#B3985B] text-xs font-semibold">{fmtDate(p.fechaEvento)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Estado del mes */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Estado del contenido — {mes}</p>
          <p className="text-white text-sm font-bold">{totalPubs} publicaciones</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {Object.entries(pubsMap).map(([estado, count]) => (
            <div key={estado} className={`px-3 py-2 rounded-lg flex items-center gap-2 ${PUB_COLORS[estado] ?? "bg-gray-800 text-gray-400"}`}>
              <span className="font-bold text-lg">{count}</span>
              <span className="text-[10px] uppercase font-semibold">{estado}</span>
            </div>
          ))}
        </div>
        {totalPubs > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
              <span>Progreso del mes</span>
              <span>{pctCumplimiento}%</span>
            </div>
            <div className="h-1.5 bg-[#1a1a1a] rounded-full">
              <div className="h-full bg-[#B3985B] rounded-full transition-all" style={{ width: `${pctCumplimiento}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { href: "/marketing/calendario", label: "Calendario de contenido", desc: "Ver y gestionar publicaciones" },
          { href: "/marketing/contenidos", label: "Tipos de contenido", desc: "Gestionar formatos" },
          { href: "/marketing/campanas", label: "Campañas", desc: "Meta Ads y publicidad" },
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
