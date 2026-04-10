import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const tipos = await prisma.tipoIncidencia.findMany({ orderBy: [{ categoria: "asc" }, { nombre: "asc" }] });
  return NextResponse.json({ tipos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json();
  const { nombre, categoria, calculoTipo, valor, esDescuento, descripcion } = body;
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  const tipo = await prisma.tipoIncidencia.create({
    data: { nombre, categoria: categoria ?? "ASISTENCIA", calculoTipo: calculoTipo ?? "SIN_DESCUENTO", valor: valor ?? 0, esDescuento: esDescuento ?? true, descripcion },
  });
  return NextResponse.json({ tipo }, { status: 201 });
}
