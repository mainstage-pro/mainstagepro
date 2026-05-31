import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/ideas
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado");
  const area   = searchParams.get("area");
  const tipo   = searchParams.get("tipo");

  const ideas = await prisma.idea.findMany({
    where: {
      ...(estado && { estado }),
      ...(area   && { area }),
      ...(tipo   && { tipo }),
    },
    include: { usuario: { select: { id: true, name: true } } },
    orderBy: { creadoEn: "desc" },
  });

  return NextResponse.json(ideas);
}

// POST /api/ideas
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { titulo, nota, area, tipo } = body;

  if (!titulo?.trim()) {
    return NextResponse.json({ error: "titulo requerido" }, { status: 400 });
  }

  const idea = await prisma.idea.create({
    data: {
      titulo: titulo.trim(),
      nota:   nota?.trim() ?? null,
      area:   area  ?? null,
      tipo:   tipo  ?? null,
      creadoPor: session.id,
    },
    include: { usuario: { select: { id: true, name: true } } },
  });

  return NextResponse.json(idea, { status: 201 });
}
