import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST: crea una subárea (nombre + objetivo/propósito → descripcion).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { areaId, nombre, descripcion } = await req.json();
  if (!areaId || !nombre?.trim()) return NextResponse.json({ error: "areaId y nombre son requeridos" }, { status: 400 });
  const last = await prisma.pTSubArea.findFirst({
    where: { areaId }, orderBy: { orden: "desc" }, select: { orden: true },
  });
  const subarea = await prisma.pTSubArea.create({
    data: { areaId, nombre: nombre.trim(), descripcion: descripcion?.trim() || null, orden: (last?.orden ?? 0) + 1 },
  });
  return NextResponse.json({ subarea }, { status: 201 });
}
