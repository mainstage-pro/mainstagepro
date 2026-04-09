import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; equipoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { equipoId } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if ("cantidad" in body) data.cantidad = body.cantidad;
  if ("dias" in body) data.dias = body.dias;
  if ("costoExterno" in body) data.costoExterno = body.costoExterno != null ? parseFloat(body.costoExterno) : null;
  if ("proveedorId" in body) data.proveedorId = body.proveedorId || null;
  if ("tipo" in body) data.tipo = body.tipo;
  if ("confirmado" in body) data.confirmado = body.confirmado;
  if ("notas" in body) data.notas = body.notas || null;

  const item = await prisma.proyectoEquipo.update({
    where: { id: equipoId },
    data,
    include: {
      equipo: { include: { categoria: { select: { nombre: true } } } },
      proveedor: { select: { nombre: true } },
    },
  });

  return NextResponse.json({ item });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; equipoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { equipoId } = await params;
  await prisma.proyectoEquipo.delete({ where: { id: equipoId } });
  return NextResponse.json({ ok: true });
}
