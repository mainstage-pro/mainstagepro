import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/capacitacion/[id]/versiones/[vid] — Lazy-load HTML for a specific version
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, vid } = await params;

  const version = await prisma.versionPresentacion.findFirst({
    where: { id: vid, sesionId: id },
    select: { id: true, version: true, htmlContent: true, generadaEn: true, notasSnapshot: true, puntosSnapshot: true },
  });

  if (!version) return NextResponse.json({ error: "Versión no encontrada" }, { status: 404 });

  return NextResponse.json(version);
}

// PATCH /api/capacitacion/[id]/versiones/[vid] — Save inline edits from the browser
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, vid } = await params;
  const body = await req.json() as { htmlContent: string };

  if (!body.htmlContent) {
    return NextResponse.json({ error: "htmlContent requerido" }, { status: 400 });
  }

  const version = await prisma.versionPresentacion.findFirst({
    where: { id: vid, sesionId: id },
    select: { id: true },
  });
  if (!version) return NextResponse.json({ error: "Versión no encontrada" }, { status: 404 });

  await prisma.versionPresentacion.update({
    where: { id: vid },
    data: { htmlContent: body.htmlContent },
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/capacitacion/[id]/versiones/[vid] — Remove a specific version
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, vid } = await params;

  const version = await prisma.versionPresentacion.findFirst({
    where: { id: vid, sesionId: id },
    select: { id: true },
  });

  if (!version) return NextResponse.json({ error: "Versión no encontrada" }, { status: 404 });

  await prisma.versionPresentacion.delete({ where: { id: vid } });

  // If no more versions exist, revert session estado to "en-preparacion"
  const remaining = await prisma.versionPresentacion.count({ where: { sesionId: id } });
  if (remaining === 0) {
    await prisma.sesionCapacitacion.update({
      where: { id },
      data: { estado: "en-preparacion" },
    });
  }

  return NextResponse.json({ ok: true, remaining });
}
