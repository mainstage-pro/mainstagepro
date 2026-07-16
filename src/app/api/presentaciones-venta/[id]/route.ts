import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensurePresentacionTratoCol } from "@/lib/etapaSeguimientos";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  await ensurePresentacionTratoCol();

  const presentacion = await prisma.presentacionVenta.findFirst({
    where: { id, creadaPorId: session.id },
    include: { imagenes: { orderBy: { orden: "asc" } } },
  });
  if (!presentacion) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  return NextResponse.json({ presentacion });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  await ensurePresentacionTratoCol();

  const presentacion = await prisma.presentacionVenta.findFirst({
    where: { id, creadaPorId: session.id },
  });
  if (!presentacion) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const updated = await prisma.presentacionVenta.update({
    where: { id },
    data: {
      ...(body.htmlContent !== undefined && { htmlContent: body.htmlContent }),
      ...(body.titulo !== undefined && { titulo: body.titulo }),
      ...(body.estado !== undefined && { estado: body.estado }),
    },
  });

  return NextResponse.json({ ok: true, presentacion: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  await prisma.presentacionVenta.deleteMany({ where: { id, creadaPorId: session.id } });
  return NextResponse.json({ ok: true });
}
