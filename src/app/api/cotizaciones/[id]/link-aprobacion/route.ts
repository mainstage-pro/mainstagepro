import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST: genera o devuelve el token de aprobación
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const cot = await prisma.cotizacion.findUnique({
    where: { id },
    select: { id: true, estado: true, aprobacionToken: true },
  });

  if (!cot) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (cot.estado === "APROBADA") return NextResponse.json({ error: "Ya está aprobada" }, { status: 400 });

  // Reusar token existente o generar uno nuevo
  const token = cot.aprobacionToken ?? crypto.randomUUID();

  if (!cot.aprobacionToken) {
    await prisma.cotizacion.update({
      where: { id },
      data: { aprobacionToken: token, estado: "ENVIADA" },
    });
  }

  const url = `${process.env.NEXTAUTH_URL ?? "https://mainstagepro.vercel.app"}/aprobacion/cotizacion/${token}`;
  return NextResponse.json({ token, url });
}
