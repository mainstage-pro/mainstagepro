import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const renders = await prisma.renderComercial.findMany({
    orderBy: [{ orden: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ renders });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { url, caption, etiqueta, orden } = body;
  if (!url) return NextResponse.json({ error: "URL requerida" }, { status: 400 });

  const render = await prisma.renderComercial.create({
    data: { url, caption: caption ?? null, etiqueta: etiqueta ?? null, orden: orden ?? 0 },
  });
  return NextResponse.json({ render }, { status: 201 });
}
