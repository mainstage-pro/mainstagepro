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
    const [y, m] = mes.split("-").map(Number);
    where.fecha = {
      gte: new Date(y, m - 1, 1),
      lt:  new Date(y, m, 1),
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
  const { personalId, fecha, estado, minutosRetardo, horaEntrada, horaSalida, notas, justificada, documentoUrl } = body;
  if (!personalId || !fecha || !estado) return NextResponse.json({ error: "Datos requeridos" }, { status: 400 });
  // Solo las faltas/incapacidades pueden marcarse como justificadas con documento.
  const just = estado === "FALTA" || estado === "INCAPACIDAD" || estado === "PERMISO" ? !!justificada : false;
  const doc = just ? (documentoUrl ?? null) : null;
  const asistencia = await prisma.asistencia.upsert({
    where: { personalId_fecha: { personalId, fecha: new Date(fecha + "T12:00:00") } },
    create: { personalId, fecha: new Date(fecha + "T12:00:00"), estado, minutosRetardo, horaEntrada, horaSalida, notas, justificada: just, documentoUrl: doc },
    update: { estado, minutosRetardo, horaEntrada, horaSalida, notas, justificada: just, documentoUrl: doc },
    include: { personal: { select: { id: true, nombre: true } } },
  });
  return NextResponse.json({ asistencia });
}
