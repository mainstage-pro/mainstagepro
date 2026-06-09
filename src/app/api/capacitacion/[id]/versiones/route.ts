import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * POST /api/capacitacion/[id]/versiones
 * Saves a generated HTML presentation version to the DB.
 * Called by the client AFTER the Edge streaming route completes.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { htmlContent, notasSnapshot, puntosSnapshot } = body as {
    htmlContent: string;
    notasSnapshot: string | null;
    puntosSnapshot: string[];
  };

  if (!htmlContent) {
    return NextResponse.json({ error: "htmlContent requerido" }, { status: 400 });
  }

  // Determine next version number
  const latest = await prisma.versionPresentacion.findFirst({
    where: { sesionId: id },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  const version = await prisma.versionPresentacion.create({
    data: {
      sesionId: id,
      version: nextVersion,
      htmlContent,
      notasSnapshot: notasSnapshot ?? null,
      puntosSnapshot: puntosSnapshot ?? [],
      generadaPor: session.name ?? "Mauricio Hernández",
    },
  });

  // Mark session as "lista"
  await prisma.sesionCapacitacion.update({
    where: { id },
    data: { estado: "lista" },
  });

  return NextResponse.json({
    versionId: version.id,
    version: version.version,
    generadaEn: version.generadaEn.toISOString(),
  });
}
