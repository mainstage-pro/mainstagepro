import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const allowed = [
    "fecha", "tipoId", "formato", "objetivo", "descripcion", "copy",
    "enFacebook", "enInstagram", "enTiktok", "enYoutube",
    "materialLink", "portadaUrl", "colaboradores", "estado", "comentarios",
    "alcance", "impresiones", "interacciones", "seguidoresGanados",
  ];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      if (key === "fecha") data[key] = new Date(body[key]);
      else data[key] = body[key] === "" ? null : body[key];
    }
  }

  const pub = await prisma.publicacion.update({
    where: { id },
    data,
    include: { tipo: { select: { id: true, nombre: true, formato: true, enFeedIG: true } } },
  });
  return NextResponse.json({ publicacion: pub });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.publicacion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
