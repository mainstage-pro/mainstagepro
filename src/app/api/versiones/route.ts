import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const entidad = req.nextUrl.searchParams.get("entidad");
  const entidadId = req.nextUrl.searchParams.get("entidadId");
  if (!entidad || !entidadId) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  try {
    const versiones = await prisma.versionHistorial.findMany({
      where: { entidad, entidadId },
      include: { usuario: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json({ versiones });
  } catch { return NextResponse.json({ versiones: [] }); }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const body = await req.json();
    const { entidad, entidadId, snapshot, nota } = body;
    if (!entidad || !entidadId || !snapshot) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    const version = await prisma.versionHistorial.create({
      data: { entidad, entidadId, userId: session.id, snapshot: JSON.stringify(snapshot), nota: nota ?? null },
    });
    return NextResponse.json({ version });
  } catch { return NextResponse.json({ error: "Error al guardar versión" }, { status: 500 }); }
}
