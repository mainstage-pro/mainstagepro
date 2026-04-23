import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calcularProximaFecha, type RecurrenciaConfig } from "@/lib/recurrencia";

// Explicit SELECT — avoids selecting proyectoEventoId which may not exist in DB yet
const SELECT = {
  id: true,
  titulo: true,
  descripcion: true,
  prioridad: true,
  area: true,
  estado: true,
  fecha: true,
  fechaVencimiento: true,
  fechaCompletada: true,
  recurrencia: true,
  notas: true,
  etiquetas: true,
  orden: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
  asignadoAId: true,
  creadoPorId: true,
  iniciativaId: true,
  proyectoTareaId: true,
  seccionId: true,
  carpetaId: true,
  asignadoA:     { select: { id: true, name: true } },
  creadoPor:     { select: { id: true, name: true } },
  iniciativa:    { select: { id: true, nombre: true, color: true } },
  proyectoTarea: { select: { id: true, nombre: true, color: true } },
  seccion:       { select: { id: true, nombre: true } },
  carpeta:       { select: { id: true, nombre: true } },
  _count:        { select: { subtareas: true, comentarios: true, archivos: true } },
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const tarea = await prisma.tarea.findUnique({
    where: { id },
    select: {
      ...SELECT,
      subtareas: {
        where: { estado: { not: "CANCELADA" } },
        select: {
          id: true, titulo: true, estado: true, prioridad: true,
          fecha: true, fechaVencimiento: true,
          asignadoA: { select: { id: true, name: true } },
          _count: { select: { subtareas: true } },
        },
        orderBy: { orden: "asc" },
      },
      comentarios: {
        select: {
          id: true, contenido: true, createdAt: true,
          autor: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      archivos: {
        select: {
          id: true, nombre: true, url: true, tipo: true, tamano: true, createdAt: true,
          subidoPor: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!tarea) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ tarea });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body   = await req.json();

  const allowed = [
    "titulo", "descripcion", "prioridad", "area", "estado",
    "asignadoAId", "iniciativaId", "proyectoTareaId", "seccionId", "carpetaId", "parentId",
    "fecha", "fechaVencimiento", "recurrencia", "notas", "etiquetas", "orden",
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  for (const key of allowed) {
    if (!(key in body)) continue;
    if (key === "fecha" || key === "fechaVencimiento") {
      data[key] = body[key] ? new Date(body[key]) : null;
    } else {
      data[key] = body[key];
    }
  }

  // Auto-manage fechaCompletada
  if ("estado" in data) {
    data.fechaCompletada = data.estado === "COMPLETADA" ? new Date() : null;
  }

  const tarea = await prisma.tarea.update({ where: { id }, data, select: SELECT });

  // ── Recurrence: when completing a recurring task, spawn next occurrence ──
  let nextTarea = null;
  if (data.estado === "COMPLETADA" && tarea.recurrencia) {
    try {
      const cfg = JSON.parse(tarea.recurrencia) as RecurrenciaConfig;
      const desde = tarea.fecha ?? new Date();
      const proximaFecha = calcularProximaFecha(cfg, desde);

      nextTarea = await prisma.tarea.create({
        data: {
          titulo:          tarea.titulo,
          descripcion:     tarea.descripcion,
          prioridad:       tarea.prioridad,
          area:            tarea.area,
          asignadoAId:     tarea.asignadoAId,
          creadoPorId:     tarea.creadoPorId,
          iniciativaId:    tarea.iniciativaId,
          proyectoTareaId: tarea.proyectoTareaId,
          seccionId:       tarea.seccionId,
          carpetaId:       tarea.carpetaId,
          fecha:           proximaFecha,
          fechaVencimiento:tarea.fechaVencimiento,
          recurrencia:     tarea.recurrencia,
          notas:           tarea.notas,
          etiquetas:       tarea.etiquetas,
          orden:           tarea.orden,
        },
        select: SELECT,
      });
    } catch {
      // Invalid recurrencia JSON — ignore
    }
  }

  return NextResponse.json({ tarea, nextTarea });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  if (session.role !== "ADMIN") {
    const tarea = await prisma.tarea.findUnique({
      where: { id },
      select: { creadoPorId: true },
    });
    if (tarea?.creadoPorId !== session.id) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }
  }

  await prisma.tarea.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
