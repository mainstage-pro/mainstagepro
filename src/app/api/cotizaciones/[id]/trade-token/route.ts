import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createExpiringToken } from "@/lib/tokens";

// POST — generar o regenerar el trade token de una cotización
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const cot = await prisma.cotizacion.findUnique({
    where: { id },
    select: { id: true, estado: true },
  });
  if (!cot) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const token = createExpiringToken(90);

  await prisma.cotizacion.update({
    where: { id },
    data: { tradeToken: token },
  });

  const url = `${process.env.NEXTAUTH_URL ?? "https://mainstagepro.vercel.app"}/trade/${token}`;
  return NextResponse.json({ token, url });
}
