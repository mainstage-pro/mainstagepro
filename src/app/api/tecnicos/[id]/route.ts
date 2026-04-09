import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const allowed = ["nombre", "celular", "rolId", "nivel", "zonaHabitual", "cuentaBancaria", "datosFiscales", "activo", "comentarios"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key] ?? null;
  }

  const tecnico = await prisma.tecnico.update({
    where: { id },
    data,
    include: { rol: { select: { id: true, nombre: true } } },
  });
  return NextResponse.json({ tecnico });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.tecnico.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
