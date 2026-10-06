import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { SELECT_CANAL, SELECT_INVITADO, aInvitadoFila, esRolInvitado, invitadosDelShow } from "@/lib/show-canales";

/// Quién se sube al escenario además del artista en esta fecha. Cada uno consume
/// canales de consola que el rider maestro no contempla; los canales se derivan
/// de aquí (ver `/api/show-invitados/[invitadoId]/requerimientos`).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { showId } = await params;
  const show = await prisma.giraShow.findUnique({ where: { id: showId }, select: { id: true } });
  if (!show) return NextResponse.json({ error: "El show no existe" }, { status: 404 });

  return NextResponse.json({ invitados: await invitadosDelShow(showId) });
}

function texto(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { showId } = await params;
  const show = await prisma.giraShow.findUnique({ where: { id: showId }, select: { id: true } });
  if (!show) return NextResponse.json({ error: "El show no existe" }, { status: 404 });

  const body = await req.json();
  const nombre = texto(body.nombre);
  if (!nombre) return NextResponse.json({ error: "El invitado necesita un nombre" }, { status: 400 });

  // El rol es opcional, pero si viene tiene que ser uno de los de la lista: la UI
  // lo pinta por llave y un valor libre se vería en blanco.
  if ("rol" in body && body.rol !== null && body.rol !== "" && !esRolInvitado(body.rol)) {
    return NextResponse.json({ error: "Ese rol de invitado no existe" }, { status: 400 });
  }

  const max = await prisma.showInvitado.aggregate({ where: { showId }, _max: { orden: true } });

  const invitado = await prisma.showInvitado.create({
    data: {
      showId,
      nombre,
      rol: esRolInvitado(body.rol) ? body.rol : null,
      momento: texto(body.momento),
      notas: texto(body.notas),
      orden: (max._max.orden ?? 0) + 10,
    },
    select: { ...SELECT_INVITADO, canales: { select: SELECT_CANAL } },
  });

  await logActividad(session.id, "CREAR", "ShowInvitado", invitado.id, `Agregó a «${nombre}» al show`, { showId });

  return NextResponse.json({ invitado: aInvitadoFila(invitado) });
}
