import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const templates = await prisma.itemTemplateBodega.findMany({
    orderBy: [{ categoria: "asc" }, { orden: "asc" }],
  });

  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { descripcion, categoria, orden } = await req.json();
  if (!descripcion) return NextResponse.json({ error: "Descripción requerida" }, { status: 400 });

  const template = await prisma.itemTemplateBodega.create({
    data: { descripcion, categoria: categoria || "GENERAL", orden: orden ?? 0 },
  });

  return NextResponse.json({ template });
}
