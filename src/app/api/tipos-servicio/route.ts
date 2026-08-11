import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tipos = await prisma.tipoServicio.findMany({
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    include: { fotos: { orderBy: [{ orden: "asc" }, { createdAt: "asc" }] } },
  });

  return NextResponse.json({ tipos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, emoji, subtitulo, descripcion, orden } = body;

  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const slug = body.slug ? slugify(body.slug) : slugify(nombre);
  const existe = await prisma.tipoServicio.findUnique({ where: { slug } });
  if (existe) return NextResponse.json({ error: "Ya existe un servicio con ese identificador" }, { status: 409 });

  const tipo = await prisma.tipoServicio.create({
    data: {
      slug,
      nombre,
      emoji: emoji ?? null,
      subtitulo: subtitulo ?? null,
      descripcion: descripcion ?? null,
      orden: orden ?? 0,
    },
    include: { fotos: true },
  });

  return NextResponse.json({ tipo }, { status: 201 });
}
