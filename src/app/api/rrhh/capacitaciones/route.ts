import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado");
  const area = searchParams.get("area");

  const capacitaciones = await prisma.capacitacion.findMany({
    where: {
      ...(estado ? { estado } : {}),
      ...(area ? { area } : {}),
    },
    include: {
      participantes: {
        include: { personal: { select: { id: true, nombre: true, puesto: true } } },
      },
    },
    orderBy: { fechaInicio: "desc" },
  });

  return NextResponse.json({ capacitaciones });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.area !== "RRHH" && session.area !== "DIRECCION")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { titulo, descripcion, area, tipo, modalidad, fechaInicio, fechaFin, duracionHrs, instructor, material, estado, obligatoria, participanteIds } = body;

  if (!titulo || !fechaInicio) {
    return NextResponse.json({ error: "titulo y fechaInicio son requeridos" }, { status: 400 });
  }

  const capacitacion = await prisma.capacitacion.create({
    data: {
      titulo,
      descripcion: descripcion || null,
      area: area || "GENERAL",
      tipo: tipo || "TECNICA",
      modalidad: modalidad || "PRESENCIAL",
      fechaInicio: new Date(fechaInicio),
      fechaFin: fechaFin ? new Date(fechaFin) : null,
      duracionHrs: duracionHrs ? Number(duracionHrs) : null,
      instructor: instructor || null,
      material: material || null,
      estado: estado || "PROGRAMADA",
      obligatoria: Boolean(obligatoria),
      participantes: participanteIds?.length > 0 ? {
        create: participanteIds.map((pid: string) => ({ personalId: pid })),
      } : undefined,
    },
    include: {
      participantes: {
        include: { personal: { select: { id: true, nombre: true, puesto: true } } },
      },
    },
  });

  return NextResponse.json({ capacitacion }, { status: 201 });
}
