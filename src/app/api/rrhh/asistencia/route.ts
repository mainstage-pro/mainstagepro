import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const personalId = searchParams.get("personalId");
  const mes = searchParams.get("mes");
  const where: Record<string, unknown> = {};
  if (personalId) where.personalId = personalId;
  if (mes) {
    where.fecha = {
      gte: new Date(`${mes}-01`),
      lt: new Date(new Date(`${mes}-01`).setMonth(new Date(`${mes}-01`).getMonth() + 1)),
    };
  }
  const asistencias = await prisma.asistencia.findMany({
    where, orderBy: { fecha: "desc" },
    include: { personal: { select: { id: true, nombre: true, puesto: true } } },
  });
  return NextResponse.json({ asistencias });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json();
  const { personalId, fecha, estado, minutosRetardo, horaEntrada, horaSalida, notas } = body;
  if (!personalId || !fecha || !estado) return NextResponse.json({ error: "Datos requeridos" }, { status: 400 });
  const asistencia = await prisma.asistencia.upsert({
    where: { personalId_fecha: { personalId, fecha: new Date(fecha) } },
    create: { personalId, fecha: new Date(fecha), estado, minutosRetardo, horaEntrada, horaSalida, notas },
    update: { estado, minutosRetardo, horaEntrada, horaSalida, notas },
    include: { personal: { select: { id: true, nombre: true } } },
  });
  return NextResponse.json({ asistencia });
}
