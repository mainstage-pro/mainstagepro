// El nuevo orden del día del show, tal como quedó tras arrastrar el renglón.
//
// Llega el día entero y no solo el momento movido: arrastrar corre a todos los
// vecinos, y guardarlo de a PATCHes deja el day sheet a medias si falla el
// segundo. La hora del movido se recalcula aquí y no se cree la que mande el
// navegador: es el mismo `horaAlMover` que la pantalla usó para pintarlo, pero
// leído de lo que la base tiene en este momento.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { horaAlMover, ordenarBloques } from "@/lib/giras";
import { SELECT_MOMENTO } from "@/lib/show-momentos";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { showId } = await params;
  const body = await req.json();
  const ids: unknown = body.ids;
  const movidoId: unknown = body.movidoId;
  if (!Array.isArray(ids) || ids.some((x) => typeof x !== "string")) {
    return NextResponse.json({ error: "Falta el orden de los momentos" }, { status: 400 });
  }
  if (typeof movidoId !== "string") {
    return NextResponse.json({ error: "Falta cuál momento se movió" }, { status: 400 });
  }

  const actuales = await prisma.showMomento.findMany({ where: { showId }, select: SELECT_MOMENTO });

  // Que lleguen los mismos ids del día y ninguno más: una lista incompleta
  // dejaría a los que faltan con un orden que ya no corresponde a nada.
  const porId = new Map(actuales.map((m) => [m.id, m]));
  if (ids.length !== porId.size || ids.some((id) => !porId.has(id as string))) {
    return NextResponse.json({ error: "El orden no corresponde a este show" }, { status: 400 });
  }

  const lista = (ids as string[]).map((id) => porId.get(id)!);
  const { hora, horaFin } = horaAlMover(lista, movidoId);

  await prisma.$transaction(
    (ids as string[]).map((id, i) =>
      prisma.showMomento.update({
        where: { id },
        data: id === movidoId ? { orden: (i + 1) * 10, hora, horaFin } : { orden: (i + 1) * 10 },
      }),
    ),
  );

  const momentos = await prisma.showMomento.findMany({ where: { showId }, select: SELECT_MOMENTO });
  return NextResponse.json({ momentos: ordenarBloques(momentos) });
}
