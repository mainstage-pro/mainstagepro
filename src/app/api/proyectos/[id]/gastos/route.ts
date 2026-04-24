import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { concepto, monto, fecha, notas, metodoPago, categoriaId, referencia, proveedorId, cuentaOrigenId } = await req.json();

  if (!concepto || !monto) {
    return NextResponse.json({ error: "concepto y monto requeridos" }, { status: 400 });
  }

  const proyecto = await prisma.proyecto.findUnique({ where: { id }, select: { id: true } });
  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const gasto = await prisma.movimientoFinanciero.create({
    data: {
      tipo: "GASTO",
      fecha: fecha ? new Date(fecha) : new Date(),
      concepto,
      monto: parseFloat(monto),
      proyectoId: id,
      metodoPago: metodoPago || "TRANSFERENCIA",
      categoriaId: categoriaId || null,
      proveedorId: proveedorId || null,
      cuentaOrigenId: cuentaOrigenId || null,
      referencia: referencia || null,
      notas: notas || null,
      creadoPor: session.id,
    },
    include: {
      categoria: { select: { nombre: true } },
      proveedor: { select: { nombre: true } },
    },
  });

  return NextResponse.json({ gasto });
}
