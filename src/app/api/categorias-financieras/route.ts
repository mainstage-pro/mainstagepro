import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function ensureDescripcion() {
  await prisma.$executeRawUnsafe(`ALTER TABLE categorias_financieras ADD COLUMN IF NOT EXISTS "descripcion" TEXT`);
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureDescripcion();
  const categorias = await prisma.categoriaFinanciera.findMany({
    orderBy: [{ tipo: "asc" }, { orden: "asc" }, { nombre: "asc" }],
  });

  return NextResponse.json({ categorias });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, tipo, orden, descripcion } = body;

  if (!nombre || !tipo) return NextResponse.json({ error: "Nombre y tipo requeridos" }, { status: 400 });

  await ensureDescripcion();
  const categoria = await prisma.categoriaFinanciera.create({
    data: { nombre, tipo, orden: orden ?? 0, descripcion: descripcion?.trim() || null },
  });

  return NextResponse.json({ categoria });
}
