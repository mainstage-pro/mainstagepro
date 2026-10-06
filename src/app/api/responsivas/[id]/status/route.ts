import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(req: NextRequest, context: any) {
  try {
    const session = await getSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { status, motivoCorreccion } = body;

    const data: any = { status };
    
    if (status === 'VALIDADA') {
      data.validadoPorId = session.id;
      data.validadoEn = new Date();
      data.motivoCorreccion = null;
    } else if (status === 'REQUIERE_CORRECCION') {
      data.motivoCorreccion = motivoCorreccion;
    }

    const responsiva = await prisma.responsivaTecnico.update({
      where: { id: (await context.params).id },
      data
    });

    return NextResponse.json(responsiva);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
