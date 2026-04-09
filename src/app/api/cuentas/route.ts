import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cuentas = await prisma.cuentaBancaria.findMany({
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({ cuentas });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, banco, numeroCuenta, clabe, titular, rfc } = body;

  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const cuenta = await prisma.cuentaBancaria.create({
    data: { nombre, banco: banco || null, numeroCuenta: numeroCuenta || null, clabe: clabe || null, titular: titular || null, rfc: rfc || null },
  });

  return NextResponse.json({ cuenta });
}
