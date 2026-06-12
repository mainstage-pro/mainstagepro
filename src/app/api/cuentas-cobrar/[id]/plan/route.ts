import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const cuotas = await prisma.cuotaCobro.findMany({
    where: { cuentaCobrarId: id },
    orderBy: { numeroCuota: "asc" },
    include: { abono: { select: { id: true, fecha: true, monto: true, metodoPago: true } } },
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

  const cuenta = await prisma.cuentaCobrar.findUnique({ where: { id } });
  if (!cuenta) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  const pendiente = cuenta.monto - cuenta.montoCobrado;
  const totalCuotas = cuotas.reduce((s, c) => s + c.monto, 0);

  if (Math.abs(totalCuotas - pendiente) > 1) {
    return NextResponse.json(
      { error: `La suma de cuotas ($${totalCuotas}) debe igualar el monto pendiente ($${pendiente})` },
      { status: 400 }
    );
  }

  // Eliminar cuotas PENDIENTES anteriores
  await prisma.cuotaCobro.deleteMany({
    where: { cuentaCobrarId: id, estado: "PENDIENTE" },
  });

  const created = await prisma.$transaction(
    cuotas.map((c, i) =>
      prisma.cuotaCobro.create({
        data: {
          cuentaCobrarId: id,
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

  await prisma.cuotaCobro.deleteMany({
    where: { cuentaCobrarId: id, estado: "PENDIENTE" },
  });

  return NextResponse.json({ ok: true });
}
