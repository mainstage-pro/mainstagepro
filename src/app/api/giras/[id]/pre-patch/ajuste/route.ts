import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { camposDePuerto, listasPrePatchDelShow } from "@/lib/pre-patch";

/**
 * Meterse con un puerto de la interfaz SOLO en esta fecha.
 *
 * La interfaz es la misma toda la gira y cambiar su pre-patch desde una plaza lo
 * movería en todas, así que lo que esta fecha quiere distinto nace como ajuste:
 * un renglón colgado del puerto de la gira que sustituye. Borrar el ajuste
 * (DELETE del renglón) regresa el puerto a como lo dice la gira.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const showId = typeof body.showId === "string" ? body.showId : "";
  const baseId = typeof body.baseId === "string" ? body.baseId : "";
  if (!showId || !baseId) return NextResponse.json({ error: "Falta la fecha o el puerto" }, { status: 400 });

  const show = await prisma.giraShow.findFirst({ where: { id: showId, giraId: id }, select: { id: true } });
  if (!show) return NextResponse.json({ error: "Esa fecha no es de esta gira" }, { status: 400 });

  // El puerto tiene que ser de la base de ESTA gira: el ajuste de un puerto de
  // otra lista no se parcharía nunca.
  const base = await prisma.prePatchCanal.findFirst({
    where: { id: baseId, giraId: id, showId: null },
    select: { id: true, tipo: true, nombre: true, notas: true, orden: true },
  });
  if (!base) return NextResponse.json({ error: "Ese puerto no es del pre-patch de esta gira" }, { status: 400 });

  const campos = camposDePuerto(body);
  if ("error" in campos) return NextResponse.json({ error: campos.error }, { status: 400 });

  const oculto = "oculto" in body ? body.oculto === true : undefined;
  if (!Object.keys(campos.data).length && oculto === undefined) {
    return NextResponse.json({ error: "Nada por ajustar" }, { status: 400 });
  }

  const existente = await prisma.prePatchCanal.findUnique({
    where: { showId_baseId: { showId, baseId } },
    select: { id: true },
  });

  const ajuste = existente
    ? await prisma.prePatchCanal.update({
        where: { id: existente.id },
        data: { ...campos.data, ...(oculto === undefined ? {} : { oculto }) },
        select: { id: true },
      })
    : await prisma.prePatchCanal.create({
        // El ajuste nace como copia del puerto de la gira y encima lo que se
        // acaba de capturar: así la fila no se vacía al tocar una sola celda.
        data: {
          giraId: id,
          showId,
          baseId,
          oculto: oculto === true,
          tipo: base.tipo,
          nombre: base.nombre,
          notas: base.notas,
          orden: base.orden,
          ...campos.data,
        },
        select: { id: true },
      });

  await logActividad(
    session.id,
    existente ? "ACTUALIZAR" : "CREAR",
    "PrePatchCanal",
    ajuste.id,
    oculto === true
      ? `Sacó «${base.nombre}» del pre-patch solo en esta fecha`
      : oculto === false
        ? `Regresó «${base.nombre}» al pre-patch de esta fecha`
        : `Ajustó «${base.nombre}» del pre-patch solo en esta fecha`,
    { giraId: id, showId, baseId },
  );

  return NextResponse.json({ listas: await listasPrePatchDelShow(showId, id) });
}
