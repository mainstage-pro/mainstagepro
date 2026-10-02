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
  return NextResponse.json({ token, url: `${appUrl}/aprobacion/propuesta/${token}` });
}

// DELETE: revoca el link. Quien lo tenga deja de ver la propuesta y de poder
// aprobarla. Una propuesta ya aprobada no se revoca: su link es el comprobante
// de dónde firmó el cliente.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const propuesta = await prisma.propuestaServicio.findUnique({
    where: { id },
    select: { numero: true, estado: true, aprobacionToken: true },
  });
  if (!propuesta) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (propuesta.estado === "APROBADA") {
    return NextResponse.json({ error: "La propuesta ya está aprobada: su link no se revoca" }, { status: 400 });
  }
  if (!propuesta.aprobacionToken) return NextResponse.json({ ok: true });

  await prisma.propuestaServicio.update({ where: { id }, data: { aprobacionToken: null } });
  await logActividad(session.id, "EDITAR", "propuesta_servicio", id, `Link revocado de ${propuesta.numero}`);

  return NextResponse.json({ ok: true });
}
