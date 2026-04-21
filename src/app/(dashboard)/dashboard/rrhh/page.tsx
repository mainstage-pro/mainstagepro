import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DailyGreeting from "@/components/DailyGreeting";
import TareasPendientesWidget from "@/components/TareasPendientesWidget";

function KpiCard({ label, value, sub, color = "text-white", href }: { label: string; value: string | number; sub?: string; color?: string; href?: string }) {
  const content = (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 hover:border-[#2a2a2a] transition-colors">
      <p className="text-[10px] uppercase tracking-wider text-[#555] font-semibold mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-[#6b7280] mt-0.5">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default async function DashboardRRHHPage() {
  const session = await getSession();
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const finMes    = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
  const mes       = ahora.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  const [
    personalCount,
    personalActivo,
    incidenciasMes,
    nominaPendiente,
    onboardingActivo,
    evaluacionesMes,
  ] = await Promise.all([
    prisma.personalInterno.count().catch(() => 0),
    prisma.personalInterno.count({ where: { activo: true } }).catch(() => 0),
    prisma.incidencia.count({ where: { fecha: { gte: inicioMes, lte: finMes } } }).catch(() => 0),
    prisma.pagoNomina.aggregate({ _sum: { monto: true }, where: { estado: "PENDIENTE" } }).catch(() => ({ _sum: { monto: 0 } })),
    prisma.onboardingPlan.count({ where: { estado: "EN_CURSO" } }).catch(() => 0),
    prisma.evaluacionEmpleado.count({ where: { fecha: { gte: inicioMes, lte: finMes } } }).catch(() => 0),
  ]);

  const nominaTotal = (nominaPendiente as { _sum: { monto: number | null } })._sum?.monto ?? 0;
  const fmt = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-1">Dashboard · RR.HH.</p>
          <DailyGreeting nombre={session?.name ?? "Equipo"} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Colaboradores activos" value={personalActivo} sub={`de ${personalCount} total`} href="/rrhh/personal" />
        <KpiCard
          label="Nómina pendiente"
          value={fmt(nominaTotal)}
          sub="por pagar"
          color={nominaTotal > 0 ? "text-yellow-400" : "text-white"}
          href="/rrhh/nomina"
        />
        <KpiCard
          label="Incidencias del mes"
          value={incidenciasMes}
          sub={mes}
          color={incidenciasMes > 0 ? "text-orange-400" : "text-white"}
          href="/rrhh/incidencias"
        />
        <KpiCard
          label="Onboarding activo"
          value={onboardingActivo}
          sub="planes en curso"
          color={onboardingActivo > 0 ? "text-[#B3985B]" : "text-white"}
          href="/rrhh/onboarding"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Candidatos */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Reclutamiento</p>
            <Link href="/rrhh/candidatos" className="text-xs text-[#B3985B] hover:underline">Ver candidatos →</Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-[#555] uppercase">Onboarding activo</p>
              <p className={`font-bold text-2xl ${onboardingActivo > 0 ? "text-[#B3985B]" : "text-white"}`}>{onboardingActivo}</p>
              <p className="text-[#444] text-[10px]">planes en curso</p>
            </div>
            <div>
              <p className="text-[10px] text-[#555] uppercase">Evaluaciones del mes</p>
              <p className={`font-bold text-2xl ${evaluacionesMes > 0 ? "text-[#B3985B]" : "text-white"}`}>{evaluacionesMes}</p>
              <p className="text-[#444] text-[10px]">registradas</p>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-3">Accesos rápidos</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: "/rrhh/personal",    label: "Personal",    desc: "Directorio del equipo" },
              { href: "/rrhh/asistencia",  label: "Asistencia",  desc: "Registro de entradas" },
              { href: "/rrhh/nomina",      label: "Nómina",      desc: "Pagos pendientes" },
              { href: "/rrhh/incidencias", label: "Incidencias", desc: "Reporte del mes" },
              { href: "/rrhh/puestos",     label: "Puestos",     desc: "Organigrama" },
              { href: "/rrhh/evaluaciones",label: "Evaluaciones",desc: "Desempeño" },
            ].map(a => (
              <Link key={a.href} href={a.href}
                className="flex flex-col px-3 py-2.5 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a] hover:border-[#2a2a2a] hover:bg-[#141414] transition-all">
                <p className="text-white text-xs font-semibold">{a.label}</p>
                <p className="text-[#555] text-[10px] mt-0.5">{a.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Tareas pendientes del área */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest">TAREAS PENDIENTES</p>
          <div className="flex-1 h-px bg-[#1a1a1a]" />
          <Link href="/operaciones" className="text-[#B3985B] text-xs hover:underline shrink-0">Ver módulo →</Link>
        </div>
        <TareasPendientesWidget area="RRHH" />
      </div>
    </div>
  );
}
