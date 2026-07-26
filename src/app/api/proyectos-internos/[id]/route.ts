import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const tareaSelect = {
    id: true, titulo: true, descripcion: true, estado: true, prioridad: true, area: true,
    fecha: true, fechaVencimiento: true, fechaCompletada: true, notas: true, createdAt: true,
    asignadoA: { select: { id: true, name: true } },
    _count: { select: { subtareas: true, comentarios: true, archivos: true } },
  } as const;

  const proyecto = await prisma.proyectoInterno.findUnique({
    where: { id },
    include: {
      lider: { select: { id: true, name: true } },
      fases: {
        orderBy: { orden: "asc" },
        include: {
          tareas: {
            where: { parentId: null, esSeguimiento: false },
            select: tareaSelect,
            orderBy: { orden: "asc" },
          },
        },
      },
      tareas: {
        where: { parentId: null, faseInternaId: null, esSeguimiento: false },
        select: tareaSelect,
        orderBy: { orden: "asc" },
      },
    },
  });

  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Seguimientos agendados (tareas con bandera esSeguimiento).
  const seguimientos = await prisma.tarea.findMany({
    where: { proyectoInternoId: id, esSeguimiento: true, parentId: null },
    select: {
      id: true, titulo: true, notas: true, estado: true,
      fecha: true, fechaCompletada: true,
      asignadoA: { select: { id: true, name: true } },
    },
    orderBy: { fecha: "asc" },
  });

  // Avance real: tareas completadas / total (excluye seguimientos y subtareas).
  const todas = [...proyecto.fases.flatMap(f => f.tareas), ...proyecto.tareas];
  const tareasTotal = todas.length;
  const tareasHechas = todas.filter(t => t.estado === "COMPLETADA").length;
  const avance = tareasTotal > 0 ? Math.round((tareasHechas / tareasTotal) * 100) : proyecto.porcentajeAvance;

  return NextResponse.json({ proyecto: { ...proyecto, seguimientos, tareasTotal, tareasHechas, avance } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  for (const f of ["nombre", "descripcion", "area", "liderId", "estado", "prioridad", "porcentajeAvance", "objetivo", "entregable"]) {
    if (f in body) data[f] = body[f];
  }
  if ("fechaInicio" in body) data.fechaInicio = body.fechaInicio ? new Date(body.fechaInicio) : null;
  if ("fechaFin"    in body) data.fechaFin    = body.fechaFin    ? new Date(body.fechaFin)    : null;
  if ("presupuesto" in body) data.presupuesto = body.presupuesto != null && body.presupuesto !== "" ? Number(body.presupuesto) : null;

  const proyecto = await prisma.proyectoInterno.update({
    where: { id },
    data,
    include: { lider: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ proyecto });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.proyectoInterno.update({ where: { id }, data: { estado: "CANCELADO" } });
  return NextResponse.json({ ok: true });
}
