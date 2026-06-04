import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { areaId, nombre } = await req.json();
  if (!areaId || !nombre?.trim()) {
    return NextResponse.json({ error: "areaId y nombre son requeridos" }, { status: 400 });
  }
  // Get next orden
  const last = await prisma.pTSubArea.findFirst({
    where: { areaId },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });
  const subArea = await prisma.pTSubArea.create({
    data: { areaId, nombre: nombre.trim(), orden: (last?.orden ?? 0) + 1 },
  });
  return NextResponse.json({ subArea }, { status: 201 });
}
