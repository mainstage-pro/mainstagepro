import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const allowed = [
    "nombre", "formato", "objetivo", "diaSemana", "semanaDelMes", "recurrencia", "cantMes", "descripcion",
    "activo", "orden", "enFacebook", "enInstagram", "enTiktok", "enYoutube",
  ];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const tipo = await prisma.tipoContenido.update({ where: { id }, data });
  return NextResponse.json({ tipo });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.tipoContenido.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
