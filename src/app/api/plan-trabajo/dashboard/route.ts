import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/plan-trabajo/dashboard — datos para el widget del dashboard
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const isAdmin = session.role === "ADMIN" || session.role === "DIRECTOR";
  const tz = "America/Mexico_City";
  const dateStr = new Date().toLocaleDateString("en-CA", { timeZone: tz });
  const inicioDelDia = new Date(`${dateStr}T00:00:00.000-06:00`);
  const finDelDia    = new Date(`${dateStr}T23:59:59.999-06:00`);

  // Inicio de la semana (lunes)
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
        select: { id: true, tipo: true, responsableId: true },
      },
    },
  });

  const responsableWhere = isAdmin ? {} : { responsableId: session.id };

  const resumenAreas = await Promise.all(
    areas.map(async (area) => {
      const templateIds = area.templates.map((t) => t.id);

      const [entregablesPendientes, vencidas, completadasSemana, totalSemana] =
        await Promise.all([
          // Entregables pendientes hoy
          prisma.pTTareaInstancia.count({
            where: {
              templateId: { in: templateIds },
              esEntregable: true,
              estado: { in: ["PENDIENTE", "EN_PROGRESO"] },
              fechaVencimiento: { gte: inicioDelDia, lte: finDelDia },
              ...responsableWhere,
            },
          }),
          // Vencidas (pasadas y no completadas)
          prisma.pTTareaInstancia.count({
            where: {
              templateId: { in: templateIds },
              estado: "VENCIDA",
              ...responsableWhere,
            },
          }),
          // Completadas esta semana
          prisma.pTTareaInstancia.count({
            where: {
              templateId: { in: templateIds },
              estado: "COMPLETADA",
              completadaAt: { gte: inicioSemana },
              ...responsableWhere,
            },
          }),
          // Total generadas esta semana
          prisma.pTTareaInstancia.count({
            where: {
              templateId: { in: templateIds },
              fechaVencimiento: { gte: inicioSemana },
              ...responsableWhere,
            },
          }),
        ]);

      const efectividad = totalSemana > 0
        ? Math.round((completadasSemana / totalSemana) * 100)
        : 100;

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

  // Lista de entregables pendientes hoy (top 5)
  const entregablesPendientesHoy = await prisma.pTTareaInstancia.findMany({
    where: {
      esEntregable: true,
      estado: { in: ["PENDIENTE", "EN_PROGRESO"] },
      fechaVencimiento: { gte: inicioDelDia, lte: finDelDia },
      ...responsableWhere,
    },
    include: {
      template: { include: { area: true } },
      responsable: { select: { id: true, name: true } },
    },
    orderBy: { fechaVencimiento: "asc" },
    take: 5,
  });

  const totalVencidas = resumenAreas.reduce((s, a) => s + a.vencidas, 0);

  return NextResponse.json({
    areas: resumenAreas,
    entregablesPendientesHoy,
    totalVencidas,
    fecha: dateStr,
  });
}
