import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { puedeVerFormularios } from "@/lib/formularios";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeVerFormularios(session))
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { id } = await context.params;
  const respuestas = await prisma.formularioRespuesta.findMany({
    where: { formularioId: id },
    orderBy: { enviadoAt: "desc" },
    include: {
      respuestasPreguntas: {
        include: {
          pregunta: { select: { id: true, codigo: true, texto: true, tipo: true } },
        },
      },
    },
  });
  return NextResponse.json({ respuestas });
}
