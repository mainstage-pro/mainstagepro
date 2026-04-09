import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/evaluacion-cliente?proyectoId=xxx — obtener evaluación cliente de un proyecto
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const proyectoId = req.nextUrl.searchParams.get("proyectoId");
  if (!proyectoId) return NextResponse.json({ error: "proyectoId requerido" }, { status: 400 });

  const evaluacion = await prisma.evaluacionCliente.findUnique({ where: { proyectoId } });
  return NextResponse.json({ evaluacion });
}

// POST /api/evaluacion-cliente — crear o regenerar token para un proyecto
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { proyectoId } = await req.json();
  if (!proyectoId) return NextResponse.json({ error: "proyectoId requerido" }, { status: 400 });

  // Upsert: crear si no existe, si existe devolver el existente
  const evaluacion = await prisma.evaluacionCliente.upsert({
    where: { proyectoId },
    create: { proyectoId },
    update: {},
  });

  return NextResponse.json({ evaluacion });
}
