import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const actividades = await prisma.planTrabajoActividad.findMany({
    where: { activa: true },
    include: { responsable: { select: { id: true, name: true, area: true } } },
    orderBy: [{ area: "asc" }, { orden: "asc" }],
  });

  return NextResponse.json({ actividades });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const {
    area, responsableId, titulo, descripcion, frecuencia,
    diasSemana, horaEspecifica, entregable, kpiVinculado,
    origenSO, seccionSO, generarTareas, orden,
  } = body;

  if (!area || !responsableId || !titulo || !frecuencia || !entregable) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const actividad = await prisma.planTrabajoActividad.create({
    data: {
      area, responsableId, titulo, descripcion: descripcion ?? null,
      frecuencia, diasSemana: diasSemana ? JSON.stringify(diasSemana) : null,
      horaEspecifica: horaEspecifica ?? null,
      entregable, kpiVinculado: kpiVinculado ?? null,
      origenSO: origenSO ?? false, seccionSO: seccionSO ?? null,
      generarTareas: generarTareas ?? true,
      orden: orden ?? 0,
    },
    include: { responsable: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ actividad }, { status: 201 });
}
