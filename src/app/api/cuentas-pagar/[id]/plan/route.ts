import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const cuotas = await prisma.cuotaPago.findMany({
    where: { cuentaPagarId: id },
    orderBy: { numeroCuota: "asc" },
    include: { abonoPago: { select: { id: true, fecha: true, monto: true, metodoPago: true } } },
  });

  return NextResponse.json({ cuotas });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const { cuotas } = body as { cuotas: { monto: number; fechaCompromiso: string }[] };

  if (!cuotas || cuotas.length < 2) {
    return NextResponse.json({ error: "Se requieren al menos 2 cuotas" }, { status: 400 });
  }

  const cuenta = await prisma.cuentaPagar.findUnique({ where: { id } });
  if (!cuenta) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  const pendiente = cuenta.monto - cuenta.montoPagado;
  const totalCuotas = cuotas.reduce((s, c) => s + c.monto, 0);

  // Allow ±1 peso de diferencia por redondeos
  if (Math.abs(totalCuotas - pendiente) > 1) {
    return NextResponse.json(
      { error: `La suma de cuotas ($${totalCuotas}) debe igualar el monto pendiente ($${pendiente})` },
      { status: 400 }
    );
  }

  // Eliminar cuotas PENDIENTES anteriores (conservar las ya pagadas)
  await prisma.cuotaPago.deleteMany({
    where: { cuentaPagarId: id, estado: "PENDIENTE" },
  });

  // Crear nuevas cuotas
  const created = await prisma.$transaction(
    cuotas.map((c, i) =>
      prisma.cuotaPago.create({
        data: {
          cuentaPagarId: id,
          numeroCuota: i + 1,
          monto: c.monto,
          fechaCompromiso: new Date(c.fechaCompromiso),
        },
      })
    )
  );

  return NextResponse.json({ cuotas: created }, { status: 201 });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  await prisma.cuotaPago.deleteMany({
    where: { cuentaPagarId: id, estado: "PENDIENTE" },
  });

  return NextResponse.json({ ok: true });
}
