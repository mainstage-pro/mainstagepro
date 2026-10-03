// Descarga del paquete técnico directo desde el rider del artista, sin pasar
// por una gira.
//
// El rider se negocia antes de que exista una fecha: el booker lo pide para
// cotizar y el ingeniero de la casa lo pide para parchar. Obligar a crear una
// gira para poder emitirlo convertía el documento en rehén del pipeline.
//
// Son los mismos generadores que usa la gira, así que el PDF es idéntico; lo
// único que cambia es que el hero no trae nombre de gira.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { respuestaPdf } from "@/lib/pdf-gira";
import { generarListaCanales, generarRiderArtista } from "@/lib/pdf-gira/rider";

/// Solo los documentos que salen del rider maestro. El day sheet y el advance
/// necesitan fecha y foro, y el libro necesita una gira.
const DOCS_RIDER = {
  rider: generarRiderArtista,
  "input-list": generarListaCanales,
} as const;

type SlugRider = keyof typeof DOCS_RIDER;

const esSlugRider = (s: string): s is SlugRider => s in DOCS_RIDER;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ riderId: string; documento: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { riderId, documento } = await params;
  if (!esSlugRider(documento)) {
    return NextResponse.json({ error: "Ese documento no se emite desde un rider" }, { status: 404 });
  }

  const rider = await prisma.artistaRider.findFirst({
    where: { id: riderId, activo: true },
    select: { id: true },
  });
  if (!rider) return NextResponse.json({ error: "Ese rider no existe" }, { status: 404 });

  const pdf = await DOCS_RIDER[documento](riderId, null);
  if (!pdf) return NextResponse.json({ error: "No se pudo armar el documento" }, { status: 409 });

  return respuestaPdf(pdf, req.nextUrl.searchParams.get("inline") === "1");
}
