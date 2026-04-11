import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const equipo = await prisma.proyectoEquipo.findUnique({
    where: { confirmToken: token },
    select: {
      id: true,
      confirmDisponible: true,
      cantidad: true,
      dias: true,
      equipo: {
        select: {
          descripcion: true,
          marca: true,
          categoria: { select: { nombre: true } },
        },
      },
      proyecto: {
        select: { nombre: true, fechaEvento: true, lugarEvento: true },
      },
      proveedor: {
        select: { nombre: true },
      },
    },
  });

  if (!equipo) {
    return NextResponse.json({ error: "Token inválido o no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ equipo });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();
  const { disponible } = body as { disponible: boolean; notas?: string };

  if (typeof disponible !== "boolean") {
    return NextResponse.json({ error: "El campo 'disponible' debe ser boolean" }, { status: 400 });
  }

  const equipoItem = await prisma.proyectoEquipo.findUnique({
    where: { confirmToken: token },
    select: { id: true },
  });

  if (!equipoItem) {
    return NextResponse.json({ error: "Token inválido o no encontrado" }, { status: 404 });
  }

  const updated = await prisma.proyectoEquipo.update({
    where: { id: equipoItem.id },
    data: { confirmDisponible: disponible },
  });

  return NextResponse.json({ ok: true, confirmDisponible: updated.confirmDisponible });
}
