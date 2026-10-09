import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { esTipoCanal, listasDelShow, renumerarCola } from "@/lib/show-canales";

/**
 * Reacomoda los canales que nacieron en esta fecha.
 *
 * Los renglones del rider no se mueven desde aquí: su orden es el del rider de
 * la gira y vale para todas las plazas. Lo de la fecha va en la cola, y ahí sí
 * manda quien parcha esa noche.
 *
 * El número no se acepta del cliente: se vuelve a correr la cola y la lista
 * unificada lo recalcula.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { showId } = await params;
  const show = await prisma.giraShow.findUnique({ where: { id: showId }, select: { id: true } });
  if (!show) return NextResponse.json({ error: "El show no existe" }, { status: 404 });

  const body = await req.json();
  if (!esTipoCanal(body.tipo)) {
    return NextResponse.json({ error: "El canal tiene que ser entrada o salida" }, { status: 400 });
  }
  const tipo = body.tipo;
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];

  const cola = await prisma.showCanal.findMany({
    where: { showId, tipo, riderCanalId: null },
    select: { id: true },
  });

  // La lista tiene que ser exactamente la cola de esta fecha: si llegara a medias,
  // los que faltan se quedarían con el orden viejo y la lista saldría revuelta.
  const suyos = new Set(cola.map((c) => c.id));
  if (ids.length !== suyos.size || ids.some((id) => !suyos.has(id))) {
    return NextResponse.json(
      { error: "La lista cambió mientras la acomodabas: vuelve a cargar la fecha" },
      { status: 409 },
    );
  }

  await prisma.$transaction(
    ids.map((id, i) => prisma.showCanal.update({ where: { id }, data: { orden: (i + 1) * 10 } })),
  );
  await renumerarCola(showId, tipo);

  return NextResponse.json({ listas: await listasDelShow(showId) });
}
