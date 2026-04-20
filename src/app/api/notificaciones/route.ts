import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const notificaciones = await prisma.notificacion.findMany({
    where: { usuarioId: session.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const noLeidas = await prisma.notificacion.count({
    where: { usuarioId: session.id, leida: false },
  });

  return NextResponse.json({ notificaciones, noLeidas });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { usuarioId, tipo, titulo, mensaje, url, metadata } = body;

  const notif = await prisma.notificacion.create({
    data: { usuarioId, tipo, titulo, mensaje, url: url ?? null, metadata: metadata ?? null },
  });

  return NextResponse.json({ notif }, { status: 201 });
}
