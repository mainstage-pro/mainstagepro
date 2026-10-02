// Descarga con sesión de los documentos de gira (rider y listas de canales).
//
// Los documentos de show no salen por aquí: necesitan fecha y foro, y viven en
// /api/gira-shows/[showId]/documentos/[documento].

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DOCUMENTOS_GIRA, esSlugDocGira, generarDocDeGira, respuestaPdf } from "@/lib/pdf-gira";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; documento: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, documento } = await params;
  if (!esSlugDocGira(documento)) {
    return NextResponse.json({ error: "Ese documento no existe" }, { status: 404 });
  }
  if (DOCUMENTOS_GIRA[documento].ambito === "SHOW") {
    return NextResponse.json({ error: "Ese documento se emite desde un show, no desde la gira" }, { status: 400 });
  }

  const gira = await prisma.gira.findUnique({ where: { id }, select: { id: true } });
  if (!gira) return NextResponse.json({ error: "La gira no existe" }, { status: 404 });

  const pdf = await generarDocDeGira(documento, id);
  if (!pdf) {
    return NextResponse.json(
      { error: "La gira no tiene un rider técnico capturado: engancha uno para poder emitir este documento" },
      { status: 409 },
    );
  }

  return respuestaPdf(pdf, req.nextUrl.searchParams.get("inline") === "1");
}
