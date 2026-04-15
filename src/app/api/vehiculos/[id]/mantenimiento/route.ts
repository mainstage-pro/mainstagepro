import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const registros = await prisma.mantenimientoVehiculo.findMany({
    where: { vehiculoId: id },
    orderBy: { fecha: "desc" },
  });

  return NextResponse.json({ registros });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  if (!body.tipoRegistro || !body.servicio) {
    return NextResponse.json({ error: "Tipo de registro y servicio son requeridos" }, { status: 400 });
  }

  const registro = await prisma.mantenimientoVehiculo.create({
    data: {
      vehiculoId: id,
      fecha: body.fecha ? new Date(body.fecha) : new Date(),
      km: body.km ? parseInt(body.km) : null,
      tipoRegistro: body.tipoRegistro,
      servicio: body.servicio,
      aceite: body.aceite || null,
      anticongelante: body.anticongelante || null,
      estadoLlantas: body.estadoLlantas || null,
      proximoKm: body.proximoKm ? parseInt(body.proximoKm) : null,
      proximaFecha: body.proximaFecha ? new Date(body.proximaFecha) : null,
      prioridad: body.prioridad || "NORMAL",
      estatus: body.estatus || "COMPLETADO",
      costo: body.costo ? parseFloat(body.costo) : null,
      comentarios: body.comentarios || null,
    },
  });

  // Actualizar kilometraje del vehículo si se proporcionó
  if (body.km) {
    await prisma.vehiculo.update({
      where: { id },
      data: {
        kilometraje: parseInt(body.km),
        proximoServicioKm: body.proximoKm ? parseInt(body.proximoKm) : undefined,
        proximoServicioFecha: body.proximaFecha ? new Date(body.proximaFecha) : undefined,
      },
    });
  }

  return NextResponse.json({ registro });
}
