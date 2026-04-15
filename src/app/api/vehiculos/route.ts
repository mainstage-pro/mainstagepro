import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const vehiculos = await prisma.vehiculo.findMany({
    include: { mantenimientos: { orderBy: { fecha: "desc" }, take: 1 } },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({ vehiculos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, marca, modelo, anio, placas, color, kilometraje, notas } = body;

  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const vehiculo = await prisma.vehiculo.create({
    data: {
      nombre,
      marca: marca || null,
      modelo: modelo || null,
      anio: anio ? parseInt(anio) : null,
      placas: placas || null,
      color: color || null,
      kilometraje: kilometraje ? parseInt(kilometraje) : null,
      notas: notas || null,
    },
  });

  return NextResponse.json({ vehiculo });
}
