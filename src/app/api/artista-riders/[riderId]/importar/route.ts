// Traer la input list o la output list de otro rider del mismo artista.
//
// El rider de festival y el de tour casi nunca comparten el equipo, pero sí
// comparten los canales: el baterista micro-fonea igual en los dos. Clonar el
// rider completo para quedarse solo con los canales obliga a borrar media ficha,
// así que la importación es por lista.
//
// Reemplaza la lista destino completa: importar sobre renglones a medias dejaría
// numeración duplicada y nadie sabría cuáles eran suyos.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Tipo = "INPUT" | "OUTPUT";

export async function POST(req: NextRequest, { params }: { params: Promise<{ riderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { riderId } = await params;
  const body = await req.json().catch(() => ({}));

  const tipo: Tipo | null = body.tipo === "INPUT" || body.tipo === "OUTPUT" ? body.tipo : null;
  if (!tipo) return NextResponse.json({ error: "tipo debe ser INPUT u OUTPUT" }, { status: 400 });

  const destino = await prisma.artistaRider.findUnique({
    where: { id: riderId },
    select: { id: true, artistaId: true },
  });
  if (!destino) return NextResponse.json({ error: "Rider no encontrado" }, { status: 404 });

  const desdeId = typeof body.desdeRiderId === "string" ? body.desdeRiderId : "";
  if (!desdeId || desdeId === riderId) {
    return NextResponse.json({ error: "Elige de cuál rider se copia" }, { status: 400 });
  }

  // Solo del mismo artista: las personas a las que apuntan los mixes son suyas.
  const origen = await prisma.artistaRider.findFirst({
    where: { id: desdeId, artistaId: destino.artistaId },
    select: { id: true, nombre: true, version: true },
  });
  if (!origen) return NextResponse.json({ error: "Ese rider no es del mismo artista" }, { status: 400 });

  const canales = await prisma.artistaRiderCanal.findMany({
    where: { riderId: origen.id, tipo },
    orderBy: { numero: "asc" },
  });
  if (canales.length === 0) {
    return NextResponse.json({ error: `«${origen.nombre}» no tiene esa lista capturada` }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.artistaRiderCanal.deleteMany({ where: { riderId, tipo } });
    await tx.artistaRiderCanal.createMany({
      data: canales.map((c) => ({
        riderId,
        tipo: c.tipo,
        numero: c.numero,
        nombre: c.nombre,
        instrumento: c.instrumento,
        microfono: c.microfono,
        alternativas: c.alternativas,
        soporte: c.soporte,
        phantom: c.phantom,
        inserto: c.inserto,
        tipoSalida: c.tipoSalida,
        estereo: c.estereo,
        personaId: c.personaId,
        notas: c.notas,
      })),
    });
  });

  const nuevos = await prisma.artistaRiderCanal.findMany({
    where: { riderId, tipo },
    orderBy: { numero: "asc" },
  });

  return NextResponse.json({ canales: nuevos, desde: origen.nombre });
}
