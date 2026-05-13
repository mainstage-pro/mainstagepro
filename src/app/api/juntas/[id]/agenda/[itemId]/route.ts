import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { itemId } = await params;
  const body = await req.json();
  const { respuesta, completado } = body;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  if (respuesta  !== undefined) data.respuesta  = respuesta;
  if (completado !== undefined) data.completado = completado;

  const item = await prisma.agendaItem.update({
    where: { id: itemId },
    data,
  });

  return NextResponse.json({ item });
}
