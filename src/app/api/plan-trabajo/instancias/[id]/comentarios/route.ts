import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST /api/plan-trabajo/instancias/[id]/comentarios
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { contenido } = await req.json();

  if (!contenido?.trim()) {
    return NextResponse.json({ error: "Contenido requerido" }, { status: 400 });
  }

  const instancia = await prisma.pTTareaInstancia.findUnique({ where: { id }, select: { id: true } });
  if (!instancia) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const comentario = await prisma.pTComentario.create({
    data: {
      instanciaId: id,
      autorId: session.id,
      contenido: contenido.trim(),
    },
    include: {
      autor: { select: { id: true, name: true } },
    },
  });

  // Historial
  await prisma.pTHistorialEjecucion.create({
    data: {
      instanciaId: id,
      usuarioId: session.id,
      accion: "COMENTADA",
    },
  });

  return NextResponse.json({ comentario }, { status: 201 });
}
