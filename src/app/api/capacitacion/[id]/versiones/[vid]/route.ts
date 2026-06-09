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
