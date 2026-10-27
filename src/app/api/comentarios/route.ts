import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { extraerMenciones, mencionesATexto, ENTIDAD_HREF, type EntidadComentario } from "@/lib/comentarios";

const ENTIDADES_VALIDAS: EntidadComentario[] = ["TRATO", "PROYECTO", "COTIZACION", "CLIENTE", "EQUIPO"];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const entidad = req.nextUrl.searchParams.get("entidad") as EntidadComentario | null;
  const entidadId = req.nextUrl.searchParams.get("entidadId");
  if (!entidad || !entidadId || !ENTIDADES_VALIDAS.includes(entidad)) {
    return NextResponse.json({ error: "Faltan entidad/entidadId válidos" }, { status: 400 });
  }

  const comentarios = await prisma.comentario.findMany({
    where: { entidad, entidadId },
    include: { autor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ comentarios });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const entidad = body.entidad as EntidadComentario;
  const entidadId = body.entidadId as string;
  const contenido = (body.contenido ?? "").trim();
  if (!entidad || !entidadId || !ENTIDADES_VALIDAS.includes(entidad)) {
    return NextResponse.json({ error: "Faltan entidad/entidadId válidos" }, { status: 400 });
  }
  if (!contenido) return NextResponse.json({ error: "El comentario está vacío" }, { status: 400 });

  const comentario = await prisma.comentario.create({
    data: { entidad, entidadId, contenido, autorId: session.id },
    include: { autor: { select: { id: true, name: true } } },
  });

  const mencionados = extraerMenciones(contenido).filter((id) => id !== session.id);
  if (mencionados.length > 0) {
    await prisma.notificacion.createMany({
      data: mencionados.map((usuarioId) => ({
        usuarioId,
        tipo: "MENCION",
        titulo: `${session.name} te mencionó`,
        mensaje: mencionesATexto(contenido).slice(0, 180),
        url: ENTIDAD_HREF[entidad](entidadId),
      })),
    });
  }

  return NextResponse.json({ comentario });
}
