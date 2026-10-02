import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { INCLUDE_SETLIST } from "@/lib/logistica-gira";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ setlistId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { setlistId } = await params;
  const setlist = await prisma.giraSetlist.findUnique({ where: { id: setlistId }, include: INCLUDE_SETLIST });
  if (!setlist) return NextResponse.json({ error: "El setlist no existe" }, { status: 404 });

  return NextResponse.json({ setlist });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ setlistId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { setlistId } = await params;
  const existente = await prisma.giraSetlist.findUnique({
    where: { id: setlistId },
    select: { id: true, giraId: true, showId: true },
  });
  if (!existente) return NextResponse.json({ error: "El setlist no existe" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("nombre" in body) {
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    if (!nombre) return NextResponse.json({ error: "El setlist necesita nombre" }, { status: 400 });
    data.nombre = nombre;
  }

  if ("notas" in body) {
    data.notas = typeof body.notas === "string" && body.notas.trim() ? body.notas.trim() : null;
  }

  if ("duracionMin" in body) {
    const n = Number(body.duracionMin);
    data.duracionMin = body.duracionMin === null || body.duracionMin === "" || !Number.isFinite(n) ? null : Math.trunc(n);
  }

  // Solo el setlist de toda la gira puede ser el base; el de una plaza es variante.
  if ("esBase" in body) {
    const esBase = !!body.esBase && !existente.showId;
    if (esBase) {
      await prisma.giraSetlist.updateMany({
        where: { giraId: existente.giraId, esBase: true, id: { not: setlistId } },
        data: { esBase: false },
      });
    }
    data.esBase = esBase;
  }

  if (!Object.keys(data).length) return NextResponse.json({ error: "Nada por actualizar" }, { status: 400 });

  const setlist = await prisma.giraSetlist.update({ where: { id: setlistId }, data, include: INCLUDE_SETLIST });
  return NextResponse.json({ setlist });
}

/// GiraSetlist no tiene bandera `activo`: se borra con sus canciones en cascada.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ setlistId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { setlistId } = await params;
  const existente = await prisma.giraSetlist.findUnique({
    where: { id: setlistId },
    select: { id: true, giraId: true, nombre: true, _count: { select: { canciones: true } } },
  });
  if (!existente) return NextResponse.json({ error: "El setlist no existe" }, { status: 404 });

  await prisma.giraSetlist.delete({ where: { id: setlistId } });

  await logActividad(
    session.id,
    "ELIMINAR",
    "GiraSetlist",
    setlistId,
    `Quitó el setlist «${existente.nombre}» (${existente._count.canciones} canciones)`,
    { giraId: existente.giraId },
  );

  return NextResponse.json({ ok: true });
}
