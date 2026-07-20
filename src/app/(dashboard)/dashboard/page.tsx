import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/cotizador";
import { calcularMiercolesPostEvento } from "@/lib/dashboardUtils";
import Link from "next/link";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { GraficaIngresos } from "@/components/GraficaIngresos";
import { GraficaFunnelVentas } from "@/components/GraficaFunnelVentas";
import { GraficaPublicaciones } from "@/components/GraficaPublicaciones";
import { GraficaProyectos } from "@/components/GraficaProyectos";
import { redirect } from "next/navigation";
import DailyGreeting from "@/components/DailyGreeting";
import TareasHoyWidget from "@/components/TareasHoyWidget";
import PlanTrabajoWidget from "@/components/PlanTrabajoWidget";
import { NuevoTratoDropdown } from "@/components/NuevoTratoDropdown";
import { AlertTriangle, Zap } from "lucide-react";


export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();

  // Redirect non-admin users to their area-specific dashboard
  if (session && session.role !== "ADMIN" && session.area && session.area !== "GENERAL") {
    const areaRoutes: Record<string, string> = {
      DIRECCION:     "/dashboard/direccion",
      ADMINISTRACION:"/dashboard/administracion",
      MARKETING:     "/dashboard/marketing",
      VENTAS:        "/dashboard/ventas",
      PRODUCCION:    "/dashboard/produccion",
      RRHH:          "/dashboard/rrhh",
    };
    const target = areaRoutes[session.area];
    if (target) {
      redirect(target);
    }
  }

  const ahora = new Date();
  const inicioDeHoy = new Date(ahora.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }));
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const finMes    = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
  const en7dias   = new Date(ahora.getTime() + 7 * 86400000);
  const en30dias  = new Date(ahora.getTime() + 30 * 86400000);
  const hace14dias = new Date(ahora.getTime() - 14 * 86400000);
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
    cxcVencidaAgg,
    cxcVence7dias,
    cxpPendiente,
    cxpVencidaAgg,
    cxpVence7dias,
    movimientosMes,
    cuentasBancarias,
    // ── ESTA SEMANA ─────────────────────────────
    proyectosEstaSemana,
    tratosAprobadosEstaSemana,

    // ── MARKETING ───────────────────────────────
    pubsPorEstado,
    pubsProximas,
    // ── COTIZACIONES SIN RESPUESTA ───────────────
    cotizacionesSinRespuesta,
    // ── LEADS RECIENTES ───────────────────────────
    leadsRecientes,
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
      take: 10,
    }),
    prisma.equipo.count({ where: { estado: { in: ["EN_MANTENIMIENTO", "EN_REPARACION"] } } }),
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
      _sum: { monto: true, montoCobrado: true },
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] } },
    }),
    prisma.cuentaCobrar.aggregate({
      _sum: { monto: true, montoCobrado: true },
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] }, fechaCompromiso: { lt: inicioDeHoy } },
    }),
    prisma.cuentaCobrar.findMany({
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] }, fechaCompromiso: { gte: inicioDeHoy, lte: en7dias } },
      include: { cliente: { select: { nombre: true } }, empresa: { select: { nombre: true } } },
      orderBy: { fechaCompromiso: "asc" },
      take: 4,
    }),
    prisma.cuentaPagar.aggregate({
      _sum: { monto: true },
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] } },
    }),
    prisma.cuentaPagar.aggregate({
      _sum: { monto: true },
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] }, fechaCompromiso: { lt: inicioDeHoy } },
    }),
    prisma.cuentaPagar.findMany({
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] }, fechaCompromiso: { gte: inicioDeHoy, lte: en7dias } },
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
      where: { estado: { in: ["PLANEACION","CONFIRMADO","EN_CURSO"] }, fechaEvento: { gte: inicioDeHoy, lte: en7dias } },
      include: {
        cliente: { select: { nombre: true } },
        personal: { where: { confirmado: false }, select: { id: true, tecnico: { select: { nombre: true } }, rolTecnico: { select: { nombre: true } } } },
      },
      orderBy: { fechaEvento: "asc" },
    }),
    // Cotizaciones APROBADAS sin proyecto — esta semana
    prisma.trato.findMany({
      where: {
        proyectos: { none: {} },
        cotizaciones: { some: { estado: "APROBADA", fechaEvento: { gte: inicioDeHoy, lte: en7dias, not: null } } },
      },
      select: {
        id: true,
        nombreEvento: true,
        cliente: { select: { nombre: true } },
        cotizaciones: {
          where: { estado: "APROBADA", fechaEvento: { gte: inicioDeHoy, not: null } },
          select: { fechaEvento: true },
          orderBy: { fechaEvento: "asc" },
          take: 1,
        },
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

    // ── LEADS RECIENTES ───────────────────────────
    prisma.trato.findMany({
      where: { etapa: 'PROSPECCION' },
      select: {
        id: true,
        createdAt: true,
        tipoEvento: true,
        nombreEvento: true,
        origenLead: true,
        cliente: { select: { nombre: true, telefono: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),

  ]);

  // ── Eventos recientes: pasados, sin cerrar, últimos 14 días (sin corte de miércoles) ──
  const eventosRecientes = await prisma.proyecto.findMany({
    where: {
      fechaEvento: { gte: hace14dias, lt: inicioDeHoy },
      estado: { notIn: ["COMPLETADO", "CANCELADO"] },
    },
    select: {
      id: true,
      nombre: true,
      fechaEvento: true,
      estado: true,
      cliente: { select: { nombre: true } },
    },
    orderBy: { fechaEvento: "desc" },
  });

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
  const totalCxC        = (cxcPendiente._sum.monto ?? 0) - (cxcPendiente._sum.montoCobrado ?? 0);
  const cxcVencMonto    = (cxcVencidaAgg._sum.monto ?? 0) - (cxcVencidaAgg._sum.montoCobrado ?? 0);
  const cxcProxMonto    = totalCxC - cxcVencMonto;
  const totalCxP        = cxpPendiente._sum.monto ?? 0;
  const cxpVencMonto    = cxpVencidaAgg._sum.monto ?? 0;
  const cxpProxMonto    = totalCxP - cxpVencMonto;
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

  // ── Abandono ───────────────────────────────────────────────────────────────
  const limite15 = new Date(ahora.getTime() - 15 * 86400000);
  const limite21 = new Date(ahora.getTime() - 21 * 86400000);
  const hace7dias = new Date(ahora.getTime() - 7 * 86400000);

  // ── Tratos VENTA_CERRADA sin proyecto (próximos eventos) ────────────────────
  const tratosVentaCerrada = await prisma.trato.findMany({
    where: {
      etapa: "VENTA_CERRADA",
      proyectos: { none: {} },
      cotizaciones: {
        some: { estado: "APROBADA", fechaEvento: { gte: ahora, not: null } },
      },
    },
    include: {
      cliente: { select: { nombre: true } },
      cotizaciones: {
        where: { estado: "APROBADA", fechaEvento: { gte: ahora, not: null } },
        orderBy: { fechaEvento: "asc" },
        take: 1,
      },
    },
  });

  type EventoProximo = {
    id: string;
    nombre: string;
    fechaEvento: Date;
    estado: string;
    url: string;
    sinProyecto: boolean;
    cliente: { nombre: string };
    responsable?: string | null;
  };

  const eventosProyecto: EventoProximo[] = proyectosProximos.map(p => ({
    id: p.id,
    nombre: p.nombre,
    fechaEvento: p.fechaEvento!,
    estado: p.estado,
    url: `/proyectos/${p.id}`,
    sinProyecto: false,
    cliente: p.cliente,
    responsable: p.trato?.responsable?.name ?? null,
  }));

  const eventosTrato: EventoProximo[] = tratosVentaCerrada.flatMap(t =>
    t.cotizaciones.filter(c => c.fechaEvento).map(c => ({
      id: t.id,
      nombre: t.nombreEvento || (c as { nombreEvento?: string | null }).nombreEvento || "Evento",
      fechaEvento: c.fechaEvento!,
      estado: "VENTA_CERRADA",
      url: `/crm/tratos/${t.id}`,
      sinProyecto: true,
      cliente: t.cliente!,
      responsable: null,
    }))
  );

  const eventosProximos = [...eventosProyecto, ...eventosTrato]
    .sort((a, b) => a.fechaEvento.getTime() - b.fechaEvento.getTime())
    .slice(0, 10);

  const [tareasAbandonadas, tratosEnfriados, tratosCriticos, tratosSinMovimientoRaw, tratosRevisionRaw] = await Promise.all([
    prisma.tarea.count({
      where: { estado: { notIn: ["COMPLETADA", "CANCELADA"] }, parentId: null, createdAt: { lte: limite15 } },
    }),
    prisma.trato.count({
      where: { etapa: { notIn: ["VENTA_CERRADA", "VENTA_PERDIDA"] }, createdAt: { lte: limite15 } },
    }),
    prisma.trato.count({
      where: {
        etapa: { notIn: ["VENTA_CERRADA", "VENTA_PERDIDA"] },
        createdAt: { lte: limite21 },
        fechaEventoEstimada: { lte: en7dias },
      },
    }),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM tratos t
      WHERE t.etapa IN ('DESCUBRIMIENTO', 'OPORTUNIDAD')
        AND t."tipoProspecto" = 'ACTIVO'
        AND (
          (t."etapaCambiadaEn" IS NULL AND t."createdAt" <= ${hace7dias})
          OR t."etapaCambiadaEn" <= ${hace7dias}
        )
        AND NOT EXISTS (
          SELECT 1 FROM seguimientos s
          WHERE s."tratoId" = t.id
            AND s.completado = true
            AND s."fechaCompletado" > ${hace7dias}
        )
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM tratos
      WHERE "requiereRevision" = true
        AND etapa IN ('DESCUBRIMIENTO', 'OPORTUNIDAD')
    `.catch(() => [{ count: BigInt(0) }]),
  ]);
  const tratosSinMovimiento = Number(tratosSinMovimientoRaw[0]?.count ?? 0);
  const tratosEnRevision    = Number(tratosRevisionRaw[0]?.count ?? 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <DailyGreeting nombre={session?.name ?? ""} />
        <NuevoTratoDropdown />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ESTA SEMANA
      ══════════════════════════════════════════════════════════════════════ */}
      {(proyectosEstaSemana.length > 0 || eventosRecientes.length > 0 || tratosAprobadosEstaSemana.length > 0 || cxcVence7dias.length > 0 || cxpVence7dias.length > 0) && (
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
                <span className="text-[10px] text-[#B3985B] bg-[#B3985B]/10 px-2 py-0.5 rounded-full">
                  {proyectosEstaSemana.length + eventosRecientes.length + tratosAprobadosEstaSemana.length}
                </span>
              </div>

              {/* ── Próximos (proyectos) ── */}
              {proyectosEstaSemana.length === 0 && eventosRecientes.length === 0 && tratosAprobadosEstaSemana.length === 0 ? (
                <p className="text-gray-600 text-xs px-4 py-3">Sin eventos esta semana</p>
              ) : proyectosEstaSemana.map(p => {
                const hoyStrEvt = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
                const evStrEvt = p.fechaEvento!.toISOString().substring(0, 10);
                const dias = Math.round((new Date(evStrEvt).getTime() - new Date(hoyStrEvt).getTime()) / 86400000);
                const sinConfirmar = p.personal.length;
                return (
                  <a key={p.id} href={`/proyectos/${p.id}`} className="block px-4 py-2.5 border-b border-[#111] hover:bg-[#151515] transition-colors last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white text-xs font-medium truncate">{p.nombre}</p>
                      <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${dias === 0 ? "bg-green-900/40 text-green-300" : dias === 1 ? "bg-yellow-900/40 text-yellow-300" : dias <= 3 ? "bg-yellow-900/30 text-yellow-400" : "bg-[#1e1e1e] text-gray-400"}`}>
                        {dias === 0 ? "Hoy" : dias === 1 ? "Mañana" : `${dias}d`}
                      </span>
                    </div>
                    <p className="text-gray-600 text-[10px] mt-0.5">{p.cliente.nombre}</p>
                    {sinConfirmar > 0 && (
                      <p className="inline-flex items-center gap-1 text-orange-400 text-[10px] mt-0.5"><AlertTriangle strokeWidth={1.75} className="w-3 h-3" /> {sinConfirmar} técnico{sinConfirmar !== 1 ? "s" : ""} sin confirmar</p>
                    )}
                  </a>
                );
              })}

              {/* ── Cotizaciones aprobadas sin proyecto ── */}
              {tratosAprobadosEstaSemana.map(t => {
                const cot = t.cotizaciones[0];
                if (!cot?.fechaEvento) return null;
                const hoyStrEvt = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
                const evStrEvt = cot.fechaEvento.toISOString().substring(0, 10);
                const dias = Math.round((new Date(evStrEvt).getTime() - new Date(hoyStrEvt).getTime()) / 86400000);
                return (
                  <a key={t.id} href={`/crm/tratos/${t.id}`} className="block px-4 py-2.5 border-b border-[#111] hover:bg-[#151515] transition-colors last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white text-xs font-medium truncate">{t.nombreEvento ?? "Evento"}</p>
                      <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${dias === 0 ? "bg-green-900/40 text-green-300" : dias === 1 ? "bg-yellow-900/40 text-yellow-300" : dias <= 3 ? "bg-yellow-900/30 text-yellow-400" : "bg-[#1e1e1e] text-gray-400"}`}>
                        {dias === 0 ? "Hoy" : dias === 1 ? "Mañana" : `${dias}d`}
                      </span>
                    </div>
                    <p className="text-gray-600 text-[10px] mt-0.5">{t.cliente.nombre}</p>
                    <p className="text-amber-500/70 text-[10px] mt-0.5">○ Sin proyecto</p>
                  </a>
                );
              })}

              {/* ── Por cerrar (recientes) ── */}
              {eventosRecientes.length > 0 && (
                <>
                  {proyectosEstaSemana.length > 0 && (
                    <div className="border-t border-[#1a1a1a]" />
                  )}
                  <div className="px-4 py-2">
                    <p className="text-[9px] uppercase tracking-widest text-gray-700 font-semibold mb-1.5">Por cerrar</p>
                    <div className="max-h-[126px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2a2a2a transparent' }}>
                    {eventosRecientes.map(e => {
                      const diasDesde = Math.floor(
                        (ahora.getTime() - new Date(e.fechaEvento!).getTime()) / 86400000
                      );
                      return (
                        <a
                          key={e.id}
                          href={`/proyectos/${e.id}`}
                          className="flex items-center gap-2 py-2 hover:bg-[#151515] -mx-4 px-4 transition-colors border-b border-[#0d0d0d] last:border-0"
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-500/80" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-medium truncate">{e.nombre}</p>
                            <p className="text-gray-600 text-[10px] mt-0.5">{e.cliente.nombre}</p>
                          </div>
                          <span className="shrink-0 text-[10px] text-gray-600 bg-[#1a1a1a] px-1.5 py-0.5 rounded whitespace-nowrap">
                            hace {diasDesde}d
                          </span>
                        </a>
                      );
                    })}
                    </div>

                  </div>
                </>
              )}
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
                  <p className="text-white text-xs truncate">{c.empresa?.nombre ?? c.cliente?.nombre ?? "—"}</p>
                  <p className="text-yellow-400 text-[10px] font-semibold ml-2 shrink-0">
                    {new Date(c.fechaCompromiso).toLocaleDateString("es-MX", { timeZone: "UTC", day: "numeric", month: "short" })}
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
                    {new Date(c.fechaCompromiso).toLocaleDateString("es-MX", { timeZone: "UTC", day: "numeric", month: "short" })}
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
          <div className="ms-table-wrapper">
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
                <div className="flex items-center justify-between px-5 py-3 bg-[#0d0d0d]">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total disponible</p>
                  <p className={`text-sm font-bold ${totalDisponible >= 0 ? "text-[#B3985B]" : "text-red-400"}`}>
                    {formatCurrency(totalDisponible)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* CxC */}
          <div className="ms-table-wrapper">
            <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold">Por cobrar</p>
              <Link href="/finanzas/cobros-pagos" className="text-[#B3985B] text-xs hover:underline">Ver →</Link>
            </div>
            <div className="grid grid-cols-3 divide-x divide-[#1a1a1a] border-b border-[#1a1a1a]">
              <div className="px-3 py-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">Vencido</p>
                <p className={`text-sm font-bold ${cxcVencMonto > 0 ? "text-red-400" : "text-gray-700"}`}>{formatCurrency(cxcVencMonto)}</p>
              </div>
              <div className="px-3 py-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">Próximo</p>
                <p className="text-sm font-bold text-[#B3985B]">{formatCurrency(cxcProxMonto)}</p>
              </div>
              <div className="px-3 py-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">Total</p>
                <p className="text-sm font-bold text-white">{formatCurrency(totalCxC)}</p>
              </div>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {cxcVence7dias.length === 0 ? (
                <p className="text-gray-600 text-xs px-4 py-3">Sin vencimientos próximos</p>
              ) : cxcVence7dias.map((c, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2">
                  <p className="text-gray-300 text-xs truncate">{c.empresa?.nombre ?? c.cliente?.nombre ?? "—"}</p>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <p className="text-gray-600 text-[11px]">{new Date(c.fechaCompromiso).toLocaleDateString("es-MX", { timeZone: "UTC", day: "numeric", month: "short" })}</p>
                    <p className="text-green-400 text-xs font-semibold">{formatCurrency(c.monto - (c.montoCobrado ?? 0))}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CxP */}
          <div className="ms-table-wrapper">
            <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold">Por pagar</p>
              <Link href="/finanzas/cobros-pagos" className="text-[#B3985B] text-xs hover:underline">Ver →</Link>
            </div>
            <div className="grid grid-cols-3 divide-x divide-[#1a1a1a] border-b border-[#1a1a1a]">
              <div className="px-3 py-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">Vencido</p>
                <p className={`text-sm font-bold ${cxpVencMonto > 0 ? "text-red-400" : "text-gray-700"}`}>{formatCurrency(cxpVencMonto)}</p>
              </div>
              <div className="px-3 py-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">Próximo</p>
                <p className="text-sm font-bold text-[#B3985B]">{formatCurrency(cxpProxMonto)}</p>
              </div>
              <div className="px-3 py-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">Total</p>
                <p className="text-sm font-bold text-white">{formatCurrency(totalCxP)}</p>
              </div>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {cxpVence7dias.length === 0 ? (
                <p className="text-gray-600 text-xs px-4 py-3">Sin vencimientos próximos</p>
              ) : cxpVence7dias.map((c, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2">
                  <p className="text-gray-300 text-xs truncate">{c.concepto ?? "Pago"}</p>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <p className="text-gray-600 text-[11px]">{new Date(c.fechaCompromiso).toLocaleDateString("es-MX", { timeZone: "UTC", day: "numeric", month: "short" })}</p>
                    <p className="text-red-400 text-xs font-semibold">{formatCurrency(c.monto)}</p>
                  </div>
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
          <GraficaPublicaciones pubsMap={pubsMap} total={totalPubsMes} />

          {/* Próximas publicaciones */}
          <div className="ms-table-wrapper">
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
                      {(() => { const [y, m, d] = p.fecha.toISOString().substring(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" }); })()}
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
      <Section label="VENTAS" href="/crm/tratos">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard label="Pipeline activo" value={totalPipeline} sub="tratos en curso" animate={{ amount: totalPipeline }} href="/crm/tratos" />
          <KpiCard label="Valor del pipeline" value={valorPipeline > 0 ? formatCurrency(valorPipeline) : "Sin datos"}
            sub="presupuesto estimado" subColor="text-[#B3985B]"
            animate={valorPipeline > 0 ? { amount: valorPipeline, prefix: "$", decimals: 0 } : undefined} href="/crm/tratos" />
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
          <div className="ms-table-wrapper">
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

        <GraficaFunnelVentas etapasMap={etapasMap} tratosSeguimientoVencido={tratosSeguimientoVencido} />

        {/* Leads por contactar */}
        {(leadsRecientes as unknown as Array<{id:string;createdAt:Date;tipoEvento:string;nombreEvento:string|null;origenLead:string;cliente:{nombre:string;telefono:string|null}}> ).length > 0 && (
          <div className="bg-[#0a0a0a] border border-[#111] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#111] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap strokeWidth={1.75} className="w-3.5 h-3.5 text-gray-500" />
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Leads por contactar</p>
                <span className="text-[10px] text-gray-700">({(leadsRecientes as unknown[]).length})</span>
              </div>
              <Link href="/crm/tratos" className="text-[10px] text-gray-600 hover:text-[#B3985B] transition-colors">Ver todos →</Link>
            </div>
            <div className="divide-y divide-[#0f0f0f]">
              {(leadsRecientes as unknown as Array<{id:string;createdAt:Date;tipoEvento:string;nombreEvento:string|null;origenLead:string;cliente:{nombre:string;telefono:string|null}}>
              ).map((lead) => {
                const tel = lead.cliente.telefono?.replace(/\D/g, '');
                const wa = tel ? `https://wa.me/${tel}` : null;
                const diasRegistrado = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86400000);
                return (
                  <div key={lead.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#0f0f0f] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{lead.cliente.nombre}</p>
                      <p className="text-[10px] text-gray-600">
                        {lead.tipoEvento !== 'OTRO' ? lead.tipoEvento : ''}
                        {lead.nombreEvento ? ` · ${lead.nombreEvento.substring(0, 40)}` : ''}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-700 shrink-0">{diasRegistrado}d</span>
                    {lead.cliente.telefono && (
                      <span className="text-[10px] text-gray-700 font-mono shrink-0 hidden lg:inline">{lead.cliente.telefono}</span>
                    )}
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 text-green-800 hover:text-green-500 transition-colors">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.556 4.122 1.528 5.855L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-4.964-1.342l-.356-.212-3.762.98 1.003-3.659-.233-.374A9.818 9.818 0 1112 21.818z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
            subColor={equiposMantenimiento > 0 ? "text-yellow-400" : "text-gray-500"} href="/inventario/mantenimiento" />
          <KpiCard label="Nómina pendiente" value={formatCurrency(nominaPendiente._sum.monto ?? 0)}
            sub="por pagar"
            subColor={(nominaPendiente._sum.monto ?? 0) > 0 ? "text-yellow-400" : "text-gray-500"} href="/rrhh/nomina" />
        </div>

        {/* Estados + próximos eventos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GraficaProyectos estadosMap={estadosMap} proyectosSinPersonal={proyectosSinPersonal} />

          {/* Próximos eventos */}
          <div className="ms-table-wrapper">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold">Próximos eventos</p>
              <Link href="/proyectos" className="text-[#B3985B] text-xs hover:underline">Ver todos →</Link>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {eventosProximos.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-6">Sin eventos próximos</p>
              ) : eventosProximos.map(e => {
                const hoyStrPrx = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
                const evStrPrx = e.fechaEvento.toISOString().substring(0, 10);
                const dias = Math.round((new Date(evStrPrx).getTime() - new Date(hoyStrPrx).getTime()) / 86400000);
                return (
                  <Link key={`${e.sinProyecto ? "t" : "p"}-${e.id}`} href={e.url}
                    className="flex items-center justify-between px-5 py-3 hover:bg-[#1a1a1a] transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white text-sm font-medium truncate">{e.nombre}</p>
                        {e.sinProyecto && (
                          <span className="text-[10px] bg-amber-900/30 text-amber-400 px-1.5 py-0.5 rounded shrink-0">Sin proyecto</span>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs">
                        {e.cliente.nombre}
                        {e.responsable && (
                          <span className="text-[#B3985B] ml-1">· {e.responsable}</span>
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

      {/* ══════════════════════════════════════════════════════════════════════
          ALERTAS DE ABANDONO
      ══════════════════════════════════════════════════════════════════════ */}
      {(tareasAbandonadas > 0 || tratosEnfriados > 0 || tratosCriticos > 0 || tratosSinMovimiento > 0 || tratosEnRevision > 0) && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <p className="text-[11px] font-bold text-red-500/70 uppercase tracking-widest">Requieren atención</p>
            <div className="flex-1 h-px bg-red-900/20" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {tratosEnRevision > 0 && (
              <Link href="/ventas/seguimientos" className="bg-[#111] border border-orange-900/40 rounded-xl p-4 hover:border-orange-800/60 transition-colors">
                <p className="text-[10px] text-orange-400/70 uppercase tracking-wider font-semibold mb-2">Tratos en revisión</p>
                <p className="text-2xl font-bold text-orange-400">{tratosEnRevision}</p>
                <p className="text-xs text-[#555] mt-1">requieren decisión</p>
              </Link>
            )}
            {tratosSinMovimiento > 0 && (
              <Link href="/ventas/seguimientos" className="bg-[#111] border border-red-900/40 rounded-xl p-4 hover:border-red-800/60 transition-colors">
                <p className="text-[10px] text-red-400/70 uppercase tracking-wider font-semibold mb-2">Sin seguimiento +7 días</p>
                <p className="text-2xl font-bold text-red-400">{tratosSinMovimiento}</p>
                <p className="text-xs text-[#555] mt-1">tratos sin contacto</p>
              </Link>
            )}
            {tareasAbandonadas > 0 && (
              <Link href="/operaciones?vista=abandonadas" className="bg-[#111] border border-red-900/30 rounded-xl p-4 hover:border-red-800/50 transition-colors">
                <p className="text-[10px] text-red-500/60 uppercase tracking-wider font-semibold mb-2">Tareas +15 días abiertas</p>
                <p className="text-2xl font-bold text-red-400">{tareasAbandonadas}</p>
                <p className="text-xs text-[#555] mt-1">sin completarse</p>
              </Link>
            )}
            {tratosEnfriados > 0 && (
              <Link href="/crm/tratos?filtro=enfriados" className="bg-[#111] border border-yellow-900/30 rounded-xl p-4 hover:border-yellow-800/50 transition-colors">
                <p className="text-[10px] text-yellow-500/60 uppercase tracking-wider font-semibold mb-2">Tratos +15 días sin cerrar</p>
                <p className="text-2xl font-bold text-yellow-400">{tratosEnfriados}</p>
                <p className="text-xs text-[#555] mt-1">en pipeline activo</p>
              </Link>
            )}
            {tratosCriticos > 0 && (
              <Link href="/crm/tratos" className="bg-[#111] border border-red-900/40 rounded-xl p-4 hover:border-red-800/60 transition-colors">
                <p className="text-[10px] text-red-500/70 uppercase tracking-wider font-semibold mb-2">Tratos críticos</p>
                <p className="text-2xl font-bold text-red-300">{tratosCriticos}</p>
                <p className="text-xs text-[#555] mt-1">+21d con evento próximo</p>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          GESTIÓN DE TAREAS POR ÁREA
      ══════════════════════════════════════════════════════════════════════ */}
      <Section label="GESTIÓN DE TAREAS" href="/operaciones">
        <TareasHoyWidget />
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          PLAN DE TRABAJO
      ══════════════════════════════════════════════════════════════════════ */}
      <Section label="PLAN DE TRABAJO" href="/plan-trabajo">
        <PlanTrabajoWidget />
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
    <div className={`ms-card p-5 ${href ? "hover:border-[#333] transition-colors group" : ""}`}>
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
