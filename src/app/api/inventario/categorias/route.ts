import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const categorias = await prisma.categoriaEquipo.findMany({
    orderBy: { orden: "asc" },
    include: { _count: { select: { equipos: true } } },
  });

  return NextResponse.json({ categorias });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, orden } = body;

  if (!nombre?.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  }

  // Calcular orden si no se proporciona
  let finalOrden = orden;
  if (finalOrden === undefined || finalOrden === null) {
    const last = await prisma.categoriaEquipo.findFirst({ orderBy: { orden: "desc" } });
    finalOrden = (last?.orden ?? 0) + 1;
  }

  try {
    const categoria = await prisma.categoriaEquipo.create({
      data: { nombre: nombre.trim(), orden: finalOrden },
    });
    return NextResponse.json({ categoria }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ya existe una categoría con ese nombre" }, { status: 409 });
  }
}
