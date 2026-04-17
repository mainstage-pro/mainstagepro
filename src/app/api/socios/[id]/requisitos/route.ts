import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const requisitos = await prisma.socioRequisitoItem.findMany({
    where: { socioId: id },
    orderBy: { orden: "asc" },
  });

  return NextResponse.json({ requisitos });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: socioId } = await params;
  const body = await req.json();

  // body can be: { id, completado } to toggle one item, or { add: { requisito } } to add new
  if (body.add) {
    const ultimo = await prisma.socioRequisitoItem.count({ where: { socioId } });
    const item = await prisma.socioRequisitoItem.create({
      data: { socioId, requisito: body.add.requisito, orden: ultimo },
    });
    return NextResponse.json({ item }, { status: 201 });
  }

  if (body.id) {
    const item = await prisma.socioRequisitoItem.update({
      where: { id: body.id },
      data: {
        ...(body.completado !== undefined && { completado: body.completado }),
        ...(body.notas !== undefined && { notas: body.notas || null }),
        ...(body.requisito !== undefined && { requisito: body.requisito }),
      },
    });
    return NextResponse.json({ item });
  }

  return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
}
