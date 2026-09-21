import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const { empresaId, corteId, importeCompensado, aplicaciones, notas, fecha } = body;

    // aplicaciones es un arreglo de: { cuentaCobrarId, cuentaPagarId, montoAplicado }
    // En la UI, el usuario asocia cuánto de X CxC se mata con Y CxP.

    if (!empresaId || !importeCompensado || !aplicaciones || aplicaciones.length === 0) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Validar que la empresa existe
      const empresa = await tx.empresa.findUnique({ where: { id: empresaId } });
      if (!empresa) throw new Error("Empresa no encontrada");

      // 2. Acumular y validar la sumatoria de las aplicaciones
      let sumaAplicada = new Prisma.Decimal(0);
      const cxcMapeo: Record<string, Prisma.Decimal> = {};
      const cxpMapeo: Record<string, Prisma.Decimal> = {};

      for (const ap of aplicaciones) {
        const monto = new Prisma.Decimal(ap.montoAplicado);
        sumaAplicada = sumaAplicada.add(monto);
        
        cxcMapeo[ap.cuentaCobrarId] = (cxcMapeo[ap.cuentaCobrarId] || new Prisma.Decimal(0)).add(monto);
        cxpMapeo[ap.cuentaPagarId] = (cxpMapeo[ap.cuentaPagarId] || new Prisma.Decimal(0)).add(monto);
      }

      if (!sumaAplicada.equals(new Prisma.Decimal(importeCompensado))) {
        throw new Error("La sumatoria de las aplicaciones no coincide con el importe total a compensar");
      }

      // 3. Validar saldos de CxC
      for (const [cxcId, montoACompensar] of Object.entries(cxcMapeo)) {
        const cxc = await tx.cuentaCobrar.findUnique({ where: { id: cxcId } });
        if (!cxc) throw new Error(`CxC no encontrada: ${cxcId}`);
        if (cxc.empresaId !== empresaId) throw new Error(`La CxC ${cxcId} no pertenece a la empresa`);

        const saldoPendiente = new Prisma.Decimal(cxc.monto)
          .sub(new Prisma.Decimal(cxc.montoCobrado))
          .sub(new Prisma.Decimal(cxc.montoCompensado as any || 0));

        if (montoACompensar.greaterThan(saldoPendiente)) {
          throw new Error(`Saldo insuficiente en la CxC ${cxcId}. Pendiente: ${saldoPendiente.toString()}, Intento: ${montoACompensar.toString()}`);
        }
      }

      // 4. Validar saldos de CxP
      for (const [cxpId, montoACompensar] of Object.entries(cxpMapeo)) {
        const cxp = await tx.cuentaPagar.findUnique({ where: { id: cxpId } });
        if (!cxp) throw new Error(`CxP no encontrada: ${cxpId}`);
        if (cxp.empresaId !== empresaId) throw new Error(`La CxP ${cxpId} no pertenece a la empresa`);

        const saldoPendiente = new Prisma.Decimal(cxp.monto)
          .sub(new Prisma.Decimal(cxp.montoPagado))
          .sub(new Prisma.Decimal(cxp.montoCompensado as any || 0));

        if (montoACompensar.greaterThan(saldoPendiente)) {
          throw new Error(`Saldo insuficiente en la CxP ${cxpId}. Pendiente: ${saldoPendiente.toString()}, Intento: ${montoACompensar.toString()}`);
        }
      }

      // 5. Crear Compensacion y Aplicaciones
      const compensacion = await tx.compensacion.create({
        data: {
          empresaId,
          corteId: corteId || null,
          importeCompensado,
          notas,
          creadoPor: session.id,
          estado: "ACTIVA",
          fecha: fecha ? new Date(fecha) : new Date(),
          aplicaciones: {
            create: aplicaciones.map((ap: any) => ({
              cuentaCobrarId: ap.cuentaCobrarId,
              cuentaPagarId: ap.cuentaPagarId,
              montoAplicado: ap.montoAplicado
            }))
          }
        }
      });

      // 6. Actualizar CxC y evaluar estado
      for (const [cxcId, montoACompensar] of Object.entries(cxcMapeo)) {
        const cxc = await tx.cuentaCobrar.findUnique({ where: { id: cxcId } }) as any;
        const nuevoMontoCompensado = new Prisma.Decimal(cxc.montoCompensado || 0).add(montoACompensar);
        
        const saldoFinal = new Prisma.Decimal(cxc.monto)
          .sub(new Prisma.Decimal(cxc.montoCobrado))
          .sub(nuevoMontoCompensado);
          
        let nuevoEstado = cxc.estado;
        if (saldoFinal.lessThanOrEqualTo(0)) {
          nuevoEstado = cxc.montoCobrado > 0 ? "LIQUIDADO" : "COMPENSADO"; 
        } else {
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

      // 7. Actualizar CxP y evaluar estado
      for (const [cxpId, montoACompensar] of Object.entries(cxpMapeo)) {
        const cxp = await tx.cuentaPagar.findUnique({ where: { id: cxpId } }) as any;
        const nuevoMontoCompensado = new Prisma.Decimal(cxp.montoCompensado || 0).add(montoACompensar);
        
        const saldoFinal = new Prisma.Decimal(cxp.monto)
          .sub(new Prisma.Decimal(cxp.montoPagado))
          .sub(nuevoMontoCompensado);
          
        let nuevoEstado = cxp.estado;
        if (saldoFinal.lessThanOrEqualTo(0)) {
          nuevoEstado = cxp.montoPagado > 0 ? "LIQUIDADO" : "COMPENSADO"; 
        } else {
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

      return compensacion;
    });

    return NextResponse.json({ success: true, compensacion: result });

  } catch (error: any) {
    console.error("Error al crear compensación:", error);
    return NextResponse.json({ error: error.message || "Error al procesar la compensación" }, { status: 400 });
  }
}
