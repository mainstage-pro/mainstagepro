import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH — toggle completado
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ accesorioId: string }> }) {
  const { accesorioId } = await params;
  const body = await req.json();
  const accesorio = await prisma.riderAccesorio.update({
    where: { id: accesorioId },
    data: { completado: body.completado },
  });
  return NextResponse.json({ accesorio });
}

// DELETE
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ accesorioId: string }> }) {
  const { accesorioId } = await params;
  await prisma.riderAccesorio.delete({ where: { id: accesorioId } });
  return NextResponse.json({ ok: true });
}
