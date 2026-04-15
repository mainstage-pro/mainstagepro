import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const lugarEvento = url.searchParams.get("lugarEvento");

  const where: Record<string, unknown> = {};
  if (lugarEvento) where.lugarEvento = { contains: lugarEvento, mode: "insensitive" };

  try {
    const proyectos = await prisma.proyecto.findMany({
      where,
      include: {
        cliente: { select: { id: true, nombre: true, empresa: true } },
        encargado: { select: { name: true } },
        checklist: { select: { completado: true } },
        personal: { select: { confirmado: true } },
        trato: { select: { responsable: { select: { name: true } } } },
      },
      orderBy: { fechaEvento: "desc" },
    });
    return NextResponse.json({ proyectos });
  } catch (e) {
    console.error("[/api/proyectos GET]", e);
    return NextResponse.json({ error: String(e), proyectos: [] }, { status: 500 });
  }
}
