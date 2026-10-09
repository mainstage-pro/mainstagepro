import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { camposDePuerto, listasDelAlcance } from "@/lib/pre-patch";

/// Edita un puerto del pre-patch. El alcance lo dice el renglón mismo: uno de la
/// gira vale para todas las fechas, uno con fecha (propio o ajuste) solo ahí.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ canalId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { canalId } = await params;
  const puerto = await prisma.prePatchCanal.findUnique({
    where: { id: canalId },
    select: { id: true, giraId: true, showId: true, baseId: true, nombre: true },
  });
  if (!puerto) return NextResponse.json({ error: "Ese puerto no existe" }, { status: 404 });

  const body = await req.json();
  const campos = camposDePuerto(body);
  if ("error" in campos) return NextResponse.json({ error: campos.error }, { status: 400 });

  const oculto = "oculto" in body && puerto.baseId ? body.oculto === true : undefined;
  if (!Object.keys(campos.data).length && oculto === undefined) {
    return NextResponse.json({ error: "Nada por actualizar" }, { status: 400 });
  }

  await prisma.prePatchCanal.update({
    where: { id: canalId },
    data: { ...campos.data, ...(oculto === undefined ? {} : { oculto }) },
  });

  await logActividad(
    session.id,
    "ACTUALIZAR",
    "PrePatchCanal",
    canalId,
    `Cambió «${puerto.nombre}» del pre-patch de la interfaz${puerto.showId ? " en esta fecha" : " de la gira"}`,
    { giraId: puerto.giraId, showId: puerto.showId },
  );

  return NextResponse.json({ listas: await listasDelAlcance(puerto.giraId, puerto.showId) });
}

/**
 * Borra el renglón.
 *
 * En un puerto de la gira se lo lleva de todas las fechas, junto con los ajustes
 * que colgaran de él. En un puerto propio de una fecha lo quita de esa plaza. En
 * un ajuste es devolver el puerto a como lo dice la gira.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ canalId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { canalId } = await params;
  const puerto = await prisma.prePatchCanal.findUnique({
    where: { id: canalId },
    select: { id: true, giraId: true, showId: true, baseId: true, nombre: true },
  });
  if (!puerto) return NextResponse.json({ error: "Ese puerto no existe" }, { status: 404 });

  await prisma.prePatchCanal.delete({ where: { id: canalId } });

  await logActividad(
    session.id,
    "ELIMINAR",
    "PrePatchCanal",
    canalId,
    puerto.baseId
      ? `Dejó «${puerto.nombre}» del pre-patch como lo dice la gira`
      : `Quitó «${puerto.nombre}» del pre-patch${puerto.showId ? " de esta fecha" : " de la gira"}`,
    { giraId: puerto.giraId, showId: puerto.showId },
  );

  return NextResponse.json({ listas: await listasDelAlcance(puerto.giraId, puerto.showId) });
}
