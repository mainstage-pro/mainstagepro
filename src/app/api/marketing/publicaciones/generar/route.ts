import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generarParaTipo } from "@/lib/contenido-generador";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { mes } = await request.json();
  if (!mes) return NextResponse.json({ error: "Mes requerido" }, { status: 400 });

  const [year, month] = mes.split("-").map(Number);

  const tipos = await prisma.tipoContenido.findMany({
    where: { activo: true, cantMes: { gt: 0 } },
    include: { variaciones: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });

  let creadas = 0;
  for (const tipo of tipos) creadas += await generarParaTipo(tipo, year, month);

  return NextResponse.json({ creadas });
}
