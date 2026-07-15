import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Actualiza la fecha de un evento y la propaga a sus cotizaciones y proyecto ligado.
// Un trato puede agrupar varios eventos (cotizaciones agrupadas por grupoId), por eso
// el cliente envía los IDs de las cotizaciones del evento editado.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const cotizacionIds: string[] = Array.isArray(body.cotizacionIds) ? body.cotizacionIds : [];
  const actualizarEstimada = Boolean(body.actualizarEstimada);

  if (!body.fecha) return NextResponse.json({ error: "Falta la fecha" }, { status: 400 });
  const nuevaFecha = new Date(body.fecha);
  if (isNaN(nuevaFecha.getTime())) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });

  // Solo cotizaciones que realmente pertenecen a este trato
  const cotizaciones = cotizacionIds.length
    ? await prisma.cotizacion.findMany({
        where: { id: { in: cotizacionIds }, tratoId: id },
        select: { id: true, proyecto: { select: { id: true } } },
      })
    : [];

  const cotIds = cotizaciones.map((c) => c.id);
  const proyectoIds = cotizaciones
    .map((c) => c.proyecto?.id)
    .filter((x): x is string => Boolean(x));

  await prisma.$transaction([
    ...(cotIds.length
      ? [prisma.cotizacion.updateMany({ where: { id: { in: cotIds } }, data: { fechaEvento: nuevaFecha } })]
      : []),
    ...(proyectoIds.length
      ? [prisma.proyecto.updateMany({ where: { id: { in: proyectoIds } }, data: { fechaEvento: nuevaFecha } })]
      : []),
    ...(actualizarEstimada
      ? [prisma.trato.update({ where: { id }, data: { fechaEventoEstimada: nuevaFecha } })]
      : []),
  ]);

  return NextResponse.json({ ok: true, cotizaciones: cotIds, proyectos: proyectoIds });
}
