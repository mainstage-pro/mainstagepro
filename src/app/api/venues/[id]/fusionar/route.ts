import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";

/**
 * Absorbe un venue duplicado dentro de este: reapunta tratos, cotizaciones y
 * proyectos al venue bueno, reescribe el texto espejo y desactiva el duplicado.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { duplicadoId } = await req.json();
  if (!duplicadoId) return NextResponse.json({ error: "Falta duplicadoId" }, { status: 400 });
  if (duplicadoId === id) return NextResponse.json({ error: "Un venue no se fusiona consigo mismo" }, { status: 400 });

  const [bueno, duplicado] = await Promise.all([
    prisma.venue.findUnique({ where: { id } }),
    prisma.venue.findUnique({ where: { id: duplicadoId } }),
  ]);
  if (!bueno || !duplicado) return NextResponse.json({ error: "Venue no encontrado" }, { status: 404 });

  const [tratos, cotizaciones, proyectos] = await prisma.$transaction([
    prisma.trato.updateMany({ where: { venueId: duplicadoId }, data: { venueId: id, lugarEstimado: bueno.nombre } }),
    prisma.cotizacion.updateMany({ where: { venueId: duplicadoId }, data: { venueId: id, lugarEvento: bueno.nombre } }),
    prisma.proyecto.updateMany({ where: { venueId: duplicadoId }, data: { venueId: id, lugarEvento: bueno.nombre } }),
  ]);

  await prisma.venue.update({ where: { id: duplicadoId }, data: { activo: false } });

  await logActividad(
    session.id,
    "ACTUALIZAR",
    "Venue",
    id,
    `Fusionó el venue "${duplicado.nombre}" dentro de "${bueno.nombre}" (${tratos.count} tratos, ${cotizaciones.count} cotizaciones, ${proyectos.count} proyectos).`
  );

  return NextResponse.json({ ok: true, tratos: tratos.count, cotizaciones: cotizaciones.count, proyectos: proyectos.count });
}
