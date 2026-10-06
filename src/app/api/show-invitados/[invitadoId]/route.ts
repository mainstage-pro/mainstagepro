import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { SELECT_CANAL, SELECT_INVITADO, aInvitadoFila, esRolInvitado, renumerarCola } from "@/lib/show-canales";

const TEXTO = ["momento", "notas"] as const;

const INCLUDE = { ...SELECT_INVITADO, canales: { select: SELECT_CANAL } } as const;

/**
 * Edición renglón por renglón, como el día del show: cada celda se guarda sola y
 * la fila conserva su id. No hay PUT que recree la lista — los canales de esta
 * fecha cuelgan de estos ids y perderlos los borraría en cascada.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ invitadoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { invitadoId } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("nombre" in body) {
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    if (!nombre) return NextResponse.json({ error: "El invitado necesita un nombre" }, { status: 400 });
    data.nombre = nombre;
  }

  if ("rol" in body) {
    const v = body.rol;
    if (v === null || v === "") {
      data.rol = null;
    } else if (esRolInvitado(v)) {
      data.rol = v;
    } else {
      return NextResponse.json({ error: "Ese rol de invitado no existe" }, { status: 400 });
    }
  }

  for (const campo of TEXTO) {
    if (!(campo in body)) continue;
    const v = body[campo];
    data[campo] = typeof v === "string" && v.trim() ? v.trim() : null;
  }

  if ("orden" in body) {
    const n = Number(body.orden);
    data.orden = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
  }

  if (!Object.keys(data).length) return NextResponse.json({ error: "Nada por actualizar" }, { status: 400 });

  try {
    const invitado = await prisma.showInvitado.update({ where: { id: invitadoId }, data, select: INCLUDE });
    return NextResponse.json({ invitado: aInvitadoFila(invitado) });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el invitado" }, { status: 404 });
  }
}

/// Al irse el invitado se van sus canales (cascada en el schema), así que la cola
/// de esta fecha se recorre para que la lista vuelva a leerse corrida.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ invitadoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { invitadoId } = await params;
  const existente = await prisma.showInvitado.findUnique({
    where: { id: invitadoId },
    select: { id: true, showId: true, nombre: true, _count: { select: { canales: true } } },
  });
  if (!existente) return NextResponse.json({ error: "El invitado no existe" }, { status: 404 });

  await prisma.showInvitado.delete({ where: { id: invitadoId } });
  await renumerarCola(existente.showId, "INPUT");
  await renumerarCola(existente.showId, "OUTPUT");

  await logActividad(
    session.id,
    "ELIMINAR",
    "ShowInvitado",
    invitadoId,
    `Quitó a «${existente.nombre}» del show`,
    { showId: existente.showId, canales: existente._count.canales },
  );

  return NextResponse.json({ ok: true });
}
