import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import {
  SELECT_CANAL,
  esSoporte,
  esTipoCanal,
  esTipoSalida,
  listasDelShow,
  riderMaestroDelShow,
  siguienteNumero,
} from "@/lib/show-canales";

/// La lista real de la fecha: el input y output list del rider maestro más lo que
/// esta fecha agregó, en una sola secuencia numerada. El rider es solo lectura.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { showId } = await params;
  const show = await prisma.giraShow.findUnique({ where: { id: showId }, select: { id: true } });
  if (!show) return NextResponse.json({ error: "El show no existe" }, { status: 404 });

  return NextResponse.json({ listas: await listasDelShow(showId) });
}

function texto(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * Un canal a mano: lo que se agregó en plaza y no cae en la lista corta de
 * requerimientos (el talkback del road manager, el shout del DJ). Puede o no
 * colgar de un invitado.
 *
 * El número no se acepta del cliente — lo pone el servidor a continuación del
 * rider maestro.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
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

  const nombre = texto(body.nombre);
  if (!nombre) return NextResponse.json({ error: "El canal necesita un nombre" }, { status: 400 });

  // Un canal puede colgar de un invitado, pero solo de uno de ESTE show: con el
  // id de otra fecha la cascada borraría un canal que no le toca.
  let invitadoId: string | null = null;
  if (texto(body.invitadoId)) {
    const inv = await prisma.showInvitado.findFirst({
      where: { id: String(body.invitadoId), showId },
      select: { id: true },
    });
    if (!inv) return NextResponse.json({ error: "Ese invitado no es de este show" }, { status: 400 });
    invitadoId = inv.id;
  }

  if ("soporte" in body && body.soporte && !esSoporte(body.soporte)) {
    return NextResponse.json({ error: "Ese soporte no existe" }, { status: 400 });
  }
  if ("tipoSalida" in body && body.tipoSalida && !esTipoSalida(body.tipoSalida)) {
    return NextResponse.json({ error: "Ese tipo de salida no existe" }, { status: 400 });
  }

  const [rider, delShow, max] = await Promise.all([
    riderMaestroDelShow(showId),
    prisma.showCanal.findMany({ where: { showId }, select: { tipo: true, numero: true, estereo: true } }),
    prisma.showCanal.aggregate({ where: { showId }, _max: { orden: true } }),
  ]);

  const numero = siguienteNumero(tipo, rider?.canales ?? [], delShow);

  const canal = await prisma.showCanal.create({
    data: {
      showId,
      invitadoId,
      tipo,
      numero,
      nombre,
      instrumento: tipo === "INPUT" ? texto(body.instrumento) : null,
      microfono: tipo === "INPUT" ? texto(body.microfono) : null,
      soporte: tipo === "INPUT" && esSoporte(body.soporte) ? String(body.soporte) : null,
      phantom: tipo === "INPUT" ? body.phantom === true : false,
      tipoSalida: tipo === "OUTPUT" && esTipoSalida(body.tipoSalida) ? String(body.tipoSalida) : null,
      estereo: tipo === "OUTPUT" ? body.estereo === true : false,
      notas: texto(body.notas),
      orden: (max._max.orden ?? 0) + 10,
    },
    select: SELECT_CANAL,
  });

  await logActividad(
    session.id,
    "CREAR",
    "ShowCanal",
    canal.id,
    `Agregó ${tipo === "INPUT" ? "la entrada" : "la salida"} ${numero} «${nombre}» a esta fecha`,
    { showId, invitadoId },
  );

  return NextResponse.json({ canal, listas: await listasDelShow(showId) });
}
