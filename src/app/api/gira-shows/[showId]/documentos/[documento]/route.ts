// Descarga con sesión de los documentos de un show.
//
// Mismo generador que el enlace público, única diferencia el
// Content-Disposition: adentro se descarga, afuera se ve en línea.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DOCUMENTOS_GIRA, esSlugDocGira, generarDocDeShow, respuestaPdf } from "@/lib/pdf-gira";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ showId: string; documento: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { showId, documento } = await params;
  if (!esSlugDocGira(documento)) {
    return NextResponse.json({ error: "Ese documento no existe" }, { status: 404 });
  }

  const show = await prisma.giraShow.findUnique({ where: { id: showId }, select: { giraId: true } });
  if (!show) return NextResponse.json({ error: "El show no existe" }, { status: 404 });

  const pdf = await generarDocDeShow(documento, showId, show.giraId);
  if (!pdf) {
    return NextResponse.json(
      { error: `Todavía no hay información para armar el ${DOCUMENTOS_GIRA[documento].label.toLowerCase()}` },
      { status: 409 },
    );
  }

  return respuestaPdf(pdf, req.nextUrl.searchParams.get("inline") === "1");
}
