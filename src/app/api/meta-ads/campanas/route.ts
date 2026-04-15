import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const campanas = await prisma.metaCampana.findMany({
    include: {
      resultados: { orderBy: { fecha: "desc" } },
      anuncios: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ campanas });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();

  const campana = await prisma.metaCampana.create({
    data: {
      nombre: body.nombre,
      objetivo: body.objetivo || "LEADS",
      estado: body.estado || "BORRADOR",
      presupuesto: parseFloat(body.presupuesto) || 0,
      fechaInicio: body.fechaInicio ? new Date(body.fechaInicio) : null,
      fechaFin: body.fechaFin ? new Date(body.fechaFin) : null,
      audiencia: body.audiencia || null,
      ubicaciones: body.ubicaciones || null,
      notas: body.notas || null,
      creadoPorId: session.id,
    },
  });

  return NextResponse.json({ campana });
}
