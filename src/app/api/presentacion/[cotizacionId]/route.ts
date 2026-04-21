import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validarTokenPresentacion } from "@/lib/presentacion-token";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cotizacionId: string }> }
) {
  const { cotizacionId } = await params;
  const token = req.nextUrl.searchParams.get("token");

  if (!validarTokenPresentacion(cotizacionId, token)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id: cotizacionId },
    include: {
      cliente: {
        select: { nombre: true, empresa: true, telefono: true, correo: true },
      },
      trato: { select: { tipoEvento: true } },
      lineas: {
        orderBy: { orden: "asc" },
        include: {
          equipo: {
            select: { categoria: { select: { nombre: true } } },
          },
        },
      },
    },
  });

  if (!cotizacion) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json({ cotizacion });
}
