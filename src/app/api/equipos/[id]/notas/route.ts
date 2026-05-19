import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const notas = await prisma.equipoNota.findMany({
    where: { equipoId: id },
    include: { creadoPor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ notas });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const { contenido } = await req.json();
  if (!contenido?.trim()) return NextResponse.json({ error: "Contenido requerido" }, { status: 400 });
  const nota = await prisma.equipoNota.create({
    data: { equipoId: id, contenido: contenido.trim(), creadoPorId: session.id },
    include: { creadoPor: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ nota });
}
