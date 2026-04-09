import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tecnicos = await prisma.tecnico.findMany({
    include: {
      rol: { select: { id: true, nombre: true } },
    },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({ tecnicos });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { nombre, celular, rolId, nivel, zonaHabitual, cuentaBancaria, datosFiscales, comentarios } = body;

  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const tecnico = await prisma.tecnico.create({
    data: {
      nombre,
      celular: celular || null,
      rolId: rolId || null,
      nivel: nivel || "A",
      zonaHabitual: zonaHabitual || null,
      cuentaBancaria: cuentaBancaria || null,
      datosFiscales: datosFiscales || null,
      comentarios: comentarios || null,
    },
    include: { rol: { select: { id: true, nombre: true } } },
  });

  return NextResponse.json({ tecnico }, { status: 201 });
}
