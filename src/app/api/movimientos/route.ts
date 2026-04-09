import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();

    const movimiento = await prisma.movimientoFinanciero.create({
      data: {
        fecha: new Date(body.fecha),
        tipo: body.tipo,
        cuentaOrigenId: body.tipo === "GASTO" || body.tipo === "TRANSFERENCIA" ? body.cuentaId : null,
        cuentaDestinoId: body.tipo === "INGRESO" || body.tipo === "TRANSFERENCIA" ? body.cuentaId : null,
        clienteId: body.clienteId || null,
        proveedorId: body.proveedorId || null,
        proyectoId: body.proyectoId || null,
        categoriaId: body.categoriaId || null,
        concepto: body.concepto,
        monto: parseFloat(body.monto),
        metodoPago: body.metodoPago || "TRANSFERENCIA",
        referencia: body.referencia || null,
        notas: body.notas || null,
        creadoPor: session.id,
      },
    });

    return NextResponse.json({ movimiento });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al registrar movimiento" }, { status: 500 });
  }
}
