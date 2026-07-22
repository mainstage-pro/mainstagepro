import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/plan-trabajo/dashboard — datos para el widget del dashboard
// Estado ACTUAL desde Tarea (tipoOrigen="PLAN"); "vencida" = pendiente con
// fechaVencimiento pasada (ya no hay estado VENCIDA). Se combina con
// PTTareaInstancia no-migrada para completadas históricas de la semana.
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const isAdmin = session.role === "ADMIN" || session.role === "DIRECTOR";
  const tz = "America/Mexico_City";
  const dateStr = new Date().toLocaleDateString("en-CA", { timeZone: tz });
  const inicioDelDia = new Date(`${dateStr}T00:00:00.000-06:00`);
  const finDelDia    = new Date(`${dateStr}T23:59:59.999-06:00`);

  const hoy = new Date();
  const dowHoy = hoy.getDay();
  const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((dowHoy + 6) % 7));
  const lunesStr = lunes.toLocaleDateString("en-CA", { timeZone: tz });
  const inicioSemana = new Date(`${lunesStr}T00:00:00.000-06:00`);

  const areas = await prisma.pTArea.findMany({
    orderBy: { orden: "asc" },
    include: {
      templates: {
        where: { activa: true },
        select: { id: true },
      },
    },
  });

  const tareaUser = isAdmin ? {} : { asignadoAId: session.id };
  const instUser = isAdmin ? {} : { responsableId: session.id };

  const resumenAreas = await Promise.all(
    areas.map(async (area) => {
      const templateIds = area.templates.map((t) => t.id);
      if (templateIds.length === 0) {
        return { id: area.id, nombre: area.nombre, color: area.color, icono: area.icono, entregablesPendientes: 0, vencidas: 0, efectividad: 100 };
      }

      const [entregablesPendientes, vencidas, tareasCompSemana, tareasTotalSemana, instCompSemana, instTotalSemana] =
        await Promise.all([
          // Entregables pendientes hoy (Tarea PLAN, template ENTREGABLE)
          prisma.tarea.count({
            where: {
              tipoOrigen: "PLAN", parentId: null,
              ptTemplateId: { in: templateIds },
              ptTemplate: { tipo: "ENTREGABLE" },
              estado: { in: ["PENDIENTE", "EN_PROGRESO"] },
              fechaVencimiento: { gte: inicioDelDia, lte: finDelDia },
              ...tareaUser,
            },
          }),
          // Vencidas: pendientes con fechaVencimiento anterior a hoy
          prisma.tarea.count({
            where: {
              tipoOrigen: "PLAN", parentId: null,
              ptTemplateId: { in: templateIds },
              estado: { in: ["PENDIENTE", "EN_PROGRESO"] },
              fechaVencimiento: { lt: inicioDelDia },
              ...tareaUser,
            },
          }),
          prisma.tarea.count({
            where: {
              tipoOrigen: "PLAN", parentId: null,
              ptTemplateId: { in: templateIds },
              estado: "COMPLETADA",
              fechaCompletada: { gte: inicioSemana },
              ...tareaUser,
            },
          }),
          prisma.tarea.count({
            where: {
              tipoOrigen: "PLAN", parentId: null,
              ptTemplateId: { in: templateIds },
              fechaVencimiento: { gte: inicioSemana },
              ...tareaUser,
            },
          }),
          // Histórico no-migrado (evita duplicar con Tarea)
          prisma.pTTareaInstancia.count({
            where: { templateId: { in: templateIds }, migradaATareaId: null, estado: "COMPLETADA", completadaAt: { gte: inicioSemana }, ...instUser },
          }),
          prisma.pTTareaInstancia.count({
            where: { templateId: { in: templateIds }, migradaATareaId: null, fechaVencimiento: { gte: inicioSemana }, ...instUser },
          }),
        ]);

      const completadasSemana = tareasCompSemana + instCompSemana;
      const totalSemana = tareasTotalSemana + instTotalSemana;
      const efectividad = totalSemana > 0 ? Math.round((completadasSemana / totalSemana) * 100) : 100;

      return {
        id: area.id,
        nombre: area.nombre,
        color: area.color,
        icono: area.icono,
        entregablesPendientes,
        vencidas,
        efectividad,
      };
    })
  );

  // Lista de entregables pendientes hoy (top 5) — desde Tarea PLAN
  const tareasPendientes = await prisma.tarea.findMany({
    where: {
      tipoOrigen: "PLAN", parentId: null,
      ptTemplate: { tipo: "ENTREGABLE" },
      estado: { in: ["PENDIENTE", "EN_PROGRESO"] },
      fechaVencimiento: { gte: inicioDelDia, lte: finDelDia },
      ...tareaUser,
    },
    include: {
      ptTemplate: { include: { area: true } },
      asignadoA: { select: { id: true, name: true } },
    },
    orderBy: { fechaVencimiento: "asc" },
    take: 5,
  });

  const entregablesPendientesHoy = tareasPendientes.map((t) => ({
    id: t.id,
    fechaVencimiento: t.fechaVencimiento,
    estado: t.estado,
    template: t.ptTemplate ? { nombre: t.ptTemplate.nombre, area: t.ptTemplate.area } : { nombre: t.titulo, area: null },
    responsable: t.asignadoA,
  }));

  const totalVencidas = resumenAreas.reduce((s, a) => s + a.vencidas, 0);

  return NextResponse.json({
    areas: resumenAreas,
    entregablesPendientesHoy,
    totalVencidas,
    fecha: dateStr,
  });
}
