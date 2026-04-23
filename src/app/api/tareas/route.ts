import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const vista             = searchParams.get("vista");
  const proyectoId        = searchParams.get("proyectoId");
  const area              = searchParams.get("area");
  const estado            = searchParams.get("estado");
  const asignadoAId       = searchParams.get("asignadoAId");
  const iniciativaId      = searchParams.get("iniciativaId");
  const parentId          = searchParams.get("parentId");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  if (area)         where.area            = area;
  if (asignadoAId)  where.asignadoAId     = asignadoAId;
  if (iniciativaId) where.iniciativaId    = iniciativaId;
  if (proyectoId)   where.proyectoTareaId = proyectoId;

  // parentId: null string = top-level only, actual id = subtareas of that task
  if (parentId === "null") where.parentId = null;
  else if (parentId)       where.parentId = parentId;
  else                     where.parentId = null; // default: top-level

  if (estado) {
    where.estado = estado;
  } else {
    where.estado = { not: "CANCELADA" };
  }

  if (vista === "hoy") {
    const ahora = new Date();
    ahora.setHours(23, 59, 59, 999);
    where.fecha    = { lte: ahora };
    where.estado   = { notIn: ["COMPLETADA", "CANCELADA"] };
    where.parentId = null;
  } else if (vista === "proximas") {
    const manana = new Date();
    manana.setHours(0, 0, 0, 0);
    manana.setDate(manana.getDate() + 1);
    const en30 = new Date(manana);
    en30.setDate(manana.getDate() + 30);
    where.fecha  = { gte: manana, lte: en30 };
    where.estado = { not: "COMPLETADA" };
    where.OR     = [{ asignadoAId: session.id }, { asignadoAId: null, creadoPorId: session.id }];
    delete where.parentId;
  } else if (vista === "bandeja") {
    where.proyectoTareaId = null;
    where.iniciativaId    = null;
    where.parentId        = null;
    where.OR = [{ asignadoAId: session.id }, { asignadoAId: null, creadoPorId: session.id }];
  }

  const tareas = await prisma.tarea.findMany({
    where,
    select: SELECT,
    orderBy: [{ fecha: "asc" }, { orden: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ tareas });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const {
    titulo, descripcion, prioridad, area, asignadoAId, notas, etiquetas,
    iniciativaId, proyectoTareaId, seccionId, carpetaId,
    parentId, fecha, fechaVencimiento, recurrencia, orden,
  } = body;

  if (!titulo?.trim()) return NextResponse.json({ error: "Título requerido" }, { status: 400 });

  const tarea = await prisma.tarea.create({
    data: {
      titulo:          titulo.trim(),
      descripcion:     descripcion      || null,
      prioridad:       prioridad        || "MEDIA",
      area:            area             || "GENERAL",
      asignadoAId:     asignadoAId      || null,
      creadoPorId:     session.id,
      iniciativaId:    iniciativaId     || null,
      proyectoTareaId: proyectoTareaId  || null,
      seccionId:       seccionId        || null,
      carpetaId:       carpetaId        || null,
      parentId:        parentId         || null,
      fecha:           fecha            ? new Date(fecha) : null,
      fechaVencimiento:fechaVencimiento ? new Date(fechaVencimiento) : null,
      recurrencia:     recurrencia      || null,
      notas:           notas            || null,
      etiquetas:       etiquetas        ? (typeof etiquetas === "string" ? etiquetas : JSON.stringify(etiquetas)) : null,
      orden:           orden            ?? 0,
    },
    select: SELECT,
  });

  return NextResponse.json({ tarea }, { status: 201 });
}
