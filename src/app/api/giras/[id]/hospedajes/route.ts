import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { parseFechaGira } from "@/lib/giras";
import { INCLUDE_HOSPEDAJE } from "@/lib/logistica-gira";

const TEXTO = ["ciudad", "direccion", "telefono", "linkMaps", "confirmacion", "notas"] as const;

/// Hoteles de la gira, en el orden en que se duermen.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const hospedajes = await prisma.giraHospedaje.findMany({
    where: { giraId: id },
    orderBy: [{ checkIn: "asc" }, { createdAt: "asc" }],
    include: INCLUDE_HOSPEDAJE,
  });

  return NextResponse.json({ hospedajes });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const gira = await prisma.gira.findUnique({ where: { id }, select: { id: true, nombre: true } });
  if (!gira) return NextResponse.json({ error: "La gira no existe" }, { status: 404 });

  const body = await req.json();
  const hotelNombre = typeof body.hotelNombre === "string" ? body.hotelNombre.trim() : "";
  if (!hotelNombre) return NextResponse.json({ error: "El hotel necesita nombre" }, { status: 400 });

  const costo = Number(body.costoTotal);

  const hospedaje = await prisma.giraHospedaje.create({
    data: {
      giraId: id,
      hotelNombre,
      ...Object.fromEntries(
        TEXTO.map((campo) => {
          const v = body[campo];
          return [campo, typeof v === "string" && v.trim() ? v.trim() : null];
        }),
      ),
      checkIn: parseFechaGira(body.checkIn),
      checkOut: parseFechaGira(body.checkOut),
      costoTotal: body.costoTotal === null || body.costoTotal === "" || !Number.isFinite(costo) ? null : costo,
    },
    include: INCLUDE_HOSPEDAJE,
  });

  await logActividad(
    session.id,
    "CREAR",
    "GiraHospedaje",
    hospedaje.id,
    `Agregó el hotel ${hotelNombre}${hospedaje.ciudad ? ` en ${hospedaje.ciudad}` : ""} a ${gira.nombre}`,
  );

  return NextResponse.json({ hospedaje });
}
