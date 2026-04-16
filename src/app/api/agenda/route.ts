import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const ahora = new Date();
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

  const [proyectosActivos, cxcPendientes, cotizacionesSinRespuesta] = await Promise.all([
    prisma.proyecto.findMany({
      where: proyectoWhere,
      include: {
        cliente: { select: { nombre: true } },
        personal: { select: { confirmado: true } },
        checklist: { select: { completado: true } },
      },
      orderBy: { fechaEvento: "asc" },
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

  // Proyectos sin personal en los próximos 14 días
  const sinPersonal = proyectosActivos.filter(p => {
    if (!p.fechaEvento) return false;
    const d = Math.ceil((new Date(p.fechaEvento).getTime() - ahora.getTime()) / 86400000);
    return d >= 0 && d <= 14 && p.personal.length === 0;
  });
  for (const p of sinPersonal) {
    alertas.push({
      tipo: "sin_personal",
      prioridad: "ALTA",
      titulo: `${p.nombre} sin personal asignado`,
      detalle: `Evento en ${Math.ceil((new Date(p.fechaEvento).getTime() - ahora.getTime()) / 86400000)}d · ${p.cliente.nombre}`,
      href: `/proyectos/${p.id}`,
      icono: "⚠️",
    });
  }

  // CxC vencidas
  const cxcVencidas = cxcPendientes.filter(c => new Date(c.fechaCompromiso) < ahora);
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
  const sinConfirmar = proyectosActivos.filter(p => {
    if (!p.fechaEvento) return false;
    const d = Math.ceil((new Date(p.fechaEvento).getTime() - ahora.getTime()) / 86400000);
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
  const hoy = proyectosActivos.filter(p => {
    if (!p.fechaEvento) return false;
    const d = Math.ceil((new Date(p.fechaEvento).getTime() - ahora.getTime()) / 86400000);
    return d === 0;
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
