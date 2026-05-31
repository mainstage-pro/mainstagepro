import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/captura — items sin clasificar
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const todos = searchParams.get("todos") === "1";

  const items = await prisma.capturaRapida.findMany({
    where: todos ? {} : { clasificado: false },
    orderBy: { creadoEn: "desc" },
  });

  return NextResponse.json(items);
}

// POST /api/captura — crear nuevo item
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { contenido, area, tipo } = body;

  if (!contenido?.trim()) {
    return NextResponse.json({ error: "contenido requerido" }, { status: 400 });
  }

  const item = await prisma.capturaRapida.create({
    data: {
      contenido: contenido.trim(),
      area: area ?? null,
      tipo: tipo ?? null,
      creadoPor: session.id,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
