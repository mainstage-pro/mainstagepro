import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const proveedores = await prisma.proveedor.findMany({
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({ proveedores });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { nombre, empresa, giro, telefono, correo, notas, cuentaBancaria, datosFiscales } = body;

  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const proveedor = await prisma.proveedor.create({
    data: {
      nombre,
      empresa: empresa || null,
      giro: giro || null,
      telefono: telefono || null,
      correo: correo || null,
      notas: notas || null,
      cuentaBancaria: cuentaBancaria || null,
      datosFiscales: datosFiscales || null,
    },
  });

  return NextResponse.json({ proveedor }, { status: 201 });
}
