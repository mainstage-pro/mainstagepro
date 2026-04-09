import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tratoId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { tratoId } = await params;

  const trato = await prisma.trato.findUnique({
    where: { id: tratoId },
    include: {
      cliente: true,
      responsable: { select: { id: true, name: true } },
      cotizaciones: {
        where: { estado: { in: ["APROBADA", "ENVIADA", "EN_REVISION", "REENVIADA"] } },
        include: {
          lineas: { orderBy: { orden: "asc" } },
          cuentasCobrar: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!trato) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Si no hay cotización aprobada, buscar la más reciente sin importar estado
  const cotizacion = trato.cotizaciones[0] ?? await prisma.cotizacion.findFirst({
    where: { tratoId },
    include: {
      lineas: { orderBy: { orden: "asc" } },
      cuentasCobrar: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ trato, cotizacion });
}
