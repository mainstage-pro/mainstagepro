import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const proyectos = await prisma.proyecto.findMany({
    include: {
      cliente: { select: { nombre: true, empresa: true } },
      encargado: { select: { name: true } },
      checklist: { select: { completado: true } },
      personal: { select: { confirmado: true } },
    },
    orderBy: { fechaEvento: "asc" },
  });

  return NextResponse.json({ proyectos });
}
