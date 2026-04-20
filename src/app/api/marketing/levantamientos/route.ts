import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mes = searchParams.get("mes"); // YYYY-MM opcional para filtrar por mes del evento

  const levantamientos = await prisma.levantamientoContenido.findMany({
    where: mes
      ? {
          fecha: {
            gte: new Date(`${mes}-01`),
            lt:  new Date(
              new Date(`${mes}-01`).getFullYear(),
              new Date(`${mes}-01`).getMonth() + 1,
              1
            ),
          },
        }
      : undefined,
    include: {
      trato: {
        select: {
          id: true,
          etapa: true,
          tipoEvento: true,
          tipoServicio: true,
          cliente: { select: { nombre: true, empresa: true, telefono: true } },
          responsable: { select: { name: true } },
        },
      },
      activos: true,
    },
    orderBy: { fecha: "asc" },
  });

  return NextResponse.json({ levantamientos });
}
