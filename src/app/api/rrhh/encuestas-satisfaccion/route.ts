import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/rrhh/encuestas-satisfaccion?periodo=Q1-2026
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const periodo = searchParams.get("periodo");

  const encuestas = await prisma.encuestaSatisfaccionEquipo.findMany({
    where: periodo ? { periodo } : {},
    include: {
      personal: { select: { id: true, nombre: true, puesto: true, departamento: true, tipo: true } },
    },
    orderBy: [{ respondida: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ encuestas });
}

// POST /api/rrhh/encuestas-satisfaccion — crear encuesta para un empleado
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.area !== "RRHH" && session.area !== "DIRECCION")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { personalId, periodo } = body;
  if (!personalId || !periodo) {
    return NextResponse.json({ error: "personalId y periodo son requeridos" }, { status: 400 });
  }

  const encuesta = await prisma.encuestaSatisfaccionEquipo.upsert({
    where: { personalId_periodo: { personalId, periodo } },
    create: { personalId, periodo },
    update: {},
    include: {
      personal: { select: { id: true, nombre: true, puesto: true, departamento: true } },
    },
  });

  return NextResponse.json({ encuesta }, { status: 201 });
}

// DELETE /api/rrhh/encuestas-satisfaccion?id=xxx
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.area !== "RRHH")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  await prisma.encuestaSatisfaccionEquipo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
