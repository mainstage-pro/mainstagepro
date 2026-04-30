import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const roles = await prisma.rolTecnico.findMany({
    select: {
      id: true,
      nombre: true,
      tipoPago: true,
      descripcion: true,
      activo: true,
      orden: true,
      tarifaAAACorta: true,
      tarifaAAAMedia: true,
      tarifaAAALarga: true,
      tarifaAACorta: true,
      tarifaAAMedia: true,
      tarifaAALarga: true,
      tarifaACorta: true,
      tarifaAMedia: true,
      tarifaALarga: true,
      tarifaPlanaAAA: true,
      tarifaPlanaAA: true,
      tarifaPlanaA: true,
      tarifaHoraAAA: true,
      tarifaHoraAA: true,
      tarifaHoraA: true,
    },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });

  return NextResponse.json({ roles });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const {
    nombre, tipoPago, descripcion, orden,
    tarifaAAACorta, tarifaAAAMedia, tarifaAAALarga,
    tarifaAACorta,  tarifaAAMedia,  tarifaAALarga,
    tarifaACorta,   tarifaAMedia,   tarifaALarga,
    tarifaPlanaAAA, tarifaPlanaAA,  tarifaPlanaA,
    tarifaHoraAAA,  tarifaHoraAA,   tarifaHoraA,
  } = body;

  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const rol = await prisma.rolTecnico.create({
    data: {
      nombre, tipoPago: tipoPago || "POR_JORNADA",
      descripcion: descripcion || null,
      orden: orden ?? 0,
      tarifaAAACorta: tarifaAAACorta ?? null, tarifaAAAMedia: tarifaAAAMedia ?? null, tarifaAAALarga: tarifaAAALarga ?? null,
      tarifaAACorta: tarifaAACorta ?? null,   tarifaAAMedia: tarifaAAMedia ?? null,   tarifaAALarga: tarifaAALarga ?? null,
      tarifaACorta: tarifaACorta ?? null,     tarifaAMedia: tarifaAMedia ?? null,     tarifaALarga: tarifaALarga ?? null,
      tarifaPlanaAAA: tarifaPlanaAAA ?? null, tarifaPlanaAA: tarifaPlanaAA ?? null,   tarifaPlanaA: tarifaPlanaA ?? null,
      tarifaHoraAAA: tarifaHoraAAA ?? null,   tarifaHoraAA: tarifaHoraAA ?? null,    tarifaHoraA: tarifaHoraA ?? null,
    },
  });

  return NextResponse.json({ rol }, { status: 201 });
}
