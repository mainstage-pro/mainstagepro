import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/cotizador";
import Link from "next/link";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { GraficaIngresos } from "@/components/GraficaIngresos";
import { redirect } from "next/navigation";
import DailyGreeting from "@/components/DailyGreeting";

export default async function DashboardPage() {
  const session = await getSession();

  // Redirect non-admin/non-CEO users to their area dashboard
  if (session && session.role !== "ADMIN" && session.area && session.area !== "GENERAL" && session.area !== "DIRECCION") {
    const areaRoutes: Record<string, string> = {
      ADMINISTRACION: "/dashboard/administracion",
      MARKETING: "/dashboard/marketing",
      VENTAS: "/dashboard/ventas",
      PRODUCCION: "/dashboard/produccion",
    };
    const target = areaRoutes[session.area];
    if (target) {
      redirect(target);
    }
  }

  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const finMes    = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
  const en7dias   = new Date(ahora.getTime() + 7 * 86400000);
  const en30dias  = new Date(ahora.getTime() + 30 * 86400000);
  const mes       = ahora.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const mesISO    = ahora.toISOString().slice(0, 7); // "2026-04"

  const [
    // ── VENTAS ──────────────────────────────────
    tratosPorEtapa,
    cotizacionesMesCount,
    cotizacionesAprobadas,
    valorCotizacionesMes,
    tratosSeguimientoVencido,
    pipelinePresupuesto,
    // ── PRODUCCIÓN ──────────────────────────────
    proyectosPorEstado,
    proyectosProximos,
    equiposMantenimiento,
    proyectosSinPersonal,
    nominaPendiente,
    // ── ADMINISTRACIÓN ──────────────────────────
    cxcPendiente,
    cxcVencidas,
    cxcVence7dias,
    cxpPendiente,
    cxpVence7dias,
    movimientosMes,
    cuentasBancarias,
    // ── ESTA SEMANA ─────────────────────────────
    proyectosEstaSemana,
    // ── MARKETING ───────────────────────────────
    pubsPorEstado,
    pubsProximas,
    // ── COTIZACIONES SIN RESPUESTA ───────────────
    cotizacionesSinRespuesta,
    // ── CAPITAL ─────────────────────────────────
    hervamPagoMes,
    hervamConfig,
    sociosReporteMes,
    sociosReportesPendientes,
  ] = await Promise.all([

    // ── VENTAS ──────────────────────────────────
    prisma.trato.groupBy({
      by: ["etapa"],
      _count: { _all: true },
      where: { etapa: { in: ["DESCUBRIMIENTO", "OPORTUNIDAD", "VENTA_CERRADA", "VENTA_PERDIDA"] } },
    }),
    prisma.cotizacion.count({ where: { createdAt: { gte: inicioMes, lte: finMes } } }),
    prisma.cotizacion.count({ where: { createdAt: { gte: inicioMes, lte: finMes }, estado: "APROBADA" } }),
    prisma.cotizacion.aggregate({
      _sum: { granTotal: true },
      where: { createdAt: { gte: inicioMes, lte: finMes }, estado: { in: ["APROBADA", "ENVIADA"] } },
    }),
    prisma.trato.count({
      where: { etapa: { in: ["DESCUBRIMIENTO", "OPORTUNIDAD"] }, fechaProximaAccion: { lt: ahora } },
    }),
    prisma.trato.aggregate({
      _sum: { presupuestoEstimado: true },
      where: { etapa: { in: ["DESCUBRIMIENTO", "OPORTUNIDAD"] } },
    }),

    // ── PRODUCCIÓN ──────────────────────────────
    prisma.proyecto.groupBy({
      by: ["estado"],
      _count: { _all: true },
      where: { estado: { in: ["PLANEACION", "CONFIRMADO", "EN_CURSO", "COMPLETADO"] } },
    }),
    prisma.proyecto.findMany({
      where: { estado: { in: ["PLANEACION", "CONFIRMADO", "EN_CURSO"] }, fechaEvento: { gte: ahora } },
      include: {
        cliente: { select: { nombre: true } },
        trato: { select: { responsable: { select: { name: true } } } },
      },
      orderBy: { fechaEvento: "asc" },
      take: 5,
    }),
    prisma.equipo.count({ where: { estado: "EN_MANTENIMIENTO" } }),
    prisma.proyecto.count({
      where: {
        estado: { in: ["PLANEACION", "CONFIRMADO"] },
        personal: { none: { confirmado: true } },
        fechaEvento: { lte: en30dias, gte: ahora },
      },
    }),
    prisma.pagoNomina.aggregate({
      _sum: { monto: true },
      where: { estado: "PENDIENTE" },
    }),

    // ── ADMINISTRACIÓN ──────────────────────────
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
      take: 4,
    }),
    prisma.cuentaPagar.aggregate({
      _sum: { monto: true },
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] } },
    }),
    prisma.cuentaPagar.findMany({
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] }, fechaCompromiso: { gte: ahora, lte: en7dias } },
      orderBy: { fechaCompromiso: "asc" },
      take: 4,
    }),
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
        movimientosSalida:  { select: { monto: true } },
      },
    }),

    // ── ESTA SEMANA ─────────────────────────────
    prisma.proyecto.findMany({
      where: { estado: { in: ["PLANEACION","CONFIRMADO","EN_CURSO"] }, fechaEvento: { gte: ahora, lte: en7dias } },
      include: {
        cliente: { select: { nombre: true } },
        personal: { where: { confirmado: false }, select: { id: true, tecnico: { select: { nombre: true } }, rolTecnico: { select: { nombre: true } } } },
      },
      orderBy: { fechaEvento: "asc" },
    }),

    // ── MARKETING ───────────────────────────────
    prisma.publicacion.groupBy({
      by: ["estado"],
      _count: { _all: true },
      where: {
        fecha: {
          gte: new Date(`${mesISO}-01`),
          lt:  new Date(new Date(`${mesISO}-01`).setMonth(new Date(`${mesISO}-01`).getMonth() + 1)),
        },
      },
    }),
    prisma.publicacion.findMany({
      where: {
        fecha: { gte: ahora, lte: en7dias },
        estado: { in: ["PENDIENTE", "EN_PROCESO", "LISTO"] },
      },
      include: { tipo: { select: { nombre: true } } },
      orderBy: { fecha: "asc" },
      take: 5,
    }),

    // ── COTIZACIONES SIN RESPUESTA ───────────────
    prisma.cotizacion.findMany({
      where: { estado: "ENVIADA" },
      select: {
        id: true, numeroCotizacion: true, nombreEvento: true, granTotal: true, updatedAt: true,
        cliente: { select: { id: true, nombre: true, telefono: true } },
      },
      orderBy: { updatedAt: "asc" },
      take: 8,
    }),

    // ── CAPITAL ─────────────────────────────────
    prisma.hervamPago.findFirst({
      where: { mes: ahora.getMonth() + 1, anio: ahora.getFullYear() },
    }),
    prisma.hervamConfig.findFirst(),
    prisma.socioReporte.aggregate({
      _sum: { totalFacturado: true, totalSocio: true, totalMainstage: true },
      where: { mes: ahora.getMonth() + 1, anio: ahora.getFullYear() },
    }),
    prisma.socioReporte.count({
      where: { estado: { not: "PAGADO" } },
    }),

  ]);

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const etapasMap: Record<string, number> = {};
  tratosPorEtapa.forEach(t => { etapasMap[t.etapa] = t._count._all; });
  const totalPipeline    = (etapasMap.DESCUBRIMIENTO ?? 0) + (etapasMap.OPORTUNIDAD ?? 0);
  const totalCerrados    = etapasMap.VENTA_CERRADA ?? 0;
  const totalPerdidos    = etapasMap.VENTA_PERDIDA ?? 0;
  const tasaConversion   = (totalCerrados + totalPerdidos) > 0
    ? Math.round((totalCerrados / (totalCerrados + totalPerdidos)) * 100) : 0;
  const valorPipeline    = pipelinePresupuesto._sum.presupuestoEstimado ?? 0;

  const estadosMap: Record<string, number> = {};
  proyectosPorEstado.forEach(p => { estadosMap[p.estado] = p._count._all; });
  const proyectosActivos = (estadosMap.PLANEACION ?? 0) + (estadosMap.CONFIRMADO ?? 0) + (estadosMap.EN_CURSO ?? 0);

  const ingresosDelMes = movimientosMes.find(m => m.tipo === "INGRESO")?._sum.monto ?? 0;
  const gastosDelMes   = movimientosMes.find(m => m.tipo === "GASTO")?._sum.monto   ?? 0;
  const flujoNeto      = ingresosDelMes - gastosDelMes;

  const saldosPorCuenta = cuentasBancarias.map(c => ({
    ...c,
    saldo: c.movimientosEntrada.reduce((s, m) => s + m.monto, 0)
         - c.movimientosSalida.reduce((s, m)  => s + m.monto, 0),
  }));
  const totalDisponible = saldosPorCuenta.reduce((s, c) => s + c.saldo, 0);
  const totalCxP        = cxpPendiente._sum.monto ?? 0;
  const disponibleNeto  = totalDisponible - totalCxP;

  const pubsMap: Record<string, number> = {};
  pubsPorEstado.forEach(p => { pubsMap[p.estado] = p._count._all; });
  const totalPubsMes    = Object.values(pubsMap).reduce((s, v) => s + v, 0);
  const pubsPublicadas  = pubsMap.PUBLICADO ?? 0;
  const pubsPendientes  = (pubsMap.PENDIENTE ?? 0) + (pubsMap.EN_PROCESO ?? 0);


  const ESTADO_PUB_COLORS: Record<string, string> = {
    PENDIENTE:  "bg-gray-800 text-gray-400",
    EN_PROCESO: "bg-blue-900/40 text-blue-300",
    LISTO:      "bg-yellow-900/40 text-yellow-300",
    PUBLICADO:  "bg-green-900/40 text-green-300",
    CANCELADO:  "bg-red-900/40 text-red-400",
  };

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <DailyGreeting nombre={session?.name ?? ""} />
        <Link
          href="/crm/tratos/nuevo"
          className="bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors shrink-0 mt-1"
        >
          + Nuevo trato
        </Link>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CAPITAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Section label="CAPITAL" href="/socios">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* HERVAM */}
          <Link href="/hervam" className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden hover:border-[#333] transition-colors group">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold">Pulso HERVAM</p>
              {hervamPagoMes ? (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  hervamPagoMes.estado === "PAGADO"   ? "text-green-400 bg-green-900/20 border-green-700/40" :
                  hervamPagoMes.estado === "PARCIAL"  ? "text-yellow-400 bg-yellow-900/20 border-yellow-700/40" :
                  hervamPagoMes.estado === "DIFERIDO" ? "text-orange-400 bg-orange-900/20 border-orange-700/40" :
                                                        "text-red-400 bg-red-900/20 border-red-700/40"
                }`}>{hervamPagoMes.estado}</span>
              ) : (
                <span className="text-[10px] text-gray-600">Sin registro</span>
              )}
            </div>
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Pago acordado {mes}</p>
                <p className="text-2xl font-semibold text-white group-hover:text-[#B3985B] transition-colors">
                  {hervamPagoMes ? formatCurrency(hervamPagoMes.montoAcordado) : "—"}
                </p>
              </div>
              {hervamPagoMes && hervamPagoMes.montoPagado > 0 && hervamPagoMes.estado !== "PAGADO" && (
                <div className="text-right">
                  <p className="text-gray-600 text-[10px]">Pagado</p>
                  <p className="text-green-400 text-sm font-semibold">{formatCurrency(hervamPagoMes.montoPagado)}</p>
                </div>
              )}
            </div>
          </Link>

          {/* Socios de Activos */}
          <Link href="/socios" className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden hover:border-[#333] transition-colors group">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold">Socios de Activos</p>
              {sociosReportesPendientes > 0 && (
                <span className="text-[10px] text-yellow-400 bg-yellow-900/20 border border-yellow-700/40 px-2 py-0.5 rounded font-bold">
                  {sociosReportesPendientes} pendiente{sociosReportesPendientes !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">Facturado</p>
                <p className="text-white font-semibold text-lg group-hover:text-[#B3985B] transition-colors">
                  {formatCurrency(sociosReporteMes._sum.totalFacturado ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">A socios</p>
                <p className="text-white font-semibold text-lg">{formatCurrency(sociosReporteMes._sum.totalSocio ?? 0)}</p>
              </div>
              <div>
                <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">Mainstage</p>
                <p className="text-[#B3985B] font-semibold text-lg">{formatCurrency(sociosReporteMes._sum.totalMainstage ?? 0)}</p>
              </div>
            </div>
          </Link>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          ESTA SEMANA
      ══════════════════════════════════════════════════════════════════════ */}
      {(proyectosEstaSemana.length > 0 || cxcVence7dias.length > 0 || cxpVence7dias.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <p className="text-[11px] font-bold text-[#B3985B] uppercase tracking-widest">Esta semana</p>
            <div className="flex-1 h-px bg-[#B3985B]/20" />
            <span className="text-[10px] text-[#B3985B]/60">próximos 7 días</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Proyectos */}
            <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#1a1a1a] flex items-center justify-between">
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">Eventos</p>
                <span className="text-[10px] text-[#B3985B] bg-[#B3985B]/10 px-2 py-0.5 rounded-full">{proyectosEstaSemana.length}</span>
              </div>
              {proyectosEstaSemana.length === 0 ? (
                <p className="text-gray-600 text-xs px-4 py-3">Sin eventos esta semana</p>
              ) : proyectosEstaSemana.map(p => {
                const dias = Math.ceil((new Date(p.fechaEvento!).getTime() - ahora.getTime()) / 86400000);
                const sinConfirmar = p.personal.length;
                return (
                  <a key={p.id} href={`/proyectos/${p.id}`} className="block px-4 py-2.5 border-b border-[#111] hover:bg-[#151515] transition-colors last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white text-xs font-medium truncate">{p.nombre}</p>
                      <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${dias <= 1 ? "bg-red-900/40 text-red-300" : dias <= 3 ? "bg-yellow-900/40 text-yellow-300" : "bg-[#1e1e1e] text-gray-400"}`}>
                        {dias === 0 ? "Hoy" : dias === 1 ? "Mañana" : `${dias}d`}
                      </span>
                    </div>
                    <p className="text-gray-600 text-[10px] mt-0.5">{p.cliente.nombre}</p>
                    {sinConfirmar > 0 && (
                      <p className="text-orange-400 text-[10px] mt-0.5">⚠ {sinConfirmar} técnico{sinConfirmar !== 1 ? "s" : ""} sin confirmar</p>
                    )}
                  </a>
                );
              })}
            </div>
            {/* CxC */}
            <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#1a1a1a] flex items-center justify-between">
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">Cobros</p>
                <span className="text-[10px] text-yellow-400 bg-yellow-900/20 px-2 py-0.5 rounded-full">{cxcVence7dias.length}</span>
              </div>
              {cxcVence7dias.length === 0 ? (
                <p className="text-gray-600 text-xs px-4 py-3">Sin cobros próximos</p>
              ) : cxcVence7dias.map((c, i) => (
                <a key={i} href="/finanzas/cobros-pagos" className="flex items-center justify-between px-4 py-2.5 border-b border-[#111] hover:bg-[#151515] transition-colors last:border-0">
                  <p className="text-white text-xs truncate">{c.cliente.nombre}</p>
                  <p className="text-yellow-400 text-[10px] font-semibold ml-2 shrink-0">
                    {new Date(c.fechaCompromiso).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                  </p>
                </a>
              ))}
            </div>
            {/* CxP */}
            <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#1a1a1a] flex items-center justify-between">
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">Pagos</p>
                <span className="text-[10px] text-orange-400 bg-orange-900/20 px-2 py-0.5 rounded-full">{cxpVence7dias.length}</span>
              </div>
              {cxpVence7dias.length === 0 ? (
                <p className="text-gray-600 text-xs px-4 py-3">Sin pagos próximos</p>
              ) : cxpVence7dias.map((c, i) => (
                <a key={i} href="/finanzas/cobros-pagos" className="flex items-center justify-between px-4 py-2.5 border-b border-[#111] hover:bg-[#151515] transition-colors last:border-0">
                  <p className="text-white text-xs truncate">{c.concepto ?? "Pago"}</p>
                  <p className="text-orange-400 text-[10px] font-semibold ml-2 shrink-0">
                    {new Date(c.fechaCompromiso).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ADMINISTRACIÓN
      ══════════════════════════════════════════════════════════════════════ */}
      <Section label="ADMINISTRACIÓN" href="/finanzas/movimientos">
        {/* KPIs del mes */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Ingresos del mes"  value={formatCurrency(ingresosDelMes)} subColor="text-green-400" sub="registrados" animate={{ amount: ingresosDelMes, prefix: "$", decimals: 0 }} href="/finanzas/movimientos" />
          <KpiCard label="Gastos del mes"    value={formatCurrency(gastosDelMes)}   subColor="text-red-400"   sub="registrados" animate={{ amount: gastosDelMes, prefix: "$", decimals: 0 }} href="/finanzas/movimientos" />
          <KpiCard label="Flujo neto"        value={formatCurrency(flujoNeto)}
            subColor={flujoNeto >= 0 ? "text-green-400" : "text-red-400"}
            sub={flujoNeto >= 0 ? "positivo" : "negativo"} animate={{ amount: flujoNeto, prefix: "$", decimals: 0 }} href="/finanzas/reporte" />
          <KpiCard label="Disponible neto"   value={formatCurrency(disponibleNeto)}
            subColor={disponibleNeto >= 0 ? "text-white" : "text-red-400"}
            sub="bancos − CxP" animate={{ amount: disponibleNeto, prefix: "$", decimals: 0 }} href="/finanzas/cuentas" />
        </div>

        <GraficaIngresos />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Posición bancaria */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold">Cuentas</p>
              <Link href="/finanzas/cuentas" className="text-[#B3985B] text-xs hover:underline">Ver →</Link>
            </div>
            {saldosPorCuenta.length === 0 ? (
              <p className="text-gray-600 text-sm px-5 py-6 text-center">Sin cuentas</p>
            ) : (
              <div className="divide-y divide-[#1a1a1a]">
                {saldosPorCuenta.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-white text-sm">{c.nombre}</p>
                      {c.banco && <p className="text-gray-600 text-xs">{c.banco}</p>}
                    </div>
                    <p className={`text-sm font-semibold ${c.saldo >= 0 ? "text-white" : "text-red-400"}`}>
                      {formatCurrency(c.saldo)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CxC */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold">Por cobrar</p>
              <Link href="/finanzas/cxc" className="text-[#B3985B] text-xs hover:underline">Ver →</Link>
            </div>
            <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
              <p className="text-gray-500 text-xs">Total pendiente</p>
              <p className="text-white font-bold">{formatCurrency(cxcPendiente._sum.monto ?? 0)}</p>
            </div>
            {cxcVencidas > 0 && (
              <Link href="/finanzas/cxc" className="px-5 py-3 flex items-center justify-between bg-red-900/10 hover:bg-red-900/20 transition-colors">
                <p className="text-red-400 text-xs font-medium">Vencidas → ver detalle</p>
                <p className="text-red-400 font-bold text-sm">{cxcVencidas}</p>
              </Link>
            )}
            <div className="divide-y divide-[#1a1a1a]">
              {cxcVence7dias.length === 0 ? (
                <p className="text-gray-600 text-xs px-5 py-3">Sin vencimientos próximos</p>
              ) : cxcVence7dias.map((c, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-2.5">
                  <p className="text-white text-xs truncate">{c.cliente.nombre}</p>
                  <p className="text-yellow-400 text-xs font-medium ml-2 shrink-0">
                    {new Date(c.fechaCompromiso).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CxP */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold">Por pagar</p>
              <Link href="/finanzas/cxp" className="text-[#B3985B] text-xs hover:underline">Ver →</Link>
            </div>
            <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
              <p className="text-gray-500 text-xs">Total pendiente</p>
              <p className="text-white font-bold">{formatCurrency(totalCxP)}</p>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {cxpVence7dias.length === 0 ? (
                <p className="text-gray-600 text-xs px-5 py-3">Sin vencimientos próximos</p>
              ) : cxpVence7dias.map((c, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-2.5">
                  <p className="text-white text-xs truncate">{c.concepto ?? "Pago"}</p>
                  <p className="text-orange-400 text-xs font-medium ml-2 shrink-0">
                    {new Date(c.fechaCompromiso).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          MARKETING
      ══════════════════════════════════════════════════════════════════════ */}
      <Section label="MARKETING" href="/marketing/calendario">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Publicaciones mes" value={totalPubsMes} sub="programadas" />
          <KpiCard label="Publicadas" value={pubsPublicadas}
            sub={totalPubsMes > 0 ? `${Math.round((pubsPublicadas / totalPubsMes) * 100)}% completado` : "—"}
            subColor="text-green-400" />
          <KpiCard label="Pendientes" value={pubsPendientes}
            sub="por preparar o publicar"
            subColor={pubsPendientes > 0 ? "text-yellow-400" : "text-gray-500"} />
          <KpiCard label="Próx. 7 días" value={pubsProximas.length}
            sub="publicaciones por salir"
            subColor={pubsProximas.length > 0 ? "text-[#B3985B]" : "text-gray-500"} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Barra de estados del mes */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
            <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-4">Estado del mes</p>
            {totalPubsMes === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-600 text-sm">Sin publicaciones este mes</p>
                <Link href="/marketing/calendario" className="text-[#B3985B] text-xs hover:underline mt-1 block">Agregar →</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { estado: "PUBLICADO",  label: "Publicado",  color: "bg-green-500" },
                  { estado: "LISTO",      label: "Listo",      color: "bg-yellow-500" },
                  { estado: "EN_PROCESO", label: "En proceso", color: "bg-blue-500" },
                  { estado: "PENDIENTE",  label: "Pendiente",  color: "bg-gray-600" },
                  { estado: "CANCELADO",  label: "Cancelado",  color: "bg-red-700" },
                ].filter(e => pubsMap[e.estado] > 0).map(({ estado, label, color }) => {
                  const count = pubsMap[estado] ?? 0;
                  return (
                    <div key={estado}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-400 text-xs">{label}</span>
                        <span className="text-white text-xs font-semibold">{count}</span>
                      </div>
                      <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full`} style={{ width: `${(count / totalPubsMes) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Próximas publicaciones */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold">Próximas publicaciones</p>
              <Link href="/marketing/calendario" className="text-[#B3985B] text-xs hover:underline">Ver calendario →</Link>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {pubsProximas.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-6">Sin publicaciones en los próximos 7 días</p>
              ) : pubsProximas.map(p => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm truncate">{p.tipo?.nombre ?? p.formato ?? "Sin tipo"}</p>
                    <p className="text-gray-500 text-xs">
                      {new Date(p.fecha).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <span className={`shrink-0 ml-3 text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_PUB_COLORS[p.estado] ?? "bg-gray-800 text-gray-400"}`}>
                    {p.estado.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          VENTAS
      ══════════════════════════════════════════════════════════════════════ */}
      <Section label="VENTAS" href="/crm/pipeline">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard label="Pipeline activo" value={totalPipeline} sub="tratos en curso" animate={{ amount: totalPipeline }} href="/crm/pipeline" />
          <KpiCard label="Valor del pipeline" value={valorPipeline > 0 ? formatCurrency(valorPipeline) : "Sin datos"}
            sub="presupuesto estimado" subColor="text-[#B3985B]"
            animate={valorPipeline > 0 ? { amount: valorPipeline, prefix: "$", decimals: 0 } : undefined} href="/crm/pipeline" />
          <KpiCard label="Tasa de conversión" value={`${tasaConversion}%`}
            sub={`${totalCerrados} cerrados · ${totalPerdidos} perdidos`}
            subColor={tasaConversion >= 50 ? "text-green-400" : tasaConversion >= 30 ? "text-yellow-400" : "text-red-400"} href="/crm/tratos" />
          <KpiCard label="Cotizaciones mes" value={cotizacionesMesCount}
            sub={`${cotizacionesAprobadas} aprobadas`}
            subColor={cotizacionesAprobadas > 0 ? "text-green-400" : "text-gray-500"} href="/cotizaciones" />
          <KpiCard label="Valor aprobado" value={formatCurrency(valorCotizacionesMes._sum.granTotal ?? 0)}
            sub="aprobadas / enviadas" href="/cotizaciones" />
        </div>

        {/* Cotizaciones sin respuesta */}
        {cotizacionesSinRespuesta.length > 0 && (
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Cotizaciones sin respuesta</p>
              </div>
              <Link href="/cotizaciones" className="text-[#B3985B] text-xs hover:underline">Ver todas →</Link>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {cotizacionesSinRespuesta.map(c => {
                const diasEspera = Math.floor((ahora.getTime() - new Date(c.updatedAt).getTime()) / 86400000);
                const waMsg = `Hola ${c.cliente.nombre.split(" ")[0]}! 👋 Te escribimos de Mainstage Pro para dar seguimiento a la cotización *${c.numeroCotizacion}*${c.nombreEvento ? ` para ${c.nombreEvento}` : ""}. ¿Tuviste oportunidad de revisarla? Quedamos al pendiente. 🎪`;
                return (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#1a1a1a] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/cotizaciones/${c.id}`} className="text-white text-sm font-medium hover:text-[#B3985B] transition-colors truncate">
                          {c.cliente.nombre}
                        </Link>
                        <span className="text-[10px] text-gray-600 font-mono">{c.numeroCotizacion}</span>
                      </div>
                      {c.nombreEvento && <p className="text-gray-500 text-xs truncate">{c.nombreEvento}</p>}
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <p className="text-white text-sm font-semibold">{formatCurrency(c.granTotal)}</p>
                        <p className={`text-[10px] ${diasEspera > 5 ? "text-red-400" : diasEspera > 2 ? "text-yellow-400" : "text-gray-600"}`}>
                          {diasEspera === 0 ? "Hoy" : `${diasEspera}d esperando`}
                        </p>
                      </div>
                      {c.cliente.telefono && (
                        <a
                          href={`https://wa.me/52${c.cliente.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(waMsg)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-green-900/20 hover:bg-green-900/40 text-green-400 transition-colors"
                          title="Dar seguimiento por WhatsApp"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.556 4.122 1.528 5.855L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-4.964-1.342l-.356-.212-3.762.98 1.003-3.659-.233-.374A9.818 9.818 0 1112 21.818z"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Funnel */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-3">
          <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-3">Funnel</p>
          {[
            { etapa: "DESCUBRIMIENTO", label: "Descubrimiento", color: "bg-blue-500" },
            { etapa: "OPORTUNIDAD",    label: "Oportunidad",    color: "bg-[#B3985B]" },
            { etapa: "VENTA_CERRADA",  label: "Cerradas",       color: "bg-green-500" },
            { etapa: "VENTA_PERDIDA",  label: "Perdidas",       color: "bg-red-600" },
          ].map(({ etapa, label, color }) => {
            const count    = etapasMap[etapa] ?? 0;
            const maxCount = Math.max(...Object.values(etapasMap), 1);
            return (
              <div key={etapa}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 text-xs">{label}</span>
                  <span className="text-white text-sm font-semibold">{count}</span>
                </div>
                <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full`} style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
              </div>
            );
          })}
          {tratosSeguimientoVencido > 0 && (
            <Link href="/crm/tratos" className="flex items-center gap-2 mt-2 pt-3 border-t border-[#1a1a1a] text-xs text-yellow-400 hover:text-yellow-300 transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
              {tratosSeguimientoVencido} trato{tratosSeguimientoVencido !== 1 ? "s" : ""} con seguimiento vencido
            </Link>
          )}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          PRODUCCIÓN
      ══════════════════════════════════════════════════════════════════════ */}
      <Section label="PRODUCCIÓN" href="/proyectos">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Proyectos activos" value={proyectosActivos} sub="en operación" animate={{ amount: proyectosActivos }} href="/proyectos" />
          <KpiCard label="Completados" value={estadosMap.COMPLETADO ?? 0} sub="histórico" animate={{ amount: estadosMap.COMPLETADO ?? 0 }} href="/proyectos" />
          <KpiCard label="Equipos en mant." value={equiposMantenimiento}
            sub="fuera de servicio"
            subColor={equiposMantenimiento > 0 ? "text-yellow-400" : "text-gray-500"} href="/inventario" />
          <KpiCard label="Nómina pendiente" value={formatCurrency(nominaPendiente._sum.monto ?? 0)}
            sub="por pagar"
            subColor={(nominaPendiente._sum.monto ?? 0) > 0 ? "text-yellow-400" : "text-gray-500"} href="/rrhh/nomina" />
        </div>

        {/* Estados + próximos eventos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Estados */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
            <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-4">Por estado</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { estado: "PLANEACION", label: "Planeación",  color: "text-blue-400" },
                { estado: "CONFIRMADO", label: "Confirmado",  color: "text-green-400" },
                { estado: "EN_CURSO",   label: "En curso",    color: "text-yellow-400" },
                { estado: "COMPLETADO", label: "Completados", color: "text-gray-400" },
              ].map(({ estado, label, color }) => (
                <Link key={estado} href="/proyectos" className="text-center bg-[#0d0d0d] rounded-lg py-3 hover:bg-[#151515] transition-colors block">
                  <p className={`text-2xl font-bold ${color}`}>{estadosMap[estado] ?? 0}</p>
                  <p className="text-gray-600 text-xs mt-0.5">{label}</p>
                </Link>
              ))}
            </div>
            {proyectosSinPersonal > 0 && (
              <Link href="/proyectos" className="flex items-center gap-2 mt-4 pt-3 border-t border-[#1a1a1a] text-xs text-red-400 hover:text-red-300 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {proyectosSinPersonal} proyecto{proyectosSinPersonal !== 1 ? "s" : ""} próximo{proyectosSinPersonal !== 1 ? "s" : ""} sin personal
              </Link>
            )}
          </div>

          {/* Próximos eventos */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold">Próximos eventos</p>
              <Link href="/proyectos" className="text-[#B3985B] text-xs hover:underline">Ver todos →</Link>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {proyectosProximos.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-6">Sin eventos próximos</p>
              ) : proyectosProximos.map(p => {
                const dias = Math.ceil((new Date(p.fechaEvento).getTime() - ahora.getTime()) / 86400000);
                return (
                  <Link key={p.id} href={`/proyectos/${p.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-[#1a1a1a] transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">{p.nombre}</p>
                      <p className="text-gray-500 text-xs">
                        {p.cliente.nombre}
                        {p.trato?.responsable && (
                          <span className="text-[#B3985B] ml-1">· {p.trato.responsable.name}</span>
                        )}
                      </p>
                    </div>
                    <span className={`shrink-0 ml-3 text-xs font-medium px-2 py-0.5 rounded-full ${
                      dias <= 3  ? "bg-red-900/40 text-red-300" :
                      dias <= 7  ? "bg-yellow-900/40 text-yellow-300" :
                                   "bg-[#1e1e1e] text-gray-400"
                    }`}>
                      {dias === 0 ? "Hoy" : dias === 1 ? "Mañana" : `En ${dias}d`}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ── Componentes ───────────────────────────────────────────────────────────────

function Section({ label, href, children }: {
  label: string; href: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest">{label}</p>
        <div className="flex-1 h-px bg-[#1a1a1a]" />
        <Link href={href} className="text-[#B3985B] text-xs hover:underline shrink-0">Ver módulo →</Link>
      </div>
      {children}
    </div>
  );
}

function KpiCard({ label, value, sub, subColor = "text-gray-500", animate, href }: {
  label: string; value: string | number; sub?: string; subColor?: string;
  animate?: { amount: number; prefix?: string; decimals?: number };
  href?: string;
}) {
  const inner = (
    <div className={`bg-[#111] border border-[#1e1e1e] rounded-xl p-5 ${href ? "hover:border-[#333] transition-colors group" : ""}`}>
      <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-2xl font-semibold text-white ${href ? "group-hover:text-[#B3985B] transition-colors" : ""}`}>
        {animate ? (
          <AnimatedNumber
            value={animate.amount}
            prefix={animate.prefix ?? ""}
            decimals={animate.decimals ?? 0}
          />
        ) : value}
      </p>
      {sub && <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
