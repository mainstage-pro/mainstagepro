import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const temas = await prisma.temaAdicional.findMany({
    where: { juntaId: id },
    include: { autor: { select: { id: true, name: true } } },
    orderBy: { orden: "asc" },
  });
  return NextResponse.json({ temas });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const { titulo, descripcion, agregadoEnJunta } = await req.json();
  if (!titulo?.trim()) return NextResponse.json({ error: "Título requerido" }, { status: 400 });

  const count = await prisma.temaAdicional.count({ where: { juntaId: id } });

  const tema = await prisma.temaAdicional.create({
    data: {
      juntaId:         id,
      titulo:          titulo.trim(),
      descripcion:     descripcion || null,
      propuestoPor:    session.id,
      orden:           count,
      agregadoEnJunta: agregadoEnJunta ?? false,
    },
    include: { autor: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ tema }, { status: 201 });
}
