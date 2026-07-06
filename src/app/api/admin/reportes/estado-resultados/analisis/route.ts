import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET — cargar análisis guardado del período
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const mes = req.nextUrl.searchParams.get("mes") || new Date().toISOString().slice(0, 7);
  const analisis = await prisma.reporteERAnalisis.findUnique({ where: { mes } });
  return NextResponse.json({ analisis: analisis ?? null });
}

// POST — guardar / actualizar análisis del período
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { mes, ...data } = body;
  if (!mes) return NextResponse.json({ error: "mes requerido" }, { status: 400 });

  const analisis = await prisma.reporteERAnalisis.upsert({
    where: { mes },
    create: { mes, actualizadoPorId: session.id, ...data },
    update: { actualizadoPorId: session.id, ...data },
  });

  return NextResponse.json({ analisis });
}
