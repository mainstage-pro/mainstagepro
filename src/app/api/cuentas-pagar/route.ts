import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cuentas = await prisma.cuentaPagar.findMany({
    include: {
      tecnico: { select: { id: true, nombre: true, celular: true } },
      proveedor: { select: { id: true, nombre: true, telefono: true } },
      proyecto: { select: { id: true, nombre: true, numeroProyecto: true } },
    },
    orderBy: { fechaCompromiso: "asc" },
  });

  return NextResponse.json(cuentas);
}
