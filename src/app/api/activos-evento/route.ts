import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const levantamientoId = searchParams.get("levantamientoId");
  if (!levantamientoId) return NextResponse.json({ error: "levantamientoId requerido" }, { status: 400 });

  const activos = await prisma.activoEvento.findMany({
    where: { levantamientoId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ activos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { levantamientoId, tipo, nombre, url, descripcion, estado } = body;

  if (!levantamientoId || !tipo || !nombre || !url) {
    return NextResponse.json({ error: "levantamientoId, tipo, nombre y url son requeridos" }, { status: 400 });
  }

  const activo = await prisma.activoEvento.create({
    data: { levantamientoId, tipo, nombre, url, descripcion: descripcion ?? null, estado: estado ?? "ENTREGADO" },
  });

  return NextResponse.json({ activo }, { status: 201 });
}
