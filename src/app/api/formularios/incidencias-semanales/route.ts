import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const filtroUserId = session.role === "ADMIN" && userId ? userId : session.id;

  const registros = await prisma.incidenciaSemanal.findMany({
    where: { userId: filtroUserId },
    orderBy: [{ anio: "desc" }, { semana: "desc" }],
    include: { user: { select: { id: true, name: true, area: true } } },
  });

  return NextResponse.json({ registros });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { semana, anio, incidencias } = body;

  if (!semana || !anio) {
    return NextResponse.json({ error: "semana y anio son requeridos" }, { status: 400 });
  }

  const registro = await prisma.incidenciaSemanal.create({
    data: {
      userId: session.id,
      semana: Number(semana),
      anio: Number(anio),
      incidencias: incidencias ?? [],
      estado: "guardado",
    },
    include: { user: { select: { id: true, name: true, area: true } } },
  });

  return NextResponse.json({ registro }, { status: 201 });
}
