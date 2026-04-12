import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body   = await req.json();

  const allowed = ["nombre", "descripcion", "area", "estado", "color", "fechaInicio", "fechaFin"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  for (const key of allowed) {
    if (!(key in body)) continue;
    if ((key === "fechaInicio" || key === "fechaFin") && body[key]) {
      data[key] = new Date(body[key]);
    } else {
      data[key] = body[key];
    }
  }

  const iniciativa = await prisma.iniciativaExterna.update({ where: { id }, data });
  return NextResponse.json({ iniciativa });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.iniciativaExterna.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
