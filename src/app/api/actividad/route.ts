import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const userId = req.nextUrl.searchParams.get("userId");
  const take = parseInt(req.nextUrl.searchParams.get("take") ?? "50");
  const where = userId ? { userId } : {};
  try {
    const actividades = await prisma.actividadUsuario.findMany({
      where,
      include: { usuario: { select: { name: true, area: true } } },
      orderBy: { createdAt: "desc" },
      take,
    });
    return NextResponse.json({ actividades });
  } catch { return NextResponse.json({ actividades: [] }); }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const body = await req.json();
    const { accion, entidad, entidadId, descripcion, datos } = body;
    if (!accion || !entidad || !descripcion) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    const actividad = await prisma.actividadUsuario.create({
      data: { userId: session.id, accion, entidad, entidadId: entidadId ?? null, descripcion, datos: datos ? JSON.stringify(datos) : null },
    });
    return NextResponse.json({ actividad });
  } catch { return NextResponse.json({ error: "Error al registrar actividad" }, { status: 500 }); }
}
