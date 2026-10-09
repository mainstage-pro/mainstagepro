// Bajar el orden del setlist base a todas las fechas de la gira.
//
// Va aparte del PATCH de orden porque no es reordenar un setlist: es un acto
// sobre la gira completa, y el orden de cada fecha es suyo hasta que alguien
// decide desde el base que vuelvan a ir todas igual.

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { bajarOrdenDelBase } from "@/lib/logistica-gira";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const gira = await prisma.gira.findUnique({ where: { id }, select: { id: true, nombre: true } });
  if (!gira) return NextResponse.json({ error: "La gira no existe" }, { status: 404 });

  const resultado = await bajarOrdenDelBase(id);

  await logActividad(
    session.id,
    "ACTUALIZAR",
    "GiraSetlist",
    id,
    `Bajó el orden del setlist base a las fechas de ${gira.nombre}`,
    resultado,
  );

  return NextResponse.json(resultado);
}
