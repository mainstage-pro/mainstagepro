import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const comentarios = await prisma.tareaComentario.findMany({
    where: { tareaId: id },
    include: { autor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ comentarios });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { contenido } = await req.json();
  if (!contenido?.trim()) return NextResponse.json({ error: "Contenido requerido" }, { status: 400 });

  const comentario = await prisma.tareaComentario.create({
    data: { contenido: contenido.trim(), tareaId: id, autorId: session.id },
    include: { autor: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ comentario }, { status: 201 });
}
