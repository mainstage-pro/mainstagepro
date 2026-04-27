import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tipoEvento = req.nextUrl.searchParams.get("tipoEvento");
  const asistentes = parseInt(req.nextUrl.searchParams.get("asistentes") ?? "0") || 0;

  const where: Record<string, unknown> = { activo: true };

  if (tipoEvento && asistentes > 0) {
    where.AND = [
      { capacidadMin: { lte: asistentes } },
      { capacidadMax: { gte: asistentes } },
      { OR: [{ tipoEvento }, { tipoEvento: "TODOS" }] },
    ];
  } else if (tipoEvento) {
    where.OR = [{ tipoEvento }, { tipoEvento: "TODOS" }];
  }

  const grupos = await prisma.plantillaEquipo.findMany({
    where,
    include: {
      items: {
        include: {
          equipo: {
            select: { id: true, descripcion: true, marca: true, modelo: true, precioRenta: true, cantidadTotal: true },
          },
        },
        orderBy: { orden: "asc" },
      },
    },
    orderBy: [{ tipoEvento: "asc" }, { capacidadMin: "asc" }],
  });

  return NextResponse.json({ grupos });
}
