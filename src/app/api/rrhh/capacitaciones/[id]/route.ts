import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const allowed = ["titulo", "descripcion", "area", "tipo", "modalidad", "estado", "instructor", "material", "duracionHrs", "obligatoria"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      if (key === "duracionHrs") data[key] = body[key] != null ? Number(body[key]) : null;
      else if (key === "obligatoria") data[key] = Boolean(body[key]);
      else data[key] = body[key] || null;
    }
  }
  if ("fechaInicio" in body && body.fechaInicio) data.fechaInicio = new Date(body.fechaInicio);
  if ("fechaFin" in body) data.fechaFin = body.fechaFin ? new Date(body.fechaFin) : null;

  const capacitacion = await prisma.capacitacion.update({
    where: { id },
    data,
    include: {
      participantes: {
        include: { personal: { select: { id: true, nombre: true, puesto: true } } },
      },
    },
  });

  return NextResponse.json({ capacitacion });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.area !== "RRHH")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.capacitacion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// PATCH /api/rrhh/capacitaciones/[id]?participante=personalId — marcar asistencia
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { personalId, asistio, calificacion, notas } = body;

  if (!personalId) return NextResponse.json({ error: "personalId requerido" }, { status: 400 });

  const participante = await prisma.capacitacionParticipante.upsert({
    where: { capacitacionId_personalId: { capacitacionId: id, personalId } },
    create: { capacitacionId: id, personalId, asistio: Boolean(asistio), calificacion: calificacion ?? null, notas: notas ?? null },
    update: { asistio: Boolean(asistio), calificacion: calificacion ?? null, notas: notas ?? null },
  });

  return NextResponse.json({ participante });
}
