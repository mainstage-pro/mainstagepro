import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * POST /api/tipos-evento/ensure
 *
 * Devuelve el id del tipo de evento con el `slug` dado, creándolo si no existe.
 * Lo usa el editor inline de la galería en las presentaciones: cuando un admin
 * sube la primera foto de un tipo que aún no tiene fila, la crea al vuelo.
 *
 * Body: { slug, nombre? }  Respuesta: { id }
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { slug, nombre } = await req.json();
  if (!slug) return NextResponse.json({ error: "slug requerido" }, { status: 400 });

  const existente = await prisma.tipoEvento.findUnique({ where: { slug } });
  if (existente) return NextResponse.json({ id: existente.id });

  const creado = await prisma.tipoEvento.create({
    data: { slug, nombre: nombre || slug, orden: 0 },
    select: { id: true },
  });

  return NextResponse.json({ id: creado.id }, { status: 201 });
}
