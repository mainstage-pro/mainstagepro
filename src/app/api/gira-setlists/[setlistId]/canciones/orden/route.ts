// El nuevo orden del setlist completo, tal como quedó tras arrastrar.
//
// Se manda la lista entera y no el renglón movido porque reordenar es un solo
// hecho sobre el setlist, y guardarlo de a pedazos lo deja a medias si falla
// el segundo PATCH. El nombre y el color de cada bloque viajan con su propia
// fila (nuevoBloque) y no se recalculan aquí.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ setlistId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { setlistId } = await params;
  const body = await req.json();
  const ids: unknown = body.ids;
  if (!Array.isArray(ids) || ids.some((x) => typeof x !== "string")) {
    return NextResponse.json({ error: "Falta el orden de las canciones" }, { status: 400 });
  }

  // Que lleguen los mismos ids del setlist y ninguno más: si la lista llega
  // incompleta, reordenar borraría de hecho las filas que faltan del show.
  const actuales = await prisma.giraSetlistCancion.findMany({ where: { setlistId }, select: { id: true } });
  const conocidos = new Set(actuales.map((c) => c.id));
  if (ids.length !== conocidos.size || ids.some((id) => !conocidos.has(id as string))) {
    return NextResponse.json({ error: "El orden no corresponde a este setlist" }, { status: 400 });
  }

  await prisma.$transaction(
    (ids as string[]).map((id, i) => prisma.giraSetlistCancion.update({ where: { id }, data: { orden: i * 10 } })),
  );

  const canciones = await prisma.giraSetlistCancion.findMany({ where: { setlistId }, orderBy: { orden: "asc" } });
  return NextResponse.json({ canciones });
}
