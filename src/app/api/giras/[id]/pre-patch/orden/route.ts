import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { esTipoCanal, listasDelAlcance } from "@/lib/pre-patch";

/**
 * Reacomoda los puertos de un lado de la interfaz.
 *
 * Desde la gira se acomoda la base, que es la que leen todas las fechas. Desde
 * una fecha solo se acomoda lo que nació ahí: los puertos de la gira llevan el
 * orden de la gira y valen igual en todas las plazas.
 *
 * El número no se acepta del cliente: se reescribe el orden y la lista unificada
 * vuelve a contar los puertos corridos.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const gira = await prisma.gira.findUnique({ where: { id }, select: { id: true } });
  if (!gira) return NextResponse.json({ error: "La gira no existe" }, { status: 404 });

  const body = await req.json();
  if (!esTipoCanal(body.tipo)) {
    return NextResponse.json({ error: "El puerto tiene que ser de entrada o de salida" }, { status: 400 });
  }
  const tipo = body.tipo;

  let showId: string | null = null;
  if (typeof body.showId === "string" && body.showId) {
    const show = await prisma.giraShow.findFirst({ where: { id: body.showId, giraId: id }, select: { id: true } });
    if (!show) return NextResponse.json({ error: "Esa fecha no es de esta gira" }, { status: 400 });
    showId = show.id;
  }

  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];

  const cola = await prisma.prePatchCanal.findMany({
    // Los ajustes no son cola: viven en el lugar del puerto de la gira que
    // sustituyen y su número lo decide la lista unificada.
    where: { giraId: id, showId, tipo, baseId: null },
    select: { id: true },
  });

  // La lista tiene que llegar completa: si llegara a medias, los que faltan se
  // quedarían con el orden viejo y el pre-patch saldría revuelto.
  const suyos = new Set(cola.map((c) => c.id));
  if (ids.length !== suyos.size || ids.some((x) => !suyos.has(x))) {
    return NextResponse.json(
      { error: "La lista cambió mientras la acomodabas: vuelve a cargar la página" },
      { status: 409 },
    );
  }

  await prisma.$transaction(
    ids.map((x, i) => prisma.prePatchCanal.update({ where: { id: x }, data: { orden: (i + 1) * 10 } })),
  );

  return NextResponse.json({ listas: await listasDelAlcance(id, showId) });
}
