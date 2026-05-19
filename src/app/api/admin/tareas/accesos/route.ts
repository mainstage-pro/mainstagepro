import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const proyectos = await prisma.tareaProyecto.findMany({
    where: { archivado: false },
    orderBy: [{ carpetaId: "asc" }, { orden: "asc" }],
    select: {
      id: true,
      nombre: true,
      color: true,
      carpeta: { select: { id: true, nombre: true } },
      accesos: {
        select: {
          id: true,
          userId: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  const usuarios = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ proyectos, usuarios });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { proyectoId, userId } = await req.json();
  if (!proyectoId || !userId) return NextResponse.json({ error: "proyectoId y userId requeridos" }, { status: 400 });

  const acceso = await prisma.proyectoAcceso.upsert({
    where: { proyectoId_userId: { proyectoId, userId } },
    update: {},
    create: { proyectoId, userId },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ acceso }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { proyectoId, userId } = await req.json();
  if (!proyectoId || !userId) return NextResponse.json({ error: "proyectoId y userId requeridos" }, { status: 400 });

  await prisma.proyectoAcceso.deleteMany({ where: { proyectoId, userId } });
  return NextResponse.json({ ok: true });
}
