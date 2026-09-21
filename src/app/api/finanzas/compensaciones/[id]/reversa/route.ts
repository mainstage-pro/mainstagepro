import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener la compensación original
      const original = await tx.compensacion.findUnique({
        where: { id },
        include: { aplicaciones: true }
      });

      if (!original) throw new Error("Compensación no encontrada");
      if (original.estado === "REVERSADA") throw new Error("La compensación ya fue reversada anteriormente");

      // 2. Crear la reversa (un registro espejo)
      const reversa = await tx.compensacion.create({
        data: {
          empresaId: original.empresaId,
          corteId: original.corteId,
          importeCompensado: original.importeCompensado, // Guardamos el valor original, pero la semántica es que es una reversa
          notas: `Reversa de compensación original ${original.id}`,
          estado: "REVERSADA",
          reversaDeId: original.id,
          creadoPor: session.id,
          aplicaciones: {
            create: original.aplicaciones.map(ap => ({
              cuentaCobrarId: ap.cuentaCobrarId,
              cuentaPagarId: ap.cuentaPagarId,
              montoAplicado: ap.montoAplicado
            }))
          }
        }
      });

      // 3. Marcar la original como reversada
      await tx.compensacion.update({
        where: { id: original.id },
        data: {
          estado: "REVERSADA",
          reversadaPorId: reversa.id
        }
      });

      // 4. Restaurar saldos de CxC
      const cxcMapeo: Record<string, Prisma.Decimal> = {};
      const cxpMapeo: Record<string, Prisma.Decimal> = {};

      for (const ap of original.aplicaciones) {
        const monto = new Prisma.Decimal(ap.montoAplicado);
        cxcMapeo[ap.cuentaCobrarId] = (cxcMapeo[ap.cuentaCobrarId] || new Prisma.Decimal(0)).add(monto);
        cxpMapeo[ap.cuentaPagarId] = (cxpMapeo[ap.cuentaPagarId] || new Prisma.Decimal(0)).add(monto);
      }

      for (const [cxcId, montoARestaurar] of Object.entries(cxcMapeo)) {
        const cxc = await tx.cuentaCobrar.findUnique({ where: { id: cxcId } }) as any;
        const nuevoMontoCompensado = new Prisma.Decimal(cxc.montoCompensado || 0).sub(montoARestaurar);
        
        // Recalcular estado
        const saldoFinal = new Prisma.Decimal(cxc.monto)
          .sub(new Prisma.Decimal(cxc.montoCobrado))
          .sub(nuevoMontoCompensado);
          
        let nuevoEstado = "PENDIENTE";
        if (saldoFinal.lessThanOrEqualTo(0)) {
           nuevoEstado = cxc.montoCobrado > 0 ? "LIQUIDADO" : "COMPENSADO";
        } else if (cxc.montoCobrado > 0) {
           nuevoEstado = "PARCIALMENTE_PAGADO";
        } else if (nuevoMontoCompensado.greaterThan(0)) {
           nuevoEstado = "PARCIALMENTE_COMPENSADO";
        }

        await tx.cuentaCobrar.update({
          where: { id: cxcId },
          data: {
            montoCompensado: nuevoMontoCompensado,
            estado: nuevoEstado
          }
        });
      }

      // 5. Restaurar saldos de CxP
      for (const [cxpId, montoARestaurar] of Object.entries(cxpMapeo)) {
        const cxp = await tx.cuentaPagar.findUnique({ where: { id: cxpId } }) as any;
        const nuevoMontoCompensado = new Prisma.Decimal(cxp.montoCompensado || 0).sub(montoARestaurar);
        
        const saldoFinal = new Prisma.Decimal(cxp.monto)
          .sub(new Prisma.Decimal(cxp.montoPagado))
          .sub(nuevoMontoCompensado);
          
        let nuevoEstado = "PENDIENTE";
        if (saldoFinal.lessThanOrEqualTo(0)) {
           nuevoEstado = cxp.montoPagado > 0 ? "LIQUIDADO" : "COMPENSADO";
        } else if (cxp.montoPagado > 0) {
           nuevoEstado = "PARCIALMENTE_PAGADO";
        } else if (nuevoMontoCompensado.greaterThan(0)) {
           nuevoEstado = "PARCIALMENTE_COMPENSADO";
        }

        await tx.cuentaPagar.update({
          where: { id: cxpId },
          data: {
            montoCompensado: nuevoMontoCompensado,
            estado: nuevoEstado
          }
        });
      }

      return reversa;
    });

    return NextResponse.json({ success: true, reversa: result });

  } catch (error: any) {
    console.error("Error al reversar compensación:", error);
    return NextResponse.json({ error: error.message || "Error al reversar la compensación" }, { status: 400 });
  }
}
