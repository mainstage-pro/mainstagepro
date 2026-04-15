import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const vendedores = await prisma.user.findMany({
    where: { area: "VENTAS", active: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      fechaInicioVendedor: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ vendedores });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { name, email, password, fechaInicioVendedor } = body;

  if (!name || !email || !password)
    return NextResponse.json({ error: "Nombre, email y contraseña requeridos" }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "Email ya registrado" }, { status: 409 });

  const hashed = await hashPassword(password);
  const vendedor = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      area: "VENTAS",
      role: "USER",
      fechaInicioVendedor: fechaInicioVendedor ? new Date(fechaInicioVendedor) : new Date(),
    },
    select: { id: true, name: true, email: true, role: true, fechaInicioVendedor: true, createdAt: true },
  });

  return NextResponse.json({ vendedor });
}
