import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const ahora = new Date();
  const en7  = new Date(ahora.getTime() + 7  * 86400000);
  const en14 = new Date(ahora.getTime() + 14 * 86400000);
  const en30 = new Date(ahora.getTime() + 30 * 86400000);

  const [
    // Proyectos próximos sin técnicos confirmados
    proyectosSinPersonal,
    // Proyectos próximos sin equipo asignado
    proyectosSinEquipo,
    // Cotizaciones enviadas hace más de 7 días sin respuesta
    cotizacionesAnticigas,
    // CxC que vencen en 5 días
    cxcPorVencer,
    // CxP que vencen en 3 días
    cxpPorVencer,
    // Equipos en mantenimiento
    equiposMantenimiento,
    // Técnicos sin evaluar (proyectos completados en últimos 30 días)
    proyectosSinEvaluar,
    // Tratos con seguimiento vencido
    tratosSeguimientoVencido,
    // Proyectos sin anticipo cobrado (evento en 14 días)
    proyectosSinAnticipo,
  ] = await Promise.all([
    // Sin técnicos confirmados, evento en próximos 14 días
    prisma.proyecto.findMany({
      where: {
        estado: { in: ["PLANEACION", "CONFIRMADO"] },
        fechaEvento: { gte: ahora, lte: en14 },
        personal: { none: { confirmado: true } },
      },
      select: { id: true, nombre: true, numeroProyecto: true, fechaEvento: true, cliente: { select: { nombre: true } } },
      orderBy: { fechaEvento: "asc" },
      take: 5,
    }),

    // Sin equipos asignados, evento en próximos 7 días
    prisma.proyecto.findMany({
      where: {
        estado: { in: ["PLANEACION", "CONFIRMADO"] },
        fechaEvento: { gte: ahora, lte: en7 },
        equipos: { none: {} },
      },
      select: { id: true, nombre: true, numeroProyecto: true, fechaEvento: true, cliente: { select: { nombre: true } } },
      orderBy: { fechaEvento: "asc" },
      take: 5,
    }),

    // Cotizaciones ENVIADAS con más de 7 días sin respuesta
    prisma.cotizacion.findMany({
      where: {
        estado: "ENVIADA",
        fechaEnvio: { lt: new Date(ahora.getTime() - 7 * 86400000) },
      },
      select: {
        id: true, numeroCotizacion: true, granTotal: true, fechaEnvio: true,
        cliente: { select: { nombre: true, telefono: true } },
        trato: { select: { nombreEvento: true } },
      },
      orderBy: { fechaEnvio: "asc" },
      take: 5,
    }),

    // CxC que vencen en los próximos 5 días
    prisma.cuentaCobrar.findMany({
      where: {
        estado: { in: ["PENDIENTE", "PARCIAL"] },
        fechaCompromiso: { gte: ahora, lte: new Date(ahora.getTime() + 5 * 86400000) },
      },
      select: { id: true, monto: true, montoCobrado: true, fechaCompromiso: true, concepto: true, cliente: { select: { nombre: true, telefono: true } }, proyecto: { select: { id: true, nombre: true } } },
      orderBy: { fechaCompromiso: "asc" },
      take: 8,
    }),

    // CxP que vencen en los próximos 3 días
    prisma.cuentaPagar.findMany({
      where: {
        estado: { in: ["PENDIENTE", "PARCIAL"] },
        fechaCompromiso: { gte: ahora, lte: new Date(ahora.getTime() + 3 * 86400000) },
      },
      select: { id: true, monto: true, concepto: true, fechaCompromiso: true, tecnico: { select: { nombre: true } }, proveedor: { select: { nombre: true } } },
      orderBy: { fechaCompromiso: "asc" },
      take: 5,
    }),

    // Equipos en mantenimiento
    prisma.equipo.findMany({
      where: { estado: "EN_MANTENIMIENTO" },
      select: { id: true, descripcion: true, marca: true },
      take: 5,
    }),

    // Proyectos completados en últimos 30 días sin evaluación interna
    prisma.proyecto.findMany({
      where: {
        estado: "COMPLETADO",
        fechaEvento: { gte: new Date(ahora.getTime() - 30 * 86400000), lte: ahora },
        evaluacionInterna: null,
      },
      select: { id: true, nombre: true, numeroProyecto: true, fechaEvento: true },
      orderBy: { fechaEvento: "desc" },
      take: 3,
    }),

    // Tratos con seguimiento vencido hace más de 2 días
    prisma.trato.findMany({
      where: {
        etapa: { in: ["DESCUBRIMIENTO", "OPORTUNIDAD"] },
        fechaProximaAccion: { lt: new Date(ahora.getTime() - 2 * 86400000) },
      },
      select: { id: true, nombreEvento: true, cliente: { select: { nombre: true } }, fechaProximaAccion: true, responsable: { select: { name: true } } },
      orderBy: { fechaProximaAccion: "asc" },
      take: 5,
    }),

    // Proyectos en 14 días sin CxC de anticipo cobrado
    prisma.proyecto.findMany({
      where: {
        estado: { in: ["PLANEACION", "CONFIRMADO"] },
        fechaEvento: { gte: ahora, lte: en14 },
        cuentasCobrar: {
          none: { tipoPago: "ANTICIPO", estado: { in: ["PAGADO", "PARCIAL"] } },
        },
      },
      select: { id: true, nombre: true, numeroProyecto: true, fechaEvento: true, cliente: { select: { nombre: true } } },
      orderBy: { fechaEvento: "asc" },
      take: 5,
    }),
  ]);

  // Calcular días hasta evento
  function diasHasta(fecha: string | Date | null) {
    if (!fecha) return null;
    return Math.ceil((new Date(fecha).getTime() - ahora.getTime()) / 86400000);
  }
  function diasDesde(fecha: string | Date | null) {
    if (!fecha) return null;
    return Math.floor((ahora.getTime() - new Date(fecha).getTime()) / 86400000);
  }

  const alertas = [
    ...proyectosSinPersonal.map(p => ({
      tipo: "SIN_PERSONAL",
      prioridad: (diasHasta(p.fechaEvento) ?? 99) <= 7 ? "ALTA" : "MEDIA",
      titulo: `Sin técnicos confirmados — ${p.nombre}`,
      detalle: `${p.cliente.nombre} · ${diasHasta(p.fechaEvento)}d`,
      href: `/proyectos/${p.id}`,
      icono: "👥",
    })),
    ...proyectosSinEquipo.map(p => ({
      tipo: "SIN_EQUIPO",
      prioridad: "ALTA" as const,
      titulo: `Sin equipos asignados — ${p.nombre}`,
      detalle: `${p.cliente.nombre} · en ${diasHasta(p.fechaEvento)}d`,
      href: `/proyectos/${p.id}`,
      icono: "🎛️",
    })),
    ...proyectosSinAnticipo.map(p => ({
      tipo: "SIN_ANTICIPO",
      prioridad: (diasHasta(p.fechaEvento) ?? 99) <= 7 ? "ALTA" : "MEDIA",
      titulo: `Sin anticipo cobrado — ${p.nombre}`,
      detalle: `${p.cliente.nombre} · evento en ${diasHasta(p.fechaEvento)}d`,
      href: `/proyectos/${p.id}`,
      icono: "💰",
    })),
    ...cotizacionesAnticigas.map(c => ({
      tipo: "COT_SIN_RESPUESTA",
      prioridad: (diasDesde(c.fechaEnvio) ?? 0) >= 14 ? "ALTA" : "MEDIA",
      titulo: `Cotización sin respuesta — ${c.cliente.nombre}`,
      detalle: `${c.numeroCotizacion} · enviada hace ${diasDesde(c.fechaEnvio)}d`,
      href: `/cotizaciones/${c.id}`,
      icono: "📋",
    })),
    ...cxcPorVencer.map(c => ({
      tipo: "CXC_POR_VENCER",
      prioridad: (diasHasta(c.fechaCompromiso) ?? 99) <= 2 ? "ALTA" : "MEDIA",
      titulo: `Cobro por vencer — ${c.cliente?.nombre ?? ""}`,
      detalle: `$${(c.monto - (c.montoCobrado ?? 0)).toLocaleString("es-MX")} · vence en ${diasHasta(c.fechaCompromiso)}d`,
      href: c.proyecto ? `/proyectos/${c.proyecto.id}` : "/finanzas/cxc",
      icono: "🔔",
    })),
    ...cxpPorVencer.map(c => ({
      tipo: "CXP_POR_VENCER",
      prioridad: (diasHasta(c.fechaCompromiso) ?? 99) <= 1 ? "ALTA" : "MEDIA",
      titulo: `Pago próximo — ${c.tecnico?.nombre ?? c.proveedor?.nombre ?? c.concepto}`,
      detalle: `$${c.monto.toLocaleString("es-MX")} · en ${diasHasta(c.fechaCompromiso)}d`,
      href: "/finanzas/cxp",
      icono: "💸",
    })),
    ...equiposMantenimiento.map(e => ({
      tipo: "EQUIPO_MANT",
      prioridad: "BAJA" as const,
      titulo: `Equipo en mantenimiento`,
      detalle: `${e.descripcion}${e.marca ? ` · ${e.marca}` : ""}`,
      href: `/inventario/equipos/${e.id}`,
      icono: "🔧",
    })),
    ...proyectosSinEvaluar.map(p => ({
      tipo: "SIN_EVALUAR",
      prioridad: "BAJA" as const,
      titulo: `Proyecto sin evaluar — ${p.nombre}`,
      detalle: `${p.numeroProyecto} · completado hace ${diasDesde(p.fechaEvento)}d`,
      href: `/proyectos/${p.id}`,
      icono: "⭐",
    })),
    ...tratosSeguimientoVencido.map(t => ({
      tipo: "TRATO_VENCIDO",
      prioridad: (diasDesde(t.fechaProximaAccion) ?? 0) >= 5 ? "ALTA" : "MEDIA",
      titulo: `Seguimiento vencido — ${t.nombreEvento ?? t.cliente?.nombre}`,
      detalle: `${t.responsable?.name ?? ""} · vencido hace ${diasDesde(t.fechaProximaAccion)}d`,
      href: `/crm/tratos/${t.id}`,
      icono: "📞",
    })),
  ];

  // Ordenar: ALTA primero
  alertas.sort((a, b) => {
    const p = { ALTA: 0, MEDIA: 1, BAJA: 2 };
    return (p[a.prioridad as keyof typeof p] ?? 2) - (p[b.prioridad as keyof typeof p] ?? 2);
  });

  return NextResponse.json({ alertas, total: alertas.length });
}
