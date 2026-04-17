import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; rentaId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { rentaId } = await params;
  const body = await req.json();

  const renta = await prisma.socioRenta.update({
    where: { id: rentaId },
    data: {
      ...(body.descripcion !== undefined && { descripcion: body.descripcion }),
      ...(body.notas !== undefined && { notas: body.notas || null }),
    },
  });

  return NextResponse.json({ renta });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; rentaId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { rentaId } = await params;
  await prisma.socioRenta.delete({ where: { id: rentaId } });
  return NextResponse.json({ ok: true });
}
