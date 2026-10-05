// Descarga con sesión de los documentos de gira (libro, rider, listas de
// canales y setlist).
//
// Los documentos de show no salen por aquí: necesitan fecha y foro, y viven en
// /api/gira-shows/[showId]/documentos/[documento].

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DOCUMENTOS_GIRA, esSlugDocGira, generarDocDeGira, respuestaPdf, type DocumentoGira } from "@/lib/pdf-gira";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; documento: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, documento } = await params;
  if (!esSlugDocGira(documento)) {
    return NextResponse.json({ error: "Ese documento no existe" }, { status: 404 });
  }
  const doc: DocumentoGira = DOCUMENTOS_GIRA[documento];
  if (doc.ambito === "SHOW") {
    return NextResponse.json({ error: "Ese documento se emite desde un show" }, { status: 400 });
  }

  const gira = await prisma.gira.findUnique({ where: { id }, select: { id: true } });
  if (!gira) return NextResponse.json({ error: "El show o la gira no existe" }, { status: 404 });

  const pdf = await generarDocDeGira(documento, id, req.nextUrl.searchParams.get("secciones"));
  if (!pdf) {
    return NextResponse.json(
      {
        error: `No se pudo armar el ${doc.label.toLowerCase()}: falta capturar ${doc.falta ?? "la información que lo alimenta"}`,
      },
      { status: 409 },
    );
  }

  return respuestaPdf(pdf, req.nextUrl.searchParams.get("inline") === "1");
}
