// El nuevo orden del setlist completo, tal como quedó tras arrastrar.
//
// Se manda la lista entera y no el renglón movido porque mover una canción de
// bloque puede renombrar y renumerar las tandas vecinas: es un solo hecho, y
// guardarlo de a pedazos deja el setlist a medias si falla el segundo PATCH.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { bloquesNormalizados } from "@/lib/giras";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ setlistId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { setlistId } = await params;
  const body = await req.json();
  const ids: unknown = body.ids;
  if (!Array.isArray(ids) || ids.some((x) => typeof x !== "string")) {
    return NextResponse.json({ error: "Falta el orden de las canciones" }, { status: 400 });
  }

  const actuales = await prisma.giraSetlistCancion.findMany({
    where: { setlistId },
    select: { id: true, tipo: true, bloqueNombre: true, bloqueColor: true },
  });

  // Que lleguen los mismos ids del setlist y ninguno más: si la lista llega
  // incompleta, reordenar borraría de hecho las filas que faltan del show.
  const conocidos = new Set(actuales.map((c) => c.id));
  if (ids.length !== conocidos.size || ids.some((id) => !conocidos.has(id as string))) {
    return NextResponse.json({ error: "El orden no corresponde a este setlist" }, { status: 400 });
  }

  const porId = new Map(actuales.map((c) => [c.id, c]));
  const ordenadas = (ids as string[]).map((id) => porId.get(id)!);
  const bloques = new Map(bloquesNormalizados(ordenadas).map((c) => [c.id, c]));

  await prisma.$transaction(
    (ids as string[]).map((id, i) => {
      const b = bloques.get(id);
      return prisma.giraSetlistCancion.update({
        where: { id },
        data: b ? { orden: i * 10, bloqueNombre: b.bloqueNombre, bloqueColor: b.bloqueColor } : { orden: i * 10 },
      });
    }),
  );

  const canciones = await prisma.giraSetlistCancion.findMany({ where: { setlistId }, orderBy: { orden: "asc" } });
  return NextResponse.json({ canciones });
}
