import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function subDays(d: Date, n: number): Date {
  return new Date(d.getTime() - n * 86400000);
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const hoy = new Date();

  const [tareasAbandonadas, tratosEnfriados, tratosCriticos] = await Promise.all([
    prisma.tarea.count({
      where: {
        estado: { notIn: ["COMPLETADA", "CANCELADA"] },
        parentId: null,
        createdAt: { lte: subDays(hoy, 15) },
      },
    }),

    prisma.trato.count({
      where: {
        etapa: { notIn: ["VENTA_CERRADA", "VENTA_PERDIDA"] },
        createdAt: { lte: subDays(hoy, 15) },
      },
    }),

    prisma.trato.count({
      where: {
        etapa: { notIn: ["VENTA_CERRADA", "VENTA_PERDIDA"] },
        createdAt: { lte: subDays(hoy, 21) },
        fechaEventoEstimada: { lte: addDays(hoy, 14) },
      },
    }),
  ]);

  return NextResponse.json({ tareasAbandonadas, tratosEnfriados, tratosCriticos });
}
