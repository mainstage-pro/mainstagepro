import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PATCH /api/plan-trabajo/instancias/[id]/subtareas/[stId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { stId } = await params;
  const { completada } = await req.json();

  const st = await prisma.pTSubTareaInstancia.update({
    where: { id: stId },
    data: {
      completada,
      completadaAt: completada ? new Date() : null,
    },
    include: { subtarea: true },
  });

  return NextResponse.json({ subtarea: st });
}
