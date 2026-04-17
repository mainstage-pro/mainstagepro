import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const reportes = await prisma.reporteSemanal.findMany({
    select: { id: true, semana: true, fechaInicio: true, fechaFin: true, score: true, generadoEn: true, notas: true },
    orderBy: { semana: "desc" },
    take: 52, // máximo un año de historial
  });

  return NextResponse.json({ reportes });
}
