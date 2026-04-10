import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const plantillas = await prisma.plantillaEquipo.findMany({
    include: { items: { include: { equipo: { select: { id: true, descripcion: true, marca: true, modelo: true } } }, orderBy: { orden: "asc" } } },
    orderBy: [{ tipoServicio: "asc" }, { tipoEvento: "asc" }, { capacidadMin: "asc" }],
  });

  return NextResponse.json({ plantillas });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { nombre, tipoServicio, tipoEvento, capacidadMin, capacidadMax, descripcion } = await req.json();
  const plantilla = await prisma.plantillaEquipo.create({
    data: { nombre, tipoServicio: tipoServicio || "TODOS", tipoEvento: tipoEvento || "TODOS", capacidadMin: capacidadMin || 0, capacidadMax: capacidadMax || 9999, descripcion: descripcion || null },
    include: { items: true },
  });

  return NextResponse.json({ plantilla });
}
