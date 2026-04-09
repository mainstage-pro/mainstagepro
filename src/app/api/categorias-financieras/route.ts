import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const categorias = await prisma.categoriaFinanciera.findMany({
    orderBy: [{ tipo: "asc" }, { orden: "asc" }, { nombre: "asc" }],
  });

  return NextResponse.json({ categorias });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, tipo, orden } = body;

  if (!nombre || !tipo) return NextResponse.json({ error: "Nombre y tipo requeridos" }, { status: 400 });

  const categoria = await prisma.categoriaFinanciera.create({
    data: { nombre, tipo, orden: orden ?? 0 },
  });

  return NextResponse.json({ categoria });
}
