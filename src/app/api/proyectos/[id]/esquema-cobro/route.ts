import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * PUT /api/proyectos/[id]/esquema-cobro
 * Upsert del esquema de cobro: anticipo + liquidación.
 * Si existen CxC previas de tipo ANTICIPO/LIQUIDACION para este proyecto, las actualiza.
 * Si no existen, las crea.
 * Body: { anticipo?: { monto, fechaCompromiso }, liquidacion?: { monto, fechaCompromiso } }
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: proyectoId } = await params;
  const body = await req.json();

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: {
      clienteId: true,
      nombre: true,
      cotizacion: { select: { id: true } },
    },
  });
  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const existentes = await prisma.cuentaCobrar.findMany({
    where: { proyectoId, tipoPago: { in: ["ANTICIPO", "LIQUIDACION"] } },
    orderBy: { createdAt: "asc" },
  });

  const anticipo = body.anticipo as { monto: number; fechaCompromiso: string } | null;
  const liquidacion = body.liquidacion as { monto: number; fechaCompromiso: string } | null;

  const existeAnticipo = existentes.find(c => c.tipoPago === "ANTICIPO");
  const existeLiquidacion = existentes.find(c => c.tipoPago === "LIQUIDACION");

  const ops = [];

  if (anticipo) {
    if (existeAnticipo) {
      ops.push(prisma.cuentaCobrar.update({
        where: { id: existeAnticipo.id },
        data: {
          monto: anticipo.monto,
          fechaCompromiso: new Date(anticipo.fechaCompromiso),
          concepto: `Anticipo — ${proyecto.nombre}`,
        },
      }));
    } else {
      ops.push(prisma.cuentaCobrar.create({
        data: {
          clienteId: proyecto.clienteId,
          proyectoId,
          cotizacionId: proyecto.cotizacion?.id ?? null,
          concepto: `Anticipo — ${proyecto.nombre}`,
          tipoPago: "ANTICIPO",
          monto: anticipo.monto,
          fechaCompromiso: new Date(anticipo.fechaCompromiso),
          estado: "PENDIENTE",
        },
      }));
    }
  } else if (existeAnticipo && "anticipo" in body && body.anticipo === null) {
    // Explicitly removing anticipo
    ops.push(prisma.cuentaCobrar.delete({ where: { id: existeAnticipo.id } }));
  }

  if (liquidacion) {
    if (existeLiquidacion) {
      ops.push(prisma.cuentaCobrar.update({
        where: { id: existeLiquidacion.id },
        data: {
          monto: liquidacion.monto,
          fechaCompromiso: new Date(liquidacion.fechaCompromiso),
          concepto: `Liquidación — ${proyecto.nombre}`,
        },
      }));
    } else {
      ops.push(prisma.cuentaCobrar.create({
        data: {
          clienteId: proyecto.clienteId,
          proyectoId,
          cotizacionId: proyecto.cotizacion?.id ?? null,
          concepto: `Liquidación — ${proyecto.nombre}`,
          tipoPago: "LIQUIDACION",
          monto: liquidacion.monto,
          fechaCompromiso: new Date(liquidacion.fechaCompromiso),
          estado: "PENDIENTE",
        },
      }));
    }
  } else if (existeLiquidacion && "liquidacion" in body && body.liquidacion === null) {
    ops.push(prisma.cuentaCobrar.delete({ where: { id: existeLiquidacion.id } }));
  }

  await Promise.all(ops);

  const actualizadas = await prisma.cuentaCobrar.findMany({
    where: { proyectoId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ cuentasCobrar: actualizadas });
}
