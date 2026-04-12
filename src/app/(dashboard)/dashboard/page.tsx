import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/cotizador";
import Link from "next/link";
import AlertasPanel from "@/components/AlertasPanel";

export default async function DashboardPage() {
  const session = await getSession();

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
    tratosSeguimientoItems,
    // ── PRODUCCIÓN ──────────────────────────────
    proyectosPorEstado,
    proyectosProximos,
    equiposMantenimiento,
    proyectosSinPersonal,
    proyectosSinPersonalItems,
    nominaPendiente,
    // ── ADMINISTRACIÓN ──────────────────────────
    cxcPendiente,
    cxcVencidas,
    cxcVencidasItems,
    cxcVence7dias,
    cxpPendiente,
    cxpVence7dias,
    movimientosMes,
    cuentasBancarias,
    // ── MARKETING ───────────────────────────────
    pubsPorEstado,
    pubsProximas,
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
    prisma.trato.findMany({
      where: { etapa: { in: ["DESCUBRIMIENTO", "OPORTUNIDAD"] }, fechaProximaAccion: { lt: ahora } },
      select: {
        id: true, nombreEvento: true, fechaProximaAccion: true,
        cliente: { select: { nombre: true } },
        responsable: { select: { name: true } },
      },
      orderBy: { fechaProximaAccion: "asc" },
      take: 10,
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
    prisma.proyecto.findMany({
      where: {
        estado: { in: ["PLANEACION", "CONFIRMADO"] },
        personal: { none: { confirmado: true } },
        fechaEvento: { lte: en30dias, gte: ahora },
      },
      select: {
        id: true, nombre: true, numeroProyecto: true, fechaEvento: true,
        cliente: { select: { nombre: true } },
      },
      orderBy: { fechaEvento: "asc" },
      take: 10,
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
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] }, fechaCompromiso: { lt: ahora } },
      select: {
        id: true, concepto: true, monto: true, fechaCompromiso: true,
        cliente: { select: { nombre: true } },
        proyecto: { select: { nombre: true, numeroProyecto: true } },
      },
      orderBy: { fechaCompromiso: "asc" },
      take: 20,
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
  ]);

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const etapasMap: Record<string, number> = {};
  tratosPorEtapa.forEach(t => { etapasMap[t.etapa] = t._count._all; });
  const totalPipeline    = (etapasMap.DESCUBRIMIENTO ?? 0) + (etapasMap.OPORTUNIDAD ?? 0);
  const totalCerrados    = etapasMap.VENTA_CERRADA ?? 0;
  const totalPerdidos    = etapasMap.VENTA_PERDIDA ?? 0;
  const tasaConversion   = (totalCerrados + totalPerdidos) > 0
    ? Math.round((totalCerrados / (totalCerrados + totalPerdidos)) * 100) : 0;

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

  const alertaTotal = cxcVencidas + tratosSeguimientoVencido + proyectosSinPersonal;

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Hola, {session?.name?.split(" ")[0]}
          </h1>
          <p className="text-gray-500 text-sm capitalize">{mes}</p>
        </div>
        <div className="flex items-center gap-3">
          <AlertasPanel
            total={alertaTotal}
            cxcVencidas={cxcVencidasItems.map(c => ({
              ...c,
              fechaCompromiso: c.fechaCompromiso.toISOString(),
            }))}
            tratosVencidos={tratosSeguimientoItems.map(t => ({
              id: t.id,
              nombreEvento: t.nombreEvento ?? null,
              cliente: t.cliente,
              fechaProximaAccion: t.fechaProximaAccion?.toISOString() ?? null,
              responsable: t.responsable ?? null,
            }))}
            proyectosSinPersonal={proyectosSinPersonalItems.map(p => ({
              ...p,
              fechaEvento: p.fechaEvento.toISOString(),
            }))}
          />
          <Link
            href="/crm/tratos/nuevo"
            className="bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors"
          >
            + Nuevo trato
          </Link>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ADMINISTRACIÓN
      ══════════════════════════════════════════════════════════════════════ */}
      <Section label="ADMINISTRACIÓN" href="/finanzas/movimientos">
        {/* KPIs del mes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Ingresos del mes"  value={formatCurrency(ingresosDelMes)} subColor="text-green-400" sub="registrados" />
          <KpiCard label="Gastos del mes"    value={formatCurrency(gastosDelMes)}   subColor="text-red-400"   sub="registrados" />
          <KpiCard label="Flujo neto"        value={formatCurrency(flujoNeto)}
            subColor={flujoNeto >= 0 ? "text-green-400" : "text-red-400"}
            sub={flujoNeto >= 0 ? "positivo" : "negativo"} />
          <KpiCard label="Disponible neto"   value={formatCurrency(disponibleNeto)}
            subColor={disponibleNeto >= 0 ? "text-white" : "text-red-400"}
            sub="bancos − CxP" />
        </div>

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
              <div className="px-5 py-3 flex items-center justify-between bg-red-900/10">
                <p className="text-red-400 text-xs font-medium">Vencidas</p>
                <p className="text-red-400 font-bold text-sm">{cxcVencidas}</p>
              </div>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Pipeline activo" value={totalPipeline} sub="tratos en curso" />
          <KpiCard label="Cerrados" value={totalCerrados}
            sub={`${tasaConversion}% tasa de cierre`}
            subColor={tasaConversion >= 40 ? "text-green-400" : "text-yellow-400"} />
          <KpiCard label="Cotizaciones mes" value={cotizacionesMesCount}
            sub={`${cotizacionesAprobadas} aprobadas`}
            subColor={cotizacionesAprobadas > 0 ? "text-green-400" : "text-gray-500"} />
          <KpiCard label="Valor aprobado" value={formatCurrency(valorCotizacionesMes._sum.granTotal ?? 0)}
            sub="cotizaciones aprobadas / enviadas" />
        </div>

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Proyectos activos" value={proyectosActivos} sub="en operación" />
          <KpiCard label="Completados" value={estadosMap.COMPLETADO ?? 0} sub="histórico" />
          <KpiCard label="Equipos en mant." value={equiposMantenimiento}
            sub="fuera de servicio"
            subColor={equiposMantenimiento > 0 ? "text-yellow-400" : "text-gray-500"} />
          <KpiCard label="Nómina pendiente" value={formatCurrency(nominaPendiente._sum.monto ?? 0)}
            sub="por pagar"
            subColor={(nominaPendiente._sum.monto ?? 0) > 0 ? "text-yellow-400" : "text-gray-500"} />
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
                <div key={estado} className="text-center bg-[#0d0d0d] rounded-lg py-3">
                  <p className={`text-2xl font-bold ${color}`}>{estadosMap[estado] ?? 0}</p>
                  <p className="text-gray-600 text-xs mt-0.5">{label}</p>
                </div>
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

function KpiCard({ label, value, sub, subColor = "text-gray-500" }: {
  label: string; value: string | number; sub?: string; subColor?: string;
}) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
      <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
      {sub && <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>}
    </div>
  );
}
