import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  const fields = [
    "titulo", "descripcion", "frecuencia", "horaEspecifica",
    "entregable", "kpiVinculado", "origenSO", "seccionSO",
    "activa", "generarTareas", "orden",
  ];
  for (const f of fields) {
    if (f in body) data[f] = body[f];
  }
  if ("diasSemana" in body) {
    data.diasSemana = body.diasSemana ? JSON.stringify(body.diasSemana) : null;
  }

  const actividad = await prisma.planTrabajoActividad.update({
    where: { id },
    data,
    include: { responsable: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ actividad });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.planTrabajoActividad.update({
    where: { id },
    data: { activa: false, generarTareas: false },
  });

  return NextResponse.json({ ok: true });
}
