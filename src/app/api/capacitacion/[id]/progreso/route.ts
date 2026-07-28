import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST /api/capacitacion/[id]/progreso
// Body: { segundos: number, finalizar?: boolean }
// El cliente cronometra el tiempo ACTIVO (pausado en inactividad) y lo manda como
// total. "finalizar" marca el fin de la visualización (previo a la evaluación).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { segundos, finalizar, completado } = await req.json();
  const seg = Math.max(0, Math.round(Number(segundos) || 0));

  const existing = await prisma.progresoCapacitacion.findUnique({
    where: { usuarioId_sesionId: { usuarioId: session.id, sesionId: id } },
  });

  const data = {
    // Guarda el mayor tiempo activo registrado para no perder progreso entre latidos.
    segundos: Math.max(seg, existing?.segundos ?? 0),
    ...(finalizar && !existing?.completadoEn ? { completadoEn: new Date() } : {}),
    ...(completado ? { estado: "completado" } : {}),
  };

  const progreso = await prisma.progresoCapacitacion.upsert({
    where: { usuarioId_sesionId: { usuarioId: session.id, sesionId: id } },
    create: {
      usuarioId: session.id,
      sesionId: id,
      estado: completado ? "completado" : "en-progreso",
      segundos: seg,
      ...(finalizar ? { completadoEn: new Date() } : {}),
    },
    update: data,
  });

  return NextResponse.json({ ok: true, progreso });
}
