import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; temaId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { temaId } = await params;

  const { cubierto, notas, pasadoSiguienteSemana } = await req.json();

  const tema = await prisma.temaAdicional.update({
    where: { id: temaId },
    data: {
      ...(cubierto              !== undefined && { cubierto }),
      ...(notas                 !== undefined && { notas }),
      ...(pasadoSiguienteSemana !== undefined && { pasadoSiguienteSemana }),
    },
    include: { autor: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ tema });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; temaId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { temaId } = await params;

  await prisma.temaAdicional.delete({ where: { id: temaId } });
  return NextResponse.json({ ok: true });
}
