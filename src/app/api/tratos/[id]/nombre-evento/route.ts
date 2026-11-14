import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";

// Renombra un evento del trato desde su tarjeta. El nombre vive en cada cotización
// del evento (opciones A/B/C comparten grupo), así que se aplica a todas. El proyecto
// ligado se renombra también, pero solo si todavía se llamaba igual que el evento:
// si alguien ya le puso un nombre propio al proyecto, no se lo pisamos.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const cotizacionIds: string[] = Array.isArray(body.cotizacionIds) ? body.cotizacionIds : [];
  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  const anterior = typeof body.nombreAnterior === "string" ? body.nombreAnterior.trim() : "";

  if (!nombre) return NextResponse.json({ error: "El nombre no puede quedar vacío" }, { status: 400 });
  if (nombre.length > 120) return NextResponse.json({ error: "Nombre demasiado largo" }, { status: 400 });

  // Solo cotizaciones que realmente pertenecen a este trato
  const cotizaciones = cotizacionIds.length
    ? await prisma.cotizacion.findMany({
        where: { id: { in: cotizacionIds }, tratoId: id },
        select: { id: true, numeroCotizacion: true, proyecto: { select: { id: true, nombre: true } } },
      })
    : [];
  if (cotizaciones.length === 0) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });

  const cotIds = cotizaciones.map((c) => c.id);
  const proyectoIds = cotizaciones
    .map((c) => c.proyecto)
    .filter((p): p is { id: string; nombre: string } => Boolean(p) && !!anterior && p!.nombre.trim() === anterior)
    .map((p) => p.id);

  await prisma.$transaction([
    prisma.cotizacion.updateMany({ where: { id: { in: cotIds } }, data: { nombreCotizacion: nombre } }),
    ...(proyectoIds.length
      ? [prisma.proyecto.updateMany({ where: { id: { in: proyectoIds } }, data: { nombre } })]
      : []),
  ]);

  await logActividad(
    session.id,
    "EDITAR",
    "cotizacion",
    cotIds[0],
    `Evento renombrado a "${nombre}" (${cotizaciones.map((c) => c.numeroCotizacion).join(", ")})`,
  ).catch(() => {});

  return NextResponse.json({ ok: true, cotizaciones: cotIds, proyectos: proyectoIds, nombre });
}
