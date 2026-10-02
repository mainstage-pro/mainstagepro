import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { parseFechaGira } from "@/lib/giras";
import { INCLUDE_HOSPEDAJE } from "@/lib/logistica-gira";

const TEXTO = ["ciudad", "direccion", "telefono", "linkMaps", "confirmacion", "notas"] as const;
const FECHAS = ["checkIn", "checkOut"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ hospedajeId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { hospedajeId } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("hotelNombre" in body) {
    const hotelNombre = typeof body.hotelNombre === "string" ? body.hotelNombre.trim() : "";
    if (!hotelNombre) return NextResponse.json({ error: "El hotel necesita nombre" }, { status: 400 });
    data.hotelNombre = hotelNombre;
  }

  for (const campo of TEXTO) {
    if (!(campo in body)) continue;
    const v = body[campo];
    data[campo] = typeof v === "string" && v.trim() ? v.trim() : null;
  }

  for (const campo of FECHAS) {
    if (!(campo in body)) continue;
    data[campo] = parseFechaGira(body[campo]);
  }

  if ("costoTotal" in body) {
    const n = Number(body.costoTotal);
    data.costoTotal = body.costoTotal === null || body.costoTotal === "" || !Number.isFinite(n) ? null : n;
  }

  if (!Object.keys(data).length) return NextResponse.json({ error: "Nada por actualizar" }, { status: 400 });

  try {
    const hospedaje = await prisma.giraHospedaje.update({
      where: { id: hospedajeId },
      data,
      include: INCLUDE_HOSPEDAJE,
    });
    return NextResponse.json({ hospedaje });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el hotel" }, { status: 404 });
  }
}

/// GiraHospedaje no tiene bandera `activo`: quitar el hotel se lleva en cascada
/// su rooming, que sin hotel no significa nada. La UI avisa cuántos cuartos son.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ hospedajeId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { hospedajeId } = await params;
  const existente = await prisma.giraHospedaje.findUnique({
    where: { id: hospedajeId },
    select: { id: true, giraId: true, hotelNombre: true, ciudad: true, _count: { select: { roomings: true } } },
  });
  if (!existente) return NextResponse.json({ error: "El hotel no existe" }, { status: 404 });

  await prisma.giraHospedaje.delete({ where: { id: hospedajeId } });

  await logActividad(
    session.id,
    "ELIMINAR",
    "GiraHospedaje",
    hospedajeId,
    `Quitó el hotel ${existente.hotelNombre}${existente.ciudad ? ` (${existente.ciudad})` : ""} de la gira`,
    { giraId: existente.giraId, cuartos: existente._count.roomings },
  );

  return NextResponse.json({ ok: true });
}
