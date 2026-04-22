import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const proveedores = await prisma.proveedor.findMany({
    include: {
      compania: { select: { id: true, nombre: true } },
    },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({ proveedores });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { nombre, giro, telefono, correo, notas,
    rfc, cuentaBancaria, clabe, banco, noTarjeta, datosFiscales } = body;

  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  // Resolve empresaId
  let empresaId: string | null = body.empresaId ?? null;
  const empresaNombre: string | null = body.empresa || null;

  if (!empresaId && empresaNombre) {
    const existing = await prisma.empresa.findFirst({
      where: { nombre: { equals: empresaNombre, mode: "insensitive" }, activo: true },
    });
    if (existing) {
      empresaId = existing.id;
    } else {
      const created = await prisma.empresa.create({ data: { nombre: empresaNombre, tipo: "PROVEEDOR" } });
      empresaId = created.id;
    }
  }

  const empresaNameResolved = empresaId
    ? (await prisma.empresa.findUnique({ where: { id: empresaId }, select: { nombre: true } }))?.nombre ?? empresaNombre
    : empresaNombre;

  const proveedor = await prisma.proveedor.create({
    data: {
      nombre,
      empresa: empresaNameResolved,
      empresaId,
      giro: giro || null,
      telefono: telefono || null,
      correo: correo || null,
      notas: notas || null,
      rfc: rfc || null,
      cuentaBancaria: cuentaBancaria || null,
      clabe: clabe || null,
      banco: banco || null,
      noTarjeta: noTarjeta || null,
      datosFiscales: datosFiscales || null,
    },
    include: {
      compania: { select: { id: true, nombre: true } },
    },
  });

  return NextResponse.json({ proveedor }, { status: 201 });
}
