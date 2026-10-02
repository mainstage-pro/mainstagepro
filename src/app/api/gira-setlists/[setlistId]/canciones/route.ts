import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/// Una canción al final del setlist. El orden es el del show, así que se numera
/// de 10 en 10 para poder meter un encore sin renumerar todo.
export async function POST(req: NextRequest, { params }: { params: Promise<{ setlistId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { setlistId } = await params;
  const setlist = await prisma.giraSetlist.findUnique({ where: { id: setlistId }, select: { id: true } });
  if (!setlist) return NextResponse.json({ error: "El setlist no existe" }, { status: 404 });

  const body = await req.json();
  const titulo = typeof body.titulo === "string" && body.titulo.trim() ? body.titulo.trim() : "Sin título";

  const max = await prisma.giraSetlistCancion.aggregate({ where: { setlistId }, _max: { orden: true } });

  const cancion = await prisma.giraSetlistCancion.create({
    data: {
      setlistId,
      titulo,
      orden: (max._max.orden ?? 0) + 10,
      tonalidad: typeof body.tonalidad === "string" && body.tonalidad.trim() ? body.tonalidad.trim() : null,
      conTrack: !!body.conTrack,
    },
  });

  return NextResponse.json({ cancion });
}
