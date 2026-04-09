import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes"); // "2026-04"

  const where = mes
    ? {
        fecha: {
          gte: new Date(`${mes}-01`),
          lt: new Date(new Date(`${mes}-01`).setMonth(new Date(`${mes}-01`).getMonth() + 1)),
        },
      }
    : {};

  const publicaciones = await prisma.publicacion.findMany({
    where,
    include: { tipo: { select: { id: true, nombre: true, formato: true } } },
    orderBy: { fecha: "asc" },
  });
  return NextResponse.json({ publicaciones });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const {
    fecha, tipoId, formato, objetivo, descripcion, copy,
    enFacebook, enInstagram, enTiktok, enYoutube,
    materialLink, colaboradores, estado, comentarios,
  } = body;

  if (!fecha) return NextResponse.json({ error: "Fecha requerida" }, { status: 400 });

  const pub = await prisma.publicacion.create({
    data: {
      fecha: new Date(fecha),
      tipoId: tipoId || null,
      formato: formato || null,
      objetivo: objetivo || null,
      descripcion: descripcion || null,
      copy: copy || null,
      enFacebook: enFacebook ?? false,
      enInstagram: enInstagram ?? false,
      enTiktok: enTiktok ?? false,
      enYoutube: enYoutube ?? false,
      materialLink: materialLink || null,
      colaboradores: colaboradores || null,
      estado: estado ?? "PENDIENTE",
      comentarios: comentarios || null,
    },
    include: { tipo: { select: { id: true, nombre: true, formato: true } } },
  });
  return NextResponse.json({ publicacion: pub }, { status: 201 });
}
