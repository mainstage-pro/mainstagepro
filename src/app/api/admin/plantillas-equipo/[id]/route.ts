import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Handle item operations
  if (body.action === "addItem") {
    const item = await prisma.plantillaEquipoItem.create({
      data: { plantillaId: id, descripcion: body.descripcion, equipoId: body.equipoId || null, cantidad: body.cantidad || 1, esOpcional: body.esOpcional || false, orden: body.orden || 0, notas: body.notas || null },
      include: { equipo: { select: { id: true, descripcion: true, marca: true, modelo: true } } },
    });
    return NextResponse.json({ item });
  }
  if (body.action === "removeItem") {
    await prisma.plantillaEquipoItem.delete({ where: { id: body.itemId } });
    return NextResponse.json({ ok: true });
  }

  // Update plantilla fields
  const { nombre, tipoServicio, tipoEvento, capacidadMin, capacidadMax, descripcion, activo } = body;
  const plantilla = await prisma.plantillaEquipo.update({
    where: { id },
    data: { nombre, tipoServicio, tipoEvento, capacidadMin, capacidadMax, descripcion, activo },
    include: { items: { include: { equipo: { select: { id: true, descripcion: true, marca: true, modelo: true } } }, orderBy: { orden: "asc" } } },
  });
  return NextResponse.json({ plantilla });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.plantillaEquipo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
