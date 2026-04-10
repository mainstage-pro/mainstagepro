import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; unidadId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { unidadId } = await params;
  const body = await request.json();
  const allowed = ["codigo", "estado", "notas", "activo"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key] === "" ? null : body[key];
  }

  const unidad = await prisma.equipoUnidad.update({
    where: { id: unidadId },
    data,
    include: {
      _count: { select: { mantenimientos: true } },
      mantenimientos: { orderBy: { fecha: "desc" }, take: 1, select: { fecha: true, proximoMantenimiento: true, tipo: true } },
    },
  });
  return NextResponse.json({ unidad });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; unidadId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { unidadId } = await params;
  await prisma.equipoUnidad.delete({ where: { id: unidadId } });
  return NextResponse.json({ ok: true });
}
