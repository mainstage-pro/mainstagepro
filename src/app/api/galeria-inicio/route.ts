import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const slides = await prisma.fotoGaleriaInicio.findMany({
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ slides });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { url, caption, orden } = body;
  if (!url) return NextResponse.json({ error: "URL requerida" }, { status: 400 });

  const slide = await prisma.fotoGaleriaInicio.create({
    data: { url, caption: caption ?? null, orden: orden ?? 0 },
  });
  return NextResponse.json({ slide }, { status: 201 });
}
