import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const isAdmin = session.role === "ADMIN";
  let proyectosPermitidos: string[] | null = null;

  if (!isAdmin) {
    const accesos = await prisma.proyectoAcceso.findMany({
      where: { userId: session.id },
      select: { proyectoId: true },
    });
    proyectosPermitidos = accesos.map((a: { proyectoId: string }) => a.proyectoId);
  }

  const proyectos = await prisma.tareaProyecto.findMany({
    where: {
      archivado: false,
      ...(proyectosPermitidos !== null ? { id: { in: proyectosPermitidos } } : {}),
    },
    include: {
      secciones: { orderBy: { orden: "asc" }, select: { id: true, nombre: true, orden: true, colapsada: true } },
      _count: { select: { tareas: { where: { estado: { not: "COMPLETADA" }, parentId: null } } } },
    },
    orderBy: [{ carpetaId: "asc" }, { orden: "asc" }],
  });

  return NextResponse.json({ proyectos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { nombre, descripcion, color, icono, carpetaId } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const proyecto = await prisma.tareaProyecto.create({
    data: {
      nombre: nombre.trim(),
      descripcion: descripcion ?? null,
      color: color ?? null,
      icono: icono ?? null,
      carpetaId: carpetaId ?? null,
      creadoPorId: session.id,
    },
    include: {
      secciones: true,
      _count: { select: { tareas: { where: { estado: { not: "COMPLETADA" }, parentId: null } } } },
    },
  });

  return NextResponse.json({ proyecto }, { status: 201 });
}
