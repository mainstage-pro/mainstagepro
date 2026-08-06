import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureProcesoVentaColumns, ensureCotizacionEventoConfirmadoColumn } from "@/lib/migraciones-lazy";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Este endpoint lee tratos con `include` (todos los escalares), así que debe
  // garantizar las columnas nuevas del proceso de venta antes de consultar.
  await ensureProcesoVentaColumns();
  await ensureCotizacionEventoConfirmadoColumn();

  const ahora       = new Date();
  const inicioDeHoy = new Date(ahora.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }));
  const en30 = new Date(ahora.getTime() + 30 * 86400000);
  const en7  = new Date(ahora.getTime() + 7  * 86400000);
  const en14 = new Date(ahora.getTime() + 14 * 86400000);

  // Si es admin, ve todos los proyectos; si es coordinador, solo los suyos
  const proyectoWhere = session.role === "ADMIN"
    ? { estado: { in: ["PLANEACION", "CONFIRMADO", "EN_CURSO"] } }
    : {
        estado: { in: ["PLANEACION", "CONFIRMADO", "EN_CURSO"] },
        encargadoId: session.id,
      };

  const [proyectosRaw, tratosVentaCerradaAgenda, cxcPendientes, cotizacionesSinRespuesta] = await Promise.all([
    prisma.proyecto.findMany({
      where: proyectoWhere,
      include: {
        cliente: { select: { nombre: true } },
        personal: { select: { confirmado: true } },
        checklist: { select: { completado: true } },
      },
      orderBy: { fechaEvento: "asc" },
    }),

    prisma.trato.findMany({
      where: {
        proyectos: { none: {} },
        // Un trato con venta perdida nunca va a la agenda, ni siquiera con el flag manual.
        etapa: { not: "VENTA_PERDIDA" },
        OR: [
          { etapa: "VENTA_CERRADA" },
          { confirmadaEn: { not: null } },
          { cotizaciones: { some: { estado: "APROBADA" } } },
          { cotizaciones: { some: { eventoConfirmado: true } } },
        ],
      },
      include: {
        cliente: { select: { nombre: true } },
        cotizaciones: {
          where: { OR: [{ estado: "APROBADA" }, { eventoConfirmado: true }], fechaEvento: { not: null } },
          orderBy: { fechaEvento: "asc" },
          take: 1,
        },
      },
    }),

    prisma.cuentaCobrar.findMany({
      where: {
        estado: { in: ["PENDIENTE", "PARCIAL"] },
        proyecto: proyectoWhere,
      },
      select: {
        id: true, concepto: true, monto: true, montoCobrado: true,
        fechaCompromiso: true, tipoPago: true,
        cliente: { select: { nombre: true, telefono: true } },
        proyecto: { select: { id: true, nombre: true } },
      },
      orderBy: { fechaCompromiso: "asc" },
      take: 20,
    }),

    prisma.cotizacion.findMany({
      where: { estado: "ENVIADA" },
      select: {
        id: true, numeroCotizacion: true, granTotal: true, updatedAt: true,
        cliente: { select: { id: true, nombre: true, telefono: true } },
      },
      orderBy: { updatedAt: "asc" },
      take: 10,
    }),
  ]);

  // Generar alertas personales basadas en los datos
  type Alerta = { tipo: string; prioridad: "ALTA" | "MEDIA"; titulo: string; detalle: string; href: string; icono: string };
  const alertas: Alerta[] = [];

  const hoyCST = ahora.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  function diasHastaEvento(fechaEvento: Date) {
    const evStr = fechaEvento.toISOString().substring(0, 10);
    return Math.round((new Date(evStr).getTime() - new Date(hoyCST).getTime()) / 86400000);
  }

  // Build unified proyectosActivos array
  const proyectosActivos = [
    ...proyectosRaw.map(p => ({
      id: p.id,
      nombre: p.nombre,
      numeroProyecto: p.numeroProyecto,
      estado: p.estado,
      tipoEvento: p.tipoEvento,
      fechaEvento: p.fechaEvento,
      cliente: p.cliente,
      personal: p.personal,
      checklist: p.checklist,
      sinProyecto: false as const,
      url: `/proyectos/${p.id}`,
    })),
    ...tratosVentaCerradaAgenda.flatMap(trato => {
      const cot = trato.cotizaciones[0];
      const fechaEvento = cot?.fechaEvento ?? trato.fechaEventoEstimada ?? null;
      if (!fechaEvento) return [];
      return [{
        id: trato.id,
        nombre: trato.nombreEvento || (cot as { nombreEvento?: string | null } | undefined)?.nombreEvento || "Evento",
        numeroProyecto: null as null,
        estado: "VENTA_CERRADA",
        tipoEvento: trato.tipoEvento,
        fechaEvento,
        cliente: trato.cliente!,
        personal: [] as { confirmado: boolean }[],
        checklist: [] as { completado: boolean }[],
        sinProyecto: true as const,
        url: `/crm/tratos/${trato.id}`,
      }];
    }),
  ].sort((a, b) => a.fechaEvento.getTime() - b.fechaEvento.getTime());

  // Proyectos sin personal en los próximos 14 días
  const sinPersonal = proyectosRaw.filter(p => {
    if (!p.fechaEvento) return false;
    const d = diasHastaEvento(p.fechaEvento);
    return d >= 0 && d <= 14 && p.personal.length === 0;
  });
  for (const p of sinPersonal) {
    alertas.push({
      tipo: "sin_personal",
      prioridad: "ALTA",
      titulo: `${p.nombre} sin personal asignado`,
      detalle: `Evento en ${diasHastaEvento(p.fechaEvento)}d · ${p.cliente.nombre}`,
      href: `/proyectos/${p.id}`,
      icono: "⚠️",
    });
  }

  // CxC vencidas
  const cxcVencidas = cxcPendientes.filter(c => new Date(c.fechaCompromiso) < inicioDeHoy);
  if (cxcVencidas.length > 0) {
    alertas.push({
      tipo: "cxc_vencida",
      prioridad: "ALTA",
      titulo: `${cxcVencidas.length} cobro${cxcVencidas.length !== 1 ? "s" : ""} vencido${cxcVencidas.length !== 1 ? "s" : ""}`,
      detalle: `Total: ${cxcVencidas.reduce((s, c) => s + c.monto - (c.montoCobrado ?? 0), 0).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 })}`,
      href: "/finanzas/cobros-pagos",
      icono: "💰",
    });
  }

  // Cotizaciones sin respuesta > 5 días
  const cotViejas = cotizacionesSinRespuesta.filter(c => {
    const dias = Math.floor((ahora.getTime() - new Date(c.updatedAt).getTime()) / 86400000);
    return dias > 5;
  });
  if (cotViejas.length > 0) {
    alertas.push({
      tipo: "cotizacion_sin_respuesta",
      prioridad: "MEDIA",
      titulo: `${cotViejas.length} cotización${cotViejas.length !== 1 ? "es" : ""} sin respuesta`,
      detalle: "Más de 5 días esperando confirmación",
      href: "/cotizaciones",
      icono: "📄",
    });
  }

  // Proyectos con evento esta semana y staff sin confirmar
  const sinConfirmar = proyectosRaw.filter(p => {
    if (!p.fechaEvento) return false;
    const d = diasHastaEvento(p.fechaEvento);
    return d >= 0 && d <= 7 && p.personal.some(x => !x.confirmado);
  });
  if (sinConfirmar.length > 0) {
    alertas.push({
      tipo: "staff_sin_confirmar",
      prioridad: "MEDIA",
      titulo: `Staff sin confirmar esta semana`,
      detalle: `${sinConfirmar.map(p => p.nombre).join(", ")}`,
      href: "/proyectos",
      icono: "👥",
    });
  }

  // Proyecto vence hoy
  const hoy = proyectosRaw.filter(p => {
    if (!p.fechaEvento) return false;
    return diasHastaEvento(p.fechaEvento) === 0;
  });
  for (const p of hoy) {
    alertas.push({
      tipo: "evento_hoy",
      prioridad: "ALTA",
      titulo: `EVENTO HOY: ${p.nombre}`,
      detalle: p.cliente.nombre,
      href: `/proyectos/${p.id}`,
      icono: "🎪",
    });
  }

  return NextResponse.json({
    usuario: { name: session.name, role: session.role },
    proyectosActivos: proyectosActivos.map(p => ({
      id: p.id,
      nombre: p.nombre,
      numeroProyecto: p.numeroProyecto,
      estado: p.estado,
      tipoEvento: p.tipoEvento,
      fechaEvento: p.fechaEvento.toISOString(),
      cliente: p.cliente,
      personal: p.personal,
      checklist: p.checklist,
      sinProyecto: p.sinProyecto,
      url: p.url,
    })),
    cxcPendientes: cxcPendientes.map(c => ({
      ...c,
      fechaCompromiso: c.fechaCompromiso.toISOString(),
    })),
    cotizacionesSinRespuesta: cotizacionesSinRespuesta.map(c => ({
      ...c,
      updatedAt: c.updatedAt.toISOString(),
    })),
    alertasPersonales: alertas,
    _meta: { en7: en7.toISOString(), en14: en14.toISOString(), en30: en30.toISOString() },
  });
}
