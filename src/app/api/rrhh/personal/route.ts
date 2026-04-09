import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const personal = await prisma.personalInterno.findMany({
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    include: {
      _count: { select: { documentos: true, pagos: true } },
      pagos: {
        where: { estado: "PENDIENTE" },
        select: { id: true, monto: true, periodo: true },
      },
    },
  });

  return NextResponse.json({ personal });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, puesto, departamento, tipo, telefono, correo, salario, periodoPago, fechaIngreso, cuentaBancaria, datosFiscales, notas } = body;

  if (!nombre || !puesto) return NextResponse.json({ error: "Nombre y puesto requeridos" }, { status: 400 });

  const persona = await prisma.personalInterno.create({
    data: {
      nombre, puesto,
      departamento: departamento || "GENERAL",
      tipo: tipo || "EMPLEADO",
      telefono: telefono || null,
      correo: correo || null,
      salario: salario ? parseFloat(salario) : null,
      periodoPago: periodoPago || "MENSUAL",
      fechaIngreso: fechaIngreso ? new Date(fechaIngreso) : null,
      cuentaBancaria: cuentaBancaria || null,
      datosFiscales: datosFiscales || null,
      notas: notas || null,
    },
  });

  return NextResponse.json({ persona });
}
