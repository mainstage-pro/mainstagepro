import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const AREAS = ["ADMINISTRACION", "MARKETING", "VENTAS", "PRODUCCION"] as const;

const SELECT_TAREA = {
  id: true,
  titulo: true,
  prioridad: true,
  fecha: true,
  asignadoA:     { select: { id: true, name: true } },
  proyectoTarea: { select: { id: true, nombre: true, color: true } },
};

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const hoyCST     = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const hoyDate    = new Date(hoyCST);
  const manana     = new Date(hoyCST); manana.setUTCDate(manana.getUTCDate() + 1);
  const en14dias   = new Date(hoyCST); en14dias.setUTCDate(en14dias.getUTCDate() + 15);
  const inicioMes  = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const areas = await Promise.all(AREAS.map(async (area) => {
    const baseWhere = {
      area,
      parentId: null,
      estado: { notIn: ["COMPLETADA", "CANCELADA"] },
    };

    const [
      vencidas, hoy, proximas,
      vencidasCount, hoyCount, proximasCount, sinFechaCount,
      totalActivas, completadasMes,
    ] = await Promise.all([
      prisma.tarea.findMany({
        where: { ...baseWhere, fecha: { lt: hoyDate } },
        select: SELECT_TAREA, orderBy: { fecha: "asc" }, take: 25,
      }),
      prisma.tarea.findMany({
        where: { ...baseWhere, fecha: { gte: hoyDate, lt: manana } },
        select: SELECT_TAREA, orderBy: [{ prioridad: "asc" }, { fecha: "asc" }], take: 25,
      }),
      prisma.tarea.findMany({
        where: { ...baseWhere, fecha: { gte: manana, lt: en14dias } },
        select: SELECT_TAREA, orderBy: { fecha: "asc" }, take: 25,
      }),
      prisma.tarea.count({ where: { ...baseWhere, fecha: { lt: hoyDate } } }),
      prisma.tarea.count({ where: { ...baseWhere, fecha: { gte: hoyDate, lt: manana } } }),
      prisma.tarea.count({ where: { ...baseWhere, fecha: { gte: manana, lt: en14dias } } }),
      prisma.tarea.count({ where: { ...baseWhere, fecha: null } }),
      prisma.tarea.count({ where: baseWhere }),
      prisma.tarea.count({
        where: { area, parentId: null, estado: "COMPLETADA", updatedAt: { gte: inicioMes } },
      }),
    ]);

    const total    = totalActivas + completadasMes;
    const progress = total > 0 ? Math.round((completadasMes / total) * 100) : 0;

    return {
      area,
      counts: { hoy: hoyCount, vencidas: vencidasCount, proximas: proximasCount, sinFecha: sinFechaCount, totalActivas, completadasMes },
      progress,
      tareas: { hoy, vencidas, proximas },
    };
  }));

  return NextResponse.json({ areas });
}
