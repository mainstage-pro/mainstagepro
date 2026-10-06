import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { nanoid } from "nanoid";

export async function GET(req: NextRequest, context: any) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let proyecto = await prisma.proyecto.findUnique({
      where: { id: (await context.params).id },
      select: { id: true, responsivaToken: true }
    });

    if (!proyecto) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!proyecto.responsivaToken) {
      proyecto = await prisma.proyecto.update({
        where: { id: (await context.params).id },
        data: { responsivaToken: nanoid(32) },
        select: { id: true, responsivaToken: true }
      });
    }

    const responsivas = await prisma.responsivaTecnico.findMany({
      where: { proyectoId: (await context.params).id },
      include: {
        tecnico: true,
        validadoPor: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      token: proyecto.responsivaToken,
      responsivas
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
