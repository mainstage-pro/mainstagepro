import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();

    // Para TRANSFERENCIA entre cuentas se envía cuentaId (origen) y cuentaDestinoId (destino)
    // Para INGRESO: la plata entra → cuentaDestinoId = cuentaId
    // Para GASTO: la plata sale → cuentaOrigenId = cuentaId
    let cuentaOrigenId: string | null = null;
    let cuentaDestinoId: string | null = null;

    if (body.tipo === "TRANSFERENCIA") {
      cuentaOrigenId = body.cuentaId || null;
      cuentaDestinoId = body.cuentaDestinoId || null;
    } else if (body.tipo === "GASTO" || body.tipo === "RETIRO") {
      cuentaOrigenId = body.cuentaId || null;
    } else {
      // INGRESO, INVERSION u otro
      cuentaDestinoId = body.cuentaId || null;
    }

    const movimiento = await prisma.movimientoFinanciero.create({
      data: {
        fecha: new Date(body.fecha),
        tipo: body.tipo,
        cuentaOrigenId,
        cuentaDestinoId,
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
