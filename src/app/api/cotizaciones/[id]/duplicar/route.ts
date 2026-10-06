import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureCotizacionHorarioColumns } from "@/lib/migraciones-lazy";
import { datosCopiaCotizacion, siguienteNumeroCotizacion } from "@/lib/cotizacion-copia";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  await ensureCotizacionHorarioColumns();

  const original = await prisma.cotizacion.findUnique({
    where: { id },
    include: { lineas: true },
  });
  if (!original) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const nueva = await prisma.cotizacion.create({
    data: datosCopiaCotizacion(original, {
      numeroCotizacion: await siguienteNumeroCotizacion(),
      creadaPorId: session.id,
      nombreEvento: original.nombreEvento ? `${original.nombreEvento} (copia)` : null,
      giraId: original.giraId,
      giraShowId: original.giraShowId,
    }),
    select: { id: true, numeroCotizacion: true },
  });

  return NextResponse.json({ id: nueva.id, numeroCotizacion: nueva.numeroCotizacion });
}
