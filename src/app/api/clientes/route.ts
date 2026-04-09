import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    if (!body.nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

    const cliente = await prisma.cliente.create({
      data: {
        nombre: body.nombre,
        empresa: body.empresa || null,
        tipoCliente: body.tipoCliente || "POR_DESCUBRIR",
        clasificacion: body.clasificacion || "NUEVO",
        servicioUsual: body.servicioUsual || null,
        telefono: body.telefono || null,
        correo: body.correo || null,
        notas: body.notas || null,
      },
    });

    return NextResponse.json({ cliente });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const clientes = await prisma.cliente.findMany({
    select: { id: true, nombre: true, empresa: true, tipoCliente: true, clasificacion: true },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({ clientes });
}
