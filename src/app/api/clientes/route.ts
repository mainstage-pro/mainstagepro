import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    if (!body.nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

    // Resolve empresaId: prefer explicit id, fall back to plain string lookup/create
    let empresaId: string | null = body.empresaId ?? null;
    const empresaNombre: string | null = body.empresa || null;

    if (!empresaId && empresaNombre) {
      // Find or create empresa by name
      const existing = await prisma.empresa.findFirst({
        where: { nombre: { equals: empresaNombre, mode: "insensitive" }, activo: true },
      });
      if (existing) {
        empresaId = existing.id;
      } else {
        const created = await prisma.empresa.create({
          data: { nombre: empresaNombre, tipo: "CLIENTE" },
        });
        empresaId = created.id;
      }
    }

    const cliente = await prisma.cliente.create({
      data: {
        nombre: body.nombre,
        empresa: empresaId
          ? (await prisma.empresa.findUnique({ where: { id: empresaId }, select: { nombre: true } }))?.nombre ?? empresaNombre
          : empresaNombre,
        empresaId,
        tipoCliente: body.tipoCliente || "POR_DESCUBRIR",
        clasificacion: body.clasificacion || "NUEVO",
        servicioUsual: body.servicioUsual || null,
        telefono: body.telefono || null,
        correo: body.correo || null,
        notas: body.notas || null,
      },
      include: {
        compania: { select: { id: true, nombre: true } },
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
    select: {
      id: true,
      nombre: true,
      empresa: true,
      empresaId: true,
      compania: { select: { id: true, nombre: true } },
      tipoCliente: true,
      clasificacion: true,
      correo: true,
      vendedor: { select: { id: true, name: true } },
    },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({ clientes });
}
