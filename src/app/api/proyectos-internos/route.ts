import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rows = await prisma.proyectoInterno.findMany({
    where: {
      estado: { not: "CANCELADO" },
      // Proyectos privados: sólo admin o usuarios con acceso explícito.
      ...(session.role === "ADMIN"
        ? {}
        : { OR: [{ esPrivado: false }, { accesos: { some: { userId: session.id } } }] }),
    },
    include: {
      lider:  { select: { id: true, name: true } },
      fases:  { orderBy: { orden: "asc" }, include: { _count: { select: { tareas: true } } } },
      accesos: { select: { userId: true } },
      tareas: {
        where:  { parentId: null, esSeguimiento: false, estado: { not: "CANCELADA" } },
        select: { estado: true },
      },
    },
    orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
  });

  // Avance real = tareas completadas / total (excluye seguimientos y subtareas).
  const proyectos = rows.map(({ tareas, ...p }) => {
    const total = tareas.length;
    const hechas = tareas.filter(t => t.estado === "COMPLETADA").length;
    const avance = total > 0 ? Math.round((hechas / total) * 100) : p.porcentajeAvance;
    return { ...p, tareasTotal: total, tareasHechas: hechas, avance };
  });

  return NextResponse.json({ proyectos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, descripcion, area, liderId, prioridad, fechaInicio, fechaFin, presupuesto, objetivo, entregable, esPrivado, accesoUserIds } = body;

  if (!nombre || !area) {
    return NextResponse.json({ error: "nombre y area son requeridos" }, { status: 400 });
  }

  // Sólo un admin puede marcar un proyecto como privado y definir su acceso.
  const privado = session.role === "ADMIN" && esPrivado === true;
  const accesos: string[] = privado && Array.isArray(accesoUserIds)
    ? [...new Set((accesoUserIds as unknown[]).filter((id): id is string => typeof id === "string" && !!id))]
    : [];

  const proyecto = await prisma.proyectoInterno.create({
    data: {
      nombre, descripcion: descripcion ?? null, area,
      liderId: liderId ?? session.id,
      prioridad: prioridad ?? "MEDIA",
      fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
      fechaFin: fechaFin ? new Date(fechaFin) : null,
      presupuesto: presupuesto != null && presupuesto !== "" ? Number(presupuesto) : null,
      objetivo: objetivo ?? null,
      entregable: entregable ?? null,
      esPrivado: privado,
      accesos: accesos.length > 0 ? { create: accesos.map(userId => ({ userId })) } : undefined,
    },
    include: {
      lider: { select: { id: true, name: true } },
      fases: { orderBy: { orden: "asc" } },
    },
  });

  return NextResponse.json({ proyecto }, { status: 201 });
}
