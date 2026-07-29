import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { diasHabiles } from "@/lib/vacaciones";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  if (!body.fechaInicio || !body.fechaFin) {
    return NextResponse.json({ error: "Faltan fechas" }, { status: 400 });
  }
  const inicio = new Date(body.fechaInicio);
  const fin = new Date(body.fechaFin);
  if (fin < inicio) return NextResponse.json({ error: "La fecha fin no puede ser anterior al inicio" }, { status: 400 });

  const dias = body.dias != null ? Number(body.dias) : diasHabiles(inicio, fin);

  const solicitud = await prisma.solicitudVacaciones.create({
    data: {
      personalId: id,
      fechaInicio: inicio,
      fechaFin: fin,
      dias,
      motivo: body.motivo || null,
      estado: body.estado === "APROBADA" ? "APROBADA" : "PENDIENTE",
      aprobadaPor: body.estado === "APROBADA" ? (session.name ?? null) : null,
      aprobadaEn: body.estado === "APROBADA" ? new Date() : null,
    },
  });
  return NextResponse.json({ solicitud });
}
