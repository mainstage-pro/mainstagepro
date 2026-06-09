import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/capacitacion — All sessions with latest version number
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sesiones = await prisma.sesionCapacitacion.findMany({
    orderBy: { numero: "asc" },
    include: {
      versiones: {
        orderBy: { version: "desc" },
        take: 1,
        select: { version: true, generadaEn: true },
      },
    },
  });

  const result = sesiones.map((s) => ({
    ...s,
    versionActual: s.versiones[0]?.version ?? null,
    ultimaGeneracion: s.versiones[0]?.generadaEn ?? null,
    versiones: undefined,
  }));

  return NextResponse.json(result);
}
