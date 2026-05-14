import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: proyectoId } = await params;
  const { nombre, descripcion } = await req.json();

  if (!nombre) return NextResponse.json({ error: "nombre requerido" }, { status: 400 });

  const count = await prisma.faseProyectoInterno.count({ where: { proyectoId } });
  const fase = await prisma.faseProyectoInterno.create({
    data: { proyectoId, nombre, descripcion: descripcion ?? null, orden: count },
  });

  return NextResponse.json({ fase }, { status: 201 });
}
