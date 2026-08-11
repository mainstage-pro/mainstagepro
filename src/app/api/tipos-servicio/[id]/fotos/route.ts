import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { url, caption, orden, destacada } = body;

  if (!url) return NextResponse.json({ error: "URL requerida" }, { status: 400 });

  const foto = await prisma.fotoTipoServicio.create({
    data: {
      tipoServicioId: id,
      url,
      caption: caption ?? null,
      orden: orden ?? 0,
      destacada: destacada ?? false,
    },
  });

  return NextResponse.json({ foto }, { status: 201 });
}
