import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { capasIniciales } from "@/lib/site-plan";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const showId = req.nextUrl.searchParams.get("showId");
  const venueId = req.nextUrl.searchParams.get("venueId");

  const planes = await prisma.sitePlan.findMany({
    where: {
      activo: true,
      ...(showId ? { showId } : {}),
      ...(venueId ? { venueId } : {}),
    },
    select: {
      id: true,
      nombre: true,
      showId: true,
      venueId: true,
      fondoUrl: true,
      escalaMPorPx: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(planes);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = (await req.json()) as {
    nombre?: string;
    showId?: string | null;
    venueId?: string | null;
    copiarDe?: string | null;
  };

  const nombre = body.nombre?.trim();
  if (!nombre) return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });

  // Un plano del venue sirve de plantilla: la fecha nueva arranca con el predio ya
  // trazado y calibrado, y a partir de ahí los dos caminos son independientes.
  const origen = body.copiarDe
    ? await prisma.sitePlan.findUnique({
        where: { id: body.copiarDe },
        select: { contenido: true, fondoUrl: true, fondoAncho: true, fondoAlto: true, escalaMPorPx: true },
      })
    : null;

  const plan = await prisma.sitePlan.create({
    data: {
      nombre,
      showId: body.showId ?? null,
      venueId: body.venueId ?? null,
      contenido: origen?.contenido ?? JSON.stringify({ capas: capasIniciales(), objetos: [] }),
      fondoUrl: origen?.fondoUrl ?? null,
      fondoAncho: origen?.fondoAncho ?? null,
      fondoAlto: origen?.fondoAlto ?? null,
      escalaMPorPx: origen?.escalaMPorPx ?? null,
    },
    select: { id: true },
  });

  return NextResponse.json(plan, { status: 201 });
}
