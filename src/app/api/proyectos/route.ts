import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const proyectos = await prisma.proyecto.findMany({
      include: {
        cliente: { select: { id: true, nombre: true, empresa: true } },
        encargado: { select: { name: true } },
        checklist: { select: { completado: true } },
        personal: { select: { confirmado: true } },
        trato: { select: { responsable: { select: { name: true } } } },
      },
      orderBy: { fechaEvento: "asc" },
    });
    return NextResponse.json({ proyectos });
  } catch (e) {
    console.error("[/api/proyectos GET]", e);
    return NextResponse.json({ error: String(e), proyectos: [] }, { status: 500 });
  }
}
