import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { periodoId, montoConfirmado } = await req.json();
    
    if (!periodoId || !montoConfirmado) {
      return NextResponse.json({ error: "periodoId y montoConfirmado son requeridos" }, { status: 400 });
    }

    const periodo = await prisma.periodoGastoRecurrente.findUnique({
      where: { id: periodoId },
      include: { gastoRecurrente: true, cuentaPagar: true }
    });

    if (!periodo || periodo.gastoRecurrenteId !== params.id) {
      return NextResponse.json({ error: "Periodo no encontrado o no pertenece a este gasto" }, { status: 404 });
    }

    if (periodo.cuentaPagar) {
      return NextResponse.json({ error: "Este periodo ya tiene una Cuenta por Pagar generada" }, { status: 400 });
    }

    const cxp = await prisma.$transaction(async (tx) => {
      // 1. Actualizar el periodo
      await tx.periodoGastoRecurrente.update({
        where: { id: periodoId },
        data: {
          montoConfirmado: parseFloat(montoConfirmado),
          estado: "PENDIENTE_PAGO"
        }
      });

      // 2. Crear la cuenta por pagar real
      const gasto = periodo.gastoRecurrente;
      return await tx.cuentaPagar.create({
        data: {
          concepto: `${gasto.nombre} - ${periodo.periodo}`,
          monto: parseFloat(montoConfirmado),
          fechaCompromiso: periodo.fechaVencimiento,
          tipoAcreedor: gasto.proveedorId ? "PROVEEDOR" : gasto.empresaId ? "EMPRESA" : "OTRO",
          proveedorId: gasto.proveedorId,
          empresaId: gasto.empresaId,
          categoriaId: gasto.categoriaId,
          proyectoId: gasto.proyectoId,
          gastoRecurrenteId: gasto.id,
          periodoGastoId: periodo.id,
          estado: "PENDIENTE"
        }
      });
    });

    return NextResponse.json(cxp);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
