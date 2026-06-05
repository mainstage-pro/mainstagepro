import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tipo = new URL(req.url).searchParams.get("tipo");
  const q = new URL(req.url).searchParams.get("q");
  const limit = parseInt(new URL(req.url).searchParams.get("limit") ?? "50");

  const where: Record<string, unknown> = { activo: true };
  if (tipo === "cliente") where.tipo = { in: ["CLIENTE", "AMBOS"] };
  else if (tipo === "proveedor") where.tipo = { in: ["PROVEEDOR", "AMBOS"] };
  else if (tipo === "CLIENTE" || tipo === "PROVEEDOR" || tipo === "AMBOS") where.tipo = tipo;
  if (q && q.trim()) {
    where.nombre = { contains: q.trim(), mode: "insensitive" };
  }

  const empresas = await prisma.empresa.findMany({
    where,
    include: {
      contactosCliente: { select: { id: true, nombre: true, telefono: true, correo: true } },
      contactosProveedor: { select: { id: true, nombre: true, telefono: true, correo: true } },
    },
    orderBy: { nombre: "asc" },
    take: q ? Math.min(limit, 10) : limit,
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
