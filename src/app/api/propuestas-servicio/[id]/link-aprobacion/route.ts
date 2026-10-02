import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createExpiringToken } from "@/lib/tokens";
import { getConfig } from "@/lib/config";
import { logActividad } from "@/lib/actividad";

// POST: genera (o devuelve) el link público de aprobación.
// Mismo esquema que la cotización: token aleatorio con expiración embebida, sin
// columna de vencimiento. Reusar el existente evita invalidar un link ya enviado.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const propuesta = await prisma.propuestaServicio.findUnique({
    where: { id },
    select: { id: true, numero: true, estado: true, aprobacionToken: true },
  });
  if (!propuesta) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const token = propuesta.aprobacionToken ?? createExpiringToken(90);

  if (!propuesta.aprobacionToken) {
    await prisma.propuestaServicio.update({ where: { id }, data: { aprobacionToken: token } });
    await logActividad(
      session.id,
      "EDITAR",
      "propuesta_servicio",
      id,
      `Link de aprobación generado para ${propuesta.numero}`,
    );
  }

  const appUrl = await getConfig("empresa.appUrl", process.env.NEXTAUTH_URL ?? "https://mainstagepro.vercel.app");
  return NextResponse.json({ token, url: `${appUrl}/propuesta/${token}` });
}
