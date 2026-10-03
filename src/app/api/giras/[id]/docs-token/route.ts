// Enlace público de la gira completa (/gira-doc/{token}/rider).
//
// Reusa `Gira.portalToken`: es el token con el que la gira se comparte hacia
// afuera, y los documentos que no dependen de una fecha (rider, listas de
// canales) cuelgan de él. Cada show tiene además su propio token.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { createExpiringToken } from "@/lib/tokens";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const gira = await prisma.gira.findUnique({ where: { id }, select: { id: true, nombre: true } });
  if (!gira) return NextResponse.json({ error: "El show o la gira no existe" }, { status: 404 });

  const actualizada = await prisma.gira.update({
    where: { id },
    data: { portalToken: createExpiringToken(180) },
    select: { portalToken: true },
  });

  await logActividad(
    session.id,
    "COMPARTIR",
    "Gira",
    id,
    `Generó el enlace público de documentos de la gira ${gira.nombre}`,
  );

  return NextResponse.json({ token: actualizada.portalToken });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const gira = await prisma.gira.findUnique({ where: { id }, select: { id: true, nombre: true } });
  if (!gira) return NextResponse.json({ error: "El show o la gira no existe" }, { status: 404 });

  await prisma.gira.update({ where: { id }, data: { portalToken: null } });

  await logActividad(
    session.id,
    "COMPARTIR",
    "Gira",
    id,
    `Revocó el enlace público de documentos de la gira ${gira.nombre}`,
  );

  return NextResponse.json({ ok: true });
}
