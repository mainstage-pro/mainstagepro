import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const empresas = await prisma.empresa.findMany({
    where: { activo: true },
    include: {
      contactosCliente: { select: { id: true, nombre: true, telefono: true, correo: true } },
      contactosProveedor: { select: { id: true, nombre: true, telefono: true, correo: true } },
    },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({ empresas });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, giro, telefono, correo, sitioWeb, notas,
    rfc, datosFiscales, cuentaBancaria, clabe, banco, noTarjeta, tipo } = body;

  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const empresa = await prisma.empresa.create({
    data: {
      nombre,
      giro: giro || null,
      telefono: telefono || null,
      correo: correo || null,
      sitioWeb: sitioWeb || null,
      notas: notas || null,
      rfc: rfc || null,
      datosFiscales: datosFiscales || null,
      cuentaBancaria: cuentaBancaria || null,
      clabe: clabe || null,
      banco: banco || null,
      noTarjeta: noTarjeta || null,
      tipo: tipo || "AMBOS",
    },
  });

  return NextResponse.json({ empresa }, { status: 201 });
}
