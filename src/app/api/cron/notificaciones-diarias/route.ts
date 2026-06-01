import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Vercel Cron: runs daily at 8am Mexico City time (14:00 UTC)
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const ahora = new Date();
  const en72h = new Date(ahora.getTime() + 72 * 3600000);
  const en3dias = new Date(ahora.getTime() + 3 * 86400000);
  const hace7dias = new Date(ahora.getTime() - 7 * 86400000);
  const hoyStr = ahora.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });



  const notifBatch: Array<{ usuarioId: string; tipo: string; titulo: string; mensaje: string; url?: string }> = [];

  // Helper to get users by area or role
  async function getUsersByArea(area: string) {
    return prisma.user.findMany({ where: { active: true, area }, select: { id: true } });
  }
  async function getAdmins() {
    return prisma.user.findMany({ where: { active: true, role: "ADMIN" }, select: { id: true } });
  }

  const [
    adminUsers,
    produccionUsers,
    ventasUsers,
    adminAreaUsers,
    rrhhUsers,
    marketingUsers,
  ] = await Promise.all([
    getAdmins(),
    getUsersByArea("PRODUCCION"),
    getUsersByArea("VENTAS"),
    getUsersByArea("ADMINISTRACION"),
    getUsersByArea("RRHH"),
    getUsersByArea("MARKETING"),
  ]);

  // Merge admin into produccion/ventas/admin for alerting
  const notifyGroup = (users: { id: string }[], tipo: string, titulo: string, mensaje: string, url?: string) => {
    for (const u of users) notifBatch.push({ usuarioId: u.id, tipo, titulo, mensaje, url });
  };

  // 1. Proyectos en 72h sin plan de producción aprobado
  const proyectosSinPlan = await prisma.proyecto.findMany({
    where: {
      estado: { in: ["PLANEACION", "CONFIRMADO", "EN_CURSO"] },
      fechaEvento: { gte: ahora, lte: en72h },
      planProduccionAprobado: false,
    },
    select: { id: true, nombre: true, numeroProyecto: true, fechaEvento: true },
  }).catch(() => []);

  for (const p of proyectosSinPlan) {
    const hrsRestantes = Math.round((new Date(p.fechaEvento).getTime() - ahora.getTime()) / 3600000);
    const destinatarios = [...produccionUsers, ...adminUsers.filter(a => !produccionUsers.find(p2 => p2.id === a.id))];
    notifyGroup(destinatarios, "SISTEMA",
      `🚨 Plan sin aprobar: ${p.nombre}`,
      `El proyecto #${p.numeroProyecto} "${p.nombre}" ocurre en ~${hrsRestantes}h y no tiene plan de producción aprobado.`,
      `/proyectos/${p.id}/plan`
    );
  }

  // 2. Cotizaciones enviadas que vencen en 3 días
  const cotizacionesVencen = await prisma.cotizacion.findMany({
    where: { estado: "ENVIADA", fechaVencimiento: { gte: ahora, lte: en3dias } },
    include: {
      cliente: { select: { nombre: true } },
      creadaPor: { select: { id: true } },
    },
  }).catch(() => []);

  for (const c of cotizacionesVencen) {
    const diasRestantes = Math.ceil((new Date(c.fechaVencimiento!).getTime() - ahora.getTime()) / 86400000);
    const destinatarios = c.creadaPor ? [c.creadaPor] : ventasUsers;
    for (const u of destinatarios) {
      notifBatch.push({
        usuarioId: u.id, tipo: "SISTEMA",
        titulo: `⚡ Cotización por vencer: ${c.cliente?.nombre ?? "Cliente"}`,
        mensaje: `La cotización #${c.numeroCotizacion} vence en ${diasRestantes} día(s). Haz seguimiento.`,
        url: `/crm/cotizaciones/${c.id}`,
      });
    }
  }

  // 3. Cuentas por cobrar vencidas (fechaCompromiso pasada, no pagada)
  const hoy = new Date(hoyStr + "T12:00:00");
  const cxcVencidas = await prisma.cuentaCobrar.count({
    where: { estado: { in: ["PENDIENTE", "PARCIAL"] }, fechaCompromiso: { lt: hoy } },
  }).catch(() => 0);

  if (cxcVencidas > 0) {
    const destinatarios = [...adminAreaUsers, ...adminUsers.filter(a => !adminAreaUsers.find(a2 => a2.id === a.id))];
    notifyGroup(destinatarios, "SISTEMA",
      `💸 ${cxcVencidas} cobros vencidos`,
      `Hay ${cxcVencidas} cuenta(s) por cobrar con fecha de compromiso vencida.`,
      "/finanzas/cobros-pagos"
    );
  }

  // 4. Cuentas por pagar vencidas
  const cxpVencidas = await prisma.cuentaPagar.count({
    where: { estado: { in: ["PENDIENTE", "PARCIAL"] }, fechaCompromiso: { lt: hoy } },
  }).catch(() => 0);

  if (cxpVencidas > 0) {
    const destinatarios = [...adminAreaUsers, ...adminUsers.filter(a => !adminAreaUsers.find(a2 => a2.id === a.id))];
    notifyGroup(destinatarios, "SISTEMA",
      `📋 ${cxpVencidas} pagos vencidos por hacer`,
      `Hay ${cxpVencidas} cuenta(s) por pagar con fecha de compromiso vencida.`,
      "/finanzas/cobros-pagos"
    );
  }

  // 5. Tareas vencidas (count por área, notifica a responsables)
  const tareasVencidas = await prisma.tarea.groupBy({
    by: ["area"],
    _count: { _all: true },
    where: { estado: { in: ["PENDIENTE", "EN_PROGRESO"] }, fechaVencimiento: { lt: ahora } },
  }).catch(() => []);

  const areaToUsers: Record<string, { id: string }[]> = {
    PRODUCCION: produccionUsers,
    VENTAS: ventasUsers,
    ADMINISTRACION: adminAreaUsers,
    RRHH: rrhhUsers,
    MARKETING: marketingUsers,
  };

  for (const t of tareasVencidas) {
    if (t._count._all === 0) continue;
    const users = areaToUsers[t.area] ?? adminUsers;
    notifyGroup(users, "SISTEMA",
      `⏰ ${t._count._all} tareas vencidas en ${t.area}`,
      `El área ${t.area} tiene ${t._count._all} tarea(s) con fecha de vencimiento pasada.`,
      "/operaciones/equipo"
    );
  }

  // 6. Tratos sin actualización en +7 días
  const tratosSinUpdate = await prisma.trato.count({
    where: {
      etapa: { in: ["DESCUBRIMIENTO", "OPORTUNIDAD"] },
      updatedAt: { lt: hace7dias },
    },
  }).catch(() => 0);

  if (tratosSinUpdate > 0) {
    const destinatarios = [...ventasUsers, ...adminUsers.filter(a => !ventasUsers.find(v => v.id === a.id))];
    notifyGroup(destinatarios, "SISTEMA",
      `🔕 ${tratosSinUpdate} tratos sin actualizar`,
      `Hay ${tratosSinUpdate} trato(s) activos sin actualizaciones en los últimos 7 días.`,
      "/crm/tratos"
    );
  }


  const proyectosHoy = await prisma.proyecto.findMany({
    where: {
      estado: { in: ["CONFIRMADO", "EN_CURSO"] },
      fechaEvento: {
        gte: new Date(hoyStr + "T00:00:00"),
        lte: new Date(hoyStr + "T23:59:59"),
      },
    },
    select: {
      id: true, nombre: true, numeroProyecto: true,
      checklist: { select: { completado: true } },
    },
  }).catch(() => []);

  for (const p of proyectosHoy) {
    const total = p.checklist.length;
    const completados = p.checklist.filter(c => c.completado).length;
    if (total > 0 && completados < total) {
      const destinatarios = [...produccionUsers, ...adminUsers.filter(a => !produccionUsers.find(p2 => p2.id === a.id))];
      notifyGroup(destinatarios, "SISTEMA",
        `📋 Checklist incompleto: ${p.nombre}`,
        `El evento #${p.numeroProyecto} es HOY. Checklist: ${completados}/${total} completados.`,
        `/proyectos/${p.id}`
      );
    }
  }

  // Insert all notifications (skip duplicates by checking if same notif was sent today)
  const todayStart = new Date(hoyStr + "T00:00:00");
  let created = 0;

  for (const n of notifBatch) {
    // Check if we already sent this same titulo to this user today
    const existing = await prisma.notificacion.findFirst({
      where: {
        usuarioId: n.usuarioId,
        titulo: n.titulo,
        createdAt: { gte: todayStart },
      },
    });
    if (!existing) {
      await prisma.notificacion.create({ data: n });
      created++;
    }
  }

  return NextResponse.json({ ok: true, notifEnviadas: created, notifTotal: notifBatch.length });
}
