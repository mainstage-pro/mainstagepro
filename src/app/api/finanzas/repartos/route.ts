import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const repartos = await prisma.repartoUtilidad.findMany({
    include: {
      socio: { select: { id: true, nombre: true, pctParticipacion: true } },
      cuotas: { orderBy: { createdAt: "desc" }, take: 12 },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ repartos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, socioId, beneficiario, descripcion, montoBase, tipoPeriodo, baseCalculo, pctCalculo, notas } = body;

  if (!nombre || !beneficiario || !montoBase)
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });

  const reparto = await prisma.repartoUtilidad.create({
    data: {
      nombre,
      socioId: socioId || null,
      beneficiario,
      descripcion: descripcion || null,
      montoBase: parseFloat(montoBase),
      tipoPeriodo: tipoPeriodo || "SEMANAL",
      baseCalculo: baseCalculo || "FIJO",
      pctCalculo: pctCalculo ? parseFloat(pctCalculo) : null,
      notas: notas || null,
    },
    include: { socio: { select: { id: true, nombre: true } }, cuotas: true },
  });

  return NextResponse.json({ reparto }, { status: 201 });
}
