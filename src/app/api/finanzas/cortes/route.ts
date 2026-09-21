import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const { empresaId, fechaInicial, fechaFinal, totalFavorMainstage, totalFavorContraparte, montoCompensable, saldoNeto } = body;

    const corte = await prisma.corteCompensacion.create({
      data: {
        empresaId,
        fechaInicial: new Date(fechaInicial),
        fechaFinal: new Date(fechaFinal),
        totalFavorMainstage,
        totalFavorContraparte,
        montoCompensable,
        saldoNeto,
        estado: "BORRADOR",
        creadoPor: session.user.id
      }
    });

    return NextResponse.json({ success: true, corte });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
