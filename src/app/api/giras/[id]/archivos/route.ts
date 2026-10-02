// Archivero de la gira: lo que llega de afuera y hay que tener a mano.
//
// El rider de la casa, el contrato, el plano del foro, la input list que mandó
// el ingeniero local. Un archivo puede colgar de la gira completa o de un show
// (`showId`): el rider de la casa es de un foro, el contrato es de la gira.
//
// El binario NO pasa por aquí: sube del navegador directo a Vercel Blob con
// /api/upload/token y este endpoint solo registra la metadata. Así no choca con
// el límite de 4.5 MB de las funciones y un plano de 30 MB entra sin problema.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { TIPOS_ARCHIVO_GIRA } from "@/lib/giras";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const showId = req.nextUrl.searchParams.get("showId");

  const archivos = await prisma.giraArchivo.findMany({
    where: { giraId: id, ...(showId ? { showId } : {}) },
    orderBy: { createdAt: "desc" },
    include: { show: { select: { id: true, fecha: true, ciudad: true } } },
  });

  return NextResponse.json({ archivos });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const gira = await prisma.gira.findUnique({ where: { id }, select: { id: true, nombre: true } });
  if (!gira) return NextResponse.json({ error: "La gira no existe" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.url !== "string" || !body.url.trim()) {
    return NextResponse.json({ error: "Falta la URL del archivo" }, { status: 400 });
  }

  const url = body.url.trim();
  const nombre =
    typeof body.nombre === "string" && body.nombre.trim()
      ? body.nombre.trim()
      : (url.split("/").pop() || "archivo");

  const tipo = typeof body.tipo === "string" && TIPOS_ARCHIVO_GIRA.includes(body.tipo as never) ? body.tipo : "OTRO";

  const tamanoBytes =
    typeof body.tamanoBytes === "number" && Number.isFinite(body.tamanoBytes) && body.tamanoBytes > 0
      ? Math.round(body.tamanoBytes)
      : null;

  // Si el archivo se cuelga de un show, tiene que ser de esta gira: si no,
  // aparecería en el archivero de otro artista.
  let showId: string | null = null;
  if (typeof body.showId === "string" && body.showId) {
    const show = await prisma.giraShow.findUnique({ where: { id: body.showId }, select: { giraId: true } });
    if (!show || show.giraId !== id) {
      return NextResponse.json({ error: "El show no es de esta gira" }, { status: 400 });
    }
    showId = body.showId;
  }

  const archivo = await prisma.giraArchivo.create({
    data: { giraId: id, showId, nombre, url, tipo, tamanoBytes, subidoPor: session.id },
    include: { show: { select: { id: true, fecha: true, ciudad: true } } },
  });

  await logActividad(
    session.id,
    "CREAR",
    "GiraArchivo",
    archivo.id,
    `Subió "${nombre}" al archivero de la gira ${gira.nombre}`,
    { tipo, showId },
  );

  return NextResponse.json({ archivo });
}
