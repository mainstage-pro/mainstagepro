import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;

    const prospeccion = await prisma.prospeccion.update({
      where: { id },
      data: { estado: "CANCELADO" },
      include: {
        cliente:    { select: { id: true, nombre: true } },
        responsable: { select: { id: true, name: true } },
        trato:      { select: { id: true, etapa: true } },
      },
    });

    return NextResponse.json({ prospeccion });
  } catch (error) {
    console.error("[POST /api/prospeccion/[id]/cancelar]", error);
    return NextResponse.json({ error: "Error al cancelar prospeccion" }, { status: 500 });
  }
}
