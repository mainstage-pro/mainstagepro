import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { contenido, tipo } = await req.json();
  if (!contenido) return NextResponse.json({ error: "contenido requerido" }, { status: 400 });

  const entrada = await prisma.proyectoBitacora.create({
    data: {
      proyectoId: id,
      usuarioId: session.id,
      tipo: tipo || "NOTA",
      contenido,
    },
    include: { usuario: { select: { name: true } } },
  });
  return NextResponse.json({ entrada });
}
