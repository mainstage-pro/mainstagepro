import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tipos = await prisma.tipoContenido.findMany({ orderBy: [{ orden: "asc" }, { nombre: "asc" }] });
  return NextResponse.json({ tipos });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { nombre, formato, objetivo, diaSemana, recurrencia, cantMes, descripcion, activo, orden } = body;
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const tipo = await prisma.tipoContenido.create({
    data: { nombre, formato: formato ?? "POST", objetivo, diaSemana, recurrencia, cantMes, descripcion, activo: activo ?? true, orden: orden ?? 0 },
  });
  return NextResponse.json({ tipo }, { status: 201 });
}
