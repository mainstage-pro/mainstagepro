import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VARIANTES_CATALOGO } from "@/lib/site-plan";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const variantes = await prisma.sitePlanVariante.findMany({
    where: { planId: id, activo: true },
    include: {
      revisiones: { orderBy: { numero: "desc" } },
      emisiones: { orderBy: { fecha: "desc" } },
    },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(variantes);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as { clave?: string; nombre?: string; capasIds?: string[] | null };

  const plantilla = VARIANTES_CATALOGO.find(v => v.clave === body.clave);
  if (!plantilla) return NextResponse.json({ error: "Tipo de plano desconocido" }, { status: 400 });

  const cuantas = await prisma.sitePlanVariante.count({ where: { planId: id } });

  const variante = await prisma.sitePlanVariante.create({
    data: {
      planId: id,
      clave: plantilla.clave,
      nombre: body.nombre?.trim() || plantilla.nombre,
      // Los croquis temáticos nacen con su recorte puesto: elegir "croquis
      // eléctrico" y que saliera todo el predio sería elegir dos veces.
      soloElectrico: !!plantilla.soloElectrico,
      soloEmergencia: !!plantilla.soloEmergencia,
      capasIds: body.capasIds?.length ? JSON.stringify(body.capasIds) : null,
      orden: cuantas,
    },
  });

  return NextResponse.json(variante);
}
