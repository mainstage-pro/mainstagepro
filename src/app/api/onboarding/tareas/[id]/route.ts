import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  try {
    const tarea = await prisma.onboardingTarea.update({
      where: { id },
      data: {
        completada: body.completada,
        completadaEn: body.completada ? new Date() : null,
        ...(body.notas !== undefined && { notas: body.notas }),
      },
    });

    // Recalcular si el módulo quedó completo
    const todasTareas = await prisma.onboardingTarea.findMany({
      where: { moduloId: tarea.moduloId },
      select: { completada: true },
    });
    const moduloCompleto = todasTareas.every((t: { completada: boolean }) => t.completada);
    await prisma.onboardingModulo.update({
      where: { id: tarea.moduloId },
      data: { completado: moduloCompleto },
    });

    return NextResponse.json({ tarea, moduloCompleto });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
