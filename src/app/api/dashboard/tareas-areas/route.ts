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

  // Tarea pertenece a un área si: su campo area = X, O su usuario asignado tiene area = X
  const areaMatch = (area: string) => ({
    OR: [
      { area },
      { area: "GENERAL", asignadoA: { area } },
    ],
  });

  const areas = await Promise.all(AREAS.map(async (area) => {
    const base = { ...areaMatch(area), parentId: null, estado: { notIn: ["COMPLETADA", "CANCELADA"] } };
    const w = (extra: object) => ({ AND: [areaMatch(area), { parentId: null, estado: { notIn: ["COMPLETADA", "CANCELADA"] }, ...extra }] });

    const [
      vencidas, hoy, proximas, sinFecha,
      vencidasCount, hoyCount, proximasCount, sinFechaCount,
      totalActivas, completadasMes,
    ] = await Promise.all([
      prisma.tarea.findMany({ where: w({ OR: [{ fecha: { lt: hoyDate } }, { fecha: null, fechaVencimiento: { lt: hoyDate } }] }), select: SELECT_TAREA, orderBy: { fecha: "asc" }, take: 30 }),
      prisma.tarea.findMany({ where: w({ OR: [{ fecha: { gte: hoyDate, lt: manana } }, { fecha: null, fechaVencimiento: { gte: hoyDate, lt: manana } }] }), select: SELECT_TAREA, orderBy: [{ prioridad: "asc" }, { fecha: "asc" }], take: 30 }),
      prisma.tarea.findMany({ where: w({ OR: [{ fecha: { gte: manana, lt: en14dias } }, { fecha: null, fechaVencimiento: { gte: manana, lt: en14dias } }] }), select: SELECT_TAREA, orderBy: { fecha: "asc" }, take: 30 }),
      prisma.tarea.findMany({ where: w({ fecha: null, fechaVencimiento: null }), select: SELECT_TAREA, orderBy: [{ prioridad: "asc" }, { createdAt: "asc" }], take: 20 }),
      prisma.tarea.count({ where: w({ OR: [{ fecha: { lt: hoyDate } }, { fecha: null, fechaVencimiento: { lt: hoyDate } }] }) }),
      prisma.tarea.count({ where: w({ OR: [{ fecha: { gte: hoyDate, lt: manana } }, { fecha: null, fechaVencimiento: { gte: hoyDate, lt: manana } }] }) }),
      prisma.tarea.count({ where: w({ OR: [{ fecha: { gte: manana, lt: en14dias } }, { fecha: null, fechaVencimiento: { gte: manana, lt: en14dias } }] }) }),
      prisma.tarea.count({ where: w({ fecha: null, fechaVencimiento: null }) }),
      prisma.tarea.count({ where: base }),
      prisma.tarea.count({ where: { AND: [areaMatch(area), { parentId: null, estado: "COMPLETADA", updatedAt: { gte: inicioMes } }] } }),
    ]);

    const total    = totalActivas + completadasMes;
    const progress = total > 0 ? Math.round((completadasMes / total) * 100) : 0;

    return {
      area,
      counts: { hoy: hoyCount, vencidas: vencidasCount, proximas: proximasCount, sinFecha: sinFechaCount, totalActivas, completadasMes },
      progress,
      tareas: { hoy, vencidas, proximas, sinFecha },
    };
  }));

  // Efectividad por usuario (mes actual)
  const [asignadasGrp, completadasGrp, activeUsers] = await Promise.all([
    prisma.tarea.groupBy({
      by: ["asignadoAId"],
      where: { asignadoAId: { not: null }, parentId: null, estado: { notIn: ["CANCELADA"] }, createdAt: { gte: inicioMes } },
      _count: { id: true },
    }),
    prisma.tarea.groupBy({
      by: ["asignadoAId"],
      where: { asignadoAId: { not: null }, parentId: null, estado: "COMPLETADA", updatedAt: { gte: inicioMes } },
      _count: { id: true },
    }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const asignadasMap  = Object.fromEntries(asignadasGrp.map(r => [r.asignadoAId!, r._count.id]));
  const completadasMap = Object.fromEntries(completadasGrp.map(r => [r.asignadoAId!, r._count.id]));

  const usuarios = activeUsers
    .map(u => ({
      id: u.id,
      name: u.name,
      asignadas:   asignadasMap[u.id]  ?? 0,
      completadas: completadasMap[u.id] ?? 0,
    }))
    .filter(u => u.asignadas > 0)
    .sort((a, b) => {
      const ea = a.asignadas > 0 ? a.completadas / a.asignadas : 0;
      const eb = b.asignadas > 0 ? b.completadas / b.asignadas : 0;
      return eb - ea;
    });

  return NextResponse.json({ areas, usuarios });
}
