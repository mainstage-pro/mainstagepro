import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { generarTokenLayout } from "@/lib/layout-token";

type Params = { params: Promise<{ id: string; escenarioId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, escenarioId } = await params;
  const dueño = await prisma.proyectoEscenario.findFirst({
    where: { id: escenarioId, proyectoId: id },
    select: { id: true },
  });
  if (!dueño) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const appUrl = await getConfig("empresa.appUrl", process.env.NEXTAUTH_URL ?? "https://mainstagepro.vercel.app");
  const token = generarTokenLayout(escenarioId);
  return NextResponse.json({ url: `${appUrl}/layout-produccion/${escenarioId}?token=${token}` });
}
