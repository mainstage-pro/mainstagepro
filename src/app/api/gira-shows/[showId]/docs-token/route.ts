// Enlace público de los documentos de un show (/gira-doc/{token}/day-sheet).
//
// Es el enlace que se le pasa al crew y al promotor: abre el day sheet, el
// advance y también el rider de la gira, porque quien está en el show necesita
// los cuatro y no se le van a mandar dos ligas distintas.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { createExpiringToken } from "@/lib/tokens";
import { fmtFechaCorta } from "@/lib/giras";

async function leerShow(showId: string) {
  return prisma.giraShow.findUnique({
    where: { id: showId },
    select: { id: true, fecha: true, ciudad: true, gira: { select: { nombre: true } } },
  });
}

function etiqueta(show: NonNullable<Awaited<ReturnType<typeof leerShow>>>): string {
  return [show.ciudad, fmtFechaCorta(show.fecha)].filter(Boolean).join(" · ");
}

export async function POST(_req: Request, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { showId } = await params;
  const show = await leerShow(showId);
  if (!show) return NextResponse.json({ error: "El show no existe" }, { status: 404 });

  const actualizado = await prisma.giraShow.update({
    where: { id: showId },
    data: { docsToken: createExpiringToken(180) },
    select: { docsToken: true },
  });

  await logActividad(
    session.id,
    "COMPARTIR",
    "GiraShow",
    showId,
    `Generó el enlace público de documentos del show ${etiqueta(show)} (${show.gira.nombre})`,
  );

  return NextResponse.json({ token: actualizado.docsToken });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { showId } = await params;
  const show = await leerShow(showId);
  if (!show) return NextResponse.json({ error: "El show no existe" }, { status: 404 });

  await prisma.giraShow.update({ where: { id: showId }, data: { docsToken: null } });

  await logActividad(
    session.id,
    "COMPARTIR",
    "GiraShow",
    showId,
    `Revocó el enlace público de documentos del show ${etiqueta(show)} (${show.gira.nombre})`,
  );

  return NextResponse.json({ ok: true });
}
