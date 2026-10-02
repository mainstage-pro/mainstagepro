import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createExpiringToken } from "@/lib/tokens";
import { getConfig } from "@/lib/config";
import { logActividad } from "@/lib/actividad";

// POST: marca la propuesta como enviada y sella la fecha.
// Si todavía no tenía link público se genera aquí: enviar sin link no sirve
// de nada, y pedir dos clics para lo mismo tampoco.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const propuesta = await prisma.propuestaServicio.findUnique({
    where: { id },
    select: { id: true, numero: true, estado: true, aprobacionToken: true, enviadaEn: true },
  });
  if (!propuesta) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (propuesta.estado === "APROBADA") {
    return NextResponse.json({ error: "La propuesta ya está aprobada" }, { status: 400 });
  }

  const token = propuesta.aprobacionToken ?? createExpiringToken(90);

  await prisma.propuestaServicio.update({
    where: { id },
    data: {
      estado: "ENVIADA",
      enviadaEn: propuesta.enviadaEn ?? new Date(),
      aprobacionToken: token,
    },
  });

  await logActividad(session.id, "EDITAR", "propuesta_servicio", id, `Propuesta ${propuesta.numero} marcada enviada`);

  const appUrl = await getConfig("empresa.appUrl", process.env.NEXTAUTH_URL ?? "https://mainstagepro.vercel.app");
  return NextResponse.json({ ok: true, token, url: `${appUrl}/propuesta/${token}` });
}
