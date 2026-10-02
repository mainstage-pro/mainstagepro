import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { ORIGENES_CREW, nombreCrew } from "@/lib/giras";
import { INCLUDE_CREW } from "@/lib/logistica-gira";

const TEXTO = ["telefono", "email", "llamado", "notas", "nombreLibre"] as const;
const RELACIONES = ["tecnicoId", "personaId", "rolTecnicoId"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ crewId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { crewId } = await params;
  const existente = await prisma.giraCrew.findUnique({
    where: { id: crewId },
    select: { id: true, giraId: true },
  });
  if (!existente) return NextResponse.json({ error: "El miembro del crew no existe" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("origen" in body) {
    if (typeof body.origen !== "string" || !ORIGENES_CREW.includes(body.origen)) {
      return NextResponse.json({ error: "Origen inválido" }, { status: 400 });
    }
    data.origen = body.origen;
  }

  if ("funcion" in body) {
    const funcion = typeof body.funcion === "string" ? body.funcion.trim() : "";
    if (!funcion) return NextResponse.json({ error: "La función no puede quedar vacía" }, { status: 400 });
    data.funcion = funcion;
  }

  // Mover el alcance: de toda la gira a un show y de vuelta. El show tiene que
  // ser de la misma gira.
  if ("showId" in body) {
    const showId = typeof body.showId === "string" && body.showId ? body.showId : null;
    if (showId) {
      const show = await prisma.giraShow.findUnique({ where: { id: showId }, select: { giraId: true } });
      if (!show || show.giraId !== existente.giraId) {
        return NextResponse.json({ error: "El show no es de esta gira" }, { status: 400 });
      }
    }
    data.showId = showId;
  }

  for (const campo of TEXTO) {
    if (!(campo in body)) continue;
    const v = body[campo];
    data[campo] = typeof v === "string" && v.trim() ? v.trim() : null;
  }

  for (const campo of RELACIONES) {
    if (!(campo in body)) continue;
    const v = body[campo];
    data[campo] = typeof v === "string" && v ? v : null;
  }

  if ("orden" in body) {
    const n = Number(body.orden);
    data.orden = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
  }

  if (!Object.keys(data).length) return NextResponse.json({ error: "Nada por actualizar" }, { status: 400 });

  try {
    const miembro = await prisma.giraCrew.update({ where: { id: crewId }, data, include: INCLUDE_CREW });
    return NextResponse.json({ miembro });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el crew" }, { status: 404 });
  }
}

/// Baja suave: el renglón se queda para que el histórico de la gira no pierda
/// quién estaba contemplado, y su rooming y sus viajes siguen apuntando a algo.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ crewId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { crewId } = await params;
  const existente = await prisma.giraCrew.findUnique({ where: { id: crewId }, include: INCLUDE_CREW });
  if (!existente) return NextResponse.json({ error: "El miembro del crew no existe" }, { status: 404 });

  await prisma.giraCrew.update({ where: { id: crewId }, data: { activo: false } });

  await logActividad(
    session.id,
    "ELIMINAR",
    "GiraCrew",
    crewId,
    `Dio de baja a ${nombreCrew(existente)} del crew de la gira`,
    { giraId: existente.giraId, showId: existente.showId },
  );

  return NextResponse.json({ ok: true });
}
