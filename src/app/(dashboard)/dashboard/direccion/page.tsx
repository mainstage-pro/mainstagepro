import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DailyGreeting from "@/components/DailyGreeting";
import TareasPendientesWidget from "@/components/TareasPendientesWidget";

const AREA_LABELS: Record<string, string> = {
  VENTAS: "Ventas", ADMINISTRACION: "Administración",
  PRODUCCION: "Producción", MARKETING: "Marketing",
};
const AREAS_OPS = ["VENTAS", "ADMINISTRACION", "PRODUCCION", "MARKETING"] as const;

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

function StatCard({ label, value, sub, color = "text-white", href }: {
  label: string; value: string | number; sub?: string; color?: string; href?: string;
}) {
  const inner = (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 hover:border-[#2a2a2a] transition-colors">
      <p className="text-[10px] uppercase tracking-wider text-[#555] font-semibold mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-[#6b7280] mt-0.5">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function DashboardDireccionPage() {
  const session = await getSession();
  const ahora     = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const finMes    = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
  const finDeHoy  = new Date(ahora); finDeHoy.setHours(23, 59, 59, 999);

  // ── Datos operativos (paralelo) ──────────────────────────────────────────
  const [
    tareasRaw,
    proyectosEstados,
    movimientosMes,
    cxcPendiente,
    cxcVencidas,
    tratosPipeline,
    personalActivo,
  ] = await Promise.all([
    // Tareas del día: fecha <= fin de hoy, igual que vista "Hoy" del módulo de equipo
    prisma.tarea.findMany({
      where: {
        estado: { notIn: ["COMPLETADA", "CANCELADA"] },
        parentId: null,
        fecha: { lte: finDeHoy },
        area: { in: [...AREAS_OPS, "DIRECCION"] },
      },
      select: {
        id: true, titulo: true, prioridad: true, area: true,
        fecha: true, estado: true,
        asignadoA: { select: { id: true, name: true } },
      },
    }),

    // Proyectos por estado
    prisma.proyecto.groupBy({
      by: ["estado"],
      _count: { _all: true },
      where: { estado: { in: ["PLANEACION", "CONFIRMADO", "EN_CURSO", "COMPLETADO"] } },
    }),

    // Finanzas del mes
    prisma.movimientoFinanciero.groupBy({
      by: ["tipo"],
      _sum: { monto: true },
      where: { fecha: { gte: inicioMes, lte: finMes } },
    }),

    // CxC total pendiente
    prisma.cuentaCobrar.aggregate({
      _sum: { monto: true },
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] } },
    }),

    // CxC vencidas
    prisma.cuentaCobrar.count({
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] }, fechaCompromiso: { lt: ahora } },
    }),

    // Tratos activos en pipeline
    prisma.trato.count({
      where: { etapa: { in: ["DESCUBRIMIENTO", "OPORTUNIDAD"] } },
    }),

    // Personal activo
    prisma.personalInterno.count({ where: { activo: true } }).catch(() => 0),
  ]);

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const ingresos = movimientosMes.find(m => m.tipo === "INGRESO")?._sum.monto ?? 0;
  const egresos  = movimientosMes.find(m => m.tipo === "GASTO")?._sum.monto   ?? 0;
  const flujo    = ingresos - egresos;
  const cxcTotal = cxcPendiente._sum.monto ?? 0;

  const estadosMap: Record<string, number> = {};
  proyectosEstados.forEach(p => { estadosMap[p.estado] = p._count._all; });
  const proyActivos = (estadosMap.PLANEACION ?? 0) + (estadosMap.CONFIRMADO ?? 0) + (estadosMap.EN_CURSO ?? 0);

  // KPIs de tareas
  const PRIO_ORD: Record<string, number> = { URGENTE: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };
  const todayISO = ahora.toISOString().substring(0, 10);

  const totalPendientes = tareasRaw.length;
  const totalUrgentes   = tareasRaw.filter(t => t.prioridad === "URGENTE").length;
  const totalVencidas   = tareasRaw.filter(t => t.fecha && t.fecha.toISOString().substring(0, 10) < todayISO).length;
  const totalHoy        = tareasRaw.filter(t => t.fecha && t.fecha.toISOString().substring(0, 10) === todayISO).length;

  // Conteos por área
  const byArea: Record<string, number> = {};
  for (const t of tareasRaw) {
    byArea[t.area] = (byArea[t.area] ?? 0) + 1;
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-1">Dashboard · Dirección</p>
          <DailyGreeting nombre={session?.name ?? "Director"} />
        </div>
        <Link
          href="/operaciones"
          className="shrink-0 bg-[#B3985B] hover:bg-[#c9aa6a] active:scale-95 text-black text-sm font-semibold px-4 py-2 rounded-xl transition-all mt-1"
        >
          + Nueva tarea
        </Link>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          KPIs OPERATIVOS
      ══════════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest">PULSO OPERATIVO</p>
          <div className="flex-1 h-px bg-[#1a1a1a]" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard
            label="Tareas pendientes"
            value={totalPendientes}
            sub="todas las áreas"
            href="/operaciones/equipo"
          />
          <StatCard
            label="Urgentes"
            value={totalUrgentes}
            sub={totalVencidas > 0 ? `${totalVencidas} vencidas` : "sin vencer"}
            color={totalUrgentes > 0 ? "text-red-400" : "text-white"}
            href="/operaciones/equipo"
          />
          <StatCard
            label="Para hoy"
            value={totalHoy}
            sub="requieren atención"
            color={totalHoy > 0 ? "text-[#B3985B]" : "text-white"}
            href="/operaciones/equipo"
          />
          <StatCard
            label="Proyectos activos"
            value={proyActivos}
            sub={`${estadosMap.COMPLETADO ?? 0} completados`}
            href="/proyectos"
          />
        </div>

        {/* Mini barra de distribución por área */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-[#555] uppercase tracking-wider font-semibold">Tareas por área</p>
            <Link href="/operaciones/equipo" className="text-[10px] text-[#B3985B] hover:underline">Ver detalle →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {AREAS_OPS.map(area => {
              const count = byArea[area] ?? 0;
              const pct   = totalPendientes > 0 ? Math.round((count / totalPendientes) * 100) : 0;
              return (
                <div key={area}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-[#777]">{AREA_LABELS[area]}</p>
                    <p className="text-xs text-white font-semibold">{count}</p>
                  </div>
                  <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div className="h-full bg-[#B3985B] rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          KPIs FINANCIEROS (resumen ejecutivo)
      ══════════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest">FINANZAS</p>
          <div className="flex-1 h-px bg-[#1a1a1a]" />
          <Link href="/finanzas/reporte" className="text-[#B3985B] text-xs hover:underline shrink-0">Ver reporte →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Ingresos del mes"
            value={fmt(ingresos)}
            sub="registrados"
            color="text-green-400"
            href="/finanzas/movimientos"
          />
          <StatCard
            label="Egresos del mes"
            value={fmt(egresos)}
            sub="registrados"
            color="text-red-400"
            href="/finanzas/movimientos"
          />
          <StatCard
            label="Flujo neto"
            value={fmt(flujo)}
            sub={flujo >= 0 ? "positivo" : "negativo"}
            color={flujo >= 0 ? "text-[#B3985B]" : "text-red-400"}
            href="/finanzas/reporte"
          />
          <StatCard
            label="Por cobrar"
            value={fmt(cxcTotal)}
            sub={cxcVencidas > 0 ? `${cxcVencidas} vencidas` : "al corriente"}
            color={cxcVencidas > 0 ? "text-red-400" : "text-white"}
            href="/finanzas/cxc"
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ACCESOS RÁPIDOS A MÓDULOS
      ══════════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest">MÓDULOS</p>
          <div className="flex-1 h-px bg-[#1a1a1a]" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/crm/tratos",    label: "CRM",          desc: `${tratosPipeline} tratos activos`,           icon: "💼" },
            { href: "/proyectos",     label: "Proyectos",    desc: `${proyActivos} en producción`,               icon: "🎛️" },
            { href: "/finanzas/cxc",  label: "Finanzas",     desc: cxcVencidas > 0 ? `${cxcVencidas} cobros vencidos` : "Al corriente", icon: "📊" },
            { href: "/rrhh/personal", label: "RR.HH.",       desc: `${personalActivo} colaboradores activos`,    icon: "👥" },
            { href: "/marketing/calendario", label: "Marketing", desc: "Calendario de contenido",                icon: "📣" },
            { href: "/inventario/disponibilidad", label: "Inventario", desc: "Disponibilidad de equipos",        icon: "📦" },
            { href: "/operaciones/equipo", label: "Equipo",  desc: `${totalPendientes} tareas pendientes`,       icon: "✅" },
            { href: "/reportes",      label: "Reportes",     desc: "Análisis y reportes",                        icon: "📈" },
          ].map(m => (
            <Link
              key={m.href}
              href={m.href}
              className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 hover:border-[#2a2a2a] hover:bg-[#141414] transition-all flex items-start gap-3"
            >
              <span className="text-xl shrink-0 mt-0.5">{m.icon}</span>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">{m.label}</p>
                <p className="text-[#555] text-[11px] mt-0.5 truncate">{m.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAREAS POR ÁREA (vista de equipo completa)
      ══════════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest">TAREAS DEL DÍA · POR ÁREA</p>
          <div className="flex-1 h-px bg-[#1a1a1a]" />
          <Link href="/operaciones/equipo" className="text-[#B3985B] text-xs hover:underline shrink-0">Vista de equipo →</Link>
        </div>
        <TareasPendientesWidget />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAREAS DE DIRECCIÓN
      ══════════════════════════════════════════════════════════════════════ */}
      {(byArea["DIRECCION"] ?? 0) > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest">TAREAS DEL DÍA · DIRECCIÓN</p>
            <div className="flex-1 h-px bg-[#1a1a1a]" />
            <Link href="/operaciones" className="text-[#B3985B] text-xs hover:underline shrink-0">Ver módulo →</Link>
          </div>
          <TareasPendientesWidget area="DIRECCION" />
        </div>
      )}
    </div>
  );
}
